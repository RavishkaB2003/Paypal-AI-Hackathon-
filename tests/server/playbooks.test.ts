import { describe, it, expect, beforeEach } from 'vitest';
import { runAutonomousPlaybooks, getAgentAuditHistory } from '../../server/services/playbooks';
import { getDb } from '../../server/db/database';

describe('Autonomous Agent Playbooks & Directive Engine', () => {
  const db = getDb();

  beforeEach(() => {
    // Reset demo state before each test run
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
  });

  it('executes Playbook 1 (Dispute Auto-Defender) and Playbook 2 (Delivery Proof Auto-Sync)', async () => {
    const result = await runAutonomousPlaybooks();

    expect(result).toBeDefined();
    expect(result.disputesDefendedCount).toBeGreaterThanOrEqual(1);
    expect(result.deliveriesSyncedCount).toBeGreaterThanOrEqual(1);
    expect(result.actionsExecuted.length).toBeGreaterThanOrEqual(2);

    // Verify dispute case-1 was resolved in SQLite
    const dispute = db.prepare('SELECT * FROM dispute_cases WHERE id = ?').get('case-1') as any;
    expect(dispute.status).toBe('RESOLVED_MERCHANT');
    expect(dispute.resolved_at).not.toBeNull();

    // Verify delivery record was synced
    const delivery = db.prepare('SELECT * FROM delivery_records WHERE id = ?').get('REC-01') as any;
    expect(delivery.synced_to_paypal).toBe(1);
  });

  it('generates a valid StudioCanvasDirective pointing to PROTECTION', async () => {
    const result = await runAutonomousPlaybooks();

    expect(result.canvasDirective).toBeDefined();
    expect(result.canvasDirective.activeTab).toBe('PROTECTION');
    expect(result.canvasDirective.widgetHighlight).toBe('disputes-ledger');
    expect(result.canvasDirective.actionPayload).toEqual({ defendedCount: result.disputesDefendedCount });
  });

  it('handles self-healing when open disputes queue is drained', async () => {
    // Force resolve all disputes
    db.prepare("UPDATE dispute_cases SET status = 'RESOLVED_MERCHANT'").run();

    // Running playbooks should self-heal case-1 and defend it
    const result = await runAutonomousPlaybooks();
    expect(result.disputesDefendedCount).toBe(1);

    const dispute = db.prepare('SELECT * FROM dispute_cases WHERE id = ?').get('case-1') as any;
    expect(dispute.status).toBe('RESOLVED_MERCHANT');
  });

  it('handles corrupted evidence_hashes gracefully without throwing', async () => {
    // Inject invalid JSON in evidence_hashes
    db.prepare(`
      UPDATE dispute_cases
      SET status = 'UNDER_REVIEW', evidence_hashes = 'INVALID_JSON_CORRUPTED'
      WHERE id = 'case-1'
    `).run();

    const result = await runAutonomousPlaybooks();
    expect(result.disputesDefendedCount).toBe(1);

    const dispute = db.prepare('SELECT * FROM dispute_cases WHERE id = ?').get('case-1') as any;
    expect(dispute.status).toBe('RESOLVED_MERCHANT');
    const hashes = JSON.parse(dispute.evidence_hashes);
    expect(Array.isArray(hashes)).toBe(true);
  });

  it('retrieves recent autonomous audit records via getAgentAuditHistory', async () => {
    await runAutonomousPlaybooks();
    const history = getAgentAuditHistory(5);

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].action).toMatch(/^AUTONOMOUS_/);
  });
});