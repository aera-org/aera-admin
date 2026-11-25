import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { ConfigScope } from '@/common/types';

import { getConfig, updateConfig } from './configApi';

const configKeys = {
  scope: (scope: ConfigScope) => ['config', scope] as const,
};

export function useConfig(scope: ConfigScope) {
  return useQuery({
    queryKey: configKeys.scope(scope),
    queryFn: () => getConfig(scope),
  });
}

export function useUpdateConfig(scope: ConfigScope) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: number }) =>
      updateConfig(scope, key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.scope(scope) });
      notifySuccess('Setting updated.', 'Setting updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the setting.');
    },
  });
}
