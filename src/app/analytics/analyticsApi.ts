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

export type DailyAnalyticsItem = {
  day: string;
  unique: number;
  total: number;
  customers: number;
  revenue: number;
  conversion: number;
  arpu: number;
  arpc: number;
};

export type DailyCountrySeriesItem = DailyAnalyticsItem & {
  country: string;
};

export type DailyCountryTopItem = {
  country: string;
  unique: number;
  total: number;
  customers: number;
  revenue: number;
  conversion: number;
  arpu: number;
  arpc: number;
};

export type PaymentsConversionGroupBy = 'character' | 'scenario' | 'deeplink';
export type PaymentsRevenueGroupBy = 'character' | 'scenario' | 'deeplink';

export type PaymentsConversionBreakdownItem = {
  id: string;
  name: string;
  activeUsers: number;
  payingUsers: number;
  conversionRate: number;
};

export type PaymentsRevenueBreakdownItem = {
  id?: string;
  name?: string;
  deeplink?: string;
  revenue: number;
  transactions: number;
};

export type DeeplinkAnalyticsItem = {
  deeplink: string;
  ref?: string | null;
  character?: { id: string; name: string } | null;
  scenario?: { id: string; name: string; slug?: string | null } | null;
  total: number;
  unique: number;
  visits: number;
  customers: number;
  transactions: number;
  revenue: number;
  conversion: number;
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

export async function getAnalyticsDaily(params: {
  startDate: string;
  endDate: string;
}) {
  const query = new URLSearchParams();
  query.set('startDate', params.startDate);
  query.set('endDate', params.endDate);

  const res = await apiFetch(`/admin/analytics/daily?${query.toString()}`);
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load daily analytics.');
  }

  return (await res.json()) as DailyAnalyticsItem[];
}

export async function getAnalyticsDailyByCountry(params: {
  country: string;
  startDate: string;
  endDate: string;
}) {
  const query = new URLSearchParams();
  query.set('country', params.country);
  query.set('startDate', params.startDate);
  query.set('endDate', params.endDate);

  const res = await apiFetch(
    `/admin/analytics/daily/by-country?${query.toString()}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load daily country analytics.');
  }

  return (await res.json()) as DailyCountrySeriesItem[];
}

export async function getAnalyticsDailyCountryTop(params: {
  metric: string;
  startDate: string;
  endDate: string;
  order?: 'asc' | 'desc';
  limit?: number;
}) {
  const query = new URLSearchParams();
  query.set('metric', params.metric);
  query.set('startDate', params.startDate);
  query.set('endDate', params.endDate);
  if (params.order) query.set('order', params.order);
  if (params.limit) query.set('limit', String(params.limit));

  const res = await apiFetch(
    `/admin/analytics/daily/by-country/top?${query.toString()}`,
  );
  if (!res.ok) {
    throw await buildApiError(
      res,
      'Unable to load daily country ranking.',
    );
  }

  return (await res.json()) as DailyCountryTopItem[];
}

export async function getPaymentsConversionBreakdown(params: {
  groupBy: PaymentsConversionGroupBy;
  month: string;
}) {
  const query = new URLSearchParams();
  query.set('groupBy', params.groupBy);
  query.set('month', params.month);

  const res = await apiFetch(
    `/admin/analytics/payments/breakdown/conversion?${query.toString()}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load conversion breakdown.');
  }

  return (await res.json()) as PaymentsConversionBreakdownItem[];
}

export async function getPaymentsRevenueBreakdown(params: {
  groupBy: PaymentsRevenueGroupBy;
  month: string;
}) {
  const query = new URLSearchParams();
  query.set('groupBy', params.groupBy);
  query.set('month', params.month);

  const res = await apiFetch(
    `/admin/analytics/payments/breakdown/revenue?${query.toString()}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load revenue breakdown.');
  }

  return (await res.json()) as PaymentsRevenueBreakdownItem[];
}

export async function getAnalyticsDeeplinks(params: {
  startDate: string;
  endDate: string;
  ref?: string;
  characterId?: string;
  scenarioId?: string;
}) {
  const query = new URLSearchParams();
  query.set('startDate', params.startDate);
  query.set('endDate', params.endDate);
  if (params.ref) query.set('ref', params.ref);
  if (params.characterId) query.set('characterId', params.characterId);
  if (params.scenarioId) query.set('scenarioId', params.scenarioId);

  const res = await apiFetch(`/admin/analytics/deeplinks?${query.toString()}`);
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load deeplinks analytics.');
  }

  return (await res.json()) as DeeplinkAnalyticsItem[];
}
