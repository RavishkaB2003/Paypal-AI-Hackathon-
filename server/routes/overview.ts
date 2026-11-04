import { Hono } from 'hono';
import { getDb } from '../db/database';
import { type OverviewData, type OverviewCardInfo, type RecentTransaction } from '../../src/shared';

export const overviewRoute = new Hono();

function buildOverviewData(
  db: any,
  cashflowTimeframe = 'THIS_YEAR',
  expenseTimeframe = 'MONTHLY'
): OverviewData {
  // 1. Fetch account base settings
  const settings = db.prepare('SELECT * FROM account_settings WHERE id = ?').get('default') as any;
  const baseBalanceCents = settings?.base_balance_cents ?? 5690000;
  const balanceTrendPercent = settings?.balance_trend_percent ?? 3.2;

  // 2. Compute live milestone escrow totals from SQLite
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

  // 3. Compute paid invoices & net ledger deposits/transfers
  const paidInvoicesResult = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM invoices
    WHERE status = 'PAID'
  `).get() as { total: number };

  const ledgerNetResult = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM ledger_transactions
    WHERE id NOT IN ('tx-1', 'tx-2', 'tx-3', 'tx-4')
  `).get() as { total: number };

  const releasedCents = releasedResult.total;
  const inMilestonesCents = pendingResult.total;
  const milestoneTotalCents = releasedCents + inMilestonesCents;

  // Dynamic accounting conservation: mainBalance = base + paidInvoices + releasedMilestones + netLedgerMoves
  const mainBalanceCents = Math.max(
    0,
    baseBalanceCents + paidInvoicesResult.total + releasedCents + ledgerNetResult.total
  );
  const totalBalanceCents = mainBalanceCents + inMilestonesCents;

  // Covered sales = all non-draft invoice volume + active milestone agreements
  const coveredInvoicesResult = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM invoices
    WHERE status != 'DRAFT'
  `).get() as { total: number };
  const coveredSalesCents = coveredInvoicesResult.total + milestoneTotalCents;

  // 4. Fetch payment cards from SQLite
  const cardRows = db.prepare('SELECT * FROM payment_cards ORDER BY is_primary DESC, created_at ASC').all() as any[];
  const cards: OverviewCardInfo[] = cardRows.map((c) => ({
    id: c.id,
    bankName: c.bank_name,
    network: c.network,
    holderName: c.holder_name,
    maskedNumber: c.masked_number,
    dailySpent: c.daily_spent,
    dailyLimit: c.daily_limit,
    expiry: c.expiry,
    isPrimary: Boolean(c.is_primary),
  }));

  const primaryCard: OverviewCardInfo = cards[0] || {
    id: 'card-default',
    bankName: 'Universal Bank',
    network: 'VISA',
    holderName: 'ORIPIO STUDIO',
    maskedNumber: '4123',
    dailySpent: 10000,
    dailyLimit: 25000,
    expiry: '09/28',
    isPrimary: true,
  };

  // 5. Fetch cashflow series for requested timeframe
  const cashflowRows = db.prepare(`
    SELECT month, earning, spending
    FROM cashflow_metrics
    WHERE timeframe = ?
    ORDER BY sort_order ASC
  `).all(cashflowTimeframe) as any[];

  // 6. Fetch expense breakdown for requested timeframe
  const expenseRows = db.prepare(`
    SELECT category, amount, color
    FROM expense_metrics
    WHERE timeframe = ?
    ORDER BY sort_order ASC
  `).all(expenseTimeframe) as any[];

  // 7. Fetch recent ledger transactions
  const txRows = db.prepare(`
    SELECT * FROM ledger_transactions
    ORDER BY created_at DESC, rowid DESC
    LIMIT 10
  `).all() as any[];

  const recentTransactions: RecentTransaction[] = txRows.map((tx) => ({
    id: tx.id,
    name: tx.name,
    category: tx.category,
    date: tx.date,
    amountCents: tx.amount_cents,
    isIncome: Boolean(tx.is_income),
    iconColor: tx.icon_color,
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
    recentTransactions,
  };
}

// GET /api/overview - Live executive Bento dashboard data from SQLite
overviewRoute.get('/', (c) => {
  const db = getDb();
  const cashflowTimeframe = c.req.query('cashflowTimeframe') || 'THIS_YEAR';
  const expenseTimeframe = c.req.query('expenseTimeframe') || 'MONTHLY';

  const overviewData = buildOverviewData(db, cashflowTimeframe, expenseTimeframe);
  return c.json({
    success: true,
    data: overviewData,
  });
});

// POST /api/overview/deposit - Deposit funds into PayPulse balance
overviewRoute.post('/deposit', async (c) => {
  const body = await c.req.json();
  const amountCents = Number(body.amountCents);
  const sourceName = (body.source || 'PayPal Linked Bank').trim();

  if (!amountCents || amountCents <= 0) {
    return c.json({ success: false, error: 'Valid positive deposit amount is required' }, 400);
  }

  const db = getDb();
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const txId = `tx-dep-${Date.now()}`;

  const depositTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO ledger_transactions (id, name, category, date, amount_cents, is_income, icon_color, created_at)
      VALUES (?, ?, ?, ?, ?, 1, '#34D399', ?)
    `).run(txId, `Deposit from ${sourceName}`, 'Balance Top-Up', dateLabel, amountCents, now.toISOString());

    // Update latest month cashflow earning
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
      'Funds Deposited',
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
    message: 'Funds deposited into your available balance.',
    data: buildOverviewData(db),
  });
});

