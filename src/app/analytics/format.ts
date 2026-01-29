import type { AnalyticsMetricDefinition } from './metricRegistry';

export type FormatVariant = 'card' | 'table' | 'chart' | 'tooltip' | 'delta';

type DeltaResult = {
  label: string;
  isPositive: boolean | null;
};

const numberFormatCache = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(options: Intl.NumberFormatOptions) {
  const key = JSON.stringify(options);
  const existing = numberFormatCache.get(key);
  if (existing) return existing;
  const formatter = new Intl.NumberFormat(undefined, options);
  numberFormatCache.set(key, formatter);
  return formatter;
}

function formatCount(value: number, precision = 0) {
  const formatter = getNumberFormatter({
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  });
  return formatter.format(value);
}

function formatPercent(value: number, precision = 1) {
  const formatter = getNumberFormatter({
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  });
  return `${formatter.format(value * 100)}%`;
}

function formatDurationShort(value: number) {
  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${minutes}m ${seconds}s`;
}

function formatDurationClock(value: number) {
  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDuration(value: number, variant: FormatVariant) {
  if (variant === 'tooltip') {
    return `${Math.round(value)} sec`;
  }
  if (variant === 'card' || variant === 'delta') {
    return formatDurationShort(value);
  }
  return formatDurationClock(value);
}

export function formatMetricValue(
  metric: AnalyticsMetricDefinition,
  value: number | null | undefined,
  variant: FormatVariant,
) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  switch (metric.format) {
    case 'percent':
      return formatPercent(value, metric.precision ?? 1);
    case 'duration':
      return formatDuration(value, variant);
    case 'currency':
      return formatCount(value, metric.precision ?? 2);
    default:
      return formatCount(value, metric.precision ?? 0);
  }
}

export function formatMetricDelta(
  metric: AnalyticsMetricDefinition,
  current: number | null | undefined,
  previous: number | null | undefined,
): DeltaResult | null {
  if (current === null || current === undefined) return null;
  if (previous === null || previous === undefined) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;

  const diff = current - previous;
  if (diff === 0) {
    return { label: 'No change', isPositive: null };
  }

  const sign = diff > 0 ? '+' : '−';

  if (metric.format === 'percent') {
    const points = Math.abs(diff) * 100;
    const formatter = getNumberFormatter({
      maximumFractionDigits: metric.precision ?? 1,
      minimumFractionDigits: metric.precision ?? 1,
    });
    return { label: `${sign}${formatter.format(points)} pp`, isPositive: diff > 0 };
  }

  if (metric.format === 'duration') {
    return {
      label: `${sign}${formatDuration(Math.abs(diff), 'delta')}`,
      isPositive: diff > 0,
    };
  }

  const formatter = getNumberFormatter({
    maximumFractionDigits: metric.precision ?? 0,
    minimumFractionDigits: metric.precision ?? 0,
  });
  return {
    label: `${sign}${formatter.format(Math.abs(diff))}`,
    isPositive: diff > 0,
  };
}
