import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { CREATE_TABLES_SQL } from './schema';
import {
  SEED_INVOICES,
  SEED_PROJECTS,
  SEED_DISPUTE_CASES,
  SEED_DELIVERY_RECORDS,
  SEED_OVERVIEW_DATA,
} from '../../src/shared/seeds';

const DB_PATH = process.env.SQLITE_DB_PATH || './data/paypulse.db';

// Ensure data folder exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = new Database(DB_PATH);

  // Enforce WAL mode for fast concurrent reads/writes and enable Foreign Keys
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  // Initialize schema
  dbInstance.exec(CREATE_TABLES_SQL);

  // Automatically hydrate initial seed records if empty
  seedDatabaseIfEmpty(dbInstance);

  return dbInstance;
}

export function seedDatabaseIfEmpty(db: Database.Database): void {
  const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number };

  if (invoiceCount.count === 0) {
    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, client_name, client_email, amount_cents, currency,
        status, due_date, created_at, upfront_cents, midway_cents, final_cents,
        released_cents, sha256_proof, paypal_invoice_id
      ) VALUES (
        @id, @invoiceNumber, @clientName, @clientEmail, @amountCents, @currency,
        @status, @dueDate, @createdAt, @upfrontCents, @midwayCents, @finalCents,
        @releasedCents, @sha256Proof, @paypalInvoiceId
      )
    `);

    const insertProject = db.prepare(`
      INSERT INTO milestone_projects (
        id, title, total_cents, currency, client_name, client_email, status, created_at, updated_at
      ) VALUES (
        @id, @title, @totalCents, @currency, @clientName, @clientEmail, @status, @createdAt, @updatedAt
      )
    `);

    const insertTranche = db.prepare(`
      INSERT INTO milestone_tranches (
        id, project_id, name, percent, amount_cents, status, released_at, paypal_capture_id
      ) VALUES (
        @id, @projectId, @name, @percent, @amountCents, @status, @releasedAt, @paypalCaptureId
      )
    `);

    const insertDispute = db.prepare(`
      INSERT INTO dispute_cases (
        id, dispute_id, paypal_dispute_id, transaction_id, buyer_email,
        amount_cents, currency, reason, status, evidence_hashes, created_at, resolved_at
      ) VALUES (
        @id, @disputeId, @paypalDisputeId, @transactionId, @buyerEmail,
        @amountCents, @currency, @reason, @status, @evidenceHashes, @createdAt, @resolvedAt
      )
    `);

    const insertDelivery = db.prepare(`
      INSERT INTO delivery_records (
        id, invoice_id, client, document_title, carrier_or_method, reference_code, synced_to_paypal
      ) VALUES (
        @id, @invoiceId, @client, @documentTitle, @carrierOrMethod, @referenceCode, @syncedToPayPal
      )
    `);

    const seedCoreTransaction = db.transaction(() => {
      for (const inv of SEED_INVOICES) {
        insertInvoice.run({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          clientName: inv.clientName,
          clientEmail: inv.clientEmail,
          amountCents: inv.amountCents,
          currency: inv.currency,
          status: inv.status,
          dueDate: inv.dueDate,
          createdAt: inv.createdAt,
          upfrontCents: inv.escrowSplit?.upfrontCents ?? null,
          midwayCents: inv.escrowSplit?.midwayCents ?? null,
          finalCents: inv.escrowSplit?.finalCents ?? null,
          releasedCents: inv.escrowSplit?.releasedCents ?? 0,
          sha256Proof: inv.sha256Proof ?? null,
          paypalInvoiceId: inv.paypalInvoiceId ?? null,
        });
      }

      for (const p of SEED_PROJECTS) {
        insertProject.run({
          id: p.id,
          title: p.title,
          totalCents: p.totalCents,
          currency: p.currency,
          clientName: p.clientName,
          clientEmail: p.clientEmail,
          status: p.status,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        });

        for (const t of p.tranches) {
          insertTranche.run({
            id: t.id,
            projectId: p.id,
            name: t.name,
            percent: t.percent,
            amountCents: t.amountCents,
            status: t.status,
            releasedAt: t.releasedAt ?? null,
            paypalCaptureId: t.paypalCaptureId ?? null,
          });
        }
      }

      for (const d of SEED_DISPUTE_CASES) {
        insertDispute.run({
          id: d.id,
          disputeId: d.disputeId,
          paypalDisputeId: d.paypalDisputeId ?? null,
          transactionId: d.transactionId,
          buyerEmail: d.buyerEmail,
          amountCents: d.amountCents,
          currency: d.currency,
          reason: d.reason,
          status: d.status,
          evidenceHashes: JSON.stringify(d.evidenceHashes),
          createdAt: d.createdAt,
          resolvedAt: d.resolvedAt ?? null,
        });
      }

      for (const r of SEED_DELIVERY_RECORDS) {
        insertDelivery.run({
          id: r.id,
          invoiceId: r.invoiceId,
          client: r.client,
          documentTitle: r.documentTitle,
          carrierOrMethod: r.carrierOrMethod,
          referenceCode: r.referenceCode,
          syncedToPayPal: r.syncedToPayPal ? 1 : 0,
        });
      }
    });

    seedCoreTransaction();
  }

  // Hydrate extended Single-Source-of-Truth tables if empty (supports existing DB upgrade)
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM account_settings').get() as { count: number };

  if (settingsCount.count === 0) {
    const seedExtendedTransaction = db.transaction(() => {
      // 1. Account Settings
      db.prepare(`
        INSERT INTO account_settings (
          id, business_name, email, initials, currency, base_balance_cents,
          balance_trend_percent, auto_defense_enabled, email_alerts_enabled,
          default_escrow_split, visible_widgets_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'default',
        'Oripio Studio',
        'oripiostudio@gmail.com',
        'OS',
        'USD',
        5690000,
        3.2,
        1,
        1,
        '30/40/30',
        JSON.stringify(['BALANCE', 'CASHFLOW', 'CARDS', 'MILESTONES', 'EXPENSES', 'TRANSACTIONS']),
        '2026-10-25'
      );

      // 2. Payment Cards
      const insertCard = db.prepare(`
        INSERT INTO payment_cards (
          id, bank_name, network, holder_name, masked_number,
          daily_spent, daily_limit, expiry, is_primary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertCard.run(
        'card-1',
        SEED_OVERVIEW_DATA.card.bankName,
        SEED_OVERVIEW_DATA.card.network,
        SEED_OVERVIEW_DATA.card.holderName,
        SEED_OVERVIEW_DATA.card.maskedNumber,
        SEED_OVERVIEW_DATA.card.dailySpent,
        SEED_OVERVIEW_DATA.card.dailyLimit,
        SEED_OVERVIEW_DATA.card.expiry,
        1,
        '2026-10-01'
      );
      insertCard.run(
        'card-2',
        'PayPal Business Debit',
        'MASTERCARD',
        'ORIPIO STUDIO',
        '8842',
        4200,
        50000,
        '12/29',
        0,
        '2026-10-10'
      );

      // 3. Ledger Transactions
      const insertTx = db.prepare(`
        INSERT INTO ledger_transactions (
          id, name, category, date, amount_cents, is_income, icon_color, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      SEED_OVERVIEW_DATA.recentTransactions.forEach((tx, idx) => {
        insertTx.run(
          tx.id,
          tx.name,
          tx.category,
          tx.date,
          tx.amountCents,
          tx.isIncome ? 1 : 0,
          tx.iconColor,
          `2026-10-${24 - idx}`
        );
      });

      // 4. Cashflow Metrics across 3 Timeframes ('THIS_YEAR', 'LAST_6_MONTHS', 'THIS_QUARTER')
      const insertCashflow = db.prepare(`
        INSERT INTO cashflow_metrics (id, timeframe, month, earning, spending, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      SEED_OVERVIEW_DATA.cashflow.forEach((pt, idx) => {
        insertCashflow.run(`cf-yr-${idx}`, 'THIS_YEAR', pt.month, pt.earning, pt.spending, idx);
      });
      SEED_OVERVIEW_DATA.cashflow.slice(-6).forEach((pt, idx) => {
        insertCashflow.run(`cf-6m-${idx}`, 'LAST_6_MONTHS', pt.month, pt.earning, pt.spending, idx);
      });
      SEED_OVERVIEW_DATA.cashflow.slice(-3).forEach((pt, idx) => {
        insertCashflow.run(`cf-qtr-${idx}`, 'THIS_QUARTER', pt.month, pt.earning, pt.spending, idx);
      });

      // 5. Expense Metrics across 3 Timeframes ('MONTHLY', 'QUARTERLY', 'YEARLY')
      const insertExpense = db.prepare(`
        INSERT INTO expense_metrics (id, timeframe, category, amount, color, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      SEED_OVERVIEW_DATA.expenses.forEach((exp, idx) => {
        insertExpense.run(`exp-m-${idx}`, 'MONTHLY', exp.category, exp.amount, exp.color, idx);
        insertExpense.run(`exp-q-${idx}`, 'QUARTERLY', exp.category, exp.amount * 3, exp.color, idx);
        insertExpense.run(`exp-y-${idx}`, 'YEARLY', exp.category, exp.amount * 12, exp.color, idx);
      });

      // 6. Notifications
      const insertNotif = db.prepare(`
        INSERT INTO notifications (id, title, message, category, target_tab, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertNotif.run(
        'notif-1',
        'Buyer Claim Under Review',
        'Claim PP-D-99412 ($4,250.00) has a matching DHL waybill ready for protection defense.',
        'PROTECTION',
        'PROTECTION',
        0,
        '2026-10-25T09:00:00Z'
      );
      insertNotif.run(
        'notif-2',
        'Milestone Step Ready for Release',
        'Final QA & Production Handoff ($1,800.00) is awaiting approval.',
        'MILESTONE',
        'MILESTONES',
        0,
        '2026-10-24T15:30:00Z'
      );
      insertNotif.run(
        'notif-3',
        'Invoice Paid in Full',
        'Stripe Global Inc settled INV-2026-001 ($12,500.00).',
        'INVOICE',
        'INVOICES',
        1,
        '2026-10-15T12:00:00Z'
      );
    });

    seedExtendedTransaction();
  }
}