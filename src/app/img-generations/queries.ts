import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import {
  type IImgGeneration,
  type IImgGenerationDetails,
  ImgGenerationStatus,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';
import {
  createImgGeneration,
  deleteImgGeneration,
  getImgGenerationDetails,
  getImgGenerations,
  type ImgGenerationsListParams,
  regenerateImgGeneration,
  saveImgGeneration,
} from './imgGenerationsApi';

const imgGenerationKeys = {
  list: (params: ImgGenerationsListParams) =>
    ['img-generations', params] as const,
  details: (id: string) => ['img-generation', id] as const,
};

export function useImgGenerations(params: ImgGenerationsListParams) {
  return useQuery({
    queryKey: imgGenerationKeys.list(params),
    queryFn: () => getImgGenerations(params),
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.data?.some(
        (generation) =>
          generation.status !== ImgGenerationStatus.Ready &&
          generation.status !== ImgGenerationStatus.Failed,
      )
        ? 5000
        : false;
    },
    refetchIntervalInBackground: true,
  });
}

export function useImgGenerationDetails(id: string | null) {
  return useQuery({
    queryKey: imgGenerationKeys.details(id ?? ''),
    queryFn: () => getImgGenerationDetails(id ?? ''),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data &&
        data.status !== ImgGenerationStatus.Ready &&
        data.status !== ImgGenerationStatus.Failed
        ? 5000
        : false;
    },
    refetchIntervalInBackground: true,
  });
}

export function useCreateImgGeneration() {
  return useMutation({
    mutationFn: createImgGeneration,
    onSuccess: () => {
      notifySuccess('Generation created.', 'Generation created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to generate the image.');
    },
  });
}

export function useDeleteImgGeneration() {
  return useMutation({
    mutationFn: deleteImgGeneration,
    onSuccess: () => {
      notifySuccess('Generation deleted.', 'Generation deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the generation.');
    },
  });
}

export function useRegenerateImgGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: regenerateImgGeneration,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['img-generations'] });
      queryClient.invalidateQueries({
        queryKey: imgGenerationKeys.details(id),
      });
      notifySuccess('Regenerating generation...', 'Generation regenerated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to regenerate the generation.');
    },
  });
}

export function useSaveImgGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveImgGeneration,
    onSuccess: (_, id) => {
      queryClient.setQueryData<IImgGenerationDetails | undefined>(
        imgGenerationKeys.details(id),
        (current) => (current ? { ...current, isSaved: true } : current),
      );
      queryClient.setQueriesData<PaginatedResponse<IImgGeneration>>(
        { queryKey: ['img-generations'] },
        (current) =>
          current
            ? {
                ...current,
                data: current.data.map((generation) =>
                  generation.id === id
                    ? { ...generation, isSaved: true }
                    : generation,
                ),
              }
            : current,
      );
      notifySuccess('Generation saved.', 'Generation saved.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to save the generation.');
    },
  });
}
