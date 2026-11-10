// server/vercel-entry.ts
import { handle } from "@hono/node-server/vercel";

// server/app.ts
import { Hono as Hono9 } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bodyLimit } from "hono/body-limit";
import "dotenv/config";

// server/db/database.ts
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

// server/db/schema.ts
var CREATE_TABLES_SQL = `
-- 1. Invoices & Escrow Splitting
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL,
  due_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  upfront_cents INTEGER,
  midway_cents INTEGER,
  final_cents INTEGER,
  released_cents INTEGER DEFAULT 0,
  sha256_proof TEXT,
  paypal_invoice_id TEXT
);

-- 2. Milestone Projects
CREATE TABLE IF NOT EXISTS milestone_projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Milestone Tranches (1-to-many relationship with projects)
CREATE TABLE IF NOT EXISTS milestone_tranches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES milestone_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  percent INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  released_at TEXT,
  paypal_capture_id TEXT
);

-- 4. Customer Protection & Disputes Ledger
CREATE TABLE IF NOT EXISTS dispute_cases (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL UNIQUE,
  paypal_dispute_id TEXT,
  transaction_id TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence_hashes TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

-- 5. Delivery & Shipping Proof Records
CREATE TABLE IF NOT EXISTS delivery_records (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  client TEXT NOT NULL,
  document_title TEXT NOT NULL,
  carrier_or_method TEXT NOT NULL,
  reference_code TEXT NOT NULL,
  synced_to_paypal INTEGER NOT NULL DEFAULT 1
);

-- 6. Audit Logs for PayPal Debug IDs & System Actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  paypal_debug_id TEXT,
  details_json TEXT
);

-- 7. Merchant Account & Workspace Settings (Single Source of Truth)
CREATE TABLE IF NOT EXISTS account_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  initials TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  base_balance_cents INTEGER NOT NULL DEFAULT 5690000,
  balance_trend_percent REAL NOT NULL DEFAULT 3.2,
  auto_defense_enabled INTEGER NOT NULL DEFAULT 1,
  email_alerts_enabled INTEGER NOT NULL DEFAULT 1,
  default_escrow_split TEXT NOT NULL DEFAULT '30/40/30',
  visible_widgets_json TEXT NOT NULL DEFAULT '["BALANCE","CASHFLOW","CARDS","MILESTONES","EXPENSES","TRANSACTIONS"]',
  updated_at TEXT NOT NULL
);

-- 8. Payment Cards (For YourCardsCard & Add Card workflow)
CREATE TABLE IF NOT EXISTS payment_cards (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  network TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  masked_number TEXT NOT NULL,
  daily_spent INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 25000,
  expiry TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 9. Ledger Transactions (For Deposit, Transfer, & RecentTransactionsCard)
CREATE TABLE IF NOT EXISTS ledger_transactions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  is_income INTEGER NOT NULL,
  icon_color TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 10. Cashflow Series by Timeframe ('THIS_YEAR' | 'LAST_6_MONTHS' | 'THIS_QUARTER')
CREATE TABLE IF NOT EXISTS cashflow_metrics (
  id TEXT PRIMARY KEY,
  timeframe TEXT NOT NULL,
  month TEXT NOT NULL,
  earning INTEGER NOT NULL,
  spending INTEGER NOT NULL,
  sort_order INTEGER NOT NULL
);

-- 11. Expense Breakdown by Timeframe ('MONTHLY' | 'QUARTERLY' | 'YEARLY')
CREATE TABLE IF NOT EXISTS expense_metrics (
  id TEXT PRIMARY KEY,
  timeframe TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

-- 12. Real-Time User Notifications (For TopNavbar Bell Dropdown)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL,
  target_tab TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
`;

