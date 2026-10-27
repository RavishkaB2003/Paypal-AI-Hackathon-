/**
 * SQLite DDL Schema for PayPulse Backend
 * Governs: Invoices, Milestones & Tranches, Disputes, Delivery Proofs, and Audit Logs
 */

export const CREATE_TABLES_SQL = `
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
  evidence_hashes TEXT, -- JSON array of proof hashes
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
`;