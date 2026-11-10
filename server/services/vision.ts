import crypto from 'node:crypto';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import 'dotenv/config';

// Extraction schema strictly matching shared contracts
const ExtractionSchema = z.object({
  documentType: z.enum(['INVOICE', 'RECEIPT', 'WAYBILL', 'PROOF_OF_DELIVERY']),
  vendorName: z.string(),
  invoiceNumber: z.string(),
  date: z.string(),
  totalCents: z.number().int().nonnegative(),
  currency: z.string(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitPriceCents: z.number().int().nonnegative(),
      totalCents: z.number().int().nonnegative(),
    })
  ),
  confidence: z.number().min(0).max(1),
  disputeShieldStatus: z.enum(['VERIFIED', 'FLAGGED', 'MANUAL_REVIEW']),
  evidenceNotes: z.string(),
});

export type ExtractedDocument = z.infer<typeof ExtractionSchema> & {
  id: string;
  sha256Hash: string;
  createdAt: string;
};

/**
 * Computes a SHA-256 cryptographic digest of a file buffer or base64 string
 */
export function computeSha256(data: Buffer | string): string {
  const hash = crypto.createHash('sha256');
  if (typeof data === 'string') {
    hash.update(data, 'utf-8');
  } else {
    hash.update(data);
  }
  return hash.digest('hex');
}

/**
 * Extracts structured financial details from a receipt/invoice image using Google Gemini
 * with high-speed inference, a 25s circuit-breaker timeout, and resilient model cascading.
 */
export async function extractDocumentWithVision(params: {
  imageBase64?: string;
  mimeType?: string;
  sampleType?: 'delivery' | 'receipt' | 'invoice';
}): Promise<ExtractedDocument> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const buildDeterministicSample = (notesSuffix = '') => {
    const isDelivery = params.sampleType === 'delivery';
    const samplePayload = isDelivery
      ? {
          documentType: 'PROOF_OF_DELIVERY' as const,
          vendorName: 'DHL Express Global Logistics',
          invoiceNumber: 'WAYBILL-8849-20194',
          date: today,
          totalCents: 425000,
          currency: 'USD',
          items: [
            {
              description: 'Next-Gen Mobile Checkout SDK (Hardware Tokens & Handover)',
              quantity: 1,
              unitPriceCents: 425000,
              totalCents: 425000,
            },
          ],
          confidence: 0.98,
          disputeShieldStatus: 'VERIFIED' as const,
          evidenceNotes: `Signed recipient waybill with verified GPS coordinates and delivery signature.${notesSuffix}`,
        }
      : {
          documentType: 'RECEIPT' as const,
          vendorName: 'Acme Cloud & Logistics Hardware',
          invoiceNumber: 'INV-2026-904',
          date: today,
          totalCents: 185000,
          currency: 'USD',
          items: [
            {
              description: 'High-Throughput Payment Terminal Engine',
              quantity: 1,
              unitPriceCents: 140000,
              totalCents: 140000,
            },
            {
              description: 'Secure Enclave Cryptographic Co-Processor',
              quantity: 1,
              unitPriceCents: 45000,
              totalCents: 45000,
            },
          ],
          confidence: 0.95,
          disputeShieldStatus: 'VERIFIED' as const,
          evidenceNotes: `Merchant receipt matched with registered bank clearing statement.${notesSuffix}`,
        };

    return samplePayload;
  };

  // If explicitly requesting a synthetic sample (e.g. from backend integration tests)
  if (params.sampleType || !params.imageBase64) {
    const samplePayload = buildDeterministicSample();
    const mockHash = computeSha256(JSON.stringify(samplePayload));
    return {
      id: `scan-${Date.now()}`,
      ...samplePayload,
      sha256Hash: mockHash,
      createdAt: today,
    };
  }

  // If apiKey is missing or placeholder for user uploads, report error
  if (!apiKey || apiKey.includes('your_')) {
    throw new Error('Gemini API key is not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY in .env.');
  }

  // Parse Base64 buffer and compute cryptographic SHA-256
  const rawHash = computeSha256(params.imageBase64);
  let mimeType = params.mimeType || 'image/jpeg';
  let base64Data = params.imageBase64;
  if (params.imageBase64.startsWith('data:')) {
    const match = params.imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }
  }
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Prioritize fast, high-accuracy models with graceful cascade
  const envModel = process.env.DEFAULT_VISION_MODEL?.trim();
  const candidateModels = [
    envModel && envModel !== 'gemini-3.8-flash' && !envModel.includes('2.0') && !envModel.includes('2.5')
      ? envModel
      : 'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError: Error | null = null;
  for (const modelId of candidateModels) {
    try {
      const model = google(modelId);

      const { object } = await generateObject({
        model,
        schema: ExtractionSchema,
        abortSignal: AbortSignal.timeout(25000), // 25s circuit-breaker timeout
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are PayPulse Vision, an enterprise financial document extractor for PayPal merchants.
Analyze this invoice, receipt, or proof of delivery image. Extract:
1. Document Type (INVOICE, RECEIPT, WAYBILL, or PROOF_OF_DELIVERY)
2. Vendor or Client Name
3. Invoice/Reference Number
4. Date (YYYY-MM-DD)
5. Total Amount in Cents (integer: e.g. $14.50 = 1450)
6. Currency (default "USD")
7. Line items (description, quantity, unit price in cents, total in cents)
8. Confidence score (0.00 to 1.00)
9. Dispute Shield Status (VERIFIED, FLAGGED, or MANUAL_REVIEW)
10. Evidence notes describing signatures, tracking IDs, or timestamps`,
              },
              {
                type: 'image',
                image: imageBuffer,
              },
            ],
          },
        ],
      });

      return {
        id: `scan-${Date.now()}`,
        ...object,
        sha256Hash: rawHash,
        createdAt: today,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[PayPulse Vision] Model '${modelId}' extraction attempt failed (${lastError.message.slice(0, 100)}). Trying fallback...`);
    }
  }

  // Real upload extraction failed across all models - throw transparent error
  throw new Error(`AI Vision extraction could not process document: ${lastError?.message || 'Inference failed'}`);
}