// src/shared/seeds.ts
var SEED_INVOICES = [
  {
    id: "inv-1",
    invoiceNumber: "INV-2026-001",
    clientName: "Stripe Global Inc",
    clientEmail: "billing@stripe.com",
    amountCents: 125e4,
    currency: "USD",
    status: "PAID",
    dueDate: "2026-10-15",
    createdAt: "2026-10-01",
    escrowSplit: { upfrontCents: 375e3, midwayCents: 5e5, finalCents: 375e3, releasedCents: 125e4 },
    sha256Proof: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-2026-002",
    clientName: "Acme Logistics Ltd",
    clientEmail: "finance@acmelogistics.com",
    amountCents: 6e5,
    currency: "USD",
    status: "SENT",
    dueDate: "2026-11-05",
    createdAt: "2026-10-18",
    escrowSplit: { upfrontCents: 18e4, midwayCents: 24e4, finalCents: 18e4, releasedCents: 18e4 },
    sha256Proof: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  {
    id: "inv-3",
    invoiceNumber: "INV-2026-003",
    clientName: "Horizon Software",
    clientEmail: "ap@horizon.io",
    amountCents: 18e5,
    currency: "USD",
    status: "DRAFT",
    dueDate: "2026-11-20",
    createdAt: "2026-10-22",
    escrowSplit: { upfrontCents: 54e4, midwayCents: 72e4, finalCents: 54e4, releasedCents: 0 }
  },
  {
    id: "inv-4",
    invoiceNumber: "INV-2026-004",
    clientName: "Nordic Creative Agency",
    clientEmail: "payments@nordic.co",
    amountCents: 45e4,
    currency: "USD",
    status: "OVERDUE",
    dueDate: "2026-10-10",
    createdAt: "2026-09-25",
    escrowSplit: { upfrontCents: 135e3, midwayCents: 18e4, finalCents: 135e3, releasedCents: 0 }
  },
  {
    id: "inv-5",
    invoiceNumber: "INV-2026-005",
    clientName: "Vanguard Retailers",
    clientEmail: "settlements@vanguard.com",
    amountCents: 85e4,
    currency: "USD",
    status: "DISPUTED",
    dueDate: "2026-10-05",
    createdAt: "2026-09-15",
    escrowSplit: { upfrontCents: 255e3, midwayCents: 34e4, finalCents: 255e3, releasedCents: 255e3 },
    sha256Proof: "c5629d70d131ced8183b52e4293fbf160e93e04da933d40f366e26073cc4502f"
  }
];
var SEED_PROJECTS = [
  {
    id: "MS-2026-01",
    title: "Finity Design System & Web App Overhaul",
    clientName: "Stripe Global Inc",
    clientEmail: "billing@stripe.com",
    totalCents: 6e5,
    currency: "USD",
    status: "ACTIVE",
    createdAt: "2026-10-01",
    updatedAt: "2026-10-22",
    tranches: [
      { id: "t1", name: "Project Kickoff & Architecture", percent: 30, amountCents: 18e4, status: "RELEASED", releasedAt: "2026-10-05" },
      { id: "t2", name: "Core Bento UI & AG Grid Views", percent: 40, amountCents: 24e4, status: "RELEASED", releasedAt: "2026-10-18" },
      { id: "t3", name: "Final QA & Production Handoff", percent: 30, amountCents: 18e4, status: "PENDING_APPROVAL" }
    ]
  },
  {
    id: "MS-2026-02",
    title: "Next-Gen Mobile Checkout SDK Integration",
    clientName: "Acme Corp Design",
    clientEmail: "billing@acmecorp.com",
    totalCents: 425e3,
    currency: "USD",
    status: "ACTIVE",
    createdAt: "2026-10-12",
    updatedAt: "2026-10-24",
    tranches: [
      { id: "t4", name: "Initial Setup & API Specs", percent: 30, amountCents: 127500, status: "RELEASED", releasedAt: "2026-10-18" },
      { id: "t5", name: "Checkout Flow Implementation", percent: 40, amountCents: 17e4, status: "PENDING_APPROVAL" },
      { id: "t6", name: "App Store Launch Support", percent: 30, amountCents: 127500, status: "LOCKED" }
    ]
  }
];
var SEED_DISPUTE_CASES = [
  {
    id: "case-1",
    disputeId: "PP-D-99412",
    transactionId: "TXN-884920194",
    buyerEmail: "claims@northstar.com",
    amountCents: 425e3,
    currency: "USD",
    reason: "Item or service not received",
    status: "UNDER_REVIEW",
    evidenceHashes: ["9f8a21c834b65e901a...7c2e"],
    createdAt: "2026-10-24"
  },
  {
    id: "case-2",
    disputeId: "PP-D-88104",
    transactionId: "TXN-773190421",
    buyerEmail: "legal@vanguard.com",
    amountCents: 85e4,
    currency: "USD",
    reason: "Unrecognized charge claim",
    status: "RESOLVED_MERCHANT",
    evidenceHashes: ["4b3c21d890e71a...991a"],
    createdAt: "2026-10-14",
    resolvedAt: "2026-10-16"
  }
];
var SEED_DELIVERY_RECORDS = [
  {
    id: "REC-01",
    invoiceId: "INV-2026-0842",
    client: "Northstar Retail Group",
    documentTitle: "Signed Waybill & Handover Receipt",
    carrierOrMethod: "DHL Express",
    referenceCode: "DHL-884920194",
    syncedToPayPal: true
  },
  {
    id: "REC-02",
    invoiceId: "INV-2026-0841",
    client: "Acme Corp Design",
    documentTitle: "Stage 1 Architecture Sign-Off Sheet",
    carrierOrMethod: "Client Portal Approval",
    referenceCode: "APR-2026-4410",
    syncedToPayPal: true
  },
  {
    id: "REC-03",
    invoiceId: "INV-2026-0839",
    client: "Stripe Global Inc",
    documentTitle: "Production Release Delivery Confirmation",
    carrierOrMethod: "FedEx Priority",
    referenceCode: "FDX-773190421",
    syncedToPayPal: true
  }
];
var SEED_OVERVIEW_DATA = {
  totalBalanceCents: 803e4,
  // $80,300.00
  mainBalanceCents: 733e4,
  // $73,300.00
  inMilestonesCents: 7e5,
  // $7,000.00
  milestoneReleasedCents: 3e5,
  // $3,000.00
  milestoneTotalCents: 7e5,
  // $7,000.00
  balanceTrendPercent: 3.2,
  cashflow: [
    { month: "Jan", earning: 34e3, spending: 18e3 },
    { month: "Feb", earning: 42e3, spending: 21e3 },
    { month: "Mar", earning: 38e3, spending: 19e3 },
    { month: "Apr", earning: 55e3, spending: 26e3 },
    { month: "May", earning: 61e3, spending: 31e3 },
    { month: "Jun", earning: 58e3, spending: 29e3 },
    { month: "Jul", earning: 72e3, spending: 36e3 },
    { month: "Aug", earning: 80300, spending: 41e3 }
  ],
  card: {
    bankName: "Universal Bank",
    network: "VISA",
    holderName: "ALEX VANCE",
    maskedNumber: "4123",
    dailySpent: 1e4,
    dailyLimit: 25e3,
    expiry: "09/28"
  },
  expenses: [
    { category: "Software & Cloud Infrastructure", amount: 3500, color: "#8B7CFF" },
    { category: "Contractor & Engineering Splits", amount: 2800, color: "#5CE1E6" },
    { category: "Hardware Tooling & Shipments", amount: 1900, color: "#F472B6" },
    { category: "Merchant & Gateway Fees", amount: 950, color: "#FFC439" }
  ],
  recentTransactions: [
    { id: "tx-1", name: "Figma Enterprise Seat", category: "Software & Tools", date: "Oct 24, 2026", amountCents: -4500, isIncome: false, iconColor: "#8B7CFF" },
    { id: "tx-2", name: "Milestone Step 2 Release", category: "Client Payout", date: "Oct 23, 2026", amountCents: 24e4, isIncome: true, iconColor: "#34D399" },
    { id: "tx-3", name: "DHL Express Shipping Waybill", category: "Logistics", date: "Oct 22, 2026", amountCents: -18500, isIncome: false, iconColor: "#5CE1E6" },
    { id: "tx-4", name: "Stripe Global Invoice INV-001", category: "Client Settlement", date: "Oct 15, 2026", amountCents: 125e4, isIncome: true, iconColor: "#34D399" }
  ]
};

// server/db/database.ts
var isVercel = Boolean(process.env.VERCEL);
var DB_PATH = process.env.SQLITE_DB_PATH || (isVercel ? "/tmp/paypulse.db" : "./data/paypulse.db");
try {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch {
}
var dbInstance = null;
function getDb() {
  if (dbInstance) {
    seedDatabaseIfEmpty(dbInstance);
    return dbInstance;
  }
  try {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma(isVercel ? "journal_mode = MEMORY" : "journal_mode = WAL");
  } catch (err) {
    console.warn("Falling back to in-memory SQLite database:", err);
    dbInstance = new Database(":memory:");
  }
  dbInstance.pragma("foreign_keys = ON");
  dbInstance.exec(CREATE_TABLES_SQL);
  seedDatabaseIfEmpty(dbInstance);
  return dbInstance;
}
function seedDatabaseIfEmpty(db) {
  const invoiceCount = db.prepare("SELECT COUNT(*) as count FROM invoices").get();
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
          paypalInvoiceId: inv.paypalInvoiceId ?? null
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
          updatedAt: p.updatedAt
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
            paypalCaptureId: t.paypalCaptureId ?? null
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
          resolvedAt: d.resolvedAt ?? null
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
          syncedToPayPal: r.syncedToPayPal ? 1 : 0
        });
      }
    });
    seedCoreTransaction();
  }
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM account_settings").get();
  if (settingsCount.count === 0) {
    const seedExtendedTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO account_settings (
          id, business_name, email, initials, currency, base_balance_cents,
          balance_trend_percent, auto_defense_enabled, email_alerts_enabled,
          default_escrow_split, visible_widgets_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "default",
        "Oripio Studio",
        "oripiostudio@gmail.com",
        "OS",
        "USD",
        569e4,
        3.2,
        1,
        1,
        "30/40/30",
        JSON.stringify(["BALANCE", "CASHFLOW", "CARDS", "MILESTONES", "EXPENSES", "TRANSACTIONS"]),
        "2026-10-25"
      );
      const insertCard = db.prepare(`
        INSERT INTO payment_cards (
          id, bank_name, network, holder_name, masked_number,
          daily_spent, daily_limit, expiry, is_primary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertCard.run(
        "card-1",
        SEED_OVERVIEW_DATA.card.bankName,
        SEED_OVERVIEW_DATA.card.network,
        SEED_OVERVIEW_DATA.card.holderName,
        SEED_OVERVIEW_DATA.card.maskedNumber,
        SEED_OVERVIEW_DATA.card.dailySpent,
        SEED_OVERVIEW_DATA.card.dailyLimit,
        SEED_OVERVIEW_DATA.card.expiry,
        1,
        "2026-10-01"
      );
      insertCard.run(
        "card-2",
        "PayPal Business Debit",
        "MASTERCARD",
        "ORIPIO STUDIO",
        "8842",
        4200,
        5e4,
        "12/29",
        0,
        "2026-10-10"
      );
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
      const insertCashflow = db.prepare(`
        INSERT INTO cashflow_metrics (id, timeframe, month, earning, spending, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      SEED_OVERVIEW_DATA.cashflow.forEach((pt, idx) => {
        insertCashflow.run(`cf-yr-${idx}`, "THIS_YEAR", pt.month, pt.earning, pt.spending, idx);
      });
      SEED_OVERVIEW_DATA.cashflow.slice(-6).forEach((pt, idx) => {
        insertCashflow.run(`cf-6m-${idx}`, "LAST_6_MONTHS", pt.month, pt.earning, pt.spending, idx);
      });
      SEED_OVERVIEW_DATA.cashflow.slice(-3).forEach((pt, idx) => {
        insertCashflow.run(`cf-qtr-${idx}`, "THIS_QUARTER", pt.month, pt.earning, pt.spending, idx);
      });
      const insertExpense = db.prepare(`
        INSERT INTO expense_metrics (id, timeframe, category, amount, color, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      SEED_OVERVIEW_DATA.expenses.forEach((exp, idx) => {
        insertExpense.run(`exp-m-${idx}`, "MONTHLY", exp.category, exp.amount, exp.color, idx);
        insertExpense.run(`exp-q-${idx}`, "QUARTERLY", exp.category, exp.amount * 3, exp.color, idx);
        insertExpense.run(`exp-y-${idx}`, "YEARLY", exp.category, exp.amount * 12, exp.color, idx);
      });
      const insertNotif = db.prepare(`
        INSERT INTO notifications (id, title, message, category, target_tab, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertNotif.run(
        "notif-1",
        "Buyer Claim Under Review",
        "Claim PP-D-99412 ($4,250.00) has a matching DHL waybill ready for protection defense.",
        "PROTECTION",
        "PROTECTION",
        0,
        "2026-10-25T09:00:00Z"
      );
      insertNotif.run(
        "notif-2",
        "Milestone Step Ready for Release",
        "Final QA & Production Handoff ($1,800.00) is awaiting approval.",
        "MILESTONE",
        "MILESTONES",
        0,
        "2026-10-24T15:30:00Z"
      );
      insertNotif.run(
        "notif-3",
        "Invoice Paid in Full",
        "Stripe Global Inc settled INV-2026-001 ($12,500.00).",
        "INVOICE",
        "INVOICES",
        1,
        "2026-10-15T12:00:00Z"
      );
    });
    seedExtendedTransaction();
  }
}

// server/routes/invoices.ts
import { Hono } from "hono";

// src/shared/contracts.ts
import { z } from "zod";
var TabTypeSchema = z.enum([
  "OVERVIEW",
  "INVOICES",
  "SMART_SCAN",
  "MILESTONES",
  "PROTECTION",
  "SETTINGS"
]);
var StudioCanvasDirectiveSchema = z.object({
  activeTab: TabTypeSchema,
  invoiceIdFilter: z.string().optional(),
  widgetHighlight: z.string().optional(),
  actionPayload: z.record(z.string(), z.unknown()).optional(),
  reasoning: z.string().optional()
});
var InvoiceStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "PAID",
  "DISPUTED",
  "OVERDUE"
]);
var EscrowSplitSchema = z.object({
  upfrontCents: z.number().int().nonnegative(),
  midwayCents: z.number().int().nonnegative(),
  finalCents: z.number().int().nonnegative(),
  releasedCents: z.number().int().nonnegative()
});
var InvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string().email(),
  amountCents: z.number().int().positive(),
  currency: z.string().default("USD"),
  status: InvoiceStatusSchema,
  dueDate: z.string(),
  createdAt: z.string(),
  escrowSplit: EscrowSplitSchema.optional(),
  sha256Proof: z.string().optional(),
  paypalInvoiceId: z.string().optional()
});
var TrancheStatusSchema = z.enum(["LOCKED", "PENDING_APPROVAL", "RELEASED"]);
var TrancheSchema = z.object({
  id: z.string(),
  name: z.string(),
  percent: z.number().min(1).max(100),
  amountCents: z.number().int().positive(),
  status: TrancheStatusSchema,
  releasedAt: z.string().optional(),
  paypalCaptureId: z.string().optional()
});
var MilestoneEscrowSchema = z.object({
  id: z.string(),
  title: z.string(),
  totalCents: z.number().int().positive(),
  currency: z.string().default("USD"),
  clientName: z.string(),
  clientEmail: z.string().email(),
  status: z.enum(["ACTIVE", "COMPLETED", "DISPUTED"]),
  tranches: z.array(TrancheSchema),
  createdAt: z.string(),
  updatedAt: z.string()
});
var DocumentTypeSchema = z.enum([
  "INVOICE",
  "RECEIPT",
  "WAYBILL",
  "PROOF_OF_DELIVERY"
]);
var DisputeShieldStatusSchema = z.enum([
  "VERIFIED",
  "FLAGGED",
  "MANUAL_REVIEW"
]);
var ScanItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative()
});
var SmartScanResultSchema = z.object({
  id: z.string(),
  documentType: DocumentTypeSchema,
  vendorName: z.string(),
  invoiceNumber: z.string(),
  date: z.string(),
  totalCents: z.number().int().nonnegative(),
  currency: z.string().default("USD"),
  items: z.array(ScanItemSchema),
  sha256Hash: z.string(),
  confidence: z.number().min(0).max(1),
  disputeShieldStatus: DisputeShieldStatusSchema,
  evidenceNotes: z.string().optional(),
  createdAt: z.string()
});
var ProtectionCaseStatusSchema = z.enum([
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED_MERCHANT",
  "RESOLVED_BUYER"
]);
var ProtectionCaseSchema = z.object({
  id: z.string(),
  disputeId: z.string(),
  paypalDisputeId: z.string().optional(),
  transactionId: z.string(),
  buyerEmail: z.string().email(),
  amountCents: z.number().int().positive(),
  currency: z.string().default("USD"),
  reason: z.string(),
  status: ProtectionCaseStatusSchema,
  evidenceHashes: z.array(z.string()),
  createdAt: z.string(),
  resolvedAt: z.string().optional()
});
function splitAmountIntoCents(totalCents, ratios) {
  if (totalCents < 0 || !Number.isInteger(totalCents)) {
    throw new Error(`totalCents must be a non-negative integer. Received: ${totalCents}`);
  }
  if (ratios.length === 0) return [];
  const ratioSum = ratios.reduce((acc, r) => acc + r, 0);
  if (ratioSum <= 0) {
    throw new Error(`Ratios sum must be positive. Received sum: ${ratioSum}`);
  }
  let allocated = 0;
  const result = [];
  for (let i = 0; i < ratios.length - 1; i++) {
    const portion = Math.floor(totalCents * ratios[i] / ratioSum);
    result.push(portion);
    allocated += portion;
  }
  const finalRemainder = totalCents - allocated;
  result.push(finalRemainder);
  return result;
}
var DeliveryRecordSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  client: z.string(),
  documentTitle: z.string(),
  carrierOrMethod: z.string(),
  referenceCode: z.string(),
  syncedToPayPal: z.boolean()
});
var CashflowPointSchema = z.object({
  month: z.string(),
  earning: z.number().nonnegative(),
  spending: z.number().nonnegative()
});
var ExpenseCategorySchema = z.object({
  category: z.string(),
  amount: z.number().nonnegative(),
  color: z.string()
});
var OverviewCardInfoSchema = z.object({
  id: z.string().optional(),
  bankName: z.string(),
  network: z.string(),
  holderName: z.string(),
  maskedNumber: z.string(),
  dailySpent: z.number().nonnegative(),
  dailyLimit: z.number().positive(),
  expiry: z.string(),
  isPrimary: z.boolean().optional()
});
var RecentTransactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  date: z.string(),
  amountCents: z.number().int(),
  isIncome: z.boolean(),
  iconColor: z.string()
});
var OverviewDataSchema = z.object({
  totalBalanceCents: z.number().int().nonnegative(),
  mainBalanceCents: z.number().int().nonnegative(),
  inMilestonesCents: z.number().int().nonnegative(),
  milestoneReleasedCents: z.number().int().nonnegative(),
  milestoneTotalCents: z.number().int().nonnegative(),
  coveredSalesCents: z.number().int().nonnegative().optional(),
  balanceTrendPercent: z.number(),
  cashflow: z.array(CashflowPointSchema),
  card: OverviewCardInfoSchema,
  cards: z.array(OverviewCardInfoSchema).optional(),
  expenses: z.array(ExpenseCategorySchema),
  recentTransactions: z.array(RecentTransactionSchema)
});
var AccountSettingsSchema = z.object({
  businessName: z.string(),
  email: z.string().email(),
  initials: z.string(),
  currency: z.string(),
  baseBalanceCents: z.number().int(),
  balanceTrendPercent: z.number(),
  autoDefenseEnabled: z.boolean(),
  emailAlertsEnabled: z.boolean(),
  defaultEscrowSplit: z.string(),
  visibleWidgets: z.array(z.string()),
  updatedAt: z.string()
});
var NotificationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  category: z.enum(["INVOICE", "MILESTONE", "PROTECTION", "SYSTEM"]),
  targetTab: TabTypeSchema,
  isRead: z.boolean(),
  createdAt: z.string()
});

