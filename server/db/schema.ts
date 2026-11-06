/**
 * SQLite DDL Schema for PayPulse Backend (Single Source of Truth)
 * Governs: Invoices, Milestones & Tranches, Disputes, Delivery Proofs,
 * Account Settings, Payment Cards, Ledger Transactions, Analytics Timeframes,
 * Notifications, and Audit Logs.
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