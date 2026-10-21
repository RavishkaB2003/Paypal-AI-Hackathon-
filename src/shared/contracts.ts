import {z} from "zod";

//Navigation & AI Canvas Directives
export const TabTypeSchema = z.enum([
    "OVERVIEW",
    "INVOICES",
    "SMART_SCAN",
    "MILESTONES",
    "PROTECTION"
])

export type TabType = z.infer<typeof TabTypeSchema>;


//Instructions for the Studio Canvas For Controlling
export const StudioCanvasDirectiveSchema = z.object({
  activeTab: TabTypeSchema,
  invoiceIdFilter: z.string().optional(),
  widgetHighlight: z.string().optional(),
  actionPayload: z.record(z.string(), z.unknown()).optional(),
  reasoning: z.string().optional(),
});

export type StudioCanvasDirective = z.infer<typeof StudioCanvasDirectiveSchema>;

//Invoice & Escrow Schemas
//Structure of an Invoice
export const InvoiceStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'PAID',
  'DISPUTED',
  'OVERDUE'
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

//How the escrow is split between the parties
export const EscrowSplitSchema = z.object({
  upfrontCents: z.number().int().nonnegative(),
  midwayCents: z.number().int().nonnegative(),
  finalCents: z.number().int().nonnegative(),
  releasedCents: z.number().int().nonnegative(),
});
export type EscrowSplit = z.infer<typeof EscrowSplitSchema>;

//Invoice Structure
export const InvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string().email(),
  amountCents: z.number().int().positive(),
  currency: z.string().default('USD'),
  status: InvoiceStatusSchema,
  dueDate: z.string(),
  createdAt: z.string(),
  escrowSplit: EscrowSplitSchema.optional(),
  sha256Proof: z.string().optional(),
  paypalInvoiceId: z.string().optional(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

//Milestone Escrow Schemas
export const TrancheStatusSchema = z.enum(['LOCKED', 'PENDING_APPROVAL', 'RELEASED']);
export type TrancheStatus = z.infer<typeof TrancheStatusSchema>;


//defines an individual payment stage.
export const TrancheSchema = z.object({
  id: z.string(),
  name: z.string(),
  percent: z.number().min(1).max(100),
  amountCents: z.number().int().positive(),
  status: TrancheStatusSchema,
  releasedAt: z.string().optional(),
  paypalCaptureId: z.string().optional(),
});
export type Tranche = z.infer<typeof TrancheSchema>;


//defines the entire milestone escrow agreement.
export const MilestoneEscrowSchema = z.object({
  id: z.string(),
  title: z.string(),
  totalCents: z.number().int().positive(),
  currency: z.string().default('USD'),
  clientName: z.string(),
  clientEmail: z.string().email(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'DISPUTED']),
  tranches: z.array(TrancheSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MilestoneEscrow = z.infer<typeof MilestoneEscrowSchema>;

//Multimodal Smart Scan Schemas

//restricts the document category to one of four types
export const DocumentTypeSchema = z.enum([
  'INVOICE',
  'RECEIPT',
  'WAYBILL',
  'PROOF_OF_DELIVERY'
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

//indicates the review status assigned to a scanned document or its evidence.
export const DisputeShieldStatusSchema = z.enum([
  'VERIFIED',
  'FLAGGED',
  'MANUAL_REVIEW'
]);
export type DisputeShieldStatus = z.infer<typeof DisputeShieldStatusSchema>;


//describes one line item on a scanned document
export const ScanItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});
export type ScanItem = z.infer<typeof ScanItemSchema>;

//overall result of scanning a document
export const SmartScanResultSchema = z.object({
  id: z.string(),
  documentType: DocumentTypeSchema,
  vendorName: z.string(),
  invoiceNumber: z.string(),
  date: z.string(),
  totalCents: z.number().int().nonnegative(),
  currency: z.string().default('USD'),
  items: z.array(ScanItemSchema),
  sha256Hash: z.string(),
  confidence: z.number().min(0).max(1),
  disputeShieldStatus: DisputeShieldStatusSchema,
  evidenceNotes: z.string().optional(),
  createdAt: z.string(),
});
export type SmartScanResult = z.infer<typeof SmartScanResultSchema>;

//Paypal Dispute & Protection Schemas
//defines how the application represents a payment dispute
export const ProtectionCaseStatusSchema = z.enum([
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED_MERCHANT',
  'RESOLVED_BUYER'
]);
export type ProtectionCaseStatus = z.infer<typeof ProtectionCaseStatusSchema>;



//defines the data required for a dispute case
export const ProtectionCaseSchema = z.object({
  id: z.string(),
  disputeId: z.string(),
  paypalDisputeId: z.string().optional(),
  transactionId: z.string(),
  buyerEmail: z.string().email(),
  amountCents: z.number().int().positive(),
  currency: z.string().default('USD'),
  reason: z.string(),
  status: ProtectionCaseStatusSchema,
  evidenceHashes: z.array(z.string()),
  createdAt: z.string(),
  resolvedAt: z.string().optional(),
});
export type ProtectionCase = z.infer<typeof ProtectionCaseSchema>;

//Deterministic Integer Math Utilities

/**
 * Splits an integer amount of cents across percentage ratios (e.g., [30, 40, 30]).
 * Guarantees zero floating point error and sums EXACTLY to totalCents.
 * Any remainder cents from integer rounding are attributed to the final tranche.
 */
export function splitAmountIntoCents(totalCents: number, ratios: number[]): number[] {
  if (totalCents < 0 || !Number.isInteger(totalCents)) {
    throw new Error(`totalCents must be a non-negative integer. Received: ${totalCents}`);
  }
  if (ratios.length === 0) return [];
  const ratioSum = ratios.reduce((acc, r) => acc + r, 0);
  if (ratioSum <= 0) {
    throw new Error(`Ratios sum must be positive. Received sum: ${ratioSum}`);
  }
  let allocated = 0;
  const result: number[] = [];
  for (let i = 0; i < ratios.length - 1; i++) {
    const portion = Math.floor((totalCents * ratios[i]) / ratioSum);
    result.push(portion);
    allocated += portion;
  }
  // The last tranche gets the exact remainder to ensure zero penny drift
  const finalRemainder = totalCents - allocated;
  result.push(finalRemainder);
  return result;
}

/**
 * Converts integer cents (e.g. 10050) into PayPal REST API money object (e.g. { currency_code: 'USD', value: '100.50' }).
 */
export function toPayPalMoney(cents: number, currency = 'USD'): { currency_code: string; value: string } {
  if (!Number.isInteger(cents)) {
    throw new Error(`cents must be an integer. Received: ${cents}`);
  }
  const dollars = (cents / 100).toFixed(2);
  return {
    currency_code: currency.toUpperCase(),
    value: dollars,
  };
}

/**
 * Parses PayPal monetary value string or number into exact integer cents.
 * Avoids IEEE-754 floating point imprecision.
 */
export function fromPayPalMoney(value: string | number): number {
  const numeric = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numeric)) {
    throw new Error(`Invalid monetary value: ${value}`);
  }
  return Math.round(numeric * 100);
}

/**
 * Formats integer cents into user-friendly localized currency string (e.g., "$1,250.00").
 */
export function formatCurrency(cents: number, currency = 'USD'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}