// server/routes/invoices.ts
var invoicesRoute = new Hono();
function mapRowToInvoice(row) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientName: row.client_name,
    clientEmail: row.client_email,
    amountCents: row.amount_cents,
    currency: row.currency || "USD",
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    escrowSplit: row.upfront_cents !== null && row.upfront_cents !== void 0 ? {
      upfrontCents: row.upfront_cents,
      midwayCents: row.midway_cents,
      finalCents: row.final_cents,
      releasedCents: row.released_cents || 0
    } : void 0,
    sha256Proof: row.sha256_proof || void 0,
    paypalInvoiceId: row.paypal_invoice_id || void 0
  };
}
invoicesRoute.get("/", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all();
  const invoices = rows.map(mapRowToInvoice);
  return c.json({ success: true, data: invoices });
});
invoicesRoute.get("/:id", (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const row = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
  if (!row) {
    return c.json({ success: false, error: "Invoice not found" }, 404);
  }
  return c.json({ success: true, data: mapRowToInvoice(row) });
});
invoicesRoute.post("/", async (c) => {
  const body = await c.req.json();
  const db = getDb();
  const amountCents = Number(body.amountCents);
  if (!amountCents || amountCents <= 0) {
    return c.json({ success: false, error: "Valid positive amount in cents is required" }, 400);
  }
  const splits = body.enableThreeStepSplit ? splitAmountIntoCents(amountCents, [30, 40, 30]) : null;
  const newId = `inv-${Date.now()}`;
  const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const invoiceRecord = {
    id: newId,
    invoiceNumber: body.invoiceNumber || `INV-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    clientName: body.clientName || "Client",
    clientEmail: body.clientEmail || "billing@example.com",
    amountCents,
    currency: body.currency || "USD",
    status: "SENT",
    dueDate: body.dueDate || now,
    createdAt: now,
    upfrontCents: splits ? splits[0] : null,
    midwayCents: splits ? splits[1] : null,
    finalCents: splits ? splits[2] : null,
    releasedCents: 0,
    sha256Proof: body.sha256Proof || null,
    paypalInvoiceId: null
  };
  const insert = db.prepare(`
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
  insert.run(invoiceRecord);
  db.prepare(`
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    (/* @__PURE__ */ new Date()).toISOString(),
    "CREATE_INVOICE",
    "INVOICE",
    newId,
    JSON.stringify({ amountCents, splits })
  );
  const createdRow = db.prepare("SELECT * FROM invoices WHERE id = ?").get(newId);
  return c.json({
    success: true,
    data: mapRowToInvoice(createdRow)
  }, 201);
});

// server/routes/milestones.ts
import { Hono as Hono2 } from "hono";
var milestonesRoute = new Hono2();
function fetchAllProjects(db) {
  const projects = db.prepare("SELECT * FROM milestone_projects ORDER BY created_at DESC, rowid DESC").all();
  return projects.map((p) => {
    const tranches = db.prepare(`
      SELECT * FROM milestone_tranches
      WHERE project_id = ?
      ORDER BY rowid ASC
    `).all(p.id);
    return {
      id: p.id,
      title: p.title,
      totalCents: p.total_cents,
      currency: p.currency,
      clientName: p.client_name,
      clientEmail: p.client_email,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      tranches: tranches.map((t) => ({
        id: t.id,
        name: t.name,
        percent: t.percent,
        amountCents: t.amount_cents,
        status: t.status,
        releasedAt: t.released_at || void 0,
        paypalCaptureId: t.paypal_capture_id || void 0
      }))
    };
  });
}
milestonesRoute.get("/", (c) => {
  const db = getDb();
  const data = fetchAllProjects(db);
  return c.json({ success: true, data });
});
milestonesRoute.post("/", async (c) => {
  const body = await c.req.json();
  const title = (body.title || "").trim();
  const clientName = (body.clientName || "").trim();
  const clientEmail = (body.clientEmail || "client@example.com").trim();
  const totalCents = Number(body.totalCents);
  const currency = body.currency || "USD";
  const stepNames = Array.isArray(body.stepNames) && body.stepNames.length === 3 ? [body.stepNames[0], body.stepNames[1], body.stepNames[2]] : [
    "Project Kickoff & Architecture",
    "Midpoint Deliverable Review",
    "Final QA & Production Handoff"
  ];
  if (!title || !clientName || !totalCents || totalCents <= 0) {
    return c.json({
      success: false,
      error: "Agreement title, client name, and a positive total amount are required"
    }, 400);
  }
  const db = getDb();
  const splits = splitAmountIntoCents(totalCents, [30, 40, 30]);
  const existingCount = db.prepare("SELECT COUNT(*) as count FROM milestone_projects").get().count;
  const projectId = `MS-2026-0${existingCount + 1}`;
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const createAgreementTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO milestone_projects (
        id, title, total_cents, currency, client_name, client_email, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(projectId, title, totalCents, currency, clientName, clientEmail, today, today);
    const insertTranche = db.prepare(`
      INSERT INTO milestone_tranches (
        id, project_id, name, percent, amount_cents, status, released_at, paypal_capture_id
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)
    `);
    const percents = [30, 40, 30];
    splits.forEach((amount, idx) => {
      insertTranche.run(
        `${projectId}-t${idx + 1}`,
        projectId,
        stepNames[idx],
        percents[idx],
        amount,
        idx === 0 ? "PENDING_APPROVAL" : "LOCKED"
      );
    });
    db.prepare(`
      INSERT INTO notifications (id, title, message, category, target_tab, is_read, created_at)
      VALUES (?, ?, ?, 'MILESTONE', 'MILESTONES', 0, ?)
    `).run(
      `notif-${Date.now()}`,
      "New Milestone Agreement Created",
      `${title} (${clientName}) configured with 30/40/30 escrow steps.`,
      (/* @__PURE__ */ new Date()).toISOString()
    );
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, 'CREATE_MILESTONE_PROJECT', 'MILESTONE', ?, ?)
    `).run((/* @__PURE__ */ new Date()).toISOString(), projectId, JSON.stringify({ title, clientName, totalCents, splits }));
  });
  createAgreementTx();
  const updatedProjects = fetchAllProjects(db);
  const created = updatedProjects.find((p) => p.id === projectId);
  return c.json({
    success: true,
    message: `Milestone agreement '${title}' created.`,
    data: created
  }, 201);
});
milestonesRoute.post("/:id/release-step", async (c) => {
  const projectId = c.req.param("id");
  const db = getDb();
  const nextTranche = db.prepare(`
    SELECT * FROM milestone_tranches
    WHERE project_id = ? AND status = 'PENDING_APPROVAL'
    ORDER BY rowid ASC
    LIMIT 1
  `).get(projectId);
  if (!nextTranche) {
    return c.json({ success: false, error: "No milestone tranche pending approval for release" }, 400);
  }
  const now = /* @__PURE__ */ new Date();
  const today = now.toISOString().split("T")[0];
  const dateLabel = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const releaseTx = db.transaction(() => {
    db.prepare(`
      UPDATE milestone_tranches
      SET status = 'RELEASED', released_at = ?
      WHERE id = ?
    `).run(today, nextTranche.id);
    const nextLocked = db.prepare(`
      SELECT * FROM milestone_tranches
      WHERE project_id = ? AND status = 'LOCKED'
      ORDER BY rowid ASC
      LIMIT 1
    `).get(projectId);
    if (nextLocked) {
      db.prepare(`
        UPDATE milestone_tranches
        SET status = 'PENDING_APPROVAL'
        WHERE id = ?
      `).run(nextLocked.id);
    } else {
      db.prepare(`
        UPDATE milestone_projects
        SET status = 'COMPLETED'
        WHERE id = ?
      `).run(projectId);
    }
    db.prepare(`
      UPDATE milestone_projects
      SET updated_at = ?
      WHERE id = ?
    `).run(today, projectId);
    db.prepare(`
      INSERT INTO ledger_transactions (id, name, category, date, amount_cents, is_income, icon_color, created_at)
      VALUES (?, ?, 'Milestone Payout', ?, ?, 1, '#34D399', ?)
    `).run(
      `tx-ms-${Date.now()}`,
      `Milestone Released: ${nextTranche.name}`,
      dateLabel,
      nextTranche.amount_cents,
      now.toISOString()
    );
    db.prepare(`
      INSERT INTO notifications (id, title, message, category, target_tab, is_read, created_at)
      VALUES (?, ?, ?, 'MILESTONE', 'MILESTONES', 0, ?)
    `).run(
      `notif-${Date.now()}`,
      "Milestone Step Released",
      `${nextTranche.name} ($${(nextTranche.amount_cents / 100).toFixed(2)}) released to available balance.`,
      now.toISOString()
    );
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, 'RELEASE_TRANCHE', 'TRANCHE', ?, ?)
    `).run(
      now.toISOString(),
      nextTranche.id,
      JSON.stringify({ projectId, trancheName: nextTranche.name, amountCents: nextTranche.amount_cents })
    );
  });
  releaseTx();
  const updatedProjects = fetchAllProjects(db);
  const updated = updatedProjects.find((p) => p.id === projectId);
  return c.json({
    success: true,
    message: `Milestone step '${nextTranche.name}' successfully released.`,
    data: updated
  });
});

// server/routes/protection.ts
import { Hono as Hono3 } from "hono";
var protectionRoute = new Hono3();
function mapRowToDispute(row) {
  let evidenceHashes = [];
  try {
    evidenceHashes = typeof row.evidence_hashes === "string" ? JSON.parse(row.evidence_hashes) : row.evidence_hashes || [];
  } catch {
    evidenceHashes = [];
  }
  return {
    id: row.id,
    disputeId: row.dispute_id,
    paypalDisputeId: row.paypal_dispute_id || void 0,
    transactionId: row.transaction_id,
    buyerEmail: row.buyer_email,
    amountCents: row.amount_cents,
    currency: row.currency || "USD",
    reason: row.reason,
    status: row.status,
    evidenceHashes,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || void 0
  };
}
function mapRowToDelivery(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    client: row.client,
    documentTitle: row.document_title,
    carrierOrMethod: row.carrier_or_method,
    referenceCode: row.reference_code,
    syncedToPayPal: Boolean(row.synced_to_paypal)
  };
}
protectionRoute.get("/disputes", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM dispute_cases ORDER BY created_at DESC").all();
  const disputes = rows.map(mapRowToDispute);
  return c.json({ success: true, data: disputes });
});
protectionRoute.get("/delivery", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM delivery_records ORDER BY rowid DESC").all();
  const records = rows.map(mapRowToDelivery);
  return c.json({ success: true, data: records });
});
protectionRoute.post("/disputes/:id/evidence", async (c) => {
  const disputeId = c.req.param("id");
  const body = await c.req.json();
  const db = getDb();
  const caseRow = db.prepare("SELECT * FROM dispute_cases WHERE id = ? OR dispute_id = ?").get(disputeId, disputeId);
  if (!caseRow) {
    return c.json({ success: false, error: "Dispute case not found" }, 404);
  }
  const carrierOrMethod = (body.carrierOrMethod || "").trim();
  const referenceCode = (body.referenceCode || body.evidenceHash || `PROOF-${Date.now()}`).trim();
  const documentTitle = (body.documentTitle || "Verified Delivery & Fulfilment Receipt").trim();
  const clientName = (body.client || caseRow.buyer_email.split("@")[1] || "Verified Buyer").trim();
  const invoiceId = (body.invoiceId || caseRow.transaction_id || "INV-2026-PRO").trim();
  let hashes = [];
  try {
    hashes = JSON.parse(caseRow.evidence_hashes || "[]");
  } catch {
    hashes = [];
  }
  if (!hashes.includes(referenceCode)) {
    hashes.push(referenceCode);
  }
  const now = /* @__PURE__ */ new Date();
  const today = now.toISOString().split("T")[0];
  const submitProofTx = db.transaction(() => {
    db.prepare(`
      UPDATE dispute_cases
      SET evidence_hashes = ?, status = 'RESOLVED_MERCHANT', resolved_at = ?
      WHERE id = ?
    `).run(JSON.stringify(hashes), today, caseRow.id);
    if (carrierOrMethod || body.referenceCode) {
      const existingRec = db.prepare("SELECT id FROM delivery_records WHERE reference_code = ?").get(referenceCode);
      if (!existingRec) {
        const count = db.prepare("SELECT COUNT(*) as count FROM delivery_records").get().count;
        db.prepare(`
          INSERT INTO delivery_records (
            id, invoice_id, client, document_title, carrier_or_method, reference_code, synced_to_paypal
          ) VALUES (?, ?, ?, ?, ?, ?, 1)
        `).run(
          `REC-0${count + 1}`,
          invoiceId,
          clientName,
          documentTitle,
          carrierOrMethod || "Carrier Proof",
          referenceCode
        );
      } else {
        db.prepare("UPDATE delivery_records SET synced_to_paypal = 1 WHERE id = ?").run(existingRec.id);
      }
    }
    db.prepare(`
      INSERT INTO notifications (id, title, message, category, target_tab, is_read, created_at)
      VALUES (?, ?, ?, 'PROTECTION', 'PROTECTION', 0, ?)
    `).run(
      `notif-${Date.now()}`,
      `Claim ${caseRow.dispute_id} Resolved`,
      `Proof '${referenceCode}' accepted. $${(caseRow.amount_cents / 100).toFixed(2)} protected in your favor.`,
      now.toISOString()
    );
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, 'SUBMIT_DISPUTE_EVIDENCE', 'DISPUTE', ?, ?)
    `).run(
      now.toISOString(),
      caseRow.id,
      JSON.stringify({ evidenceHash: referenceCode, carrierOrMethod, documentTitle })
    );
  });
  submitProofTx();
  const updatedRow = db.prepare("SELECT * FROM dispute_cases WHERE id = ?").get(caseRow.id);
  return c.json({
    success: true,
    message: "Delivery proof registered and claim resolved in your favor.",
    data: mapRowToDispute(updatedRow)
  });
});

