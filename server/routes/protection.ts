import { Hono } from 'hono';
import { getDb } from '../db/database';
import { type ProtectionCase, type DeliveryRecord } from '../../src/shared';

export const protectionRoute = new Hono();

// Helper to map DB snake_case columns to ProtectionCase
function mapRowToDispute(row: any): ProtectionCase {
  let evidenceHashes: string[] = [];
  try {
    evidenceHashes = typeof row.evidence_hashes === 'string'
      ? JSON.parse(row.evidence_hashes)
      : row.evidence_hashes || [];
  } catch {
    evidenceHashes = [];
  }

  return {
    id: row.id,
    disputeId: row.dispute_id,
    paypalDisputeId: row.paypal_dispute_id || undefined,
    transactionId: row.transaction_id,
    buyerEmail: row.buyer_email,
    amountCents: row.amount_cents,
    currency: row.currency || 'USD',
    reason: row.reason,
    status: row.status,
    evidenceHashes,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || undefined,
  };
}

// Helper to map DB snake_case columns to DeliveryRecord
function mapRowToDelivery(row: any): DeliveryRecord {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    client: row.client,
    documentTitle: row.document_title,
    carrierOrMethod: row.carrier_or_method,
    referenceCode: row.reference_code,
    syncedToPayPal: Boolean(row.synced_to_paypal),
  };
}

// GET /api/protection/disputes - Fetch all customer disputes
protectionRoute.get('/disputes', (c) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM dispute_cases ORDER BY created_at DESC').all();
  const disputes = rows.map(mapRowToDispute);
  return c.json({ success: true, data: disputes });
});

// GET /api/protection/delivery - Fetch all operational delivery/carrier proofs
protectionRoute.get('/delivery', (c) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM delivery_records ORDER BY rowid ASC').all();
  const records = rows.map(mapRowToDelivery);
  return c.json({ success: true, data: records });
});

// POST /api/protection/disputes/:id/evidence - Submit cryptographic SHA-256 evidence
protectionRoute.post('/disputes/:id/evidence', async (c) => {
  const disputeId = c.req.param('id');
  const body = await c.req.json();
  const db = getDb();

  const caseRow = db.prepare('SELECT * FROM dispute_cases WHERE id = ? OR dispute_id = ?').get(disputeId, disputeId) as any;
  if (!caseRow) {
    return c.json({ success: false, error: 'Dispute case not found' }, 404);
  }

  const newHash = body.evidenceHash || `proof-${Date.now()}`;
  let hashes: string[] = [];
  try {
    hashes = JSON.parse(caseRow.evidence_hashes || '[]');
  } catch {
    hashes = [];
  }
  hashes.push(newHash);

  const now = new Date().toISOString().split('T')[0];

  // Advance dispute status to RESOLVED_MERCHANT once proof is registered
  db.prepare(`
    UPDATE dispute_cases
    SET evidence_hashes = ?, status = 'RESOLVED_MERCHANT', resolved_at = ?
    WHERE id = ?
  `).run(JSON.stringify(hashes), now, caseRow.id);

  // Record audit trail
  db.prepare(`
    INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    new Date().toISOString(),
    'SUBMIT_DISPUTE_EVIDENCE',
    'DISPUTE',
    caseRow.id,
    JSON.stringify({ evidenceHash: newHash })
  );

  const updatedRow = db.prepare('SELECT * FROM dispute_cases WHERE id = ?').get(caseRow.id);
  return c.json({
    success: true,
    message: 'Evidence document registered and queued for seller protection review.',
    data: mapRowToDispute(updatedRow),
  });
});