import {
  AnimatedAxis,
  AnimatedGrid,
  AnimatedLineSeries,
  Tooltip as ChartTooltip,
  XYChart,
} from '@visx/xychart';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  addMonths,
  buildScenarioRanking,
  compareMonthIds,
  type ConfidenceFilter,
  type ConfidenceTier,
  formatCount,
  formatMetricValue,
  formatMonthLabel,
  getLastFullMonthId,
  getMetricDefinition,
  getMonthRange,
  getRankedItemKey,
  getRankedMetricValue,
  isValidMonthId,
  type MonthId,
  normalizeRange,
  type PaymentsConversionGroupBy,
  type Quadrant,
  type RankedItem,
  rankItems,
  type ScenarioChartMetric,
  usePaymentsBreakdownRange,
  usePaymentsConversionBreakdown,
  usePaymentsRevenueBreakdown,
} from '@/app/analytics';
import {
  Alert,
  Badge,
  Card,
  Container,
  EmptyState,
  Field,
  FormRow,
  Section,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import { AppShell } from '@/components/templates';

import s from './ScenarioAnalyticsPage.module.scss';

const MONTH_OPTION_COUNT = 36;
const TABLE_MIN_WIDTH = 1120;
const CHART_HEIGHT = 280;
const MAX_CHART_MONTHS = 12;
const CHART_LINE_COLOR = '#4AA3F0';

type GroupBy = Extract<PaymentsConversionGroupBy, 'character' | 'scenario'>;

const GROUP_BY_OPTIONS = [
  { value: 'scenario', label: 'Scenario' },
  { value: 'character', label: 'Character' },
] as const;

const CONFIDENCE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'highMedium', label: 'High and Medium' },
  { value: 'high', label: 'High only' },
] as const;

const CHART_METRIC_OPTIONS: { value: ScenarioChartMetric; label: string }[] = [
  { value: 'rpau', label: 'RPAU' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'conversionRate', label: 'Conversion' },
  { value: 'activeUsers', label: 'Users' },
  { value: 'efficiency', label: 'Efficiency' },
];

const QUADRANT_CONFIG: {
  key: Quadrant;
  title: string;
  description: string;
}[] = [
  {
    key: 'hiddenGems',
    title: 'Hidden gems',
    description: 'Low traffic, high RPAU',
  },
  {
    key: 'scale',
    title: 'Scale',
    description: 'High traffic, high RPAU',
  },
  {
    key: 'belowAverage',
    title: 'Below average',
    description: 'Low traffic, low RPAU',
  },
  {
    key: 'trafficSinks',
    title: 'Traffic sinks',
    description: 'High traffic, low RPAU',
  },
];

type QueryUpdate = {
  month?: string;
  groupBy?: string;
  confidence?: string;
  chartStart?: string;
  chartEnd?: string;
  chartMetric?: string;
  chartEntity?: string;
};

type ChartPoint = {
  month: MonthId;
  value: number;
};

type ChartSeries = {
  id: string;
  label: string;
  data: ChartPoint[];
};

function isGroupBy(value: string | null): value is GroupBy {
  return value === 'scenario' || value === 'character';
}

function isConfidenceFilter(value: string | null): value is ConfidenceFilter {
  return value === 'all' || value === 'highMedium' || value === 'high';
}

function isChartMetric(value: string | null): value is ScenarioChartMetric {
  return (
    value === 'rpau' ||
    value === 'revenue' ||
    value === 'conversionRate' ||
    value === 'activeUsers' ||
    value === 'efficiency'
  );
}

function buildMonthOptions(defaultMonth: MonthId, selectedMonths: MonthId[]) {
  const rangeStart = addMonths(defaultMonth, -(MONTH_OPTION_COUNT - 1));
  const months = getMonthRange(rangeStart, defaultMonth);
  for (const selected of selectedMonths) {
    if (!months.includes(selected)) {
      months.push(selected);
    }
  }

  return months
    .sort((left, right) => compareMonthIds(right, left))
    .map((month) => ({
      value: month,
      label: formatMonthLabel(month, 'long'),
    }));
}