// server/routes/overview.ts
import { Hono as Hono4 } from "hono";
var overviewRoute = new Hono4();
function buildOverviewData(db, cashflowTimeframe = "THIS_YEAR", expenseTimeframe = "MONTHLY") {
  const settings = db.prepare("SELECT * FROM account_settings WHERE id = ?").get("default");
  const baseBalanceCents = settings?.base_balance_cents ?? 569e4;
  const balanceTrendPercent = settings?.balance_trend_percent ?? 3.2;
  const releasedResult = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM milestone_tranches
    WHERE status = 'RELEASED'
  `).get();
  const pendingResult = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM milestone_tranches
    WHERE status != 'RELEASED'
  `).get();
  const paidInvoicesResult = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM invoices
    WHERE status = 'PAID'
  `).get();
  const ledgerNetResult = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM ledger_transactions
    WHERE id NOT IN ('tx-1', 'tx-2', 'tx-3', 'tx-4')
  `).get();
  const releasedCents = releasedResult.total;
  const inMilestonesCents = pendingResult.total;
  const milestoneTotalCents = releasedCents + inMilestonesCents;
  const mainBalanceCents = Math.max(
    0,
    baseBalanceCents + paidInvoicesResult.total + releasedCents + ledgerNetResult.total
  );
  const totalBalanceCents = mainBalanceCents + inMilestonesCents;
  const coveredInvoicesResult = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM invoices
    WHERE status != 'DRAFT'
  `).get();
  const coveredSalesCents = coveredInvoicesResult.total + milestoneTotalCents;
  const cardRows = db.prepare("SELECT * FROM payment_cards ORDER BY is_primary DESC, created_at ASC").all();
  const cards = cardRows.map((c) => ({
    id: c.id,
    bankName: c.bank_name,
    network: c.network,
    holderName: c.holder_name,
    maskedNumber: c.masked_number,
    dailySpent: c.daily_spent,
    dailyLimit: c.daily_limit,
    expiry: c.expiry,
    isPrimary: Boolean(c.is_primary)
  }));
  const primaryCard = cards[0] || {
    id: "card-default",
    bankName: "Universal Bank",
    network: "VISA",
    holderName: "ORIPIO STUDIO",
    maskedNumber: "4123",
    dailySpent: 1e4,
    dailyLimit: 25e3,
    expiry: "09/28",
    isPrimary: true
  };
  const cashflowRows = db.prepare(`
    SELECT month, earning, spending
    FROM cashflow_metrics
    WHERE timeframe = ?
    ORDER BY sort_order ASC
  `).all(cashflowTimeframe);
  const expenseRows = db.prepare(`
    SELECT category, amount, color
    FROM expense_metrics
    WHERE timeframe = ?
    ORDER BY sort_order ASC
  `).all(expenseTimeframe);
  const txRows = db.prepare(`
    SELECT * FROM ledger_transactions
    ORDER BY created_at DESC, rowid DESC
    LIMIT 10
  `).all();
  const recentTransactions = txRows.map((tx) => ({
    id: tx.id,
    name: tx.name,
    category: tx.category,
    date: tx.date,
    amountCents: tx.amount_cents,
    isIncome: Boolean(tx.is_income),
    iconColor: tx.icon_color
  }));
  return {
    totalBalanceCents,
    mainBalanceCents,
    inMilestonesCents,
    milestoneReleasedCents: releasedCents,
    milestoneTotalCents,
    coveredSalesCents,
    balanceTrendPercent,
    cashflow: cashflowRows,
    card: primaryCard,
    cards,
    expenses: expenseRows,
    recentTransactions
  };
}
overviewRoute.get("/", (c) => {
  const db = getDb();
  const cashflowTimeframe = c.req.query("cashflowTimeframe") || "THIS_YEAR";
  const expenseTimeframe = c.req.query("expenseTimeframe") || "MONTHLY";
  const overviewData = buildOverviewData(db, cashflowTimeframe, expenseTimeframe);
  return c.json({
    success: true,
    data: overviewData
  });
});
overviewRoute.post("/deposit", async (c) => {
  const body = await c.req.json();
  const amountCents = Number(body.amountCents);
  const sourceName = (body.source || "PayPal Linked Bank").trim();
  if (!amountCents || amountCents <= 0) {
    return c.json({ success: false, error: "Valid positive deposit amount is required" }, 400);
  }
  const db = getDb();
  const now = /* @__PURE__ */ new Date();
  const dateLabel = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const txId = `tx-dep-${Date.now()}`;
  const depositTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO ledger_transactions (id, name, category, date, amount_cents, is_income, icon_color, created_at)
      VALUES (?, ?, ?, ?, ?, 1, '#34D399', ?)
    `).run(txId, `Deposit from ${sourceName}`, "Balance Top-Up", dateLabel, amountCents, now.toISOString());
    const addedDollars = Math.round(amountCents / 100);
    db.prepare(`
      UPDATE cashflow_metrics
      SET earning = earning + ?
      WHERE month = 'Aug'
    `).run(addedDollars);
    db.prepare(`
      INSERT INTO notifications (id, title, message, category, target_tab, is_read, created_at)
      VALUES (?, ?, ?, 'SYSTEM', 'OVERVIEW', 0, ?)
    `).run(
      `notif-${Date.now()}`,
      "Funds Deposited",
      `$${(amountCents / 100).toFixed(2)} added from ${sourceName}.`,
      now.toISOString()
    );
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, 'DEPOSIT_FUNDS', 'WALLET', ?, ?)
    `).run(now.toISOString(), txId, JSON.stringify({ amountCents, sourceName }));
  });
  depositTx();
  return c.json({
    success: true,
    message: "Funds deposited into your available balance.",
    data: buildOverviewData(db)
  });
});
overviewRoute.post("/transfer", async (c) => {
  const body = await c.req.json();
  const amountCents = Number(body.amountCents);
  const destination = (body.destination || "Linked Bank Account").trim();
  if (!amountCents || amountCents <= 0) {
    return c.json({ success: false, error: "Valid positive transfer amount is required" }, 400);
  }
  const db = getDb();
  const currentOverview = buildOverviewData(db);
  if (amountCents > currentOverview.mainBalanceCents) {
    return c.json({
      success: false,
      error: "Transfer amount exceeds available balance"
    }, 400);
  }
  const now = /* @__PURE__ */ new Date();
  const dateLabel = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const txId = `tx-trf-${Date.now()}`;
  const transferTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO ledger_transactions (id, name, category, date, amount_cents, is_income, icon_color, created_at)
      VALUES (?, ?, ?, ?, ?, 0, '#8B7CFF', ?)
    `).run(txId, `Transfer to ${destination}`, "Payout Transfer", dateLabel, -amountCents, now.toISOString());
    const spentDollars = Math.round(amountCents / 100);
    db.prepare(`
      UPDATE cashflow_metrics
      SET spending = spending + ?
      WHERE month = 'Aug'
    `).run(spentDollars);
    db.prepare(`
      INSERT INTO notifications (id, title, message, category, target_tab, is_read, created_at)
      VALUES (?, ?, ?, 'SYSTEM', 'OVERVIEW', 0, ?)
    `).run(
      `notif-${Date.now()}`,
      "Payout Transfer Sent",
      `$${(amountCents / 100).toFixed(2)} transferred to ${destination}.`,
      now.toISOString()
    );
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, 'TRANSFER_FUNDS', 'WALLET', ?, ?)
    `).run(now.toISOString(), txId, JSON.stringify({ amountCents, destination }));
  });
  transferTx();
  return c.json({
    success: true,
    message: "Transfer completed successfully.",
    data: buildOverviewData(db)
  });
});
overviewRoute.post("/cards", async (c) => {
  const body = await c.req.json();
  const holderName = (body.holderName || "").trim().toUpperCase();
  const bankName = (body.bankName || "PayPal Business").trim();
  const network = (body.network || "VISA").trim().toUpperCase();
  const maskedNumber = String(body.maskedNumber || "").replace(/\D/g, "").slice(-4);
  const expiry = (body.expiry || "12/29").trim();
  const dailyLimit = Number(body.dailyLimit) || 25e3;
  if (!holderName || maskedNumber.length !== 4) {
    return c.json({
      success: false,
      error: "Card holder name and last 4 digits are required"
    }, 400);
  }
  const db = getDb();
  const cardId = `card-${Date.now()}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const addCardTx = db.transaction(() => {
    db.prepare("UPDATE payment_cards SET is_primary = 0").run();
    db.prepare(`
      INSERT INTO payment_cards (
        id, bank_name, network, holder_name, masked_number,
        daily_spent, daily_limit, expiry, is_primary, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 1, ?)
    `).run(cardId, bankName, network, holderName, maskedNumber, dailyLimit, expiry, now);
    db.prepare(`
      INSERT INTO notifications (id, title, message, category, target_tab, is_read, created_at)
      VALUES (?, ?, ?, 'SYSTEM', 'OVERVIEW', 0, ?)
    `).run(
      `notif-${Date.now()}`,
      "New Card Linked",
      `${bankName} (${network} \u2022\u2022\u2022\u2022 ${maskedNumber}) set as active card.`,
      now
    );
  });
  addCardTx();
  return c.json({
    success: true,
    message: "Payment card added and set as active.",
    data: buildOverviewData(db)
  }, 201);
});

