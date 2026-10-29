import {
  type Invoice,
  type MilestoneEscrow,
  type ProtectionCase,
  type DeliveryRecord,
  type OverviewData,
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

// 1. Overview API
export async function getOverview(): Promise<OverviewData> {
  return fetchJson<OverviewData>('/overview');
}

// 2. Invoices API
export async function getInvoices(): Promise<Invoice[]> {
  return fetchJson<Invoice[]>('/invoices');
}

export async function createInvoice(payload: {
  invoiceNumber?: string;
  clientName: string;
  clientEmail: string;
  amountCents: number;
  currency?: string;
  dueDate?: string;
  enableThreeStepSplit?: boolean;
  sha256Proof?: string;
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
  evidenceHash: string
): Promise<ProtectionCase> {
  return fetchJson<ProtectionCase>(`/protection/disputes/${disputeId}/evidence`, {
    method: 'POST',
    body: JSON.stringify({ evidenceHash }),
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