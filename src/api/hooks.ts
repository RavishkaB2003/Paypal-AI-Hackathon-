import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOverview,
  getInvoices,
  createInvoice,
  getMilestones,
  releaseMilestoneStep,
  getDisputes,
  getDeliveryRecords,
  submitDisputeEvidence,
  getPayPalStatus,
  scanDocument,
  runAutonomousPlaybooks,
  getAgentStatus,
} from './client';
import {
  SEED_OVERVIEW_DATA,
  SEED_INVOICES,
  SEED_PROJECTS,
  SEED_DISPUTE_CASES,
  SEED_DELIVERY_RECORDS,
} from '../shared/seeds';

// Query Keys
export const QUERY_KEYS = {
  OVERVIEW: ['overview'] as const,
  INVOICES: ['invoices'] as const,
  MILESTONES: ['milestones'] as const,
  DISPUTES: ['disputes'] as const,
  DELIVERY: ['delivery'] as const,
  PAYPAL_STATUS: ['paypal-status'] as const,
  AGENTS: ['agents-status'] as const,
};

// 1. Overview Hook
export function useOverview() {
  return useQuery({
    queryKey: QUERY_KEYS.OVERVIEW,
    queryFn: getOverview,
    initialData: SEED_OVERVIEW_DATA,
    staleTime: 1000 * 30,
  });
}

// 2. Invoices Hooks
export function useInvoices() {
  return useQuery({
    queryKey: QUERY_KEYS.INVOICES,
    queryFn: getInvoices,
    initialData: SEED_INVOICES,
    staleTime: 1000 * 30,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
    },
  });
}

// 3. Milestones Hooks
export function useMilestones() {
  return useQuery({
    queryKey: QUERY_KEYS.MILESTONES,
    queryFn: getMilestones,
    initialData: SEED_PROJECTS,
    staleTime: 1000 * 30,
  });
}

export function useReleaseMilestoneStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => releaseMilestoneStep(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MILESTONES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
    },
  });
}

// 4. Disputes & Protection Hooks
export function useDisputes() {
  return useQuery({
    queryKey: QUERY_KEYS.DISPUTES,
    queryFn: getDisputes,
    initialData: SEED_DISPUTE_CASES,
    staleTime: 1000 * 30,
  });
}

export function useDeliveryRecords() {
  return useQuery({
    queryKey: QUERY_KEYS.DELIVERY,
    queryFn: getDeliveryRecords,
    initialData: SEED_DELIVERY_RECORDS,
    staleTime: 1000 * 30,
  });
}

export function useSubmitDisputeEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ disputeId, evidenceHash }: { disputeId: string; evidenceHash: string }) =>
      submitDisputeEvidence(disputeId, evidenceHash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISPUTES });
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
      // Invalidate all affected ledger states
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISPUTES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DELIVERY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.OVERVIEW });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MILESTONES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVOICES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AGENTS });
    },
  });
}

export function useAgentStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.AGENTS,
    queryFn: getAgentStatus,
    staleTime: 1000 * 30,
  });
}