import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type {
  CreateRvbPlanDto,
  UpdateRvbPlanDto,
  UpdateRvbUserDto,
} from '@/common/types';

import {
  createRvbPlan,
  getRvbGeneration,
  getRvbGenerations,
  getRvbPayments,
  getRvbPlans,
  getRvbUserDetails,
  getRvbUsers,
  type RvbGenerationsListParams,
  type RvbPaymentsListParams,
  type RvbPlansListParams,
  type RvbUsersListParams,
  updateRvbPlan,
  updateRvbUser,
} from './rvbApi';

const rvbKeys = {
  plans: ['rvb-plans'] as const,
  plansList: (params: RvbPlansListParams) => ['rvb-plans', params] as const,
  users: ['rvb-users'] as const,
  usersList: (params: RvbUsersListParams) => ['rvb-users', params] as const,
  user: (id: string) => ['rvb-users', 'detail', id] as const,
  paymentsList: (params: RvbPaymentsListParams) =>
    ['rvb-payments', params] as const,
  generationsList: (params: RvbGenerationsListParams) =>
    ['rvb-generations', params] as const,
  generation: (id: string) => ['rvb-generations', 'detail', id] as const,
};

export function useRvbPlans(params: RvbPlansListParams) {
  return useQuery({
    queryKey: rvbKeys.plansList(params),
    queryFn: () => getRvbPlans(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateRvbPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRvbPlanDto) => createRvbPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rvbKeys.plans });
      notifySuccess('RVB plan created.', 'RVB plan created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the RVB plan.');
    },
  });
}

export function useUpdateRvbPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRvbPlanDto }) =>
      updateRvbPlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rvbKeys.plans });
      notifySuccess('RVB plan updated.', 'RVB plan updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the RVB plan.');
    },
  });
}

export function useRvbUsers(params: RvbUsersListParams) {
  return useQuery({
    queryKey: rvbKeys.usersList(params),
    queryFn: () => getRvbUsers(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useRvbUserDetails(id: string | null) {
  return useQuery({
    queryKey: rvbKeys.user(id ?? ''),
    queryFn: () => getRvbUserDetails(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useUpdateRvbUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRvbUserDto }) =>
      updateRvbUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rvbKeys.users });
      notifySuccess('RVB user updated.', 'RVB user updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the RVB user.');
    },
  });
}

export function useRvbPayments(params: RvbPaymentsListParams) {
  return useQuery({
    queryKey: rvbKeys.paymentsList(params),
    queryFn: () => getRvbPayments(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useRvbGenerations(params: RvbGenerationsListParams) {
  return useQuery({
    queryKey: rvbKeys.generationsList(params),
    queryFn: () => getRvbGenerations(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useRvbGeneration(id: string | null) {
  return useQuery({
    queryKey: rvbKeys.generation(id ?? ''),
    queryFn: () => getRvbGeneration(id ?? ''),
    enabled: Boolean(id),
  });
}
