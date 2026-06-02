import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useUserProgressStats } from '@/app/user-progress';
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
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import type { ScenarioProgressStats } from '@/common/types';
import { formatCharacterType } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './UserProgressPage.module.scss';

const DEFAULT_AFTER = '2026-05-27';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TABLE_MIN_WIDTH = 1320;

const METRIC_DEFINITIONS: Array<{
  key: keyof ScenarioProgressStats;
  label: string;
}> = [
  { key: 'total', label: 'Total' },
  { key: 'pending', label: 'Pending' },
  { key: 'notified', label: 'Confirmed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'startedNextDay', label: 'Started next day' },
  { key: 'started', label: 'Started any time' },
];
const KPI_GRID_COLUMNS = METRIC_DEFINITIONS.length;


type QueryUpdate = {
  after?: string;
  before?: string;
};

type MetricCardProps = {
  label: string;
  value: string;
  meta?: string;
};

function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateValue(value: string) {
  return DATE_PATTERN.test(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value);
}

function buildPercentValue(count: number, total: number) {
  if (total <= 0) return '0%';
  return `${formatPercent((count / total) * 100)}%`;
}

function buildPercentWithCount(count: number, total: number) {
  return (
    <div className={s.tableCell}>
      <Typography variant="body">{buildPercentValue(count, total)}</Typography>
      <Typography variant="caption" className={s.tableMeta}>
        {formatCount(count)}
      </Typography>
    </div>
  );
}

function buildScenarioName(
  scenarioId: string,
  metadata?: {
    name: string;
    characterName: string;
    characterType: Parameters<typeof formatCharacterType>[0];
  },
) {
  if (!metadata) return scenarioId;
  return `${metadata.characterName} - ${metadata.name} (${formatCharacterType(metadata.characterType)})`;
}

function buildMetricCards(stats?: ScenarioProgressStats) {
  return METRIC_DEFINITIONS.map((metric) => {
    const value = stats?.[metric.key] ?? 0;
    const total = stats?.total ?? 0;

    if (metric.key === 'total') {
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
        value={buildPercentValue(value, total)}
        meta={formatCount(value)}
      />
    );
  });
}

function buildMetricCardSkeletons(prefix: string) {
  return Array.from({ length: METRIC_DEFINITIONS.length }).map((_, index) => (
    <Skeleton key={`${prefix}-${index}`} height={124} />
  ));
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

export function UserProgressPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawAfter = searchParams.get('after') ?? '';
  const rawBefore = searchParams.get('before') ?? '';

  const after = rawAfter.trim();
  const before = rawBefore.trim();

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.after !== undefined) {
        const nextAfter = update.after.trim();
        if (nextAfter) {
          next.set('after', nextAfter);
        } else {
          next.delete('after');
        }
      }

      if (update.before !== undefined) {
        const nextBefore = update.before.trim();
        if (nextBefore) {
          next.set('before', nextBefore);
        } else {
          next.delete('before');
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const nextAfter = after || DEFAULT_AFTER;
    const nextBefore = before || getTodayDateValue();

    if (nextAfter === after && nextBefore === before) return;

    updateSearchParams(
      {
        after: nextAfter,
        before: nextBefore,
      },
      true,
    );
  }, [after, before, updateSearchParams]);

  const hasValidDates = isValidDateValue(after) && isValidDateValue(before);

  const progressQuery = useMemo(
    () => ({
      after,
      before,
    }),
    [after, before],
  );

  const { data, error, isLoading } = useUserProgressStats(
    progressQuery,
    hasValidDates,
  );

  const breakdownColumns = useMemo(
    () => [
      { key: 'name', label: 'Name' },
      ...METRIC_DEFINITIONS.map((metric) => ({
        key: metric.key,
        label: metric.label,
      })),
    ],
    [],
  );

  const breakdownRows = useMemo(() => {
    const entries = Object.entries(data?.byScenario ?? {});

    return entries
      .map(([scenarioId, stats]) => {
        const metadata = data?.scenariosData?.[scenarioId];
        const name = buildScenarioName(scenarioId, metadata);

        return {
          nameValue: name,
          totalValue: stats.total,
          name: (
            <div className={`${s.tableCell} ${s.nameCell}`}>
              <Typography variant="body">{name}</Typography>
            </div>
          ),
          ...Object.fromEntries(
            METRIC_DEFINITIONS.map((metric) => {
              if (metric.key === 'total') {
                return [metric.key, formatCount(stats[metric.key])];
              }

              return [
                metric.key,
                buildPercentWithCount(stats[metric.key], stats.total),
              ];
            }),
          ),
        };
      })
      .sort((left, right) => {
        if (right.totalValue !== left.totalValue) {
          return right.totalValue - left.totalValue;
        }

        return left.nameValue.localeCompare(right.nameValue);
      });
  }, [data?.byScenario, data?.scenariosData]);

  const breakdownSkeletonRows = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, index) => ({
        name: <Skeleton key={`name-${index}`} height={20} />,
        ...Object.fromEntries(
          METRIC_DEFINITIONS.map((metric) => [
            metric.key,
            <Skeleton
              key={`${metric.key}-${index}`}
              height={metric.key === 'total' ? 20 : 40}
            />,
          ]),
        ),
      })),
    [],
  );

  return (
    <AppShell>
      <Container className={s.page} size="wide">
        <div className={s.header}>
          <Typography variant="h2">User Progress</Typography>
        </div>

        <Stack gap="24px">
          {error ? (
            <Alert
              tone="danger"
              title="Unable to load user progress"
              description="Please retry or adjust the filters."
            />
          ) : null}

          <div className={s.filters}>
            <FormRow columns={2}>
              <Field label="From" className={s.filterField}>
                <Input
                  type="date"
                  size="sm"
                  value={after}
                  onChange={(event) =>
                    updateSearchParams({ after: event.target.value })
                  }
                  fullWidth
                />
              </Field>
              <Field label="To" className={s.filterField}>
                <Input
                  type="date"
                  size="sm"
                  value={before}
                  onChange={(event) =>
                    updateSearchParams({ before: event.target.value })
                  }
                  fullWidth
                />
              </Field>
            </FormRow>
            <Typography variant="caption" tone="muted" className={s.note}>
              All non-total metrics are calculated from total.
            </Typography>
          </div>

          <Section title="Totals">
            {isLoading && !data ? (
              <Grid columns={KPI_GRID_COLUMNS} gap={4}>
                {buildMetricCardSkeletons('totals')}
              </Grid>
            ) : (
              <Grid columns={KPI_GRID_COLUMNS} gap={4}>
                {buildMetricCards(data?.totals)}
              </Grid>
            )}
          </Section>

          <Section title="Unique totals">
            {isLoading && !data ? (
              <Grid columns={KPI_GRID_COLUMNS} gap={4}>
                {buildMetricCardSkeletons('totals-unique')}
              </Grid>
            ) : (
              <Grid columns={KPI_GRID_COLUMNS} gap={4}>
                {buildMetricCards(data?.totalsUnique)}
              </Grid>
            )}
          </Section>

          <Section title="By scenario">
            {isLoading && !data ? (
              <Table
                columns={breakdownColumns}
                rows={breakdownSkeletonRows}
                scrollable
                minWidth={TABLE_MIN_WIDTH}
              />
            ) : breakdownRows.length === 0 ? (
              <EmptyState
                title="No scenario progress found"
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
