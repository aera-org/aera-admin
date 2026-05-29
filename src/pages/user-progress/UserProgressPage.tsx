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
import { formatCharacterType } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './UserProgressPage.module.scss';

const DEFAULT_AFTER = '2026-05-27';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

  const {
    data,
    error,
    isLoading,
  } = useUserProgressStats(progressQuery, hasValidDates);

  const totals = data?.totals;
  const total = totals?.total ?? 0;
  const accepted = totals?.accepted ?? 0;
  const declined = totals?.declined ?? 0;
  const pending = totals?.pending ?? 0;

  const breakdownColumns = useMemo(
    () => [
      { key: 'name', label: 'Name' },
      { key: 'total', label: 'Total' },
      { key: 'pending', label: 'Pending' },
      { key: 'accepted', label: 'Accepted' },
      { key: 'declined', label: 'Declined' },
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
          name: (
            <div className={`${s.tableCell} ${s.nameCell}`}>
              <Typography variant="body">{name}</Typography>
            </div>
          ),
          totalValue: stats.total,
          total: formatCount(stats.total),
          pending: buildPercentWithCount(stats.pending, stats.total),
          accepted: buildPercentWithCount(stats.accepted, stats.total),
          declined: buildPercentWithCount(stats.declined, stats.total),
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
        total: <Skeleton key={`total-${index}`} height={20} />,
        pending: <Skeleton key={`pending-${index}`} height={40} />,
        accepted: <Skeleton key={`accepted-${index}`} height={40} />,
        declined: <Skeleton key={`declined-${index}`} height={40} />,
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
              <Field label="After" className={s.filterField}>
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
              <Field label="Before" className={s.filterField}>
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
              Accepted, declined, and pending are calculated from total.
            </Typography>
          </div>

          <Section title="Totals">
            {isLoading && !data ? (
              <Grid columns={4} gap={16}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} height={124} />
                ))}
              </Grid>
            ) : (
              <Grid columns={4} gap={16}>
                <MetricCard label="Total" value={formatCount(total)} />
                <MetricCard
                  label="Pending"
                  value={buildPercentValue(pending, total)}
                  meta={formatCount(pending)}
                />
                <MetricCard
                  label="Accepted"
                  value={buildPercentValue(accepted, total)}
                  meta={formatCount(accepted)}
                />
                <MetricCard
                  label="Declined"
                  value={buildPercentValue(declined, total)}
                  meta={formatCount(declined)}
                />
              </Grid>
            )}
          </Section>

          <Section title="By scenario">
            {isLoading && !data ? (
              <Table
                columns={breakdownColumns}
                rows={breakdownSkeletonRows}
                scrollable
                minWidth={920}
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
                minWidth={920}
              />
            )}
          </Section>
        </Stack>
      </Container>
    </AppShell>
  );
}
