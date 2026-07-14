import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  addMonths,
  compareMonthIds,
  formatCount,
  formatMonthLabel,
  getLastFullMonthId,
  getMonthRange,
  isValidMonthId,
  type ActiveUsersScenario,
  type ActiveUserStats,
  type MonthId,
  useAnalyticsActiveUsers,
} from '@/app/analytics';
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
import { formatCharacterType } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './ActiveUsersPage.module.scss';

const MONTH_OPTION_COUNT = 36;
const KPI_GRID_COLUMNS = 6;
const TABLE_MIN_WIDTH = 1040;

type MetricKey = keyof ActiveUserStats;
type RatioBase = 'users' | 'chats';

type MetricDefinition = {
  key: MetricKey;
  label: string;
  ratioBase: RatioBase | null;
  ratioLabel: string | null;
  ratioKind: 'percent' | 'average' | null;
};

type MetricDisplay = {
  value: string;
  meta: string | null;
  searchText: string;
};

type MetricCardProps = {
  label: string;
  display: MetricDisplay;
};

const METRIC_DEFINITIONS: MetricDefinition[] = [
  { key: 'users', label: 'Users', ratioBase: null, ratioLabel: null, ratioKind: null },
  {
    key: 'customers',
    label: 'Customers',
    ratioBase: 'users',
    ratioLabel: 'of users',
    ratioKind: 'percent',
  },
  {
    key: 'chats',
    label: 'Chats',
    ratioBase: 'users',
    ratioLabel: 'per user',
    ratioKind: 'average',
  },
  {
    key: 'sessions',
    label: 'Sessions',
    ratioBase: 'chats',
    ratioLabel: 'per chat',
    ratioKind: 'average',
  },
  {
    key: 'photos',
    label: 'Photos',
    ratioBase: 'chats',
    ratioLabel: 'per chat',
    ratioKind: 'average',
  },
  {
    key: 'messages',
    label: 'Messages',
    ratioBase: 'chats',
    ratioLabel: 'per chat',
    ratioKind: 'average',
  },
];

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

function getEmptyStats(): ActiveUserStats {
  return {
    users: 0,
    customers: 0,
    chats: 0,
    sessions: 0,
    photos: 0,
    messages: 0,
  };
}

function normalizeStats(stats: ActiveUserStats | undefined): ActiveUserStats {
  const fallback = getEmptyStats();
  if (!stats) return fallback;

  return {
    users: Number.isFinite(stats.users) ? stats.users : 0,
    customers: Number.isFinite(stats.customers) ? stats.customers : 0,
    chats: Number.isFinite(stats.chats) ? stats.chats : 0,
    sessions: Number.isFinite(stats.sessions) ? stats.sessions : 0,
    photos: Number.isFinite(stats.photos) ? stats.photos : 0,
    messages: Number.isFinite(stats.messages) ? stats.messages : 0,
  };
}

