import { useQuery } from '@tanstack/react-query';

import type { ConversionsQuery } from '@/common/types';

import { getConversions } from './conversionsApi';

const conversionsKeys = {
  stats: (params: ConversionsQuery) => ['conversions', params] as const,
};

export function useConversions(params: ConversionsQuery, enabled = true) {
  return useQuery({
    queryKey: conversionsKeys.stats(params),
    queryFn: () => getConversions(params),
    enabled,
  });
}
