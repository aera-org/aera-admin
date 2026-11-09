import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { UpdateWebUserDto } from '@/common/types';

import {
  getWebUserDetails,
  getWebUsers,
  updateWebUser,
  type WebUsersListParams,
} from './webUsersApi';

const webUserKeys = {
  all: ['web-users'] as const,
  list: (params: WebUsersListParams) => ['web-users', params] as const,
  details: (id: string) => ['web-users', 'detail', id] as const,
};

export function useWebUsers(params: WebUsersListParams) {
  return useQuery({
    queryKey: webUserKeys.list(params),
    queryFn: () => getWebUsers(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useWebUserDetails(id: string | null) {
  return useQuery({
    queryKey: webUserKeys.details(id ?? ''),
    queryFn: () => getWebUserDetails(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useUpdateWebUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWebUserDto }) =>
      updateWebUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webUserKeys.all });
      notifySuccess('Web user updated.', 'Web user updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the web user.');
    },
  });
}
