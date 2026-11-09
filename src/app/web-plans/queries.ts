import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { CreateWebPlanDto, UpdateWebPlanDto } from '@/common/types';

import {
  createWebPlan,
  deleteWebPlan,
  getWebPlans,
  updateWebPlan,
  type WebPlansListParams,
} from './webPlansApi';

const webPlanKeys = {
  all: ['web-plans'] as const,
  list: (params: WebPlansListParams) => ['web-plans', params] as const,
};

export function useWebPlans(params: WebPlansListParams) {
  return useQuery({
    queryKey: webPlanKeys.list(params),
    queryFn: () => getWebPlans(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateWebPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWebPlanDto) => createWebPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webPlanKeys.all });
      notifySuccess('Web plan created.', 'Web plan created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the web plan.');
    },
  });
}

export function useUpdateWebPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWebPlanDto }) =>
      updateWebPlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webPlanKeys.all });
      notifySuccess('Web plan updated.', 'Web plan updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the web plan.');
    },
  });
}

export function useDeleteWebPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWebPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webPlanKeys.all });
      notifySuccess('Web plan deleted.', 'Web plan deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the web plan.');
    },
  });
}
