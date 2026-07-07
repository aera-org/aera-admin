import { useMutation } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { BroadcastDto } from '@/common/types';

import { countBroadcastUsers, createBroadcast } from './broadcastApi';

export function useBroadcastCount() {
  return useMutation({
    mutationFn: (payload: BroadcastDto) => countBroadcastUsers(payload),
    onError: (error) => {
      notifyError(error, 'Unable to count broadcast users.');
    },
  });
}

export function useCreateBroadcast() {
  return useMutation({
    mutationFn: (payload: BroadcastDto) => createBroadcast(payload),
    onSuccess: () => {
      notifySuccess('Broadcast sent.', 'Broadcast sent.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to send broadcast.');
    },
  });
}
