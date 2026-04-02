import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type {
  IVideoGenerationCreateDto,
  IVideoGenerationSetDetails,
  IVideoGenerationUpdateDto,
} from '@/common/types';

import {
  createVideoGeneration,
  createVideoGenerationItem,
  deleteVideoGeneration,
  deleteVideoGenerationItem,
  getVideoGenerationDetails,
  getVideoGenerations,
  regenerateVideoGenerationItem,
  updateVideoGeneration,
  type VideoGenerationsListParams,
} from './videoGenerationsApi';

const videoGenerationKeys = {
  list: (params: VideoGenerationsListParams) => ['video-generations', params] as const,
  detail: (id: string) => ['video-generations', 'detail', id] as const,
};

export function useVideoGenerations(params: VideoGenerationsListParams) {
  return useQuery({
    queryKey: videoGenerationKeys.list(params),
    queryFn: () => getVideoGenerations(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useVideoGenerationDetails(
  id: string | null,
  initialData?: IVideoGenerationSetDetails | null,
  options: {
    enabled?: boolean;
    refetchInterval?:
      | number
      | false
      | ((data: IVideoGenerationSetDetails | undefined) => number | false);
  } = {},
) {
  const resolvedRefetchInterval =
    typeof options.refetchInterval === 'function'
      ? (query: { state: { data: unknown } }) =>
          // @ts-expect-error react-query type mismatch for refetchInterval callback
          options.refetchInterval?.(
            query.state.data as IVideoGenerationSetDetails | undefined,
          )
      : options.refetchInterval;

  return useQuery({
    queryKey: videoGenerationKeys.detail(id ?? ''),
    queryFn: () => getVideoGenerationDetails(id ?? ''),
    enabled: options.enabled ?? Boolean(id),
    initialData: initialData ?? undefined,
    refetchInterval: resolvedRefetchInterval,
  });
}

export function useCreateVideoGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IVideoGenerationCreateDto) =>
      createVideoGeneration(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-generations'] });
      notifySuccess('Video created.', 'Video created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the video.');
    },
  });
}

type VideoGenerationUpdateOptions = {
  id: string;
  payload: IVideoGenerationUpdateDto;
};

export function useUpdateVideoGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: VideoGenerationUpdateOptions) =>
      updateVideoGeneration(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['video-generations'] });
      queryClient.invalidateQueries({
        queryKey: ['video-generations', 'detail', variables.id],
      });
      notifySuccess('Video updated.', 'Video updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the video.');
    },
  });
}

export function useDeleteVideoGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVideoGeneration(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['video-generations'] });
      queryClient.invalidateQueries({
        queryKey: ['video-generations', 'detail', id],
      });
      notifySuccess('Video deleted.', 'Video deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the video.');
    },
  });
}

type VideoGenerationItemCreateOptions = {
  id: string;
};

export function useCreateVideoGenerationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: VideoGenerationItemCreateOptions) =>
      createVideoGenerationItem(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['video-generations'] });
      queryClient.invalidateQueries({
        queryKey: ['video-generations', 'detail', variables.id],
      });
      notifySuccess('Item added.', 'Video item added.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to add video item.');
    },
  });
}

type VideoGenerationItemDeleteOptions = {
  id: string;
  itemId: string;
};

export function useRegenerateVideoGenerationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, itemId }: VideoGenerationItemDeleteOptions) =>
      regenerateVideoGenerationItem(id, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['video-generations'] });
      queryClient.invalidateQueries({
        queryKey: ['video-generations', 'detail', variables.id],
      });
      notifySuccess('Regenerating item...', 'Video item regenerated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to regenerate video item.');
    },
  });
}

export function useDeleteVideoGenerationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, itemId }: VideoGenerationItemDeleteOptions) =>
      deleteVideoGenerationItem(id, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['video-generations'] });
      queryClient.invalidateQueries({
        queryKey: ['video-generations', 'detail', variables.id],
      });
      notifySuccess('Item deleted.', 'Video item deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete video item.');
    },
  });
}
