import { Hono } from 'hono';
import { getDb, seedDatabaseIfEmpty } from '../db/database';
import { type AccountSettings, type NotificationItem, type TabType } from '../../src/shared';

export const settingsRoute = new Hono();

function mapRowToSettings(row: any): AccountSettings {
  let visibleWidgets = ['BALANCE', 'CASHFLOW', 'CARDS', 'MILESTONES', 'EXPENSES', 'TRANSACTIONS'];
  try {
    if (row?.visible_widgets_json) {
      visibleWidgets = JSON.parse(row.visible_widgets_json);
    }
  } catch {
    visibleWidgets = ['BALANCE', 'CASHFLOW', 'CARDS', 'MILESTONES', 'EXPENSES', 'TRANSACTIONS'];
  }

  return {
    businessName: row?.business_name || 'Oripio Studio',
    email: row?.email || 'oripiostudio@gmail.com',
    initials: row?.initials || 'OS',
    currency: row?.currency || 'USD',
    baseBalanceCents: row?.base_balance_cents ?? 5690000,
    balanceTrendPercent: row?.balance_trend_percent ?? 3.2,
    autoDefenseEnabled: Boolean(row?.auto_defense_enabled ?? 1),
    emailAlertsEnabled: Boolean(row?.email_alerts_enabled ?? 1),
    defaultEscrowSplit: row?.default_escrow_split || '30/40/30',
    visibleWidgets,
    updatedAt: row?.updated_at || new Date().toISOString().split('T')[0],
  };
}

function mapRowToNotification(row: any): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    category: row.category,
    targetTab: (row.target_tab || 'OVERVIEW') as TabType,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

// GET /api/settings - Fetch merchant profile & workspace preferences from SQLite
settingsRoute.get('/', (c) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM account_settings WHERE id = ?').get('default');
  return c.json({
    success: true,
    data: mapRowToSettings(row),
  });
});

// PUT /api/settings - Update merchant profile, escrow preferences, or visible Bento widgets
settingsRoute.put('/', async (c) => {
  const body = await c.req.json();
  const db = getDb();
  const existing = mapRowToSettings(
    db.prepare('SELECT * FROM account_settings WHERE id = ?').get('default')
  );

  const businessName = (body.businessName ?? existing.businessName).trim();
  const email = (body.email ?? existing.email).trim();
  const computedInitials = businessName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'OS';
  const initials = (body.initials ?? computedInitials).trim().toUpperCase().slice(0, 2);
  const currency = body.currency ?? existing.currency;
  const autoDefenseEnabled = body.autoDefenseEnabled !== undefined
    ? (body.autoDefenseEnabled ? 1 : 0)
    : (existing.autoDefenseEnabled ? 1 : 0);
  const emailAlertsEnabled = body.emailAlertsEnabled !== undefined
    ? (body.emailAlertsEnabled ? 1 : 0)
    : (existing.emailAlertsEnabled ? 1 : 0);
  const defaultEscrowSplit = body.defaultEscrowSplit ?? existing.defaultEscrowSplit;
  const visibleWidgets = Array.isArray(body.visibleWidgets)
    ? body.visibleWidgets
    : existing.visibleWidgets;
  const today = new Date().toISOString().split('T')[0];

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

  const updated = db.prepare('SELECT * FROM account_settings WHERE id = ?').get('default');
  return c.json({
    success: true,
    message: 'Workspace settings saved to database.',
    data: mapRowToSettings(updated),
  });
});

// GET /api/settings/notifications - Fetch live notifications for TopNavbar bell
settingsRoute.get('/notifications', (c) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC, rowid DESC LIMIT 15').all();
  return c.json({
    success: true,
    data: rows.map(mapRowToNotification),
  });
});

// POST /api/settings/notifications/read-all - Mark all notifications as read
settingsRoute.post('/notifications/read-all', (c) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1').run();
  const rows = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC, rowid DESC LIMIT 15').all();
  return c.json({
    success: true,
    data: rows.map(mapRowToNotification),
  });
});

// POST /api/settings/reset-demo - Reset SQLite tables back to clean initial seed state
settingsRoute.post('/reset-demo', (c) => {
  const db = getDb();
  const resetTx = db.transaction(() => {
    db.prepare('DELETE FROM invoices').run();
    db.prepare('DELETE FROM milestone_tranches').run();
    db.prepare('DELETE FROM milestone_projects').run();
    db.prepare('DELETE FROM dispute_cases').run();
    db.prepare('DELETE FROM delivery_records').run();
    db.prepare('DELETE FROM account_settings').run();
    db.prepare('DELETE FROM payment_cards').run();
    db.prepare('DELETE FROM ledger_transactions').run();
    db.prepare('DELETE FROM cashflow_metrics').run();
    db.prepare('DELETE FROM expense_metrics').run();
    db.prepare('DELETE FROM notifications').run();
  });
  resetTx();
  seedDatabaseIfEmpty(db);

  return c.json({
    success: true,
    message: 'All database tables reset to initial seed state.',
  });
});