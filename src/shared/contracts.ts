import { z } from "zod";

// Navigation & AI Canvas Directives
export const TabTypeSchema = z.enum([
  "OVERVIEW",
  "INVOICES",
  "SMART_SCAN",
  "MILESTONES",
  "PROTECTION",
  "SETTINGS",
]);

export type TabType = z.infer<typeof TabTypeSchema>;

// Instructions for the Studio Canvas
export const StudioCanvasDirectiveSchema = z.object({
  activeTab: TabTypeSchema,
  invoiceIdFilter: z.string().optional(),
  widgetHighlight: z.string().optional(),
  actionPayload: z.record(z.string(), z.unknown()).optional(),
  reasoning: z.string().optional(),
});

export type StudioCanvasDirective = z.infer<typeof StudioCanvasDirectiveSchema>;

// Invoice & Escrow Schemas
export const InvoiceStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "PAID",
  "DISPUTED",
  "OVERDUE",
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const EscrowSplitSchema = z.object({
  upfrontCents: z.number().int().nonnegative(),
  midwayCents: z.number().int().nonnegative(),
  finalCents: z.number().int().nonnegative(),
  releasedCents: z.number().int().nonnegative(),
});
export type EscrowSplit = z.infer<typeof EscrowSplitSchema>;

export const InvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string().email(),
  amountCents: z.number().int().positive(),
  currency: z.string().default("USD"),
  status: InvoiceStatusSchema,
  dueDate: z.string(),
  createdAt: z.string(),
  escrowSplit: EscrowSplitSchema.optional(),
  sha256Proof: z.string().optional(),
  paypalInvoiceId: z.string().optional(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

// Milestone Escrow Schemas
export const TrancheStatusSchema = z.enum(["LOCKED", "PENDING_APPROVAL", "RELEASED"]);
export type TrancheStatus = z.infer<typeof TrancheStatusSchema>;

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

export const MilestoneEscrowSchema = z.object({
  id: z.string(),
  title: z.string(),
  totalCents: z.number().int().positive(),
  currency: z.string().default("USD"),
  clientName: z.string(),
  clientEmail: z.string().email(),
  status: z.enum(["ACTIVE", "COMPLETED", "DISPUTED"]),
  tranches: z.array(TrancheSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MilestoneEscrow = z.infer<typeof MilestoneEscrowSchema>;

// Multimodal Smart Scan Schemas
export const DocumentTypeSchema = z.enum([
  "INVOICE",
  "RECEIPT",
  "WAYBILL",
  "PROOF_OF_DELIVERY",
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const DisputeShieldStatusSchema = z.enum([
  "VERIFIED",
  "FLAGGED",
  "MANUAL_REVIEW",
]);
export type DisputeShieldStatus = z.infer<typeof DisputeShieldStatusSchema>;

export const ScanItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});
export type ScanItem = z.infer<typeof ScanItemSchema>;

export const SmartScanResultSchema = z.object({
  id: z.string(),
  documentType: DocumentTypeSchema,
  vendorName: z.string(),
  invoiceNumber: z.string(),
  date: z.string(),
  totalCents: z.number().int().nonnegative(),
  currency: z.string().default("USD"),
  items: z.array(ScanItemSchema),
  sha256Hash: z.string(),
  confidence: z.number().min(0).max(1),
  disputeShieldStatus: DisputeShieldStatusSchema,
  evidenceNotes: z.string().optional(),
  createdAt: z.string(),
});
export type SmartScanResult = z.infer<typeof SmartScanResultSchema>;

// PayPal Dispute & Protection Schemas
export const ProtectionCaseStatusSchema = z.enum([
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED_MERCHANT",
  "RESOLVED_BUYER",
]);
export type ProtectionCaseStatus = z.infer<typeof ProtectionCaseStatusSchema>;

export const ProtectionCaseSchema = z.object({
  id: z.string(),
  disputeId: z.string(),
  paypalDisputeId: z.string().optional(),
  transactionId: z.string(),
  buyerEmail: z.string().email(),
  amountCents: z.number().int().positive(),
  currency: z.string().default("USD"),
  reason: z.string(),
  status: ProtectionCaseStatusSchema,
  evidenceHashes: z.array(z.string()),
  createdAt: z.string(),
  resolvedAt: z.string().optional(),
});
export type ProtectionCase = z.infer<typeof ProtectionCaseSchema>;

// Deterministic Integer Math Utilities
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
  const finalRemainder = totalCents - allocated;
  result.push(finalRemainder);
  return result;
}

export function toPayPalMoney(cents: number, currency = "USD"): { currency_code: string; value: string } {
  if (!Number.isInteger(cents)) {
    throw new Error(`cents must be an integer. Received: ${cents}`);
  }
  const dollars = (cents / 100).toFixed(2);
  return {
    currency_code: currency.toUpperCase(),
    value: dollars,
  };
}

export function fromPayPalMoney(value: string | number): number {
  const numeric = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(numeric)) {
    throw new Error(`Invalid monetary value: ${value}`);
  }
  return Math.round(numeric * 100);
}

export function formatCurrency(cents: number, currency = "USD"): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

// Delivery & Tracking Proof Records
export const DeliveryRecordSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  client: z.string(),
  documentTitle: z.string(),
  carrierOrMethod: z.string(),
  referenceCode: z.string(),
  syncedToPayPal: z.boolean(),
});
export type DeliveryRecord = z.infer<typeof DeliveryRecordSchema>;

