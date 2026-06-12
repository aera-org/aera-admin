import { useQuery } from '@tanstack/react-query';

import type { ActivationsQuery } from '@/common/types';

import { getActivations } from './activationsApi';

const activationsKeys = {
  stats: (params: ActivationsQuery) => ['activations', params] as const,
};

export function useActivations(params: ActivationsQuery, enabled = true) {
  return useQuery({
    queryKey: activationsKeys.stats(params),
    queryFn: () => getActivations(params),
    enabled,
  });
}
