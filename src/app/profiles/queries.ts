import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError } from '@/app/toast';
import type { IVoice, VoiceCreateDto, VoiceUpdateDto } from '@/common/types';

import {
  createProfile,
  getProfile,
  getProfiles,
  removeProfile,
  updateProfile,
} from './profilesApi';

const profileKeys = {
  list: () => ['profiles'] as const,
  details: (id: string) => ['profile', id] as const,
};

export function useProfiles() {
  return useQuery({
    queryKey: profileKeys.list(),
    queryFn: getProfiles,
  });
}

export function useProfile(id: string | null) {
  return useQuery({
    queryKey: profileKeys.details(id ?? ''),
    queryFn: () => getProfile(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VoiceCreateDto) => createProfile(payload),
    onSuccess: (data) => {
      if (!data?.id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.list() });
        return;
      }
      queryClient.setQueryData<IVoice[]>(profileKeys.list(), (prev) =>
        prev ? [...prev, data] : [data],
      );
    },
    onError: (error) => {
      notifyError(error, 'Unable to create profile.');
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VoiceUpdateDto }) =>
      updateProfile(id, payload),
    onSuccess: (data) => {
      if (!data?.id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.list() });
        return;
      }
      queryClient.setQueryData<IVoice[]>(profileKeys.list(), (prev) =>
        prev
          ? prev.map((voice) => (voice.id === data.id ? data : voice))
          : prev,
      );
      queryClient.setQueryData<IVoice>(profileKeys.details(data.id), data);
    },
    onError: (error) => {
      notifyError(error, 'Unable to update profile.');
    },
  });
}

export function useRemoveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeProfile(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<IVoice[]>(profileKeys.list(), (prev) =>
        prev ? prev.filter((voice) => voice.id !== id) : prev,
      );
      queryClient.removeQueries({ queryKey: profileKeys.details(id) });
    },
    onError: (error) => {
      notifyError(error, 'Unable to remove profile.');
    },
  });
}
