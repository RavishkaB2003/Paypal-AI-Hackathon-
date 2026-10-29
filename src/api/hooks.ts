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
};

// 1. Overview Hook
export function useOverview() {
  return useQuery({
    queryKey: QUERY_KEYS.OVERVIEW,
    queryFn: getOverview,
    initialData: SEED_OVERVIEW_DATA,
    staleTime: 1000 * 30, // 30 seconds
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
      // Refresh both invoices and overview balance cards
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
      // Refresh milestones, active milestone cards, and overview totals
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
    staleTime: 1000 * 60, // 1 minute
  });
}