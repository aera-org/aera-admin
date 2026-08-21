import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { CreateUserTypeDto, UpdateUserTypeDto } from '@/common/types';

import {
  createUserType,
  getUserTypeDetails,
  getUserTypes,
  updateUserType,
  type UserTypesListParams,
} from './userTypesApi';

const userTypeKeys = {
  list: (params: UserTypesListParams) => ['user-types', params] as const,
  detail: (id: string) => ['user-types', 'detail', id] as const,
};

export function useUserTypes(params: UserTypesListParams) {
  return useQuery({
    queryKey: userTypeKeys.list(params),
    queryFn: () => getUserTypes(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useUserTypeDetails(id: string | null, enabled = true) {
  return useQuery({
    queryKey: userTypeKeys.detail(id ?? 'unknown'),
    queryFn: () => getUserTypeDetails(id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateUserType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserTypeDto) => createUserType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-types'] });
      notifySuccess('User type created.', 'User type created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the user type.');
    },
  });
}

export function useUpdateUserType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateUserTypeDto;
    }) => updateUserType(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-types'] });
      queryClient.invalidateQueries({
        queryKey: userTypeKeys.detail(variables.id),
      });
      notifySuccess('User type updated.', 'User type updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the user type.');
    },
  });
}