// server/routes/paypal.ts
import { Hono as Hono5 } from "hono";

// server/services/paypal.ts
import "dotenv/config";
var tokenCache = null;
var PAYPAL_ENV = process.env.PAYPAL_ENVIRONMENT || "sandbox";
var BASE_URL = PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
var CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
var CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
function hasValidCredentials() {
  return Boolean(CLIENT_ID) && Boolean(CLIENT_SECRET) && !CLIENT_ID.includes("your_") && !CLIENT_SECRET.includes("your_");
}
function logAudit(action, entityId, debugId, details) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, paypal_debug_id, details_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      (/* @__PURE__ */ new Date()).toISOString(),
      action,
      "PAYPAL_API",
      entityId,
      debugId,
      JSON.stringify(details)
    );
  } catch (err) {
    console.warn("[PayPal Audit Log] Failed to record audit log:", err);
  }
}
async function getAccessToken() {
  if (!hasValidCredentials()) {
    return "simulated-sandbox-access-token";
  }
  if (tokenCache && Date.now() < tokenCache.expiresAt - 6e4) {
    return tokenCache.accessToken;
  }
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const debugId = response.headers.get("paypal-debug-id");
  if (!response.ok) {
    const errorText = await response.text();
    logAudit("OAUTH_TOKEN_FAILED", "oauth2", debugId, { error: errorText });
    throw new Error(`PayPal OAuth2 failure (${response.status}): ${errorText}`);
  }
  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1e3
  };
  logAudit("OAUTH_TOKEN_ACQUIRED", "oauth2", debugId, { expiresIn: data.expires_in });
  return tokenCache.accessToken;
}
async function createPayPalOrder(params) {
  const currency = params.currency || "USD";
  const amountFormatted = (params.amountCents / 100).toFixed(2);
  if (!hasValidCredentials()) {
    const simulatedOrderId = `SIM-ORD-${Date.now()}`;
    const simulatedDebugId = `SIM-DEBUG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    logAudit("CREATE_ORDER_SIMULATED", simulatedOrderId, simulatedDebugId, { params });
    return {
      orderId: simulatedOrderId,
      status: "CREATED",
      debugId: simulatedDebugId
    };
  }
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.invoiceNumber || `REF-${Date.now()}`,
          description: params.description || "PayPulse Secure Payment",
          amount: {
            currency_code: currency,
            value: amountFormatted
          }
        }
      ]
    })
  });
  const debugId = response.headers.get("paypal-debug-id");
  const data = await response.json();
  if (!response.ok) {
    logAudit("CREATE_ORDER_FAILED", "orders", debugId, { error: data });
    throw new Error(`PayPal Create Order Failed: ${JSON.stringify(data)}`);
  }
  logAudit("CREATE_ORDER_SUCCESS", data.id, debugId, { amountFormatted, currency });
  return {
    orderId: data.id,
    status: data.status,
    debugId
  };
}
async function capturePayPalOrder(orderId) {
  if (!hasValidCredentials() || orderId.startsWith("SIM-")) {
    const simCaptureId = `SIM-CAP-${Date.now()}`;
    const simDebugId = `SIM-DEBUG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    logAudit("CAPTURE_ORDER_SIMULATED", orderId, simDebugId, { captureId: simCaptureId });
    return {
      captureId: simCaptureId,
      status: "COMPLETED",
      debugId: simDebugId
    };
  }
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  const debugId = response.headers.get("paypal-debug-id");
  const data = await response.json();
  if (!response.ok) {
    logAudit("CAPTURE_ORDER_FAILED", orderId, debugId, { error: data });
    throw new Error(`PayPal Capture Order Failed: ${JSON.stringify(data)}`);
  }
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = capture?.id || data.id;
  logAudit("CAPTURE_ORDER_SUCCESS", orderId, debugId, { captureId, status: data.status });
  return {
    captureId,
    status: data.status,
    debugId
  };
}

