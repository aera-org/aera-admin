import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { CharacterType } from '@/common/types';

import {
  deleteLora,
  getLoras,
  type LorasListParams,
  updateLora,
} from './lorasApi';

const loraKeys = {
  list: (params: LorasListParams) => ['loras', params] as const,
};

export function useLoras(params: LorasListParams) {
  return useQuery({
    queryKey: loraKeys.list(params),
    queryFn: () => getLoras(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateLora() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      type,
      strength,
      triggerWord,
    }: {
      id: string;
      type?: CharacterType;
      strength?: number;
      triggerWord?: string;
    }) => updateLora(id, { type, strength, triggerWord }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loras'] });
      notifySuccess('LoRA updated.', 'LoRA updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the LoRA.');
    },
  });
}

export function useDeleteLora() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLora(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loras'] });
      notifySuccess('LoRA deleted.', 'LoRA deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the LoRA.');
    },
  });
}
