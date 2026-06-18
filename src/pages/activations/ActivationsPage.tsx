import {
  AnimatedAxis,
  AnimatedGrid,
  AnimatedLineSeries,
  Tooltip as ChartTooltip,
  XYChart,
} from '@visx/xychart';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { formatCount } from '@/app/analytics';
import { useActivations } from '@/app/activations';
import {
  Alert,
  Card,
  Container,
  EmptyState,
  Field,
  FormRow,
  Grid,
  Input,
  Section,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import {
  StageActionType,
  type ActivationScenarioMetadata,
  type ActivationsStats,
} from '@/common/types';
import { formatCharacterType } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './ActivationsPage.module.scss';

const MIN_START_DATE = '2026-06-12';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TABLE_MIN_WIDTH = 1280;

const ACTION_TYPES = [
  StageActionType.Connect,
  StageActionType.Story,
  StageActionType.Flirt,
] as const;

type TotalMetricKey = 'total' | 'left' | 'clicked' | 'written';
type ChartMetricKey = TotalMetricKey;

type QueryUpdate = {
  start?: string;
  end?: string;
};

type TotalMetricDefinition = {
  key: TotalMetricKey;
  label: string;
  denominator: 'raw' | 'total';
};

type ActionMetricDefinition = {
  key: StageActionType;
  label: string;
};

type DailyChartDatum = {
  day: string;
  value: number;
};

type MetricCardProps = {
  label: string;
  value: string;
  meta?: string;
};

const TOTAL_METRICS: TotalMetricDefinition[] = [
  { key: 'total', label: 'Total', denominator: 'raw' },
  { key: 'left', label: 'Left', denominator: 'total' },
  { key: 'clicked', label: 'Clicked', denominator: 'total' },
  { key: 'written', label: 'Written', denominator: 'total' },
];

const ACTION_METRICS: ActionMetricDefinition[] = [
  { key: StageActionType.Connect, label: 'Connect' },
  { key: StageActionType.Story, label: 'Story' },
  { key: StageActionType.Flirt, label: 'Flirt' },
];

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

function toUtcDateId(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseUtcDateId(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isValidDateId(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE_PATTERN.test(value)) return false;
  const parsed = parseUtcDateId(value);
  return toUtcDateId(parsed) === value;
}

function addDaysToDateId(value: string, delta: number) {
  const date = parseUtcDateId(value);
  date.setUTCDate(date.getUTCDate() + delta);
  return toUtcDateId(date);
}

function clampDateId(value: string, min: string, max: string) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeDateRange(
  rawStart: string | null,
  rawEnd: string | null,
  fallbackStart: string,
  fallbackEnd: string,
  maxDate: string,
) {
  let start = isValidDateId(rawStart) ? rawStart : fallbackStart;
  let end = isValidDateId(rawEnd) ? rawEnd : fallbackEnd;

  start = clampDateId(start, MIN_START_DATE, maxDate);
  end = clampDateId(end, MIN_START_DATE, maxDate);

  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  return { start, end };
}

function formatPercent(value: number) {
  return `${formatCount(value, 1)}%`;
}

function buildPercentValue(count: number, denominator: number) {
  if (denominator <= 0) return '0%';
  return formatPercent((count / denominator) * 100);
}

function createEmptyActionCounts(): Record<StageActionType, number> {
  return Object.fromEntries(ACTION_TYPES.map((type) => [type, 0])) as Record<
    StageActionType,
    number
  >;
}

function createEmptyStats(): ActivationsStats {
  return {
    total: 0,
    left: 0,
    clicked: 0,
    written: 0,
    clickedByAction: createEmptyActionCounts(),
  };
}

function addStats(target: ActivationsStats, source?: ActivationsStats) {
  if (!source) return target;

  target.total += source.total ?? 0;
  target.left += source.left ?? 0;
  target.clicked += source.clicked ?? 0;
  target.written += source.written ?? 0;

  ACTION_TYPES.forEach((type) => {
    target.clickedByAction[type] += source.clickedByAction?.[type] ?? 0;
  });

  return target;
}

function formatDayLabel(value: string, variant: 'short' | 'long' = 'short') {
  if (!ISO_DATE_PATTERN.test(value)) return value;
  const date = parseUtcDateId(value);
  const options: Intl.DateTimeFormatOptions =
    variant === 'short'
      ? { month: 'short', day: '2-digit', timeZone: 'UTC' }
      : { month: 'long', day: '2-digit', year: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function MetricCard({ label, value, meta }: MetricCardProps) {
  return (
    <Card className={s.kpiCard} padding="md">
      <Typography variant="caption" className={s.metricLabel}>
        {label}
      </Typography>
      <Typography variant="h2" className={s.metricValue}>
        {value}
      </Typography>
      {meta ? (
        <Typography variant="caption" className={s.metricMeta}>
          {meta}
        </Typography>
      ) : null}
    </Card>
  );
}

function buildMetricCardSkeletons(prefix: string, count: number) {
  return Array.from({ length: count }).map((_, index) => (
    <Skeleton key={`${prefix}-${index}`} height={124} />
  ));
}

function buildScenarioLabel(
  scenarioId: string,
  metadata?: ActivationScenarioMetadata,
) {
  if (!metadata) return scenarioId;

  const characterName = metadata.character.name.trim();
  const scenarioName = metadata.name.trim();
  if (!characterName || !scenarioName) return scenarioId;
  return `${characterName} - ${scenarioName} (${formatCharacterType(metadata.character.type)})`;
}

function buildPercentWithCount(count: number, denominator: number) {
  return (
    <div className={s.tableCell}>
      <Typography variant="body">
        {buildPercentValue(count, denominator)}
      </Typography>
      <Typography variant="caption" className={s.tableMeta}>
        {formatCount(count)}
      </Typography>
    </div>
  );
}

export function ActivationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [chartMetric, setChartMetric] = useState<ChartMetricKey>('total');

  const rawStart = searchParams.get('start');
  const rawEnd = searchParams.get('end');

  const defaultEnd = useMemo(
    () => addDaysToDateId(toUtcDateId(new Date()), -1),
    [],
  );
  const maxSelectableDate = useMemo(
    () => (defaultEnd < MIN_START_DATE ? MIN_START_DATE : defaultEnd),
    [defaultEnd],
  );
  const { start, end } = useMemo(
    () =>
      normalizeDateRange(
        rawStart,
        rawEnd,
        MIN_START_DATE,
        maxSelectableDate,
        maxSelectableDate,
      ),
    [maxSelectableDate, rawEnd, rawStart],
  );

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.start !== undefined) {
        const nextStart = update.start.trim();
        if (nextStart) {
          next.set('start', nextStart);
        } else {
          next.delete('start');
        }
      }

      if (update.end !== undefined) {
        const nextEnd = update.end.trim();
        if (nextEnd) {
          next.set('end', nextEnd);
        } else {
          next.delete('end');
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (rawStart === start && rawEnd === end) return;

    updateSearchParams({ start, end }, true);
  }, [end, rawEnd, rawStart, start, updateSearchParams]);

  const query = useMemo(() => ({ start, end }), [end, start]);
  const isRangeValid = isValidDateId(start) && isValidDateId(end);

  const { data, error, isLoading } = useActivations(query, isRangeValid);
  const errorDescription =
    error instanceof Error && error.message
      ? error.message
      : 'Please retry or adjust the filters.';

  const scenarioMetadataById = useMemo(
    () =>
      new Map((data?.scenarios ?? []).map((scenario) => [scenario.id, scenario])),
    [data?.scenarios],
  );

  const totals = useMemo(() => {
    const aggregated = createEmptyStats();

    (data?.daysData ?? []).forEach((item) => {
      addStats(aggregated, item.data.totals);
    });

    return aggregated;
  }, [data?.daysData]);

  const scenarioStatsById = useMemo(() => {
    const aggregated = new Map<string, ActivationsStats>();

    (data?.daysData ?? []).forEach((item) => {
      Object.entries(item.data.byScenario ?? {}).forEach(([scenarioId, stats]) => {
        const existing = aggregated.get(scenarioId) ?? createEmptyStats();
        addStats(existing, stats);
        aggregated.set(scenarioId, existing);
      });
    });

    return aggregated;
  }, [data?.daysData]);

  const totalsCards = useMemo(
    () =>
      TOTAL_METRICS.map((metric) => {
        const value = totals[metric.key];

        if (metric.denominator === 'raw') {
          return (
            <MetricCard
              key={metric.key}
              label={metric.label}
              value={formatCount(value)}
            />
          );
        }

        return (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={buildPercentValue(value, totals.total)}
            meta={formatCount(value)}
          />
        );
      }),
    [totals],
  );

  const actionTotalsCards = useMemo(
    () =>
      ACTION_METRICS.map((metric) => {
        const value = totals.clickedByAction[metric.key] ?? 0;

        return (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={buildPercentValue(value, totals.clicked)}
            meta={formatCount(value)}
          />
        );
      }),
    [totals.clicked, totals.clickedByAction],
  );

  const chartMetricOptions = useMemo(
    () =>
      TOTAL_METRICS.map((metric) => ({
        value: metric.key,
        label: metric.label,
      })),
    [],
  );

  const activeChartMetric = useMemo(
    () => TOTAL_METRICS.find((metric) => metric.key === chartMetric) ?? TOTAL_METRICS[0],
    [chartMetric],
  );

  const chartData = useMemo(() => {
    return [...(data?.daysData ?? [])]
      .sort((left, right) => left.day.localeCompare(right.day))
      .map((item) => ({
        day: item.day,
        value: item.data.totals[chartMetric],
      }))
      .filter((item) => Number.isFinite(item.value));
  }, [chartMetric, data?.daysData]);

  const breakdownColumns = useMemo(
    () => [
      { key: 'name', label: 'Character + Scenario' },
      ...TOTAL_METRICS.map((metric) => ({
        key: metric.key,
        label: metric.label,
      })),
      ...ACTION_METRICS.map((metric) => ({
        key: metric.key,
        label: metric.label,
      })),
    ],
    [],
  );

  const breakdownRows = useMemo(() => {
    return [...scenarioStatsById.entries()]
      .map(([scenarioId, stats]) => {
        const metadata = scenarioMetadataById.get(scenarioId);
        const label = buildScenarioLabel(scenarioId, metadata);

        return {
          nameValue: label,
          totalValue: stats.total,
          name: (
            <div className={`${s.tableCell} ${s.nameCell}`}>
              <Typography variant="body">{label}</Typography>
            </div>
          ),
          total: formatCount(stats.total),
          left: buildPercentWithCount(stats.left, stats.total),
          clicked: buildPercentWithCount(stats.clicked, stats.total),
          written: buildPercentWithCount(stats.written, stats.total),
          connect: buildPercentWithCount(
            stats.clickedByAction[StageActionType.Connect] ?? 0,
            stats.clicked,
          ),
          story: buildPercentWithCount(
            stats.clickedByAction[StageActionType.Story] ?? 0,
            stats.clicked,
          ),
          flirt: buildPercentWithCount(
            stats.clickedByAction[StageActionType.Flirt] ?? 0,
            stats.clicked,
          ),
        };
      })
      .sort((left, right) => {
        if (right.totalValue !== left.totalValue) {
          return right.totalValue - left.totalValue;
        }

        return left.nameValue.localeCompare(right.nameValue);
      });
  }, [scenarioMetadataById, scenarioStatsById]);

  const breakdownSkeletonRows = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, index) => ({
        name: <Skeleton key={`name-${index}`} height={20} />,
        ...Object.fromEntries(
          [...TOTAL_METRICS, ...ACTION_METRICS].map((metric) => [
            metric.key,
            <Skeleton key={`${metric.key}-${index}`} height={40} />,
          ]),
        ),
      })),
    [],
  );

  const formatChartValue = useCallback((value: number) => {
    if (!Number.isFinite(value)) return '—';
    return formatCount(value);
  }, []);

  const { ref: chartRef, width: chartWidth } =
    useElementWidth<HTMLDivElement>();

  return (
    <AppShell>
      <Container className={s.page} size="wide">
        <div className={s.header}>
          <Typography variant="h2">Activations</Typography>
        </div>

        <Stack gap="24px">
          {error ? (
            <Alert
              tone="danger"
              title="Unable to load activations"
              description={errorDescription}
            />
          ) : null}

          <div className={s.filters}>
            <FormRow columns={2}>
              <Field label="Start date" className={s.filterField}>
                <Input
                  type="date"
                  size="sm"
                  value={start}
                  min={MIN_START_DATE}
                  max={maxSelectableDate}
                  onChange={(event) =>
                    updateSearchParams({ start: event.target.value })
                  }
                  fullWidth
                />
              </Field>
              <Field label="End date" className={s.filterField}>
                <Input
                  type="date"
                  size="sm"
                  value={end}
                  min={MIN_START_DATE}
                  max={maxSelectableDate}
                  onChange={(event) =>
                    updateSearchParams({ end: event.target.value })
                  }
                  fullWidth
                />
              </Field>
            </FormRow>
            <Typography variant="caption" tone="muted" className={s.filterNote}>
              UTC dates. Start cannot be earlier than June 12, 2026. End cannot
              be later than the previous UTC day.
            </Typography>
          </div>

          <Section title="Totals">
            {isLoading && !data ? (
              <Grid columns={TOTAL_METRICS.length} gap={4}>
                {buildMetricCardSkeletons('totals', TOTAL_METRICS.length)}
              </Grid>
            ) : (
              <Grid columns={TOTAL_METRICS.length} gap={4}>
                {totalsCards}
              </Grid>
            )}
          </Section>

          <Section title="Action totals">
            {isLoading && !data ? (
              <Grid columns={ACTION_METRICS.length} gap={4}>
                {buildMetricCardSkeletons('actions', ACTION_METRICS.length)}
              </Grid>
            ) : (
              <Grid columns={ACTION_METRICS.length} gap={4}>
                {actionTotalsCards}
              </Grid>
            )}
          </Section>

          <Section
            title="Daily"
            actions={
              <Field
                label="Metric"
                layout="inline"
                className={s.breakdownField}
              >
                <Select
                  options={chartMetricOptions}
                  value={chartMetric}
                  onChange={(value) => setChartMetric(value as ChartMetricKey)}
                  size="sm"
                  fitContent
                />
              </Field>
            }
          >
            <Card className={s.panel} padding="md">
              {isLoading && !data ? (
                <Skeleton height={260} />
              ) : chartData.length ? (
                <div ref={chartRef} className={s.chart}>
                  {chartWidth > 0 ? (
                    <XYChart
                      width={chartWidth}
                      height={260}
                      xScale={{ type: 'point' }}
                      yScale={{ type: 'linear', nice: true }}
                    >
                      <AnimatedGrid columns={false} numTicks={4} />
                      <AnimatedAxis
                        orientation="bottom"
                        tickFormat={(value) =>
                          formatDayLabel(String(value), 'short')
                        }
                        numTicks={Math.min(6, chartData.length)}
                      />
                      <AnimatedAxis
                        orientation="left"
                        numTicks={4}
                        tickFormat={(value) => formatChartValue(Number(value))}
                      />
                      <AnimatedLineSeries
                        dataKey={activeChartMetric.label}
                        data={chartData}
                        xAccessor={(datum) => datum.day}
                        yAccessor={(datum) => datum.value}
                      />
                      <ChartTooltip
                        showVerticalCrosshair
                        showSeriesGlyphs
                        renderTooltip={({ tooltipData }) => {
                          const nearest = tooltipData?.nearestDatum;
                          if (!nearest) return null;
                          const datum = nearest.datum as DailyChartDatum;
                          return (
                            <div className={s.chartTooltip}>
                              <Typography variant="meta" as="div">
                                {formatDayLabel(datum.day, 'long')}
                              </Typography>
                              <Typography variant="body" as="div">
                                {formatChartValue(datum.value)}
                              </Typography>
                            </div>
                          );
                        }}
                      />
                    </XYChart>
                  ) : (
                    <Skeleton height={260} />
                  )}
                </div>
              ) : (
                <EmptyState
                  title="No data for this period"
                  description="Try adjusting the date range."
                />
              )}
            </Card>
          </Section>

          <Section title="Scenario Breakdown">
            {isLoading && !data ? (
              <Table
                columns={breakdownColumns}
                rows={breakdownSkeletonRows}
                scrollable
                minWidth={TABLE_MIN_WIDTH}
              />
            ) : breakdownRows.length === 0 ? (
              <EmptyState
                title="No activations found"
                description="Try another date range."
              />
            ) : (
              <Table
                columns={breakdownColumns}
                rows={breakdownRows}
                scrollable
                minWidth={TABLE_MIN_WIDTH}
              />
            )}
          </Section>
        </Stack>
      </Container>
    </AppShell>
  );
}
