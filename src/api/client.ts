import {
  type Invoice,
  type MilestoneEscrow,
  type ProtectionCase,
  type DeliveryRecord,
  type OverviewData,
  type SmartScanResult,
  type StudioCanvasDirective,
  type AccountSettings,
  type NotificationItem,
} from '../shared/contracts';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }

  return json.data as T;
}

// 1. Overview & Wallet API
export async function getOverview(params?: {
  cashflowTimeframe?: string;
  expenseTimeframe?: string;
}): Promise<OverviewData> {
  const search = new URLSearchParams();
  if (params?.cashflowTimeframe) search.set('cashflowTimeframe', params.cashflowTimeframe);
  if (params?.expenseTimeframe) search.set('expenseTimeframe', params.expenseTimeframe);
  const qs = search.toString();
  return fetchJson<OverviewData>(`/overview${qs ? `?${qs}` : ''}`);
}

export async function depositFunds(payload: {
  amountCents: number;
  source?: string;
}): Promise<OverviewData> {
  return fetchJson<OverviewData>('/overview/deposit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function transferFunds(payload: {
  amountCents: number;
  destination?: string;
}): Promise<OverviewData> {
  return fetchJson<OverviewData>('/overview/transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function addPaymentCard(payload: {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
}): Promise<OverviewData> {
  return fetchJson<OverviewData>('/overview/cards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 2. Invoices API
export async function getInvoices(): Promise<Invoice[]> {
  return fetchJson<Invoice[]>('/invoices');
}

export async function createInvoice(payload: {
  clientName: string;
  clientEmail: string;
  dueDate?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceCents: number;
  }>;
}): Promise<Invoice> {
  return fetchJson<Invoice>('/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 3. Milestones API
export async function getMilestones(): Promise<MilestoneEscrow[]> {
  return fetchJson<MilestoneEscrow[]>('/milestones');
}

export async function createMilestone(payload: {
  title: string;
  clientName: string;
  clientEmail: string;
  totalCents: number;
  currency?: string;
  stepNames?: [string, string, string];
}): Promise<MilestoneEscrow> {
  return fetchJson<MilestoneEscrow>('/milestones', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function releaseMilestoneStep(projectId: string): Promise<MilestoneEscrow> {
  return fetchJson<MilestoneEscrow>(`/milestones/${projectId}/release-step`, {
    method: 'POST',
  });
}

// 4. Disputes & Protection API
export async function getDisputes(): Promise<ProtectionCase[]> {
  return fetchJson<ProtectionCase[]>('/protection/disputes');
}

export async function getDeliveryRecords(): Promise<DeliveryRecord[]> {
  return fetchJson<DeliveryRecord[]>('/protection/delivery');
}

export async function submitDisputeEvidence(
  disputeId: string,
  payload: {
    evidenceHash?: string;
    carrierOrMethod?: string;
    referenceCode?: string;
    documentTitle?: string;
    client?: string;
    invoiceId?: string;
  }
): Promise<ProtectionCase> {
  return fetchJson<ProtectionCase>(`/protection/disputes/${disputeId}/evidence`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 5. PayPal Sandbox API
export async function getPayPalStatus(): Promise<{
  configured: boolean;
  liveConnected: boolean;
  environment: string;
  message: string;
}> {
  return fetchJson<{
    configured: boolean;
    liveConnected: boolean;
    environment: string;
    message: string;
  }>('/paypal/status');
}

export async function createPayPalOrder(params: {
  amountCents: number;
  currency?: string;
  invoiceNumber?: string;
  description?: string;
}): Promise<{ orderId: string; status: string; debugId: string | null }> {
  return fetchJson<{ orderId: string; status: string; debugId: string | null }>('/paypal/create-order', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function capturePayPalOrder(orderId: string): Promise<{
  captureId: string;
  status: string;
  debugId: string | null;
}> {
  return fetchJson<{ captureId: string; status: string; debugId: string | null }>('/paypal/capture-order', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
}

// 6. Multimodal Vision Document Scan API
export async function scanDocument(params: {
  imageBase64?: string;
  mimeType?: string;
  sampleType?: 'delivery' | 'receipt' | 'invoice';
}): Promise<SmartScanResult> {
  return fetchJson<SmartScanResult>('/scan', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// 7. Autonomous Agent Playbooks API
export interface PlaybookExecutionData {
  timestamp: string;
  disputesDefendedCount: number;
  deliveriesSyncedCount: number;
  actionsExecuted: string[];
  canvasDirective: StudioCanvasDirective;
}

export async function runAutonomousPlaybooks(): Promise<PlaybookExecutionData> {
  return fetchJson<PlaybookExecutionData>('/agents/run-playbook', {
    method: 'POST',
  });
}

export async function getAgentStatus(): Promise<{
  status: string;
  playbooks: Array<{ id: string; status: string; name: string }>;
  recentAutonomousActions: any[];
}> {
  return fetchJson('/agents/status');
}

// 8. Account Settings & Notifications API
export async function getAccountSettings(): Promise<AccountSettings> {
  return fetchJson<AccountSettings>('/settings');
}

export async function updateAccountSettings(
  payload: Partial<AccountSettings>
): Promise<AccountSettings> {
  return fetchJson<AccountSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return fetchJson<NotificationItem[]>('/settings/notifications');
}

export async function markNotificationsRead(): Promise<NotificationItem[]> {
  return fetchJson<NotificationItem[]>('/settings/notifications/read-all', {
    method: 'POST',
  });
}

export async function resetWorkspaceDemo(): Promise<void> {
  const res = await fetch(`${API_BASE}/settings/reset-demo`, { method: 'POST' });
  if (!res.ok) {
    throw new Error('Failed to reset demo data');
  }
}