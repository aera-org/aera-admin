import {
  formatCount,
  formatMetricValue,
  formatMonthLabel,
  getMetricDefinition,
  useAnalyticsDaily,
  useAnalyticsDeeplinks,
  useAnalyticsMainRange,
} from '@/app/analytics';
import {
  calculateGeneralMetrics,
  GENERAL_CPA_USD,
  getGeneralDateRange,
} from '@/app/analytics/generalMetrics';
import {
  Alert,
  Button,
  Card,
  Field,
  FormRow,
  Input,
  Section,
  Skeleton,
  Typography,
} from '@/atoms';

import s from './AnalyticsPage.module.scss';

const currencyMetric = getMetricDefinition('averageRevenuePerUniqueUserAll')!;

export function GeneralAnalytics({
  month,
  onMonthChange,
}: {
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const dates = getGeneralDateRange(month);
  // Never show the previous month's data under the newly selected month.
  const options = { placeholderData: () => undefined };
  const daily = useAnalyticsDaily(dates, options);
  const deeplinks = useAnalyticsDeeplinks(dates, options);
  const payments = useAnalyticsMainRange(
    { section: 'payments', startMonth: month, endMonth: month },
    options,
  );
  const metrics = calculateGeneralMetrics(
    daily.isError ? undefined : daily.data,
    deeplinks.isError ? undefined : deeplinks.data,
    payments.isError
      ? undefined
      : payments.data?.data.find((row) => row.month === month)?.revenue,
  );
  const cards = [
    {
      label: 'Starts unique',
      value: metrics.startsUnique,
      loading: daily.isPending,
      format: 'count',
    },
    {
      label: 'Paid starts unique',
      value: metrics.paidStartsUnique,
      loading: deeplinks.isPending,
      format: 'count',
    },
    {
      label: 'ARPUU All',
      value: metrics.arpuuAll,
      loading: daily.isPending,
      format: 'currency',
    },
    {
      label: 'ARPUU All (paid)',
      value: metrics.arpuuAllPaid,
      loading: deeplinks.isPending,
      format: 'currency',
    },
    {
      label: 'ROAS',
      value: metrics.roas,
      loading: payments.isPending || deeplinks.isPending,
      format: 'ratio',
      description: 'Revenue Payments ÷ (Paid starts unique × CPA).',
    },
    {
      label: 'CPA',
      value: GENERAL_CPA_USD,
      loading: false,
      format: 'currency',
    },
  ];

  return (
    <Section title="General" description={formatMonthLabel(month, 'long')}>
      <FormRow columns={1}>
        <Field label="Month">
          <Input
            type="month"
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
            aria-label="General month"
          />
        </Field>
      </FormRow>
      {[
        { name: 'Daily', query: daily },
        { name: 'Deeplinks', query: deeplinks },
        { name: 'Payments', query: payments },
      ].map(({ name, query }) =>
        query.isError ? (
          <div key={name}>
            <Alert
              tone="danger"
              title={`Unable to load ${name} analytics`}
              description="Retry or choose another month."
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Retry {name}
            </Button>
          </div>
        ) : null,
      )}
      <div className={s.kpiGrid}>
        {cards.map((card) => (
          <Card key={card.label} className={s.kpiCard} padding="md">
            <Typography variant="meta" tone="muted">
              {card.label}
            </Typography>
            {card.loading ? (
              <Skeleton height={32} />
            ) : (
              <Typography variant="h3">
                {card.value === null
                  ? '—'
                  : card.format === 'currency'
                    ? formatMetricValue(currencyMetric, card.value, 'card')
                    : card.format === 'ratio'
                      ? `${formatCount(card.value, 2)}×`
                      : formatCount(card.value)}
              </Typography>
            )}
            {card.description ? (
              <Typography variant="caption" tone="muted">
                {card.description}
              </Typography>
            ) : null}
          </Card>
        ))}
      </div>
    </Section>
  );
}
