import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { ITgUserDetails, UpdateTgUser } from '@/common/types';

import {
  getUserDetails,
  getUsers,
  updateUser,
  type UsersListParams,
} from './usersApi';

const userKeys = {
  list: (params: UsersListParams) => ['users', params] as const,
  details: (id: string) => ['user', id] as const,
};

export function useUsers(params: UsersListParams, enabled = true) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getUsers(params),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useUserDetails(id: string | null) {
  return useQuery({
    queryKey: userKeys.details(id ?? ''),
    queryFn: () => getUserDetails(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTgUser }) =>
      updateUser(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: userKeys.details(variables.id) });
      queryClient.setQueryData<ITgUserDetails | undefined>(
        userKeys.details(variables.id),
        (previous) => (previous ? { ...previous, ...data } : previous),
      );
      if (variables.payload.isBlocked !== undefined) {
        notifySuccess(
          variables.payload.isBlocked ? 'User blocked.' : 'User unblocked.',
          'User status updated.',
        );
        return;
      }
      if (variables.payload.subscribedUntil !== undefined) {
        notifySuccess('Subscription updated.', 'Subscription updated.');
        return;
      }
      if (variables.payload.fuel !== undefined) {
        notifySuccess('Fuel updated.', 'Fuel updated.');
        return;
      }
      if (variables.payload.air !== undefined) {
        notifySuccess('Air updated.', 'Air updated.');
        return;
      }
      notifySuccess('User updated.', 'User updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the user.');
    },
  });
}