function formatEntityLabel(
  name: string,
  characterType: string | null,
  fallback: string,
) {
  const normalizedName = name.trim() || fallback;
  return characterType
    ? `${normalizedName} (${characterType})`
    : normalizedName;
}

function formatUsd(value: number, precision: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

function formatRpau(value: number | null) {
  if (value === null) return '—';
  return formatUsd(value, 4);
}

function formatEfficiency(value: number | null) {
  if (value === null) return '—';
  return `${formatCount(value * 100, 0)}%`;
}

function formatMoMChange(current: number | null, previous: number | null) {
  if (
    current === null ||
    previous === null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return null;
  }

  const change = (current - previous) / previous;
  if (change === 0) {
    return { label: '0%', tone: 'muted' as const };
  }

  const sign = change > 0 ? '+' : '−';
  return {
    label: `${sign}${formatCount(Math.abs(change) * 100, 0)}%`,
    tone: change > 0 ? ('success' as const) : ('danger' as const),
  };
}

function formatChartMetricValue(
  metric: ScenarioChartMetric,
  value: number | null,
  variant: 'axis' | 'tooltip',
) {
  if (value === null || !Number.isFinite(value)) return '—';

  if (metric === 'rpau') {
    return formatUsd(value, variant === 'axis' ? 3 : 4);
  }
  if (metric === 'revenue') {
    if (variant === 'axis') {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    }
    return formatUsd(value, 2);
  }
  if (metric === 'conversionRate') {
    return `${formatCount(value * 100, 1)}%`;
  }
  if (metric === 'efficiency') {
    return `${formatCount(value * 100, 0)}%`;
  }
  return formatCount(value);
}

function useElementWidth<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!node) return;

    const measure = () => {
      const nextWidth = node.getBoundingClientRect().width ?? 0;
      setWidth(nextWidth);
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) setWidth(entry.contentRect.width);
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    let frame = 0;
    const handleResize = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [node]);

  return { ref: setNode, width };
}