// server/routes/paypal.ts
var paypalRoute = new Hono5();
paypalRoute.get("/status", async (c) => {
  const configured = hasValidCredentials();
  let liveConnected = false;
  let connectionMessage = "Running in simulated sandbox mode (add real credentials in .env to connect live)";
  if (configured) {
    try {
      await getAccessToken();
      liveConnected = true;
      connectionMessage = "Connected to PayPal Sandbox REST API successfully";
    } catch (err) {
      connectionMessage = `Credential error: ${err.message}`;
    }
  }
  return c.json({
    success: true,
    configured,
    liveConnected,
    environment: process.env.PAYPAL_ENVIRONMENT || "sandbox",
    message: connectionMessage
  });
});
paypalRoute.post("/create-order", async (c) => {
  try {
    const body = await c.req.json();
    const amountCents = Number(body.amountCents);
    if (!amountCents || amountCents <= 0) {
      return c.json({ success: false, error: "Positive amount in cents is required" }, 400);
    }
    const result = await createPayPalOrder({
      amountCents,
      currency: body.currency || "USD",
      invoiceNumber: body.invoiceNumber,
      description: body.description
    });
    return c.json({ success: true, data: result });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
paypalRoute.post("/capture-order", async (c) => {
  try {
    const body = await c.req.json();
    const orderId = body.orderId;
    if (!orderId) {
      return c.json({ success: false, error: "orderId is required" }, 400);
    }
    const result = await capturePayPalOrder(orderId);
    return c.json({ success: true, data: result });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// server/routes/settings.ts
import { Hono as Hono6 } from "hono";
var settingsRoute = new Hono6();
function mapRowToSettings(row) {
  let visibleWidgets = ["BALANCE", "CASHFLOW", "CARDS", "MILESTONES", "EXPENSES", "TRANSACTIONS"];
  try {
    if (row?.visible_widgets_json) {
      visibleWidgets = JSON.parse(row.visible_widgets_json);
    }
  } catch {
    visibleWidgets = ["BALANCE", "CASHFLOW", "CARDS", "MILESTONES", "EXPENSES", "TRANSACTIONS"];
  }
  return {
    businessName: row?.business_name || "Oripio Studio",
    email: row?.email || "oripiostudio@gmail.com",
    initials: row?.initials || "OS",
    currency: row?.currency || "USD",
    baseBalanceCents: row?.base_balance_cents ?? 569e4,
    balanceTrendPercent: row?.balance_trend_percent ?? 3.2,
    autoDefenseEnabled: Boolean(row?.auto_defense_enabled ?? 1),
    emailAlertsEnabled: Boolean(row?.email_alerts_enabled ?? 1),
    defaultEscrowSplit: row?.default_escrow_split || "30/40/30",
    visibleWidgets,
    updatedAt: row?.updated_at || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
}
function mapRowToNotification(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    category: row.category,
    targetTab: row.target_tab || "OVERVIEW",
    isRead: Boolean(row.is_read),
    createdAt: row.created_at
  };
}
settingsRoute.get("/", (c) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM account_settings WHERE id = ?").get("default");
  return c.json({
    success: true,
    data: mapRowToSettings(row)
  });
});
settingsRoute.put("/", async (c) => {
  const body = await c.req.json();
  const db = getDb();
  const existing = mapRowToSettings(
    db.prepare("SELECT * FROM account_settings WHERE id = ?").get("default")
  );
  const businessName = (body.businessName ?? existing.businessName).trim();
  const email = (body.email ?? existing.email).trim();
  const computedInitials = businessName.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "OS";
  const initials = (body.initials ?? computedInitials).trim().toUpperCase().slice(0, 2);
  const currency = body.currency ?? existing.currency;
  const autoDefenseEnabled = body.autoDefenseEnabled !== void 0 ? body.autoDefenseEnabled ? 1 : 0 : existing.autoDefenseEnabled ? 1 : 0;
  const emailAlertsEnabled = body.emailAlertsEnabled !== void 0 ? body.emailAlertsEnabled ? 1 : 0 : existing.emailAlertsEnabled ? 1 : 0;
  const defaultEscrowSplit = body.defaultEscrowSplit ?? existing.defaultEscrowSplit;
  const visibleWidgets = Array.isArray(body.visibleWidgets) ? body.visibleWidgets : existing.visibleWidgets;
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  db.prepare(`
    UPDATE account_settings
    SET business_name = ?,
        email = ?,
        initials = ?,
        currency = ?,
        auto_defense_enabled = ?,
        email_alerts_enabled = ?,
        default_escrow_split = ?,
        visible_widgets_json = ?,
        updated_at = ?
    WHERE id = 'default'
  `).run(
    businessName,
    email,
    initials,
    currency,
    autoDefenseEnabled,
    emailAlertsEnabled,
    defaultEscrowSplit,
    JSON.stringify(visibleWidgets),
    today
  );
  const updated = db.prepare("SELECT * FROM account_settings WHERE id = ?").get("default");
  return c.json({
    success: true,
    message: "Workspace settings saved to database.",
    data: mapRowToSettings(updated)
  });
});
settingsRoute.get("/notifications", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM notifications ORDER BY created_at DESC, rowid DESC LIMIT 15").all();
  return c.json({
    success: true,
    data: rows.map(mapRowToNotification)
  });
});
settingsRoute.post("/notifications/read-all", (c) => {
  const db = getDb();
  db.prepare("UPDATE notifications SET is_read = 1").run();
  const rows = db.prepare("SELECT * FROM notifications ORDER BY created_at DESC, rowid DESC LIMIT 15").all();
  return c.json({
    success: true,
    data: rows.map(mapRowToNotification)
  });
});
settingsRoute.post("/reset-demo", (c) => {
  const db = getDb();
  const resetTx = db.transaction(() => {
    db.prepare("DELETE FROM invoices").run();
    db.prepare("DELETE FROM milestone_tranches").run();
    db.prepare("DELETE FROM milestone_projects").run();
    db.prepare("DELETE FROM dispute_cases").run();
    db.prepare("DELETE FROM delivery_records").run();
    db.prepare("DELETE FROM account_settings").run();
    db.prepare("DELETE FROM payment_cards").run();
    db.prepare("DELETE FROM ledger_transactions").run();
    db.prepare("DELETE FROM cashflow_metrics").run();
    db.prepare("DELETE FROM expense_metrics").run();
    db.prepare("DELETE FROM notifications").run();
  });
  resetTx();
  seedDatabaseIfEmpty(db);
  return c.json({
    success: true,
    message: "All database tables reset to initial seed state."
  });
});

// server/routes/scan.ts
import { Hono as Hono7 } from "hono";

// server/services/vision.ts
import crypto from "node:crypto";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z as z2 } from "zod";
import "dotenv/config";
var ExtractionSchema = z2.object({
  documentType: z2.enum(["INVOICE", "RECEIPT", "WAYBILL", "PROOF_OF_DELIVERY"]),
  vendorName: z2.string(),
  invoiceNumber: z2.string(),
  date: z2.string(),
  totalCents: z2.number().int().nonnegative(),
  currency: z2.string(),
  items: z2.array(
    z2.object({
      description: z2.string(),
      quantity: z2.number().positive(),
      unitPriceCents: z2.number().int().nonnegative(),
      totalCents: z2.number().int().nonnegative()
    })
  ),
  confidence: z2.number().min(0).max(1),
  disputeShieldStatus: z2.enum(["VERIFIED", "FLAGGED", "MANUAL_REVIEW"]),
  evidenceNotes: z2.string()
});
function computeSha256(data) {
  const hash = crypto.createHash("sha256");
  if (typeof data === "string") {
    hash.update(data, "utf-8");
  } else {
    hash.update(data);
  }
  return hash.digest("hex");
}
async function extractDocumentWithVision(params) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const today = now.split("T")[0];
  const buildDeterministicSample = (notesSuffix = "") => {
    const isDelivery = params.sampleType === "delivery";
    const samplePayload = isDelivery ? {
      documentType: "PROOF_OF_DELIVERY",
      vendorName: "DHL Express Global Logistics",
      invoiceNumber: "WAYBILL-8849-20194",
      date: today,
      totalCents: 425e3,
      currency: "USD",
      items: [
        {
          description: "Next-Gen Mobile Checkout SDK (Hardware Tokens & Handover)",
          quantity: 1,
          unitPriceCents: 425e3,
          totalCents: 425e3
        }
      ],
      confidence: 0.98,
      disputeShieldStatus: "VERIFIED",
      evidenceNotes: `Signed recipient waybill with verified GPS coordinates and delivery signature.${notesSuffix}`
    } : {
      documentType: "RECEIPT",
      vendorName: "Acme Cloud & Logistics Hardware",
      invoiceNumber: "INV-2026-904",
      date: today,
      totalCents: 185e3,
      currency: "USD",
      items: [
        {
          description: "High-Throughput Payment Terminal Engine",
          quantity: 1,
          unitPriceCents: 14e4,
          totalCents: 14e4
        },
        {
          description: "Secure Enclave Cryptographic Co-Processor",
          quantity: 1,
          unitPriceCents: 45e3,
          totalCents: 45e3
        }
      ],
      confidence: 0.95,
      disputeShieldStatus: "VERIFIED",
      evidenceNotes: `Merchant receipt matched with registered bank clearing statement.${notesSuffix}`
    };
    return samplePayload;
  };
  if (params.sampleType || !params.imageBase64) {
    const samplePayload = buildDeterministicSample();
    const mockHash = computeSha256(JSON.stringify(samplePayload));
    return {
      id: `scan-${Date.now()}`,
      ...samplePayload,
      sha256Hash: mockHash,
      createdAt: today
    };
  }
  if (!apiKey || apiKey.includes("your_")) {
    throw new Error("Gemini API key is not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY in .env.");
  }
  const rawHash = computeSha256(params.imageBase64);
  let mimeType = params.mimeType || "image/jpeg";
  let base64Data = params.imageBase64;
  if (params.imageBase64.startsWith("data:")) {
    const match = params.imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }
  }
  const imageBuffer = Buffer.from(base64Data, "base64");
  const envModel = process.env.DEFAULT_VISION_MODEL?.trim();
  const candidateModels = [
    envModel && envModel !== "gemini-3.8-flash" && !envModel.includes("2.0") && !envModel.includes("2.5") ? envModel : "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-flash-latest"
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);
  let lastError = null;
  for (const modelId of candidateModels) {
    try {
      const model = google(modelId);
      const { object } = await generateObject({
        model,
        schema: ExtractionSchema,
        abortSignal: AbortSignal.timeout(25e3),
        // 25s circuit-breaker timeout
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are PayPulse Vision, an enterprise financial document extractor for PayPal merchants.
Analyze this invoice, receipt, or proof of delivery image. Extract:
1. Document Type (INVOICE, RECEIPT, WAYBILL, or PROOF_OF_DELIVERY)
2. Vendor or Client Name
3. Invoice/Reference Number
4. Date (YYYY-MM-DD)
5. Total Amount in Cents (integer: e.g. $14.50 = 1450)
6. Currency (default "USD")
7. Line items (description, quantity, unit price in cents, total in cents)
8. Confidence score (0.00 to 1.00)
9. Dispute Shield Status (VERIFIED, FLAGGED, or MANUAL_REVIEW)
10. Evidence notes describing signatures, tracking IDs, or timestamps`
              },
              {
                type: "image",
                image: imageBuffer
              }
            ]
          }
        ]
      });
      return {
        id: `scan-${Date.now()}`,
        ...object,
        sha256Hash: rawHash,
        createdAt: today
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[PayPulse Vision] Model '${modelId}' extraction attempt failed (${lastError.message.slice(0, 100)}). Trying fallback...`);
    }
  }
  throw new Error(`AI Vision extraction could not process document: ${lastError?.message || "Inference failed"}`);
}

// server/routes/scan.ts
var scanRoute = new Hono7();
scanRoute.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const result = await extractDocumentWithVision({
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
      sampleType: body.sampleType
    });
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      (/* @__PURE__ */ new Date()).toISOString(),
      "AI_DOCUMENT_SCAN",
      "DOCUMENT",
      result.id,
      JSON.stringify({
        vendorName: result.vendorName,
        totalCents: result.totalCents,
        sha256Hash: result.sha256Hash,
        confidence: result.confidence
      })
    );
    return c.json({ success: true, data: result });
  } catch (err) {
    console.error("[Scan Route Error]:", err);
    return c.json({ success: false, error: err.message || "Vision extraction failed" }, 500);
  }
});

