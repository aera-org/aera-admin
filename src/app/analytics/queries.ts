import { useQuery } from '@tanstack/react-query';

import {
  getAnalyticsMainRange,
  getAnalyticsMetrics,
  type AnalyticsMainRangeResponse,
  type AnalyticsMetricsResponse,
} from './analyticsApi';
import type { AnalyticsMetricKey, AnalyticsSection } from './metricRegistry';

const analyticsKeys = {
  mainRange: (params: {
    section: AnalyticsSection;
    startMonth: string;
    endMonth: string;
  }) => ['analytics', 'main-range', params] as const,
  metrics: (params: {
    section: AnalyticsSection;
    metrics: AnalyticsMetricKey[];
    startMonth: string;
    endMonth: string;
  }) => ['analytics', 'metrics', params] as const,
};

type AnalyticsQueryOptions<T> = {
  enabled?: boolean;
  staleTime?: number;
  placeholderData?: (previous: T | undefined) => T | undefined;
};

const DEFAULT_STALE_TIME = 15 * 60 * 1000;

export function useAnalyticsMainRange(
  params: {
    section: AnalyticsSection;
    startMonth: string;
    endMonth: string;
  },
  options: AnalyticsQueryOptions<AnalyticsMainRangeResponse> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.mainRange(params),
    queryFn: () => getAnalyticsMainRange(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useAnalyticsMetrics(
  params: {
    section: AnalyticsSection;
    metrics: AnalyticsMetricKey[];
    startMonth: string;
    endMonth: string;
  },
  options: AnalyticsQueryOptions<AnalyticsMetricsResponse> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.metrics(params),
    queryFn: () => getAnalyticsMetrics(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}
