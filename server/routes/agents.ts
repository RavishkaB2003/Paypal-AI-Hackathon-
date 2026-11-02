import { Hono } from 'hono';
import { runAutonomousPlaybooks, getAgentAuditHistory } from '../services/playbooks';
import { getDb } from '../db/database';

export const agentsRoute = new Hono();

// POST /api/agents/run-playbook - Trigger autonomous agent cycle
agentsRoute.post('/run-playbook', async (c) => {
  try {
    const result = await runAutonomousPlaybooks();
    return c.json({
      success: true,
      data: result,
      message: result.actionsExecuted.length > 0
        ? `Executed ${result.actionsExecuted.length} autonomous agent action(s).`
        : 'Autonomous inspection complete: Ledger 100% verified and protected.',
    });
  } catch (err: any) {
    console.error('[Agents Route Error]:', err);
    return c.json({ success: false, error: err.message || 'Agent playbook execution failed' }, 500);
  }
});

// POST /api/agents/reset-demo - Resets disputes & delivery tracking back to initial demo state
agentsRoute.post('/reset-demo', (c) => {
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
    message: 'Demo state reset: Case PP-D-99412 is now UNDER_REVIEW and ready for autonomous defense.',
  });
});

// GET /api/agents/status - Retrieve playbook status and recent autonomous logs
agentsRoute.get('/status', (c) => {
  const history = getAgentAuditHistory(10);
  return c.json({
    success: true,
    data: {
      status: 'ACTIVE',
      playbooks: [
        { id: 'DISPUTE_AUTO_DEFENDER', status: 'READY', name: 'Dispute Auto-Defender Agent' },
        { id: 'DELIVERY_TRACKER_SYNC', status: 'READY', name: 'Delivery Proof Auto-Sync Agent' },
        { id: 'CANVAS_DIRECTIVE_ENGINE', status: 'READY', name: 'Studio Canvas Directive Agent' },
      ],
      recentAutonomousActions: history,
    },
  });
});