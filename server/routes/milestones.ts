import { Hono } from 'hono';
import { getDb } from '../db/database';
import { splitAmountIntoCents, type MilestoneEscrow, type Tranche } from '../../src/shared';

export const milestonesRoute = new Hono();

// Helper to fetch full milestone projects with child tranches
function fetchAllProjects(db: any): MilestoneEscrow[] {
  const projects = db.prepare('SELECT * FROM milestone_projects ORDER BY created_at DESC, rowid DESC').all();

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

// POST /api/milestones - Create a new 3-step milestone escrow agreement
milestonesRoute.post('/', async (c) => {
  const body = await c.req.json();
  const title = (body.title || '').trim();
  const clientName = (body.clientName || '').trim();
  const clientEmail = (body.clientEmail || 'client@example.com').trim();
  const totalCents = Number(body.totalCents);
  const currency = body.currency || 'USD';
  const stepNames: [string, string, string] = Array.isArray(body.stepNames) && body.stepNames.length === 3
    ? [body.stepNames[0], body.stepNames[1], body.stepNames[2]]
    : [
        'Project Kickoff & Architecture',
        'Midpoint Deliverable Review',
        'Final QA & Production Handoff',
      ];

  if (!title || !clientName || !totalCents || totalCents <= 0) {
    return c.json({
      success: false,
      error: 'Agreement title, client name, and a positive total amount are required',
    }, 400);
  }

  const db = getDb();
  const splits = splitAmountIntoCents(totalCents, [30, 40, 30]);
  const existingCount = (db.prepare('SELECT COUNT(*) as count FROM milestone_projects').get() as { count: number }).count;
  const projectId = `MS-2026-0${existingCount + 1}`;
  const today = new Date().toISOString().split('T')[0];

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
        idx === 0 ? 'PENDING_APPROVAL' : 'LOCKED'
      );
    });

    db.prepare(`
      INSERT INTO notifications (id, title, message, category, target_tab, is_read, created_at)
      VALUES (?, ?, ?, 'MILESTONE', 'MILESTONES', 0, ?)
    `).run(
      `notif-${Date.now()}`,
      'New Milestone Agreement Created',
      `${title} (${clientName}) configured with 30/40/30 escrow steps.`,
      new Date().toISOString()
    );

    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, 'CREATE_MILESTONE_PROJECT', 'MILESTONE', ?, ?)
    `).run(new Date().toISOString(), projectId, JSON.stringify({ title, clientName, totalCents, splits }));
  });

  createAgreementTx();

  const updatedProjects = fetchAllProjects(db);
  const created = updatedProjects.find((p) => p.id === projectId);

  return c.json({
    success: true,
    message: `Milestone agreement '${title}' created.`,
    data: created,
  }, 201);
});

// POST /api/milestones/:id/release-step - Release next approved tranche & promote next locked step
milestonesRoute.post('/:id/release-step', async (c) => {
  const projectId = c.req.param('id');
  const db = getDb();

  const nextTranche = db.prepare(`
    SELECT * FROM milestone_tranches
    WHERE project_id = ? AND status = 'PENDING_APPROVAL'
    ORDER BY rowid ASC
    LIMIT 1
  `).get(projectId) as any;

  if (!nextTranche) {
    return c.json({ success: false, error: 'No milestone tranche pending approval for release' }, 400);
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const releaseTx = db.transaction(() => {
    // 1. Mark current tranche as RELEASED
    db.prepare(`
      UPDATE milestone_tranches
      SET status = 'RELEASED', released_at = ?
      WHERE id = ?
    `).run(today, nextTranche.id);

    // 2. Promote the next LOCKED tranche (if any) to PENDING_APPROVAL
    const nextLocked = db.prepare(`
      SELECT * FROM milestone_tranches
      WHERE project_id = ? AND status = 'LOCKED'
      ORDER BY rowid ASC
      LIMIT 1
    `).get(projectId) as any;

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

    // 3. Update project timestamp
    db.prepare(`
      UPDATE milestone_projects
      SET updated_at = ?
      WHERE id = ?
    `).run(today, projectId);

    // 4. Record payout in ledger_transactions so Overview Recent Transactions updates
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

    // 5. Create notification
    db.prepare(`
      INSERT INTO notifications (id, title, message, category, target_tab, is_read, created_at)
      VALUES (?, ?, ?, 'MILESTONE', 'MILESTONES', 0, ?)
    `).run(
      `notif-${Date.now()}`,
      'Milestone Step Released',
      `${nextTranche.name} ($${(nextTranche.amount_cents / 100).toFixed(2)}) released to available balance.`,
      now.toISOString()
    );

    // 6. Record audit log
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
    data: updated,
  });
});