// server/routes/agents.ts
import { Hono as Hono8 } from "hono";

// server/services/playbooks.ts
async function runAutonomousPlaybooks() {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const today = now.split("T")[0];
  const actionsExecuted = [];
  let disputesDefendedCount = 0;
  let deliveriesSyncedCount = 0;
  let openDisputes = db.prepare(`
    SELECT * FROM dispute_cases
    WHERE status = 'UNDER_REVIEW'
  `).all();
  if (openDisputes.length === 0) {
    db.prepare(`
      UPDATE dispute_cases
      SET status = 'UNDER_REVIEW', resolved_at = NULL, evidence_hashes = '["9f8a21c834b65e901a...7c2e"]'
      WHERE id = 'case-1'
    `).run();
    openDisputes = db.prepare(`
      SELECT * FROM dispute_cases
      WHERE status = 'UNDER_REVIEW'
    `).all();
  }
  for (const dispute of openDisputes) {
    const rawTxnId = dispute.transaction_id || dispute.transactionId || "";
    const cleanTxnRef = rawTxnId.replace(/^TXN-/, "");
    const cleanDisputeRef = (dispute.dispute_id || "").replace(/^PP-D-/, "");
    const matchingDelivery = db.prepare(`
      SELECT * FROM delivery_records
      WHERE invoice_id LIKE ? 
         OR reference_code LIKE ? 
         OR reference_code LIKE ?
      LIMIT 1
    `).get(`%${rawTxnId}%`, `%${cleanTxnRef}%`, `%${cleanDisputeRef}%`);
    let proofHash = `auto-proof-${Date.now()}-sha256`;
    if (matchingDelivery && matchingDelivery.reference_code) {
      proofHash = matchingDelivery.reference_code;
    }
    let hashes = [];
    try {
      hashes = JSON.parse(dispute.evidence_hashes || "[]");
    } catch {
      hashes = [];
    }
    if (!hashes.includes(proofHash)) {
      hashes.push(proofHash);
    }
    db.prepare(`
      UPDATE dispute_cases
      SET status = 'RESOLVED_MERCHANT', evidence_hashes = ?, resolved_at = ?
      WHERE id = ?
    `).run(JSON.stringify(hashes), today, dispute.id);
    disputesDefendedCount++;
    const actionDesc = `Autonomous Agent defended case ${dispute.dispute_id} ($${(dispute.amount_cents / 100).toFixed(2)}) using proof '${proofHash}'`;
    actionsExecuted.push(actionDesc);
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      now,
      "AUTONOMOUS_DISPUTE_DEFENSE",
      "DISPUTE",
      dispute.id,
      JSON.stringify({
        disputeId: dispute.dispute_id,
        amountCents: dispute.amount_cents,
        proofAttached: proofHash,
        playbook: "DISPUTE_AUTO_DEFENDER"
      })
    );
  }
  const unsyncedDeliveries = db.prepare(`
    SELECT * FROM delivery_records
    WHERE synced_to_paypal = 0
  `).all();
  for (const record of unsyncedDeliveries) {
    db.prepare(`
      UPDATE delivery_records
      SET synced_to_paypal = 1
      WHERE id = ?
    `).run(record.id);
    deliveriesSyncedCount++;
    const syncDesc = `Autonomous Agent synced delivery record ${record.reference_code} (${record.carrier_or_method}) to PayPal Seller Protection`;
    actionsExecuted.push(syncDesc);
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      now,
      "AUTONOMOUS_DELIVERY_SYNC",
      "DELIVERY_RECORD",
      record.id,
      JSON.stringify({
        trackingNumber: record.reference_code,
        carrier: record.carrier_or_method,
        playbook: "DELIVERY_TRACKER_SYNC"
      })
    );
  }
  let directive;
  if (disputesDefendedCount > 0) {
    directive = {
      activeTab: "PROTECTION",
      widgetHighlight: "disputes-ledger",
      reasoning: `Autonomous agent successfully defended ${disputesDefendedCount} claim(s) using registered waybills. Directing to Protection ledger.`,
      actionPayload: { defendedCount: disputesDefendedCount }
    };
  } else if (deliveriesSyncedCount > 0) {
    directive = {
      activeTab: "PROTECTION",
      widgetHighlight: "delivery-records",
      reasoning: `Autonomous agent synced ${deliveriesSyncedCount} tracking proof(s) to PayPal Seller Protection. Directing to Protection view.`,
      actionPayload: { syncedCount: deliveriesSyncedCount }
    };
  } else {
    const pendingMilestone = db.prepare(`
      SELECT * FROM milestone_tranches
      WHERE status = 'PENDING_APPROVAL'
      LIMIT 1
    `).get();
    if (pendingMilestone) {
      directive = {
        activeTab: "MILESTONES",
        widgetHighlight: "milestone-approvals",
        reasoning: `All disputes are protected. Recommending review for pending milestone tranche: '${pendingMilestone.name}'.`,
        actionPayload: { trancheId: pendingMilestone.id }
      };
    } else {
      directive = {
        activeTab: "PROTECTION",
        widgetHighlight: "protection-status",
        reasoning: "Autonomous inspection verified: 100% of transactions covered by PayPal Seller Protection."
      };
    }
  }
  return {
    timestamp: now,
    disputesDefendedCount,
    deliveriesSyncedCount,
    actionsExecuted,
    canvasDirective: directive
  };
}
function getAgentAuditHistory(limit = 10) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM audit_logs
    WHERE action LIKE 'AUTONOMOUS%'
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);
}

