import { Hono } from 'hono';
import { getDb } from '../db/database';
import { splitAmountIntoCents, type Invoice } from '../../src/shared';

export const invoicesRoute = new Hono();

// Helper to map DB snake_case columns to shared TypeScript Invoice contract
function mapRowToInvoice(row: any): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientName: row.client_name,
    clientEmail: row.client_email,
    amountCents: row.amount_cents,
    currency: row.currency || 'USD',
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    escrowSplit: row.upfront_cents !== null && row.upfront_cents !== undefined
      ? {
          upfrontCents: row.upfront_cents,
          midwayCents: row.midway_cents,
          finalCents: row.final_cents,
          releasedCents: row.released_cents || 0,
        }
      : undefined,
    sha256Proof: row.sha256_proof || undefined,
    paypalInvoiceId: row.paypal_invoice_id || undefined,
  };
}

// GET /api/invoices - Fetch all invoices
invoicesRoute.get('/', (c) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all();
  const invoices = rows.map(mapRowToInvoice);
  return c.json({ success: true, data: invoices });
});

// GET /api/invoices/:id - Fetch single invoice
invoicesRoute.get('/:id', (c) => {
  const id = c.req.param('id');
  const db = getDb();
  const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);

  if (!row) {
    return c.json({ success: false, error: 'Invoice not found' }, 404);
  }

  return c.json({ success: true, data: mapRowToInvoice(row) });
});

// POST /api/invoices - Create new invoice with optional 3-step escrow split
invoicesRoute.post('/', async (c) => {
  const body = await c.req.json();
  const db = getDb();

  const amountCents = Number(body.amountCents);
  if (!amountCents || amountCents <= 0) {
    return c.json({ success: false, error: 'Valid positive amount in cents is required' }, 400);
  }

  // Calculate 30 / 40 / 30 deterministic integer cent split if requested
  const splits = body.enableThreeStepSplit
    ? splitAmountIntoCents(amountCents, [30, 40, 30])
    : null;

  const newId = `inv-${Date.now()}`;
  const now = new Date().toISOString().split('T')[0];

  const invoiceRecord = {
    id: newId,
    invoiceNumber: body.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    clientName: body.clientName || 'Client',
    clientEmail: body.clientEmail || 'billing@example.com',
    amountCents: amountCents,
    currency: body.currency || 'USD',
    status: 'SENT',
    dueDate: body.dueDate || now,
    createdAt: now,
    upfrontCents: splits ? splits[0] : null,
    midwayCents: splits ? splits[1] : null,
    finalCents: splits ? splits[2] : null,
    releasedCents: 0,
    sha256Proof: body.sha256Proof || null,
    paypalInvoiceId: null,
  };

  const insert = db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, client_name, client_email, amount_cents, currency,
      status, due_date, created_at, upfront_cents, midway_cents, final_cents,
      released_cents, sha256_proof, paypal_invoice_id
    ) VALUES (
      @id, @invoiceNumber, @clientName, @clientEmail, @amountCents, @currency,
      @status, @dueDate, @createdAt, @upfrontCents, @midwayCents, @finalCents,
      @releasedCents, @sha256Proof, @paypalInvoiceId
    )
  `);

  insert.run(invoiceRecord);

  // Log audit trail
  db.prepare(`
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    new Date().toISOString(),
    'CREATE_INVOICE',
    'INVOICE',
    newId,
    JSON.stringify({ amountCents, splits })
  );

  // Fetch freshly committed row from SQLite
  const createdRow = db.prepare('SELECT * FROM invoices WHERE id = ?').get(newId);

  return c.json({
    success: true,
    data: mapRowToInvoice(createdRow),
  }, 201);
});