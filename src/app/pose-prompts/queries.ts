import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { CreatePosePromptDto, UpdatePosePromptDto } from '@/common/types';

import {
  createPosePrompt,
  deletePosePrompt,
  getPosePromptDetails,
  getPosePrompts,
  type PosePromptsListParams,
  updatePosePrompt,
  updatePosePromptReference,
  type UpdatePosePromptReferenceDto,
} from './posePromptsApi';

const posePromptKeys = {
  list: (params: PosePromptsListParams) => ['pose-prompts', params] as const,
  detail: (id: string) => ['pose-prompts', 'detail', id] as const,
};

export function usePosePrompts(params: PosePromptsListParams) {
  return useQuery({
    queryKey: posePromptKeys.list(params),
    queryFn: () => getPosePrompts(params),
    placeholderData: (previousData) => previousData,
  });
}

export function usePosePromptDetails(id: string | null, enabled = true) {
  return useQuery({
    queryKey: posePromptKeys.detail(id ?? 'unknown'),
    queryFn: () => getPosePromptDetails(id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreatePosePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePosePromptDto) => createPosePrompt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pose-prompts'] });
      notifySuccess('Pose created.', 'Pose created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the pose.');
    },
  });
}

export function useUpdatePosePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePosePromptDto;
    }) => updatePosePrompt(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pose-prompts'] });
      queryClient.invalidateQueries({
        queryKey: posePromptKeys.detail(variables.id),
      });
      notifySuccess('Pose updated.', 'Pose updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the pose.');
    },
  });
}

export function useUpdatePosePromptReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePosePromptReferenceDto;
    }) => updatePosePromptReference(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pose-prompts'] });
      queryClient.invalidateQueries({
        queryKey: posePromptKeys.detail(variables.id),
      });
      notifySuccess('Reference updated.', 'Reference updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the reference.');
    },
  });
}

export function useDeletePosePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePosePrompt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pose-prompts'] });
      notifySuccess('Pose deleted.', 'Pose deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the pose.');
    },
  });
}
