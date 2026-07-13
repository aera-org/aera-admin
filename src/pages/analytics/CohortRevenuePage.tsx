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
  compareMonthIds,
  formatMonthLabel,
  getLastFullMonthId,
  getMonthRange,
  isValidMonthId,
  type MonthId,
  useAnalyticsCohortRevenue,
} from '@/app/analytics';
import {
  Alert,
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

import s from './CohortRevenuePage.module.scss';

const MONTH_OPTION_COUNT = 36;
const CHART_HEIGHT = 280;
const TABLE_MIN_WIDTH = 520;

type CohortRevenueDatum = {
  label: string;
  month: MonthId;
  monthLabel: string;
  value: number;
};

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

function normalizeMonthKey(value: string | null | undefined): MonthId | null {
  const month = value?.slice(0, 7);
  return isValidMonthId(month) ? month : null;
}

function formatUsd(value: number, precision = 2) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

function formatChartUsd(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function buildMonthOptions(selectedMonth: MonthId, defaultMonth: MonthId) {
  const rangeStart = addMonths(defaultMonth, -(MONTH_OPTION_COUNT - 1));
  const months = getMonthRange(rangeStart, defaultMonth);
  if (!months.includes(selectedMonth)) {
    months.push(selectedMonth);
  }

  return months
    .sort((a, b) => compareMonthIds(b, a))
    .map((month) => ({
      value: month,
      label: formatMonthLabel(month, 'long'),
    }));
}

function buildChartData(
  cohortMonth: MonthId,
  revenueByMonth: Record<string, number> | undefined,
) {
  const normalizedRevenue = new Map<MonthId, number>();

  Object.entries(revenueByMonth ?? {}).forEach(([rawMonth, rawValue]) => {
    const month = normalizeMonthKey(rawMonth);
    if (!month) return;

    const value = Number.isFinite(rawValue) ? rawValue : 0;
    normalizedRevenue.set(month, (normalizedRevenue.get(month) ?? 0) + value);
  });

  const lastRevenueMonth = Array.from(normalizedRevenue.keys()).sort(
    compareMonthIds,
  ).at(-1);

  if (!lastRevenueMonth || compareMonthIds(lastRevenueMonth, cohortMonth) < 0) {
    return [];
  }

  return getMonthRange(cohortMonth, lastRevenueMonth).map((month) => ({
    label: formatMonthLabel(month, 'short'),
    month,
    monthLabel: formatMonthLabel(month, 'long'),
    value: normalizedRevenue.get(month) ?? 0,
  }));
}

export function CohortRevenuePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCohortMonth = searchParams.get('cohortMonth');
  const defaultCohortMonth = useMemo(() => getLastFullMonthId(), []);
  const cohortMonth = isValidMonthId(rawCohortMonth)
    ? rawCohortMonth
    : defaultCohortMonth;

  const { data, error, isLoading } = useAnalyticsCohortRevenue({
    cohortMonth,
  });
  const { ref: chartRef, width: chartWidth } =
    useElementWidth<HTMLDivElement>();

  const updateCohortMonth = useCallback(
    (nextMonth: MonthId, replace = false) => {
      const next = new URLSearchParams(searchParams);
      next.set('cohortMonth', nextMonth);
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (rawCohortMonth === cohortMonth) return;
    updateCohortMonth(cohortMonth, true);
  }, [cohortMonth, rawCohortMonth, updateCohortMonth]);

  const monthOptions = useMemo(
    () => buildMonthOptions(cohortMonth, defaultCohortMonth),
    [cohortMonth, defaultCohortMonth],
  );

  const effectiveCohortMonth =
    normalizeMonthKey(data?.cohortDate) ?? cohortMonth;

  const chartData = useMemo(
    () => buildChartData(effectiveCohortMonth, data?.revenueByMonth),
    [data?.revenueByMonth, effectiveCohortMonth],
  );

  const totalRevenue = useMemo(
    () => chartData.reduce((total, item) => total + item.value, 0),
    [chartData],
  );

  const tableColumns = useMemo(
    () => [
      { key: 'total', label: 'Total' },
      ...chartData.map((item) => ({
        key: item.month,
        label: item.label,
      })),
    ],
    [chartData],
  );

  const tableRows = useMemo(
    () => [
      {
        total: formatUsd(totalRevenue),
        ...Object.fromEntries(
          chartData.map((item) => [item.month, formatUsd(item.value)]),
        ),
      },
    ],
    [chartData, totalRevenue],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && chartData.length === 0;
  const showErrorPlaceholder = Boolean(error && !data);

  return (
    <AppShell>
      <Container className={s.page} size="wide">
        <div className={s.header}>
          <Typography variant="h2">Cohort Revenue</Typography>
        </div>

        <Stack gap="24px">
          <Section title="Filters">
            <div className={s.filters}>
              <FormRow columns={1}>
                <Field
                  label="Cohort month"
                  labelFor="cohort-revenue-month"
                  className={s.filterField}
                >
                  <Select
                    id="cohort-revenue-month"
                    options={monthOptions}
                    value={cohortMonth}
                    onChange={(value) =>
                      updateCohortMonth(value as MonthId)
                    }
                    size="sm"
                    fullWidth
                  />
                </Field>
              </FormRow>
            </div>
          </Section>

          {error ? (
            <Alert
              tone="danger"
              title="Unable to load cohort revenue"
              description="Please retry or choose another cohort month."
            />
          ) : null}

          <Section title="Revenue by month">
            <Card className={s.panel} padding="md">
              {showSkeleton ? (
                <Skeleton height={CHART_HEIGHT} />
              ) : showErrorPlaceholder ? (
                <EmptyState
                  title="Unable to load chart"
                  description="Please retry or choose another cohort month."
                />
              ) : showEmpty ? (
                <EmptyState
                  title="No cohort revenue"
                  description="This cohort does not have revenue data yet."
                />
              ) : (
                <div ref={chartRef} className={s.chart}>
                  {chartWidth > 0 ? (
                    <XYChart
                      width={chartWidth}
                      height={CHART_HEIGHT}
                      xScale={{ type: 'point' }}
                      yScale={{ type: 'linear', nice: true }}
                    >
                      <AnimatedGrid columns={false} numTicks={4} />
                      <AnimatedAxis
                        orientation="bottom"
                        numTicks={Math.min(6, chartData.length)}
                      />
                      <AnimatedAxis
                        orientation="left"
                        numTicks={4}
                        tickFormat={(value) => formatChartUsd(Number(value))}
                      />
                      <AnimatedLineSeries
                        dataKey="Revenue"
                        data={chartData}
                        xAccessor={(datum) => datum.label}
                        yAccessor={(datum) => datum.value}
                      />
                      <ChartTooltip
                        showVerticalCrosshair
                        showSeriesGlyphs
                        renderTooltip={({ tooltipData }) => {
                          const nearest = tooltipData?.nearestDatum;
                          if (!nearest) return null;
                          const datum = nearest.datum as CohortRevenueDatum;
                          return (
                            <div className={s.chartTooltip}>
                              <Typography variant="meta" as="div">
                                {datum.monthLabel}
                              </Typography>
                              <Typography variant="body" as="div">
                                {formatUsd(datum.value)}
                              </Typography>
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
            </Card>
          </Section>

          <Section title="Revenue table">
            {showSkeleton ? (
              <Skeleton height={96} />
            ) : showErrorPlaceholder ? (
              <EmptyState
                title="Unable to load table"
                description="Please retry or choose another cohort month."
              />
            ) : showEmpty ? (
              <EmptyState
                title="No table data"
                description="This cohort does not have monthly revenue values."
              />
            ) : (
              <Table
                columns={tableColumns}
                rows={tableRows}
                scrollable
                minWidth={Math.max(
                  TABLE_MIN_WIDTH,
                  tableColumns.length * 120,
                )}
              />
            )}
          </Section>
        </Stack>
      </Container>
    </AppShell>
  );
}
