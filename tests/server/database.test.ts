import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, seedDatabaseIfEmpty } from '../../server/db/database';

describe('Database & SQLite WAL Persistence (Single Source of Truth)', () => {
  let db: ReturnType<typeof getDb>;

  beforeAll(() => {
    db = getDb();
  });

  it('initializes a valid Database instance', () => {
    expect(db).toBeDefined();
  });

  it('enforces WAL journal mode for high concurrency', () => {
    const journalMode = db.pragma('journal_mode', { simple: true });
    expect(journalMode).toBe('wal');
  });

  it('enforces foreign key constraints', () => {
    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    expect(foreignKeys).toBe(1);
  });

  it('contains all 12 required tables in SQLite schema', () => {
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    // 1. Invoices
    expect(tableNames).toContain('invoices');
    // 2. Milestone Projects
    expect(tableNames).toContain('milestone_projects');
    // 3. Milestone Tranches
    expect(tableNames).toContain('milestone_tranches');
    // 4. Disputes
    expect(tableNames).toContain('dispute_cases');
    // 5. Delivery Records
    expect(tableNames).toContain('delivery_records');
    // 6. Audit Logs
    expect(tableNames).toContain('audit_logs');
    // 7. Account Settings
    expect(tableNames).toContain('account_settings');
    // 8. Payment Cards
    expect(tableNames).toContain('payment_cards');
    // 9. Ledger Transactions
    expect(tableNames).toContain('ledger_transactions');
    // 10. Cashflow Metrics
    expect(tableNames).toContain('cashflow_metrics');
    // 11. Expense Metrics
    expect(tableNames).toContain('expense_metrics');
    // 12. Real-time Notifications
    expect(tableNames).toContain('notifications');
  });

  it('seeds data idempotently without duplicate records', () => {
    const countBefore = (
      db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number }
    ).count;
    seedDatabaseIfEmpty(db);
    const countAfter = (
      db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number }
    ).count;

    expect(countAfter).toBe(countBefore);
  });

  it('verifies relationship and penny totals between milestone projects and tranches', () => {
    const projects = db.prepare('SELECT * FROM milestone_projects').all() as any[];
    expect(projects.length).toBeGreaterThan(0);

    const firstProject = projects[0];
    const tranches = db
      .prepare('SELECT * FROM milestone_tranches WHERE project_id = ?')
      .all(firstProject.id) as any[];
    expect(tranches.length).toBeGreaterThan(0);

    const totalTranchesCents = tranches.reduce((sum, t) => sum + t.amount_cents, 0);
    expect(totalTranchesCents).toBe(firstProject.total_cents);
  });

  it('enforces cascade deletion of tranches when a milestone project is deleted', () => {
    const testProjectId = `test-proj-${Date.now()}`;
    const testTrancheId = `test-tran-${Date.now()}`;

    // Insert dummy project
    db.prepare(`
      INSERT INTO milestone_projects (id, title, total_cents, client_name, client_email, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testProjectId,
      'Test Project Cascade',
      10000,
      'Test Client',
      'client@test.com',
      'IN_PROGRESS',
      new Date().toISOString(),
      new Date().toISOString()
    );

    // Insert dummy tranche
    db.prepare(`
      INSERT INTO milestone_tranches (id, project_id, name, percent, amount_cents, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      testTrancheId,
      testProjectId,
      'Tranche 1',
      100,
      10000,
      'PENDING'
    );

    // Confirm tranche exists
    const beforeDel = db.prepare('SELECT id FROM milestone_tranches WHERE id = ?').get(testTrancheId);
    expect(beforeDel).toBeDefined();

    // Delete project
    db.prepare('DELETE FROM milestone_projects WHERE id = ?').run(testProjectId);

    // Confirm tranche was cascaded
    const afterDel = db.prepare('SELECT id FROM milestone_tranches WHERE id = ?').get(testTrancheId);
    expect(afterDel).toBeUndefined();
  });

  it('can write and query audit logs with JSON payloads', () => {
    const testLogId = `test-audit-${Date.now()}`;
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(),
      'TEST_ACTION',
      'TEST_ENTITY',
      testLogId,
      JSON.stringify({ test: true, metric: 42 })
    );

    const row = db.prepare('SELECT * FROM audit_logs WHERE entity_id = ?').get(testLogId) as any;
    expect(row).toBeDefined();
    expect(row.action).toBe('TEST_ACTION');
    expect(JSON.parse(row.details_json)).toEqual({ test: true, metric: 42 });
  });
});