// Aggregated Overview Dashboard Schema
export const CashflowPointSchema = z.object({
  month: z.string(),
  earning: z.number().nonnegative(),
  spending: z.number().nonnegative(),
});
export type CashflowPoint = z.infer<typeof CashflowPointSchema>;

export const ExpenseCategorySchema = z.object({
  category: z.string(),
  amount: z.number().nonnegative(),
  color: z.string(),
});
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

export const OverviewCardInfoSchema = z.object({
  id: z.string().optional(),
  bankName: z.string(),
  network: z.string(),
  holderName: z.string(),
  maskedNumber: z.string(),
  dailySpent: z.number().nonnegative(),
  dailyLimit: z.number().positive(),
  expiry: z.string(),
  isPrimary: z.boolean().optional(),
});
export type OverviewCardInfo = z.infer<typeof OverviewCardInfoSchema>;

export const RecentTransactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  date: z.string(),
  amountCents: z.number().int(),
  isIncome: z.boolean(),
  iconColor: z.string(),
});
export type RecentTransaction = z.infer<typeof RecentTransactionSchema>;

export const OverviewDataSchema = z.object({
  totalBalanceCents: z.number().int().nonnegative(),
  mainBalanceCents: z.number().int().nonnegative(),
  inMilestonesCents: z.number().int().nonnegative(),
  milestoneReleasedCents: z.number().int().nonnegative(),
  milestoneTotalCents: z.number().int().nonnegative(),
  coveredSalesCents: z.number().int().nonnegative().optional(),
  balanceTrendPercent: z.number(),
  cashflow: z.array(CashflowPointSchema),
  card: OverviewCardInfoSchema,
  cards: z.array(OverviewCardInfoSchema).optional(),
  expenses: z.array(ExpenseCategorySchema),
  recentTransactions: z.array(RecentTransactionSchema),
});
export type OverviewData = z.infer<typeof OverviewDataSchema>;

// Merchant Account Settings & Notifications Contracts
export const AccountSettingsSchema = z.object({
  businessName: z.string(),
  email: z.string().email(),
  initials: z.string(),
  currency: z.string(),
  baseBalanceCents: z.number().int(),
  balanceTrendPercent: z.number(),
  autoDefenseEnabled: z.boolean(),
  emailAlertsEnabled: z.boolean(),
  defaultEscrowSplit: z.string(),
  visibleWidgets: z.array(z.string()),
  updatedAt: z.string(),
});
export type AccountSettings = z.infer<typeof AccountSettingsSchema>;

export const NotificationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  category: z.enum(["INVOICE", "MILESTONE", "PROTECTION", "SYSTEM"]),
  targetTab: TabTypeSchema,
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type NotificationItem = z.infer<typeof NotificationItemSchema>;