// POST /api/overview/transfer - Transfer / payout funds from available balance
overviewRoute.post('/transfer', async (c) => {
  const body = await c.req.json();
  const amountCents = Number(body.amountCents);
  const destination = (body.destination || 'Linked Bank Account').trim();

  if (!amountCents || amountCents <= 0) {
    return c.json({ success: false, error: 'Valid positive transfer amount is required' }, 400);
  }

  const db = getDb();
  const currentOverview = buildOverviewData(db);

  if (amountCents > currentOverview.mainBalanceCents) {
    return c.json({
      success: false,
      error: 'Transfer amount exceeds available balance',
    }, 400);
  }

  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const txId = `tx-trf-${Date.now()}`;

  const transferTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO ledger_transactions (id, name, category, date, amount_cents, is_income, icon_color, created_at)
      VALUES (?, ?, ?, ?, ?, 0, '#8B7CFF', ?)
    `).run(txId, `Transfer to ${destination}`, 'Payout Transfer', dateLabel, -amountCents, now.toISOString());

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
      'Payout Transfer Sent',
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
    message: 'Transfer completed successfully.',
    data: buildOverviewData(db),
  });
});

// POST /api/overview/cards - Add a new payment card to SQLite
overviewRoute.post('/cards', async (c) => {
  const body = await c.req.json();
  const holderName = (body.holderName || '').trim().toUpperCase();
  const bankName = (body.bankName || 'PayPal Business').trim();
  const network = (body.network || 'VISA').trim().toUpperCase();
  const maskedNumber = String(body.maskedNumber || '').replace(/\D/g, '').slice(-4);
  const expiry = (body.expiry || '12/29').trim();
  const dailyLimit = Number(body.dailyLimit) || 25000;

  if (!holderName || maskedNumber.length !== 4) {
    return c.json({
      success: false,
      error: 'Card holder name and last 4 digits are required',
    }, 400);
  }

  const db = getDb();
  const cardId = `card-${Date.now()}`;
  const now = new Date().toISOString();

  const addCardTx = db.transaction(() => {
    db.prepare('UPDATE payment_cards SET is_primary = 0').run();
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
      'New Card Linked',
      `${bankName} (${network} •••• ${maskedNumber}) set as active card.`,
      now
    );
  });

  addCardTx();

  return c.json({
    success: true,
    message: 'Payment card added and set as active.',
    data: buildOverviewData(db),
  }, 201);
});