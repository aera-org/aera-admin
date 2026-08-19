import { useCallback, useEffect, useMemo } from 'react';
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
  isValidMonthId,
  type MonthId,
  type PaymentsConversionGroupBy,
  type Quadrant,
  type RankedItem,
  rankItems,
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
};

function isGroupBy(value: string | null): value is GroupBy {
  return value === 'scenario' || value === 'character';
}

function isConfidenceFilter(value: string | null): value is ConfidenceFilter {
  return value === 'all' || value === 'highMedium' || value === 'high';
}

function buildMonthOptions(selectedMonth: MonthId, defaultMonth: MonthId) {
  const rangeStart = addMonths(defaultMonth, -(MONTH_OPTION_COUNT - 1));
  const months = getMonthRange(rangeStart, defaultMonth);
  if (!months.includes(selectedMonth)) {
    months.push(selectedMonth);
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
  const defaultMonth = useMemo(() => getLastFullMonthId(), []);
  const month = isValidMonthId(rawMonth) ? rawMonth : defaultMonth;
  const groupBy: GroupBy = isGroupBy(rawGroupBy) ? rawGroupBy : 'scenario';
  const confidence: ConfidenceFilter = isConfidenceFilter(rawConfidence)
    ? rawConfidence
    : 'all';

  const conversionQuery = usePaymentsConversionBreakdown({
    groupBy,
    month,
  });
  const revenueQuery = usePaymentsRevenueBreakdown({
    groupBy,
    month,
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
      }
      if (update.confidence !== undefined) {
        if (update.confidence === 'all') {
          next.delete('confidence');
        } else {
          next.set('confidence', update.confidence);
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
        meta="Partner traffic, not attractiveness"
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
