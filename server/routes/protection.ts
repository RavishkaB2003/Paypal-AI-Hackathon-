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
  const rows = db.prepare('SELECT * FROM delivery_records ORDER BY rowid DESC').all();
  const records = rows.map(mapRowToDelivery);
  return c.json({ success: true, data: records });
});

// POST /api/protection/disputes/:id/evidence - Submit delivery proof & resolve claim
protectionRoute.post('/disputes/:id/evidence', async (c) => {
  const disputeId = c.req.param('id');
  const body = await c.req.json();
  const db = getDb();

  const caseRow = db.prepare('SELECT * FROM dispute_cases WHERE id = ? OR dispute_id = ?').get(disputeId, disputeId) as any;
  if (!caseRow) {
    return c.json({ success: false, error: 'Dispute case not found' }, 404);
  }

  const carrierOrMethod = (body.carrierOrMethod || '').trim();
  const referenceCode = (body.referenceCode || body.evidenceHash || `PROOF-${Date.now()}`).trim();
  const documentTitle = (body.documentTitle || 'Verified Delivery & Fulfilment Receipt').trim();
  const clientName = (body.client || caseRow.buyer_email.split('@')[1] || 'Verified Buyer').trim();
  const invoiceId = (body.invoiceId || caseRow.transaction_id || 'INV-2026-PRO').trim();

  let hashes: string[] = [];
  try {
    hashes = JSON.parse(caseRow.evidence_hashes || '[]');
  } catch {
    hashes = [];
  }
  if (!hashes.includes(referenceCode)) {
    hashes.push(referenceCode);
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const submitProofTx = db.transaction(() => {
    // 1. Update dispute status to RESOLVED_MERCHANT
    db.prepare(`
      UPDATE dispute_cases
      SET evidence_hashes = ?, status = 'RESOLVED_MERCHANT', resolved_at = ?
      WHERE id = ?
    `).run(JSON.stringify(hashes), today, caseRow.id);

    // 2. If carrier or tracking details were supplied, register in delivery_records
    if (carrierOrMethod || body.referenceCode) {
      const existingRec = db.prepare('SELECT id FROM delivery_records WHERE reference_code = ?').get(referenceCode) as any;
      if (!existingRec) {
        const count = (db.prepare('SELECT COUNT(*) as count FROM delivery_records').get() as { count: number }).count;
        db.prepare(`
          INSERT INTO delivery_records (
            id, invoice_id, client, document_title, carrier_or_method, reference_code, synced_to_paypal
          ) VALUES (?, ?, ?, ?, ?, ?, 1)
        `).run(
          `REC-0${count + 1}`,
          invoiceId,
          clientName,
          documentTitle,
          carrierOrMethod || 'Carrier Proof',
          referenceCode
        );
      } else {
        db.prepare('UPDATE delivery_records SET synced_to_paypal = 1 WHERE id = ?').run(existingRec.id);
      }
    }

    // 3. Create notification
    db.prepare(`
      INSERT INTO notifications (id, title, message, category, target_tab, is_read, created_at)
      VALUES (?, ?, ?, 'PROTECTION', 'PROTECTION', 0, ?)
    `).run(
      `notif-${Date.now()}`,
      `Claim ${caseRow.dispute_id} Resolved`,
      `Proof '${referenceCode}' accepted. $${(caseRow.amount_cents / 100).toFixed(2)} protected in your favor.`,
      now.toISOString()
    );

    // 4. Record audit trail
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, 'SUBMIT_DISPUTE_EVIDENCE', 'DISPUTE', ?, ?)
    `).run(
      now.toISOString(),
      caseRow.id,
      JSON.stringify({ evidenceHash: referenceCode, carrierOrMethod, documentTitle })
    );
  });

  submitProofTx();

  const updatedRow = db.prepare('SELECT * FROM dispute_cases WHERE id = ?').get(caseRow.id);
  return c.json({
    success: true,
    message: 'Delivery proof registered and claim resolved in your favor.',
    data: mapRowToDispute(updatedRow),
  });
});