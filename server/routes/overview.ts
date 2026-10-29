import { Hono } from 'hono';
import { getDb } from '../db/database';
import { SEED_OVERVIEW_DATA } from '../../src/shared/seeds';
import { type OverviewData } from '../../src/shared';

export const overviewRoute = new Hono();

// GET /api/overview - Live executive Bento dashboard data
overviewRoute.get('/', (c) => {
  const db = getDb();

  // Dynamically compute live milestone totals from SQLite
  const releasedResult = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM milestone_tranches
    WHERE status = 'RELEASED'
  `).get() as { total: number };

  const pendingResult = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM milestone_tranches
    WHERE status != 'RELEASED'
  `).get() as { total: number };

  const releasedCents = releasedResult.total;
  const inMilestonesCents = pendingResult.total;
  const milestoneTotalCents = releasedCents + inMilestonesCents;

  const overviewData: OverviewData = {
    ...SEED_OVERVIEW_DATA,
    inMilestonesCents,
    milestoneReleasedCents: releasedCents,
    milestoneTotalCents,
  };

  return c.json({
    success: true,
    data: overviewData,
  });
});