function formatRatio(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${formatCount(value, 1)}%`;
}

function buildMetricDisplay(
  stats: ActiveUserStats,
  metric: MetricDefinition,
): MetricDisplay {
  const count = stats[metric.key];
  const value = formatCount(count);

  if (!metric.ratioBase || !metric.ratioKind || !metric.ratioLabel) {
    return { value, meta: null, searchText: value };
  }

  const denominator = stats[metric.ratioBase];
  const ratio = denominator > 0 ? count / denominator : 0;
  const meta =
    metric.ratioKind === 'percent'
      ? `${formatPercent(ratio * 100)} ${metric.ratioLabel}`
      : `${formatRatio(ratio)} ${metric.ratioLabel}`;

  return { value, meta, searchText: `${value} ${meta}` };
}

function MetricCard({ label, display }: MetricCardProps) {
  return (
    <Card className={s.kpiCard} padding="md">
      <Typography variant="caption" className={s.metricLabel}>
        {label}
      </Typography>
      <Typography variant="h2" className={s.metricValue}>
        {display.value}
      </Typography>
      {display.meta ? (
        <Typography variant="caption" className={s.metricMeta}>
          {display.meta}
        </Typography>
      ) : null}
    </Card>
  );
}

function buildMetricCell(display: MetricDisplay) {
  return (
    <div className={s.tableCell}>
      <Typography variant="body">{display.value}</Typography>
      {display.meta ? (
        <Typography variant="caption" className={s.tableMeta}>
          {display.meta}
        </Typography>
      ) : null}
    </div>
  );
}

function buildMetricCardSkeletons(prefix: string) {
  return Array.from({ length: METRIC_DEFINITIONS.length }).map((_, index) => (
    <Skeleton key={`${prefix}-${index}`} height={124} />
  ));
}

function buildScenarioLabel(scenarioId: string, scenario?: ActiveUsersScenario) {
  if (!scenario) return scenarioId;

  const scenarioName = scenario.name?.trim();
  const characterName = scenario.character?.name?.trim();
  if (!scenarioName) return scenarioId;
  if (!characterName || !scenario.character?.type) return scenarioName;

  return `${scenarioName} - ${characterName} (${formatCharacterType(scenario.character.type)})`;
}

type QueryUpdate = {
  month?: string;
  q?: string;
};

export function ActiveUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMonth = searchParams.get('month');
  const rawQuery = searchParams.get('q') ?? '';
  const defaultMonth = useMemo(() => getLastFullMonthId(), []);
  const month = isValidMonthId(rawMonth) ? rawMonth : defaultMonth;
  const searchQuery = rawQuery.trim();

  const { data, error, isLoading } = useAnalyticsActiveUsers({ month });

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.month !== undefined) {
        next.set('month', update.month);
      }

      if (update.q !== undefined) {
        const nextQuery = update.q.trim();
        if (nextQuery) {
          next.set('q', nextQuery);
        } else {
          next.delete('q');
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (rawMonth === month) return;
    updateSearchParams({ month }, true);
  }, [month, rawMonth, updateSearchParams]);

  const monthOptions = useMemo(
    () => buildMonthOptions(month, defaultMonth),
    [defaultMonth, month],
  );

  const scenarioById = useMemo(
    () => new Map((data?.scenarios ?? []).map((scenario) => [scenario.id, scenario])),
    [data?.scenarios],
  );

  const totals = useMemo(() => normalizeStats(data?.data.totals), [data]);

  const totalCards = useMemo(
    () =>
      METRIC_DEFINITIONS.map((metric) => (
        <MetricCard
          key={metric.key}
          label={metric.label}
          display={buildMetricDisplay(totals, metric)}
        />
      )),
    [totals],
  );

  const tableColumns = useMemo(
    () => [
      { key: 'scenario', label: 'Scenario' },
      ...METRIC_DEFINITIONS.map((metric) => ({
        key: metric.key,
        label: metric.label,
      })),
    ],
    [],
  );

  const tableRows = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();

    return Object.entries(data?.data.byScenario ?? {})
      .map(([scenarioId, rawStats]) => {
        const stats = normalizeStats(rawStats);
        const scenarioLabel = buildScenarioLabel(
          scenarioId,
          scenarioById.get(scenarioId),
        );
        const metricDisplays = Object.fromEntries(
          METRIC_DEFINITIONS.map((metric) => [
            metric.key,
            buildMetricDisplay(stats, metric),
          ]),
        ) as Record<MetricKey, MetricDisplay>;
        const searchText = [
          scenarioLabel,
          ...METRIC_DEFINITIONS.map(
            (metric) => `${metric.label} ${metricDisplays[metric.key].searchText}`,
          ),
        ]
          .join(' ')
          .toLowerCase();

        return {
          scenarioValue: scenarioLabel,
          usersValue: stats.users,
          searchText,
          scenario: (
            <div className={`${s.tableCell} ${s.scenarioCell}`}>
              <Typography variant="body">{scenarioLabel}</Typography>
            </div>
          ),
          ...Object.fromEntries(
            METRIC_DEFINITIONS.map((metric) => [
              metric.key,
              buildMetricCell(metricDisplays[metric.key]),
            ]),
          ),
        };
      })
      .filter((row) => !normalizedQuery || row.searchText.includes(normalizedQuery))
      .sort((left, right) => {
        if (right.usersValue !== left.usersValue) {
          return right.usersValue - left.usersValue;
        }

        return left.scenarioValue.localeCompare(right.scenarioValue);
      });
  }, [data?.data.byScenario, scenarioById, searchQuery]);

  const tableSkeletonRows = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, index) => ({
        scenario: <Skeleton key={`scenario-${index}`} height={20} />,
        ...Object.fromEntries(
          METRIC_DEFINITIONS.map((metric) => [
            metric.key,
            <Skeleton key={`${metric.key}-${index}`} height={40} />,
          ]),
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && tableRows.length === 0;

  return (
    <AppShell>
      <Container className={s.page} size="wide">
        <div className={s.header}>
          <Typography variant="h2">Active Users</Typography>
        </div>

        <Stack gap="24px">
          {error ? (
            <Alert
              tone="danger"
              title="Unable to load active users"
              description="Please retry or choose another month."
            />
          ) : null}

          <Section title="Filters">
            <div className={s.filters}>
              <FormRow columns={2}>
                <Field
                  label="Month"
                  labelFor="active-users-month"
                  className={s.filterField}
                >
                  <Select
                    id="active-users-month"
                    options={monthOptions}
                    value={month}
                    onChange={(value) => updateSearchParams({ month: value })}
                    size="sm"
                    fullWidth
                  />
                </Field>
                <Field
                  label="Search"
                  labelFor="active-users-search"
                  className={s.filterField}
                >
                  <Input
                    id="active-users-search"
                    size="sm"
                    value={rawQuery}
                    placeholder="Scenario or metric value"
                    onChange={(event) =>
                      updateSearchParams({ q: event.target.value })
                    }
                    fullWidth
                  />
                </Field>
              </FormRow>
            </div>
          </Section>

          <Section title="Totals">
            {showSkeleton ? (
              <Grid columns={KPI_GRID_COLUMNS} gap={4}>
                {buildMetricCardSkeletons('totals')}
              </Grid>
            ) : (
              <Grid columns={KPI_GRID_COLUMNS} gap={4}>
                {totalCards}
              </Grid>
            )}
          </Section>

          <Section title="By scenario">
            {showSkeleton ? (
              <Table
                columns={tableColumns}
                rows={tableSkeletonRows}
                scrollable
                minWidth={TABLE_MIN_WIDTH}
              />
            ) : showEmpty ? (
              <EmptyState
                title="No active users found"
                description={
                  searchQuery
                    ? 'Try another search query.'
                    : 'Try another month.'
                }
              />
            ) : (
              <Table
                columns={tableColumns}
                rows={tableRows}
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
