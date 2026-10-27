import { Hono } from 'hono';
import { getDb } from '../db/database';
import { type MilestoneEscrow, type Tranche } from '../../src/shared';

export const milestonesRoute = new Hono();

// Helper to fetch full milestone projects with child tranches
function fetchAllProjects(db: any): MilestoneEscrow[] {
  const projects = db.prepare('SELECT * FROM milestone_projects ORDER BY created_at DESC').all();

  return projects.map((p: any) => {
    const tranches = db.prepare(`
      SELECT * FROM milestone_tranches
      WHERE project_id = ?
      ORDER BY rowid ASC
    `).all(p.id) as any[];

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
      tranches: tranches.map((t: any): Tranche => ({
        id: t.id,
        name: t.name,
        percent: t.percent,
        amountCents: t.amount_cents,
        status: t.status,
        releasedAt: t.released_at || undefined,
        paypalCaptureId: t.paypal_capture_id || undefined,
      })),
    };
  });
}

// GET /api/milestones - Fetch all milestone escrow projects
milestonesRoute.get('/', (c) => {
  const db = getDb();
  const data = fetchAllProjects(db);
  return c.json({ success: true, data });
});

// POST /api/milestones/:id/release-step - Release next approved tranche
milestonesRoute.post('/:id/release-step', async (c) => {
  const projectId = c.req.param('id');
  const db = getDb();

  // Find the first tranche that is pending approval
  const nextTranche = db.prepare(`
    SELECT * FROM milestone_tranches
    WHERE project_id = ? AND status = 'PENDING_APPROVAL'
    ORDER BY rowid ASC
    LIMIT 1
  `).get(projectId) as any;

  if (!nextTranche) {
    return c.json({ success: false, error: 'No milestone tranche pending approval for release' }, 400);
  }

  const now = new Date().toISOString().split('T')[0];

  // Update tranche to RELEASED
  db.prepare(`
    UPDATE milestone_tranches
    SET status = 'RELEASED', released_at = ?
    WHERE id = ?
  `).run(now, nextTranche.id);

  // Update project timestamp
  db.prepare(`
    UPDATE milestone_projects
    SET updated_at = ?
    WHERE id = ?
  `).run(now, projectId);

  // Record audit log
  db.prepare(`
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    new Date().toISOString(),
    'RELEASE_TRANCHE',
    'TRANCHE',
    nextTranche.id,
    JSON.stringify({ projectId, trancheName: nextTranche.name, amountCents: nextTranche.amount_cents })
  );

  const updatedProjects = fetchAllProjects(db);
  const updated = updatedProjects.find((p) => p.id === projectId);

  return c.json({
    success: true,
    message: `Milestone step '${nextTranche.name}' successfully released.`,
    data: updated,
  });
});