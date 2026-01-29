import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { AnalyticsMetricKey, AnalyticsSection } from './metricRegistry';

export type AnalyticsMainRow = {
  month: string;
} & Partial<Record<AnalyticsMetricKey, number | null>>;

export type AnalyticsMainRangeResponse = {
  section: AnalyticsSection;
  data: AnalyticsMainRow[];
};

export type AnalyticsMetricPoint = {
  month: string;
  value: number | null;
};

export type AnalyticsMetricSeries = {
  metric: AnalyticsMetricKey;
  data: AnalyticsMetricPoint[];
};

export type AnalyticsMetricsResponse = {
  section: AnalyticsSection;
  metrics: AnalyticsMetricSeries[];
};

export async function getAnalyticsMainRange(params: {
  section: AnalyticsSection;
  startMonth: string;
  endMonth: string;
}) {
  const query = new URLSearchParams();
  query.set('section', params.section);
  query.set('startMonth', params.startMonth);
  query.set('endMonth', params.endMonth);

  const res = await apiFetch(`/admin/analytics/main-range?${query.toString()}`);
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load analytics range.');
  }

  return (await res.json()) as AnalyticsMainRangeResponse;
}

export async function getAnalyticsMetrics(params: {
  section: AnalyticsSection;
  metrics: AnalyticsMetricKey[];
  startMonth: string;
  endMonth: string;
}) {
  const query = new URLSearchParams();
  query.set('section', params.section);
  query.set('metrics', params.metrics.join(','));
  query.set('startMonth', params.startMonth);
  query.set('endMonth', params.endMonth);

  const res = await apiFetch(`/admin/analytics/metrics?${query.toString()}`);
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load analytics metrics.');
  }

  return (await res.json()) as AnalyticsMetricsResponse;
}
