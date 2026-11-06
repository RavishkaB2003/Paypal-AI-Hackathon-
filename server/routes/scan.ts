import { Hono } from 'hono';
import { extractDocumentWithVision } from '../services/vision';
import { getDb } from '../db/database';

export const scanRoute = new Hono();

// POST /api/scan - Extract document details from uploaded image or sample
scanRoute.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const result = await extractDocumentWithVision({
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
      sampleType: body.sampleType,
    });

    // Record audit log
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(),
      'AI_DOCUMENT_SCAN',
      'DOCUMENT',
      result.id,
      JSON.stringify({
        vendorName: result.vendorName,
        totalCents: result.totalCents,
        sha256Hash: result.sha256Hash,
        confidence: result.confidence,
      })
    );

    return c.json({ success: true, data: result });
  } catch (err: any) {
    console.error('[Scan Route Error]:', err);
    return c.json({ success: false, error: err.message || 'Vision extraction failed' }, 500);
  }
});