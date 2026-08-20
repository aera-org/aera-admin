import { useQueries, useQuery } from '@tanstack/react-query';

import {
  type ActiveUsersResponse,
  type AnalyticsMainRangeResponse,
  type AnalyticsMetricsResponse,
  type CohortRevenueResponse,
  type DailyAnalyticsItem,
  type DailyCountrySeriesItem,
  type DailyCountryTopItem,
  type DeeplinkAnalyticsItem,
  getAnalyticsActiveUsers,
  getAnalyticsCohortRevenue,
  getAnalyticsDaily,
  getAnalyticsDailyByCountry,
  getAnalyticsDailyCountryTop,
  getAnalyticsDeeplinks,
  getAnalyticsMainRange,
  getAnalyticsMetrics,
  getPaymentsConversionBreakdown,
  getPaymentsRevenueBreakdown,
  type PaymentsConversionBreakdownItem,
  type PaymentsConversionGroupBy,
  type PaymentsRevenueBreakdownItem,
  type PaymentsRevenueGroupBy,
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
  paymentsConversionBreakdown: (params: {
    groupBy: PaymentsConversionGroupBy;
    month: string;
  }) => ['analytics', 'payments', 'conversion-breakdown', params] as const,
  paymentsRevenueBreakdown: (params: {
    groupBy: PaymentsRevenueGroupBy;
    month: string;
  }) => ['analytics', 'payments', 'revenue-breakdown', params] as const,
  deeplinks: (params: {
    startDate: string;
    endDate: string;
    ref?: string;
    characterId?: string;
    scenarioId?: string;
  }) => ['analytics', 'deeplinks', params] as const,
  daily: (params: { startDate: string; endDate: string }) =>
    ['analytics', 'daily', params] as const,
  activeUsers: (params: { month: string }) =>
    ['analytics', 'active-users', params] as const,
  cohortRevenue: (params: { cohortMonth: string }) =>
    ['analytics', 'cohort-revenue', params] as const,
  dailyByCountry: (params: {
    country: string;
    startDate: string;
    endDate: string;
  }) => ['analytics', 'daily', 'by-country', params] as const,
  dailyCountryTop: (params: {
    metric: string;
    startDate: string;
    endDate: string;
    order?: 'asc' | 'desc';
    limit?: number;
  }) => ['analytics', 'daily', 'by-country', 'top', params] as const,
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

export function usePaymentsConversionBreakdown(
  params: { groupBy: PaymentsConversionGroupBy; month: string },
  options: AnalyticsQueryOptions<PaymentsConversionBreakdownItem[]> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.paymentsConversionBreakdown(params),
    queryFn: () => getPaymentsConversionBreakdown(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function usePaymentsRevenueBreakdown(
  params: { groupBy: PaymentsRevenueGroupBy; month: string },
  options: AnalyticsQueryOptions<PaymentsRevenueBreakdownItem[]> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.paymentsRevenueBreakdown(params),
    queryFn: () => getPaymentsRevenueBreakdown(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export type PaymentsBreakdownRangeMonth = {
  month: string;
  conversion: PaymentsConversionBreakdownItem[];
  revenue: PaymentsRevenueBreakdownItem[];
};

export function usePaymentsBreakdownRange(
  params: {
    groupBy: PaymentsConversionGroupBy;
    months: string[];
  },
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  const enabled = (options.enabled ?? true) && params.months.length > 0;
  const staleTime = options.staleTime ?? DEFAULT_STALE_TIME;
  const { groupBy, months } = params;

  const conversionQueries = useQueries({
    queries: months.map((month) => ({
      queryKey: analyticsKeys.paymentsConversionBreakdown({ groupBy, month }),
      queryFn: () => getPaymentsConversionBreakdown({ groupBy, month }),
      placeholderData: (previous: PaymentsConversionBreakdownItem[] | undefined) =>
        previous,
      staleTime,
      enabled,
    })),
  });

  const revenueQueries = useQueries({
    queries: months.map((month) => ({
      queryKey: analyticsKeys.paymentsRevenueBreakdown({
        groupBy,
        month,
      }),
      queryFn: () => getPaymentsRevenueBreakdown({ groupBy, month }),
      placeholderData: (previous: PaymentsRevenueBreakdownItem[] | undefined) =>
        previous,
      staleTime,
      enabled,
    })),
  });

  const error =
    conversionQueries.find((query) => query.error)?.error ??
    revenueQueries.find((query) => query.error)?.error ??
    null;
  const hasAllData = months.every(
    (_, index) =>
      conversionQueries[index]?.data !== undefined &&
      revenueQueries[index]?.data !== undefined,
  );

  return {
    data: hasAllData
      ? months.map((month, index) => ({
          month,
          conversion: conversionQueries[index]?.data ?? [],
          revenue: revenueQueries[index]?.data ?? [],
        }))
      : undefined,
    error,
    isError: Boolean(error),
    isPending: enabled && !hasAllData && !error,
  };
}

export function useAnalyticsDeeplinks(
  params: {
    startDate: string;
    endDate: string;
    ref?: string;
    exclude?: string;
    characterId?: string;
    scenarioId?: string;
  },
  options: AnalyticsQueryOptions<DeeplinkAnalyticsItem[]> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.deeplinks(params),
    queryFn: () => getAnalyticsDeeplinks(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useAnalyticsDaily(
  params: { startDate: string; endDate: string },
  options: AnalyticsQueryOptions<DailyAnalyticsItem[]> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.daily(params),
    queryFn: () => getAnalyticsDaily(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useAnalyticsActiveUsers(
  params: { month: string },
  options: AnalyticsQueryOptions<ActiveUsersResponse> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.activeUsers(params),
    queryFn: () => getAnalyticsActiveUsers(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useAnalyticsCohortRevenue(
  params: { cohortMonth: string },
  options: AnalyticsQueryOptions<CohortRevenueResponse> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.cohortRevenue(params),
    queryFn: () => getAnalyticsCohortRevenue(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useAnalyticsDailyByCountry(
  params: { country: string; startDate: string; endDate: string },
  options: AnalyticsQueryOptions<DailyCountrySeriesItem[]> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.dailyByCountry(params),
    queryFn: () => getAnalyticsDailyByCountry(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useAnalyticsDailyCountryTop(
  params: {
    metric: string;
    startDate: string;
    endDate: string;
    order?: 'asc' | 'desc';
    limit?: number;
  },
  options: AnalyticsQueryOptions<DailyCountryTopItem[]> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.dailyCountryTop(params),
    queryFn: () => getAnalyticsDailyCountryTop(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}