function ConfidenceBadge({ tier }: { tier: ConfidenceTier }) {
  if (tier === 'high') return <Badge tone="success">High</Badge>;
  if (tier === 'medium') return <Badge tone="warning">Medium</Badge>;
  return (
    <Badge tone="accent" outline>
      Low
    </Badge>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  meta?: string;
};

function MetricCard({ label, value, meta }: MetricCardProps) {
  return (
    <Card className={s.kpiCard} padding="md">
      <Typography variant="caption" className={s.metricLabel}>
        {label}
      </Typography>
      <Typography variant="h2">{value}</Typography>
      {meta ? (
        <Typography variant="caption" className={s.metricMeta}>
          {meta}
        </Typography>
      ) : null}
    </Card>
  );
}

function MonthMetricCell({
  metric,
  value,
  previous,
}: {
  metric: ScenarioChartMetric;
  value: number | null;
  previous: number | null;
}) {
  const change = formatMoMChange(value, previous);

  return (
    <div className={s.monthCell}>
      <Typography variant="body" as="span" className={s.alignRight}>
        {formatChartMetricValue(metric, value, 'tooltip')}
      </Typography>
      {change ? (
        <Typography
          variant="caption"
          tone={change.tone}
          className={s.alignRight}
        >
          {change.label}
        </Typography>
      ) : null}
    </div>
  );
}

function RightCell({ children }: { children: string }) {
  return (
    <Typography variant="body" as="span" className={s.alignRight}>
      {children}
    </Typography>
  );
}

export function ScenarioAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMonth = searchParams.get('month');
  const rawGroupBy = searchParams.get('groupBy');
  const rawConfidence = searchParams.get('confidence');
  const rawChartStart = searchParams.get('chartStart');
  const rawChartEnd = searchParams.get('chartEnd');
  const rawChartMetric = searchParams.get('chartMetric');
  const rawChartEntity = searchParams.get('chartEntity');
  const defaultMonth = useMemo(() => getLastFullMonthId(), []);
  const month = isValidMonthId(rawMonth) ? rawMonth : defaultMonth;
  const groupBy: GroupBy = isGroupBy(rawGroupBy) ? rawGroupBy : 'scenario';
  const confidence: ConfidenceFilter = isConfidenceFilter(rawConfidence)
    ? rawConfidence
    : 'all';
  const fallbackChartRange = useMemo(
    () => ({ start: addMonths(defaultMonth, -1), end: defaultMonth }),
    [defaultMonth],
  );
  const {
    start: chartStart,
    end: chartEnd,
    adjusted: chartRangeAdjusted,
  } = normalizeRange(
    rawChartStart,
    rawChartEnd,
    fallbackChartRange,
    MAX_CHART_MONTHS,
  );
  const chartMetric: ScenarioChartMetric = isChartMetric(rawChartMetric)
    ? rawChartMetric
    : 'rpau';
  const chartMonths = useMemo(
    () => getMonthRange(chartStart, chartEnd),
    [chartEnd, chartStart],
  );
  const { ref: chartRef, width: chartWidth } =
    useElementWidth<HTMLDivElement>();

  const conversionQuery = usePaymentsConversionBreakdown({
    groupBy,
    month,
  });
  const revenueQuery = usePaymentsRevenueBreakdown({
    groupBy,
    month,
  });
  const breakdownRange = usePaymentsBreakdownRange({
    groupBy,
    months: chartMonths,
  });

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.month !== undefined) {
        next.set('month', update.month);
      }
      if (update.groupBy !== undefined) {
        if (update.groupBy === 'scenario') {
          next.delete('groupBy');
        } else {
          next.set('groupBy', update.groupBy);
        }
        next.delete('chartEntity');
      }
      if (update.confidence !== undefined) {
        if (update.confidence === 'all') {
          next.delete('confidence');
        } else {
          next.set('confidence', update.confidence);
        }
      }
      if (update.chartStart !== undefined) {
        next.set('chartStart', update.chartStart);
      }
      if (update.chartEnd !== undefined) {
        next.set('chartEnd', update.chartEnd);
      }
      if (update.chartMetric !== undefined) {
        if (update.chartMetric === 'rpau') {
          next.delete('chartMetric');
        } else {
          next.set('chartMetric', update.chartMetric);
        }
      }
      if (update.chartEntity !== undefined) {
        if (update.chartEntity) {
          next.set('chartEntity', update.chartEntity);
        } else {
          next.delete('chartEntity');
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const updates: QueryUpdate = {};
    if (rawMonth !== month) updates.month = month;
    if (rawChartStart !== chartStart) updates.chartStart = chartStart;
    if (rawChartEnd !== chartEnd) updates.chartEnd = chartEnd;
    if (Object.keys(updates).length === 0) return;
    updateSearchParams(updates, true);
  }, [
    chartEnd,
    chartStart,
    month,
    rawChartEnd,
    rawChartStart,
    rawMonth,
    updateSearchParams,
  ]);

  const monthOptions = useMemo(
    () => buildMonthOptions(defaultMonth, [month, chartStart, chartEnd]),
    [chartEnd, chartStart, defaultMonth, month],
  );

  const ranking = useMemo(() => {
    if (!conversionQuery.data || !revenueQuery.data) {
      return buildScenarioRanking([], []);
    }

    return buildScenarioRanking(conversionQuery.data, revenueQuery.data);
  }, [conversionQuery.data, revenueQuery.data]);

  const rankedItems = useMemo(
    () => rankItems(ranking.items, confidence),
    [confidence, ranking.items],
  );

  const monthlyRankings = useMemo(() => {
    if (!breakdownRange.data) return [];

    return breakdownRange.data.map((row) => ({
      month: row.month,
      ranking: buildScenarioRanking(row.conversion, row.revenue),
    }));
  }, [breakdownRange.data]);

  const chartEntityOptions = useMemo(() => {
    const byId = new Map<
      string,
      { value: string; label: string; endRpau: number | null }
    >();

    for (const row of monthlyRankings) {
      for (const item of row.ranking.items) {
        const id = getRankedItemKey(item);
        const label = formatEntityLabel(item.name, item.characterType, item.id);
        const existing = byId.get(id);
        const endRpau = row.month === chartEnd ? item.rpau : null;
        if (!existing) {
          byId.set(id, { value: id, label, endRpau });
        } else if (row.month === chartEnd) {
          existing.label = label;
          existing.endRpau = item.rpau;
        }
      }
    }

    return [...byId.values()].sort((left, right) => {
      if (left.endRpau === null && right.endRpau === null) {
        return left.label.localeCompare(right.label);
      }
      if (left.endRpau === null) return 1;
      if (right.endRpau === null) return -1;
      if (right.endRpau !== left.endRpau) return right.endRpau - left.endRpau;
      return left.label.localeCompare(right.label);
    });
  }, [chartEnd, monthlyRankings]);

  const defaultChartEntity = chartEntityOptions[0]?.value ?? '';
  const chartEntity =
    rawChartEntity &&
    chartEntityOptions.some((option) => option.value === rawChartEntity)
      ? rawChartEntity
      : defaultChartEntity;

  useEffect(() => {
    if (!chartEntity || rawChartEntity === chartEntity) return;
    updateSearchParams({ chartEntity }, true);
  }, [chartEntity, rawChartEntity, updateSearchParams]);

  const chartSeries = useMemo(() => {
    if (!chartEntity) return [] as ChartSeries[];

    const selectedOption = chartEntityOptions.find(
      (option) => option.value === chartEntity,
    );
    if (!selectedOption) return [] as ChartSeries[];

    const data = monthlyRankings.flatMap((row) => {
      const match = row.ranking.items.find(
        (item) => getRankedItemKey(item) === chartEntity,
      );
      const value = match ? getRankedMetricValue(match, chartMetric) : null;
      if (value === null) return [];
      return [{ month: row.month, value }];
    });

    if (data.length === 0) return [] as ChartSeries[];

    return [
      {
        id: chartEntity,
        label: selectedOption.label,
        data,
      },
    ];
  }, [chartEntity, chartEntityOptions, chartMetric, monthlyRankings]);

  const hasChartPoints = chartSeries.some((series) => series.data.length > 0);
  const showChartSkeleton = breakdownRange.isPending;
  const showChartEmpty =
    !showChartSkeleton && !breakdownRange.error && !hasChartPoints;
  const showComparisonTable =
    !showChartSkeleton &&
    !breakdownRange.error &&
    chartEntityOptions.length > 0 &&
    chartMonths.length > 0;

  const comparisonColumns = useMemo(
    () => [
      {
        key: 'name',
        label: (
          <Typography variant="meta" tone="muted" as="div">
            {groupBy === 'character' ? 'Character' : 'Scenario'}
          </Typography>
        ),
      },
      ...chartMonths.map((monthId) => ({
        key: monthId,
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            className={s.alignRight}
          >
            {formatMonthLabel(monthId, 'short')}
          </Typography>
        ),
      })),
    ],
    [chartMonths, groupBy],
  );

  const comparisonRows = useMemo(
    () =>
      chartEntityOptions.map((option) => {
        const values = chartMonths.map((monthId) => {
          const row = monthlyRankings.find((item) => item.month === monthId);
          const match = row?.ranking.items.find(
            (item) => getRankedItemKey(item) === option.value,
          );
          return match ? getRankedMetricValue(match, chartMetric) : null;
        });

        return {
          name: (
            <Typography variant="body" className={s.nameCell}>
              {option.label}
            </Typography>
          ),
          ...Object.fromEntries(
            chartMonths.map((monthId, index) => [
              monthId,
              <MonthMetricCell
                key={`${option.value}-${monthId}`}
                metric={chartMetric}
                value={values[index] ?? null}
                previous={index === 0 ? null : (values[index - 1] ?? null)}
              />,
            ]),
          ),
        };
      }),
    [chartEntityOptions, chartMetric, chartMonths, monthlyRankings],
  );

  const comparisonSkeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, index) => ({
        name: <Skeleton key={`comparison-name-${index}`} height={20} />,
        ...Object.fromEntries(
          chartMonths.map((monthId) => [
            monthId,
            <Skeleton key={`comparison-${monthId}-${index}`} height={36} />,
          ]),
        ),
      })),
    [chartMonths],
  );

  const revenueMetric = useMemo(() => getMetricDefinition('revenue'), []);
  const conversionMetric = useMemo(
    () => getMetricDefinition('conversionRate'),
    [],
  );

  const tableColumns = useMemo(
    () => [
      {
        key: 'rank',
        label: (
          <Typography variant="meta" tone="muted" as="div">
            Rank
          </Typography>
        ),
      },
      {
        key: 'name',
        label: (
          <Typography variant="meta" tone="muted" as="div">
            Name
          </Typography>
        ),
      },
      {
        key: 'confidence',
        label: (
          <Typography variant="meta" tone="muted" as="div">
            Confidence
          </Typography>
        ),
      },
      {
        key: 'users',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            className={s.alignRight}
          >
            Users
          </Typography>
        ),
      },
      {
        key: 'customers',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            className={s.alignRight}
          >
            Customers
          </Typography>
        ),
      },
      {
        key: 'conversion',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            className={s.alignRight}
          >
            Conv
          </Typography>
        ),
      },
      {
        key: 'revenue',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            className={s.alignRight}
          >
            Revenue
          </Typography>
        ),
      },
      {
        key: 'transactions',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            className={s.alignRight}
          >
            Txns
          </Typography>
        ),
      },
      {
        key: 'rpau',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            className={s.alignRight}
          >
            RPAU
          </Typography>
        ),
      },
      {
        key: 'efficiency',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            className={s.alignRight}
          >
            Efficiency
          </Typography>
        ),
      },
    ],
    [],
  );

  const tableRows = useMemo(
    () =>
      rankedItems.map((item, index) => ({
        rank: <RightCell>{String(index + 1)}</RightCell>,
        name: (
          <Typography variant="body" className={s.nameCell}>
            {formatEntityLabel(item.name, item.characterType, item.id)}
          </Typography>
        ),
        confidence: <ConfidenceBadge tier={item.tier} />,
        users: <RightCell>{formatCount(item.activeUsers)}</RightCell>,
        customers: <RightCell>{formatCount(item.payingUsers)}</RightCell>,
        conversion: (
          <RightCell>
            {conversionMetric
              ? formatMetricValue(
                  conversionMetric,
                  item.conversionRate,
                  'table',
                )
              : '—'}
          </RightCell>
        ),
        revenue: (
          <RightCell>
            {revenueMetric
              ? formatMetricValue(revenueMetric, item.revenue, 'table')
              : '—'}
          </RightCell>
        ),
        transactions: <RightCell>{formatCount(item.transactions)}</RightCell>,
        rpau: <RightCell>{formatRpau(item.rpau)}</RightCell>,
        efficiency: <RightCell>{formatEfficiency(item.efficiency)}</RightCell>,
      })),
    [conversionMetric, rankedItems, revenueMetric],
  );

  const tableSkeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, index) => ({
        rank: <Skeleton key={`rank-${index}`} height={20} />,
        name: <Skeleton key={`name-${index}`} height={20} />,
        confidence: <Skeleton key={`confidence-${index}`} height={20} />,
        users: <Skeleton key={`users-${index}`} height={20} />,
        customers: <Skeleton key={`customers-${index}`} height={20} />,
        conversion: <Skeleton key={`conversion-${index}`} height={20} />,
        revenue: <Skeleton key={`revenue-${index}`} height={20} />,
        transactions: <Skeleton key={`transactions-${index}`} height={20} />,
        rpau: <Skeleton key={`rpau-${index}`} height={20} />,
        efficiency: <Skeleton key={`efficiency-${index}`} height={20} />,
      })),
    [],
  );

  const error = conversionQuery.error ?? revenueQuery.error;
  const hasBothBreakdowns =
    conversionQuery.data !== undefined && revenueQuery.data !== undefined;
  const showSkeleton = !hasBothBreakdowns && !error;
  const showEmpty = !showSkeleton && !error && rankedItems.length === 0;
  const hasJoinWarning =
    !showSkeleton &&
    !error &&
    (ranking.unmatchedRevenue > 0 || ranking.joinedByName > 0);
  const entityLabel = groupBy === 'scenario' ? 'scenarios' : 'characters';

  const kpiCards = (
    <>
      <MetricCard
        label="Platform RPAU"
        value={formatRpau(
          ranking.platform.activeUsers > 0 ? ranking.platform.rpau : null,
        )}
        meta="Revenue / active users"
      />
      <MetricCard
        label="Revenue"
        value={
          revenueMetric
            ? formatMetricValue(revenueMetric, ranking.platform.revenue, 'card')
            : '—'
        }
      />
      <MetricCard
        label="Active users"
        value={formatCount(ranking.platform.activeUsers)}
      />
      <MetricCard
        label="Customers"
        value={formatCount(ranking.platform.payingUsers)}
      />
      <MetricCard
        label="Conversion"
        value={
          conversionMetric
            ? formatMetricValue(
                conversionMetric,
                ranking.platform.conversionRate,
                'card',
              )
            : '—'
        }
      />
    </>
  );

  return (
    <AppShell>
      <Container className={s.page} size="wide">
        <div className={s.header}>
          <Typography variant="h2">Scenario Analytics</Typography>
          <Typography variant="meta" tone="muted">
            Rank {entityLabel} by revenue per active user. Active users is
            partner traffic allocation, not attractiveness. Month is current
            efficiency, not lifetime.
          </Typography>
        </div>

        <Stack gap="24px">
          {error ? (
            <Alert
              tone="danger"
              title="Unable to load scenario analytics"
              description="Please retry or choose another month."
            />
          ) : null}

          {hasJoinWarning ? (
            <Alert
              tone="warning"
              title="Breakdown join is incomplete"
              description={[
                ranking.unmatchedRevenue > 0
                  ? `${ranking.unmatchedRevenue} revenue row${
                      ranking.unmatchedRevenue === 1 ? '' : 's'
                    } did not match a conversion row.`
                  : null,
                ranking.joinedByName > 0
                  ? `${ranking.joinedByName} row${
                      ranking.joinedByName === 1 ? '' : 's'
                    } joined by name instead of id.`
                  : null,
              ]
                .filter(Boolean)
                .join(' ')}
            />
          ) : null}

          <Section title="Filters">
            <div className={s.filters}>
              <FormRow columns={3}>
                <Field
                  label="Month"
                  labelFor="scenario-analytics-month"
                  className={s.filterField}
                >
                  <Select
                    id="scenario-analytics-month"
                    options={monthOptions}
                    value={month}
                    onChange={(value) => updateSearchParams({ month: value })}
                    size="sm"
                    fullWidth
                  />
                </Field>
                <Field
                  label="Group by"
                  labelFor="scenario-analytics-group-by"
                  className={s.filterField}
                >
                  <Select
                    id="scenario-analytics-group-by"
                    options={[...GROUP_BY_OPTIONS]}
                    value={groupBy}
                    onChange={(value) => updateSearchParams({ groupBy: value })}
                    size="sm"
                    fullWidth
                  />
                </Field>
                <Field
                  label="Confidence"
                  labelFor="scenario-analytics-confidence"
                  className={s.filterField}
                >
                  <Select
                    id="scenario-analytics-confidence"
                    options={[...CONFIDENCE_OPTIONS]}
                    value={confidence}
                    onChange={(value) =>
                      updateSearchParams({ confidence: value })
                    }
                    size="sm"
                    fullWidth
                  />
                </Field>
              </FormRow>
            </div>
          </Section>

          <Section
            title="Totals"
            description={`Weighted platform RPAU for ${formatMonthLabel(
              month,
              'long',
            )}.`}
          >
            {showSkeleton ? (
              <div className={s.kpiGrid}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={`kpi-${index}`} height={112} />
                ))}
              </div>
            ) : (
              <div className={s.kpiGrid}>{kpiCards}</div>
            )}
          </Section>

          <Section
            title="Ranking"
            description="Sorted by RPAU. Low confidence is a small sample, not a quality score. Efficiency is RPAU versus the weighted platform average (100% = in line)."
          >
            {showSkeleton ? (
              <Table
                columns={tableColumns}
                rows={tableSkeletonRows}
                scrollable
                minWidth={TABLE_MIN_WIDTH}
              />
            ) : showEmpty ? (
              <EmptyState
                title="No ranking data"
                description={
                  confidence === 'all'
                    ? 'Try another month.'
                    : 'Try a wider confidence filter or another month.'
                }
              />
            ) : (
              <Table
                columns={tableColumns}
                rows={tableRows}
                scrollable
                minWidth={TABLE_MIN_WIDTH}
                getRowProps={(_row, index) => ({
                  className:
                    rankedItems[index]?.tier === 'low' ? s.mutedRow : undefined,
                })}
              />
            )}
          </Section>

          <Section
            title="Traffic vs RPAU"
            description={
              ranking.medians
                ? `Quadrants split at median users (${formatCount(
                    ranking.medians.users,
                  )}) and median RPAU (${formatRpau(
                    ranking.medians.rpau,
                  )}) among High and Medium confidence rows. Low-confidence rows are excluded. This is not a character × scenario matrix.`
                : 'Need at least one High or Medium confidence row to split quadrants.'
            }
          >
            {showSkeleton ? (
              <div className={s.matrix}>
                {QUADRANT_CONFIG.map((quadrant) => (
                  <Skeleton key={quadrant.key} height={160} />
                ))}
              </div>
            ) : ranking.medians ? (
              <div className={s.matrix}>
                {QUADRANT_CONFIG.map((quadrant) => (
                  <QuadrantCard
                    key={quadrant.key}
                    title={quadrant.title}
                    description={quadrant.description}
                    items={ranking.quadrants[quadrant.key]}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Not enough sample"
                description="Quadrants use High and Medium confidence rows only."
              />
            )}
          </Section>

          <Section
            title="Month comparison"
            description={[
              `One ${groupBy} over the selected months. Ranking above is a single-month snapshot.`,
              chartRangeAdjusted
                ? `Range limited to ${MAX_CHART_MONTHS} months. From month adjusted to ${formatMonthLabel(chartStart, 'long')}.`
                : null,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className={s.filters}>
              <FormRow columns={4}>
                <Field
                  label="From"
                  labelFor="scenario-analytics-chart-start"
                  className={s.filterField}
                >
                  <Select
                    id="scenario-analytics-chart-start"
                    options={monthOptions}
                    value={chartStart}
                    onChange={(value) =>
                      updateSearchParams({ chartStart: value })
                    }
                    size="sm"
                    fullWidth
                  />
                </Field>
                <Field
                  label="To"
                  labelFor="scenario-analytics-chart-end"
                  className={s.filterField}
                >
                  <Select
                    id="scenario-analytics-chart-end"
                    options={monthOptions}
                    value={chartEnd}
                    onChange={(value) =>
                      updateSearchParams({ chartEnd: value })
                    }
                    size="sm"
                    fullWidth
                  />
                </Field>
                <Field
                  label="Metric"
                  labelFor="scenario-analytics-chart-metric"
                  className={s.filterField}
                >
                  <Select
                    id="scenario-analytics-chart-metric"
                    options={CHART_METRIC_OPTIONS}
                    value={chartMetric}
                    onChange={(value) =>
                      updateSearchParams({ chartMetric: value })
                    }
                    size="sm"
                    fullWidth
                  />
                </Field>
                <Field
                  label={groupBy === 'character' ? 'Character' : 'Scenario'}
                  labelFor="scenario-analytics-chart-entity"
                  className={s.filterField}
                >
                  <Select
                    id="scenario-analytics-chart-entity"
                    options={chartEntityOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    value={chartEntity}
                    onChange={(value) =>
                      updateSearchParams({ chartEntity: value })
                    }
                    placeholder={
                      groupBy === 'character'
                        ? 'Select character'
                        : 'Select scenario'
                    }
                    size="sm"
                    fullWidth
                    disabled={chartEntityOptions.length === 0}
                  />
                </Field>
              </FormRow>
            </div>

            <Card className={s.panel} padding="md">
              {breakdownRange.error ? (
                <Alert
                  tone="danger"
                  title="Unable to load comparison chart"
                  description="Please retry or choose another range."
                />
              ) : null}
              {showChartSkeleton ? (
                <>
                  <Skeleton height={CHART_HEIGHT} />
                  <Table
                    columns={comparisonColumns}
                    rows={comparisonSkeletonRows}
                    scrollable
                    minWidth={Math.max(640, 220 + chartMonths.length * 120)}
                  />
                </>
              ) : (
                <>
                  {showChartEmpty ? (
                    <EmptyState
                      title="No comparison data"
                      description={`Try another ${
                        groupBy === 'character' ? 'character' : 'scenario'
                      }, range, or metric.`}
                    />
                  ) : (
                    <div ref={chartRef} className={s.chart}>
                      {chartWidth > 0 ? (
                        <XYChart
                          width={chartWidth}
                          height={CHART_HEIGHT}
                          xScale={{ type: 'point', padding: 0.1 }}
                          yScale={{ type: 'linear', nice: true }}
                        >
                          <AnimatedGrid columns={false} numTicks={4} />
                          <AnimatedAxis
                            orientation="bottom"
                            tickFormat={(value) =>
                              formatMonthLabel(String(value), 'short')
                            }
                            numTicks={Math.min(6, chartMonths.length)}
                          />
                          <AnimatedAxis
                            orientation="left"
                            numTicks={4}
                            tickFormat={(value) =>
                              formatChartMetricValue(
                                chartMetric,
                                Number(value),
                                'axis',
                              )
                            }
                          />
                          {chartSeries.map((series) => (
                            <AnimatedLineSeries
                              key={series.id}
                              dataKey={series.id}
                              data={series.data}
                              color={CHART_LINE_COLOR}
                              xAccessor={(datum) => datum.month}
                              yAccessor={(datum) => datum.value}
                            />
                          ))}
                          <ChartTooltip
                            showVerticalCrosshair
                            showSeriesGlyphs
                            renderTooltip={({ tooltipData }) => {
                              const nearest = tooltipData?.nearestDatum;
                              if (!nearest) return null;
                              const datum = nearest.datum as ChartPoint;
                              return (
                                <div className={s.chartTooltip}>
                                  <Typography variant="meta" as="div">
                                    {formatMonthLabel(datum.month, 'long')}
                                  </Typography>
                                  {chartSeries.map((series) => {
                                    const point = series.data.find(
                                      (item) => item.month === datum.month,
                                    );
                                    return (
                                      <div
                                        key={series.id}
                                        className={s.chartTooltipRow}
                                      >
                                        <span className={s.legendSwatch} />
                                        <Typography variant="caption">
                                          {series.label}
                                        </Typography>
                                        <Typography variant="body">
                                          {formatChartMetricValue(
                                            chartMetric,
                                            point?.value ?? null,
                                            'tooltip',
                                          )}
                                        </Typography>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }}
                          />
                        </XYChart>
                      ) : (
                        <Skeleton height={CHART_HEIGHT} />
                      )}
                    </div>
                  )}
                  {showComparisonTable ? (
                    <Table
                      columns={comparisonColumns}
                      rows={comparisonRows}
                      scrollable
                      minWidth={Math.max(640, 220 + chartMonths.length * 120)}
                      getRowProps={(_row, index) => ({
                        className:
                          chartEntityOptions[index]?.value === chartEntity
                            ? s.selectedRow
                            : undefined,
                      })}
                    />
                  ) : null}
                </>
              )}
            </Card>
          </Section>
        </Stack>
      </Container>
    </AppShell>
  );
}

type QuadrantCardProps = {
  title: string;
  description: string;
  items: RankedItem[];
};

function QuadrantCard({ title, description, items }: QuadrantCardProps) {
  return (
    <Card className={s.matrixCard} padding="md">
      <div className={s.matrixHeader}>
        <Typography variant="h3">{title}</Typography>
        <Typography variant="caption" tone="muted">
          {description}
        </Typography>
      </div>
      {items.length === 0 ? (
        <Typography variant="caption" tone="muted">
          None
        </Typography>
      ) : (
        <div className={s.matrixList}>
          {items.map((item) => (
            <div key={item.id || item.name} className={s.matrixItem}>
              <Typography variant="body" truncate>
                {formatEntityLabel(item.name, item.characterType, item.id)}
              </Typography>
              <Typography variant="caption" tone="muted">
                {formatRpau(item.rpau)} · {formatCount(item.activeUsers)} users
              </Typography>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
