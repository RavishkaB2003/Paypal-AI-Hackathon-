import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOverview,
  depositFunds,
  transferFunds,
  addPaymentCard,
  getInvoices,
  createInvoice,
  getMilestones,
  createMilestone,
  releaseMilestoneStep,
  getDisputes,
  getDeliveryRecords,
  submitDisputeEvidence,
  getPayPalStatus,
  scanDocument,
  runAutonomousPlaybooks,
  getAgentStatus,
  getAccountSettings,
  updateAccountSettings,
  getNotifications,
  markNotificationsRead,
  resetWorkspaceDemo,
} from './client';
import { type AccountSettings } from '../shared/contracts';

// Query Keys
export const QUERY_KEYS = {
  OVERVIEW: ['overview'] as const,
  INVOICES: ['invoices'] as const,
  MILESTONES: ['milestones'] as const,
  DISPUTES: ['disputes'] as const,
  DELIVERY: ['delivery'] as const,
  PAYPAL_STATUS: ['paypal-status'] as const,
  AGENTS: ['agents-status'] as const,
  SETTINGS: ['account-settings'] as const,
  NOTIFICATIONS: ['notifications'] as const,
};

// 1. Overview & Wallet Hooks (100% SQLite Single Source of Truth)
export function useOverview(params?: {
  cashflowTimeframe?: string;
  expenseTimeframe?: string;
}) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.OVERVIEW,
      params?.cashflowTimeframe || 'THIS_YEAR',
      params?.expenseTimeframe || 'MONTHLY',
    ],
    queryFn: () => getOverview(params),
  });
}

export function useDepositFunds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: depositFunds,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });
}

export function useTransferFunds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transferFunds,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });
}

export function useAddPaymentCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addPaymentCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });
}

// 2. Invoices Hooks
export function useInvoices() {
  return useQuery({
    queryKey: QUERY_KEYS.INVOICES,
    queryFn: getInvoices,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });
}

// 3. Milestones Hooks
export function useMilestones() {
  return useQuery({
    queryKey: QUERY_KEYS.MILESTONES,
    queryFn: getMilestones,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMilestone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MILESTONES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });
}

export function useReleaseMilestoneStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => releaseMilestoneStep(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MILESTONES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });
}

// 4. Disputes & Protection Hooks
export function useDisputes() {
  return useQuery({
    queryKey: QUERY_KEYS.DISPUTES,
    queryFn: getDisputes,
  });
}

export function useDeliveryRecords() {
  return useQuery({
    queryKey: QUERY_KEYS.DELIVERY,
    queryFn: getDeliveryRecords,
  });
}

export function useSubmitDisputeEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      disputeId,
      ...payload
    }: {
      disputeId: string;
      evidenceHash?: string;
      carrierOrMethod?: string;
      referenceCode?: string;
      documentTitle?: string;
      client?: string;
      invoiceId?: string;
    }) => submitDisputeEvidence(disputeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISPUTES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DELIVERY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });
}

// 5. PayPal Sandbox Status Hook
export function usePayPalStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.PAYPAL_STATUS,
    queryFn: getPayPalStatus,
    staleTime: 1000 * 60,
  });
}

// 6. Multimodal Vision Scan Hook
export function useScanDocument() {
  return useMutation({
    mutationFn: (params: {
      imageBase64?: string;
      mimeType?: string;
      sampleType?: 'delivery' | 'receipt' | 'invoice';
    }) => scanDocument(params),
  });
}

// 7. Autonomous Agent Playbook Hooks
export function useRunPlaybooks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runAutonomousPlaybooks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISPUTES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DELIVERY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MILESTONES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AGENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });
}

export function useAgentStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.AGENTS,
    queryFn: getAgentStatus,
  });
}

// 8. Account Settings & Notifications Hooks
export function useAccountSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.SETTINGS,
    queryFn: getAccountSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<AccountSettings>) => updateAccountSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS,
    queryFn: getNotifications,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
    },
  });
}

export function useResetWorkspaceDemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetWorkspaceDemo,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}