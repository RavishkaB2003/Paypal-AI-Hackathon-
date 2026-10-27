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

  if (invoiceCount.count > 0) {
    return; // Already populated
  }

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

  const seedTransaction = db.transaction(() => {
    // 1. Invoices
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

    // 2. Milestone Projects & Tranches
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

    // 3. Dispute Cases
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

    // 4. Delivery Records
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

  seedTransaction();
}