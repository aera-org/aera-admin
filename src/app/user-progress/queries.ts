import { useQuery } from '@tanstack/react-query';

import type { UserProgressQuery } from '@/common/types';

import { getUserProgressStats } from './userProgressApi';

const userProgressKeys = {
  stats: (params: UserProgressQuery) => ['user-progress', params] as const,
};

export function useUserProgressStats(
  params: UserProgressQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: userProgressKeys.stats(params),
    queryFn: () => getUserProgressStats(params),
    enabled,
  });
}