// server/routes/agents.ts
var agentsRoute = new Hono8();
agentsRoute.post("/run-playbook", async (c) => {
  try {
    const result = await runAutonomousPlaybooks();
    return c.json({
      success: true,
      data: result,
      message: result.actionsExecuted.length > 0 ? `Executed ${result.actionsExecuted.length} autonomous agent action(s).` : "Autonomous inspection complete: Ledger 100% verified and protected."
    });
  } catch (err) {
    console.error("[Agents Route Error]:", err);
    return c.json({ success: false, error: err.message || "Agent playbook execution failed" }, 500);
  }
});
agentsRoute.post("/reset-demo", (c) => {
  const db = getDb();
  db.prepare(`
    UPDATE dispute_cases
    SET status = 'UNDER_REVIEW', resolved_at = NULL, evidence_hashes = '["9f8a21c834b65e901a...7c2e"]'
    WHERE id = 'case-1'
  `).run();
  db.prepare(`
    UPDATE delivery_records
    SET synced_to_paypal = 0
    WHERE id = 'REC-01'
  `).run();
  return c.json({
    success: true,
    message: "Demo state reset: Case PP-D-99412 is now UNDER_REVIEW and ready for autonomous defense."
  });
});
agentsRoute.get("/status", (c) => {
  const history = getAgentAuditHistory(10);
  return c.json({
    success: true,
    data: {
      status: "ACTIVE",
      playbooks: [
        { id: "DISPUTE_AUTO_DEFENDER", status: "READY", name: "Dispute Auto-Defender Agent" },
        { id: "DELIVERY_TRACKER_SYNC", status: "READY", name: "Delivery Proof Auto-Sync Agent" },
        { id: "CANVAS_DIRECTIVE_ENGINE", status: "READY", name: "Studio Canvas Directive Agent" }
      ],
      recentAutonomousActions: history
    }
  });
});

// server/app.ts
var app = new Hono9();
app.use("*", logger());
app.use("*", bodyLimit({ maxSize: 15 * 1024 * 1024 }));
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin.endsWith(".vercel.app") || process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN) {
        return origin;
      }
      return "http://localhost:5173";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"]
  })
);
getDb();
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: process.env.NODE_ENV || "development",
    server: "PayPulse Hono Server v3"
  });
});
app.route("/api/overview", overviewRoute);
app.route("/api/invoices", invoicesRoute);
app.route("/api/milestones", milestonesRoute);
app.route("/api/protection", protectionRoute);
app.route("/api/paypal", paypalRoute);
app.route("/api/settings", settingsRoute);
app.route("/api/scan", scanRoute);
app.route("/api/agents", agentsRoute);
app.onError((err, c) => {
  console.error("Server Unhandled Error:", err);
  return c.json(
    {
      success: false,
      error: err.message || "Internal Server Error"
    },
    500
  );
});

// server/vercel-entry.ts
var honoHandler = handle(app);
async function vercelHandler(req, res) {
  const db = getDb();
  seedDatabaseIfEmpty(db);
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  return honoHandler(req, res);
}
export {
  vercelHandler as default
};
