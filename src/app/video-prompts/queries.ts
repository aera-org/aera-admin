import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { VideoPromptCreateDto, VideoPromptUpdateDto } from '@/common/types';

import {
  createVideoPrompt,
  deleteVideoPrompt,
  getVideoPromptDetails,
  getVideoPrompts,
  updateVideoPrompt,
  type VideoPromptsListParams,
} from './videoPromptsApi';

const videoPromptKeys = {
  all: ['video-prompts'] as const,
  list: (params: VideoPromptsListParams) => ['video-prompts', params] as const,
  detail: (id: string) => ['video-prompts', 'detail', id] as const,
};

export function useVideoPrompts(params: VideoPromptsListParams, enabled = true) {
  return useQuery({
    queryKey: videoPromptKeys.list(params),
    queryFn: () => getVideoPrompts(params),
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useVideoPromptDetails(id: string | null, enabled = true) {
  return useQuery({
    queryKey: videoPromptKeys.detail(id ?? 'unknown'),
    queryFn: () => getVideoPromptDetails(id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateVideoPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VideoPromptCreateDto) => createVideoPrompt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoPromptKeys.all });
      notifySuccess('Video prompt created.', 'Video prompt created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the video prompt.');
    },
  });
}

export function useUpdateVideoPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: VideoPromptUpdateDto;
    }) => updateVideoPrompt(id, payload),
    onSuccess: () => {
      // Root key also covers the detail query.
      queryClient.invalidateQueries({ queryKey: videoPromptKeys.all });
      notifySuccess('Video prompt updated.', 'Video prompt updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the video prompt.');
    },
  });
}

export function useDeleteVideoPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVideoPrompt(id),
    onSuccess: () => {
      // Skip detail queries: the deleted item's page is still mounted and would 404.
      queryClient.invalidateQueries({
        queryKey: videoPromptKeys.all,
        predicate: (query) => query.queryKey[1] !== 'detail',
      });
      notifySuccess('Video prompt deleted.', 'Video prompt deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the video prompt.');
    },
  });
}
