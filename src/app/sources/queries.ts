import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateSourceDto, ISource } from '@/common/types';
import { notifyError, notifySuccess } from '@/app/toast';

import {
  createSource,
  getSource,
  getSources,
  removeSource,
  refreshSource,
  updateSourceStatus,
} from './sourcesApi';

export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: getSources,
  });
}

export function useSource(id: string | null) {
  return useQuery({
    queryKey: ['source', id],
    queryFn: () => getSource(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSource,
    onSuccess: (data) => {
      if (!data?.id) {
        queryClient.invalidateQueries({ queryKey: ['sources'] });
        return;
      }
      queryClient.setQueryData<ISource[]>(['sources'], (prev) =>
        prev ? [data, ...prev] : [data],
      );
    },
    onError: (error) => {
      notifyError(error, 'Unable to add source.');
    },
  });
}

export function useUpdateSourceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => updateSourceStatus(id, { isActive }),
    onSuccess: (data, variables) => {
      if (!data?.id) {
        queryClient.invalidateQueries({ queryKey: ['sources'] });
        queryClient.invalidateQueries({ queryKey: ['source', variables.id] });
        return;
      }
      queryClient.setQueryData<ISource[]>(['sources'], (prev) =>
        prev
          ? prev.map((source) => (source.id === data.id ? data : source))
          : prev,
      );
      queryClient.setQueryData<ISource>(['source', data.id], data);
    },
    onError: (error) => {
      notifyError(error, 'Unable to update source.');
    },
  });
}

export function useRefreshSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => refreshSource(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['source', id] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      notifySuccess(
        'Echo started checking this source. Results will be picked up soon.',
        'Echo started checking this source.',
      );
    },
    onError: (error) => {
      notifyError(error, 'Unable to refresh source.');
    },
  });
}

export function useRemoveSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeSource(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<ISource[]>(['sources'], (prev) =>
        prev ? prev.filter((source) => source.id !== id) : prev,
      );
      queryClient.removeQueries({ queryKey: ['source', id] });
    },
    onError: (error) => {
      notifyError(error, 'Unable to remove source.');
    },
  });
}
