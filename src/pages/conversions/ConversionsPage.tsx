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
import { useConversions } from '@/app/conversions';
import {
  Alert,
  Button,
  ButtonGroup,
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
  type ChatStageStats,
  type ChatStats,
  type ConversionScenarioMetadata,
  type PaywallData,
  RoleplayStage,
  STAGES_IN_ORDER,
} from '@/common/types';
import { formatCharacterType, formatRoleplayStage } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './ConversionsPage.module.scss';

const MIN_START_DATE = '2026-06-17';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAILY_STAGE_ALL = 'all';
const SCENARIO_STAGE_TOTALS = 'totals';
const STAGE_MATRIX_SCENARIO_TOTALS = 'totals';
const CORE_TABLE_MIN_WIDTH = 960;
const PAYWALL_TABLE_MIN_WIDTH = 1560;

type QueryUpdate = {
  start?: string;
  end?: string;
};

type Lens = 'core' | 'subscription' | 'air';
type ValueFormat = 'count' | 'percent' | 'decimal';
type DailyStageKey = typeof DAILY_STAGE_ALL | RoleplayStage;
type ScenarioStageKey = typeof SCENARIO_STAGE_TOTALS | RoleplayStage;
type CoreMetricKey = 'total' | 'left' | 'messagesPerChat';
type PaywallMetricKey =
  | 'seenPerChat'
  | 'boughtPerChat'
  | 'avgSeenBeforeBought'
  | 'avgSeenBeforeLeft'
  | 'leftAfterSeen'
  | 'leftOnceSeen';
type CoreSortKey =
  | 'total'
  | 'left'
  | 'messages'
  | 'messagesPerChat'
  | 'name';
type PaywallSortKey =
  | 'bought'
  | 'seen'
  | 'leftAfterSeen'
  | 'leftOnceSeen'
  | 'avgSeenBeforeBought'
  | 'avgSeenBeforeLeft'
  | 'name';

type MetricPresentation = {
  value: number;
  format: ValueFormat;
  meta?: string;
};

type DailyChartDatum = {
  day: string;
  presentation: MetricPresentation;
};

type CoreMetricDefinition = {
  key: CoreMetricKey;
  label: string;
  getPresentation: (stats: ChatStageStats) => MetricPresentation;
};

type PaywallMetricDefinition = {
  key: PaywallMetricKey;
  label: string;
  getPresentation: (
    stats: ChatStageStats,
    paywall: PaywallData,
  ) => MetricPresentation;
};

type MetricCardProps = {
  label: string;
  value: string;
  meta?: string;
};

type AggregatedScenarioStats = {
  totals: ChatStageStats;
  byStage: Record<RoleplayStage, ChatStageStats>;
};

const LENS_OPTIONS: { value: Lens; label: string }[] = [
  { value: 'core', label: 'Core' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'air', label: 'Air' },
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

function createEmptyPaywallData(): PaywallData {
  return {
    seen: 0,
    bought: 0,
    seenTimesBeforeBought: 0,
    seenTimesBeforeLeft: 0,
    leftAfterSeen: 0,
    leftOnceSeen: 0,
  };
}

function createEmptyChatStageStats(): ChatStageStats {
  return {
    total: 0,
    left: 0,
    messages: 0,
    subscription: createEmptyPaywallData(),
    air: createEmptyPaywallData(),
  };
}

function createEmptyByStageRecord() {
  return STAGES_IN_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = createEmptyChatStageStats();
      return acc;
    },
    {} as Record<RoleplayStage, ChatStageStats>,
  );
}

function createEmptyChatStats(): ChatStats {
  return {
    totals: createEmptyChatStageStats(),
    byStage: createEmptyByStageRecord(),
  };
}

function createEmptyAggregatedScenarioStats(): AggregatedScenarioStats {
  return {
    totals: createEmptyChatStageStats(),
    byStage: createEmptyByStageRecord(),
  };
}

function addPaywallData(target: PaywallData, source?: PaywallData) {
  if (!source) return target;

  target.seen += source.seen ?? 0;
  target.bought += source.bought ?? 0;
  target.seenTimesBeforeBought += source.seenTimesBeforeBought ?? 0;
  target.seenTimesBeforeLeft += source.seenTimesBeforeLeft ?? 0;
  target.leftAfterSeen += source.leftAfterSeen ?? 0;
  target.leftOnceSeen += source.leftOnceSeen ?? 0;

  return target;
}

function addChatStageStats(target: ChatStageStats, source?: ChatStageStats) {
  if (!source) return target;

  target.total += source.total ?? 0;
  target.left += source.left ?? 0;
  target.messages += source.messages ?? 0;
  addPaywallData(target.subscription, source.subscription);
  addPaywallData(target.air, source.air);

  return target;
}

function addChatStats(target: ChatStats, source?: ChatStats) {
  if (!source) return target;

  addChatStageStats(target.totals, source.totals);

  STAGES_IN_ORDER.forEach((stage) => {
    addChatStageStats(target.byStage[stage], source.byStage?.[stage]);
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

function buildRatio(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function buildPercent(count: number, denominator: number) {
  if (denominator <= 0) return 0;
  return (count / denominator) * 100;
}

function getMessagesAverageDenominator(stats: ChatStageStats) {
  return Math.max(stats.total - stats.left, 0);
}

function buildMetaText(value: number, label: string) {
  return `${formatCount(value)} ${label}`;
}

function createCountPresentation(value: number): MetricPresentation {
  return {
    value,
    format: 'count',
  };
}

function createPercentPresentation(
  count: number,
  denominator: number,
  metaLabel: string,
): MetricPresentation {
  return {
    value: buildPercent(count, denominator),
    format: 'percent',
    meta: buildMetaText(count, metaLabel),
  };
}

function createDecimalPresentation(
  numerator: number,
  denominator: number,
  metaLabel: string,
): MetricPresentation {
  return {
    value: buildRatio(numerator, denominator),
    format: 'decimal',
    meta: buildMetaText(numerator, metaLabel),
  };
}

function formatPresentationValue(presentation: MetricPresentation) {
  switch (presentation.format) {
    case 'count':
      return formatCount(presentation.value);
    case 'percent':
      return `${formatCount(presentation.value, 1)}%`;
    default:
      return formatCount(presentation.value, 1);
  }
}

function buildMetricCell(presentation: MetricPresentation) {
  if (!presentation.meta) {
    return formatPresentationValue(presentation);
  }

  return (
    <div className={s.tableCell}>
      <Typography variant="body">
        {formatPresentationValue(presentation)}
      </Typography>
      <Typography variant="caption" className={s.tableMeta}>
        {presentation.meta}
      </Typography>
    </div>
  );
}

const CORE_METRIC_DEFINITIONS: CoreMetricDefinition[] = [
  {
    key: 'total',
    label: 'Total',
    getPresentation: (stats) => createCountPresentation(stats.total),
  },
  {
    key: 'left',
    label: 'Left',
    getPresentation: (stats) =>
      createPercentPresentation(stats.left, stats.total, 'left'),
  },
  {
    key: 'messagesPerChat',
    label: 'Avg messages/chat',
    getPresentation: (stats) =>
      createDecimalPresentation(
        stats.messages,
        getMessagesAverageDenominator(stats),
        'messages',
      ),
  },
];

const PAYWALL_METRIC_DEFINITIONS: PaywallMetricDefinition[] = [
  {
    key: 'seenPerChat',
    label: 'Seen/chat',
    getPresentation: (stats, paywall) =>
      createPercentPresentation(paywall.seen, stats.total, 'seen'),
  },
  {
    key: 'boughtPerChat',
    label: 'Bought/chat',
    getPresentation: (stats, paywall) =>
      createPercentPresentation(paywall.bought, stats.total, 'bought'),
  },
  {
    key: 'avgSeenBeforeBought',
    label: 'Avg seen before bought',
    getPresentation: (_, paywall) =>
      createDecimalPresentation(
        paywall.seenTimesBeforeBought,
        paywall.bought,
        'bought',
      ),
  },
  {
    key: 'avgSeenBeforeLeft',
    label: 'Avg seen before left',
    getPresentation: (stats, paywall) =>
      createDecimalPresentation(
        paywall.seenTimesBeforeLeft,
        stats.left,
        'left',
      ),
  },
  {
    key: 'leftOnceSeen',
    label: 'Left once seen',
    getPresentation: (stats, paywall) =>
      createPercentPresentation(paywall.leftOnceSeen, stats.total, 'once seen'),
  },
  {
    key: 'leftAfterSeen',
    label: 'Left after seen',
    getPresentation: (stats, paywall) =>
      createPercentPresentation(paywall.leftAfterSeen, stats.total, 'after seen'),
  },
];

const CORE_SORT_OPTIONS: { value: CoreSortKey; label: string }[] = [
  { value: 'total', label: 'Total chats' },
  { value: 'left', label: 'Left count' },
  { value: 'messages', label: 'Messages total' },
  { value: 'messagesPerChat', label: 'Avg messages/chat' },
  { value: 'name', label: 'Scenario name' },
];

const PAYWALL_SORT_OPTIONS: { value: PaywallSortKey; label: string }[] = [
  { value: 'bought', label: 'Bought count' },
  { value: 'seen', label: 'Seen count' },
  { value: 'leftOnceSeen', label: 'Left once seen count' },
  { value: 'leftAfterSeen', label: 'Left after seen count' },
  { value: 'avgSeenBeforeBought', label: 'Avg seen before bought' },
  { value: 'avgSeenBeforeLeft', label: 'Avg seen before left' },
  { value: 'name', label: 'Scenario name' },
];

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

function buildTableSkeletonRows(columnKeys: string[], rowCount = 5) {
  return Array.from({ length: rowCount }).map((_, index) =>
    Object.fromEntries(
      columnKeys.map((key) => [key, <Skeleton key={`${key}-${index}`} height={40} />]),
    ),
  );
}

function buildScenarioLabel(
  scenarioId: string,
  metadata?: ConversionScenarioMetadata,
) {
  if (!metadata) return scenarioId;

  const characterName = metadata.character.name.trim();
  const scenarioName = metadata.name.trim();

  if (!characterName || !scenarioName) {
    return scenarioId;
  }

  return `${characterName} - ${scenarioName} (${formatCharacterType(metadata.character.type)})`;
}

function getStageStats(
  stats: ChatStats | AggregatedScenarioStats | undefined,
  stage: ScenarioStageKey | DailyStageKey,
) {
  if (!stats) return createEmptyChatStageStats();
  if (stage === DAILY_STAGE_ALL || stage === SCENARIO_STAGE_TOTALS) {
    return stats.totals;
  }
  return stats.byStage[stage] ?? createEmptyChatStageStats();
}

function getPaywallData(stats: ChatStageStats, lens: Exclude<Lens, 'core'>) {
  return lens === 'subscription' ? stats.subscription : stats.air;
}

function getCoreMetricDefinition(key: CoreMetricKey) {
  return (
    CORE_METRIC_DEFINITIONS.find((metric) => metric.key === key) ??
    CORE_METRIC_DEFINITIONS[0]
  );
}

function getPaywallMetricDefinition(key: PaywallMetricKey) {
  return (
    PAYWALL_METRIC_DEFINITIONS.find((metric) => metric.key === key) ??
    PAYWALL_METRIC_DEFINITIONS[0]
  );
}

function compareScenarioNames(left: string, right: string) {
  return left.localeCompare(right);
}

function compareNumbersDesc(left: number, right: number) {
  return right - left;
}

function sortCoreRows(
  left: { label: string; stats: ChatStageStats },
  right: { label: string; stats: ChatStageStats },
  sortKey: CoreSortKey,
) {
  switch (sortKey) {
    case 'name':
      return compareScenarioNames(left.label, right.label);
    case 'left':
      return (
        compareNumbersDesc(left.stats.left, right.stats.left) ||
        compareNumbersDesc(left.stats.total, right.stats.total) ||
        compareScenarioNames(left.label, right.label)
      );
    case 'messages':
      return (
        compareNumbersDesc(left.stats.messages, right.stats.messages) ||
        compareNumbersDesc(left.stats.total, right.stats.total) ||
        compareScenarioNames(left.label, right.label)
      );
    case 'messagesPerChat':
      return (
        compareNumbersDesc(
          buildRatio(left.stats.messages, getMessagesAverageDenominator(left.stats)),
          buildRatio(
            right.stats.messages,
            getMessagesAverageDenominator(right.stats),
          ),
        ) ||
        compareNumbersDesc(left.stats.messages, right.stats.messages) ||
        compareScenarioNames(left.label, right.label)
      );
    default:
      return (
        compareNumbersDesc(left.stats.total, right.stats.total) ||
        compareNumbersDesc(left.stats.left, right.stats.left) ||
        compareScenarioNames(left.label, right.label)
      );
  }
}

function sortPaywallRows(
  left: { label: string; stats: ChatStageStats; paywall: PaywallData },
  right: { label: string; stats: ChatStageStats; paywall: PaywallData },
  sortKey: PaywallSortKey,
) {
  switch (sortKey) {
    case 'name':
      return compareScenarioNames(left.label, right.label);
    case 'seen':
      return (
        compareNumbersDesc(left.paywall.seen, right.paywall.seen) ||
        compareNumbersDesc(left.paywall.bought, right.paywall.bought) ||
        compareScenarioNames(left.label, right.label)
      );
    case 'leftAfterSeen':
      return (
        compareNumbersDesc(left.paywall.leftAfterSeen, right.paywall.leftAfterSeen) ||
        compareNumbersDesc(left.paywall.bought, right.paywall.bought) ||
        compareScenarioNames(left.label, right.label)
      );
    case 'leftOnceSeen':
      return (
        compareNumbersDesc(left.paywall.leftOnceSeen, right.paywall.leftOnceSeen) ||
        compareNumbersDesc(left.paywall.bought, right.paywall.bought) ||
        compareScenarioNames(left.label, right.label)
      );
    case 'avgSeenBeforeBought':
      return (
        compareNumbersDesc(
          buildRatio(
            left.paywall.seenTimesBeforeBought,
            left.paywall.bought,
          ),
          buildRatio(
            right.paywall.seenTimesBeforeBought,
            right.paywall.bought,
          ),
        ) ||
        compareNumbersDesc(left.paywall.bought, right.paywall.bought) ||
        compareScenarioNames(left.label, right.label)
      );
    case 'avgSeenBeforeLeft':
      return (
        compareNumbersDesc(
          buildRatio(left.paywall.seenTimesBeforeLeft, left.stats.left),
          buildRatio(right.paywall.seenTimesBeforeLeft, right.stats.left),
        ) ||
        compareNumbersDesc(left.stats.left, right.stats.left) ||
        compareScenarioNames(left.label, right.label)
      );
    default:
      return (
        compareNumbersDesc(left.paywall.bought, right.paywall.bought) ||
        compareNumbersDesc(left.paywall.seen, right.paywall.seen) ||
        compareScenarioNames(left.label, right.label)
      );
  }
}

export function ConversionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dailyStage, setDailyStage] = useState<DailyStageKey>(DAILY_STAGE_ALL);
  const [dailyLens, setDailyLens] = useState<Lens>('core');
  const [dailyCoreMetric, setDailyCoreMetric] =
    useState<CoreMetricKey>('total');
  const [dailyPaywallMetric, setDailyPaywallMetric] =
    useState<PaywallMetricKey>('seenPerChat');
  const [stageMatrixLens, setStageMatrixLens] = useState<Lens>('core');
  const [stageMatrixScenario, setStageMatrixScenario] = useState<string>(
    STAGE_MATRIX_SCENARIO_TOTALS,
  );
  const [scenarioStage, setScenarioStage] =
    useState<ScenarioStageKey>(SCENARIO_STAGE_TOTALS);
  const [scenarioLens, setScenarioLens] = useState<Lens>('core');
  const [scenarioCoreSort, setScenarioCoreSort] =
    useState<CoreSortKey>('total');
  const [scenarioPaywallSort, setScenarioPaywallSort] =
    useState<PaywallSortKey>('bought');

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

  const { data, error, isLoading } = useConversions(query, isRangeValid);
  const errorDescription =
    error instanceof Error && error.message
      ? error.message
      : 'Please retry or adjust the filters.';

  const scenarioMetadataById = useMemo(
    () =>
      new Map((data?.scenarios ?? []).map((scenario) => [scenario.id, scenario])),
    [data?.scenarios],
  );

  const { allStats, byScenario } = useMemo(() => {
    const aggregatedAll = createEmptyChatStats();
    const aggregatedByScenario = new Map<string, AggregatedScenarioStats>();

    (data?.daysData ?? []).forEach((item) => {
      addChatStats(aggregatedAll, item.data.all);

      Object.entries(item.data.byScenario ?? {}).forEach(([scenarioId, stats]) => {
        const existing =
          aggregatedByScenario.get(scenarioId) ??
          createEmptyAggregatedScenarioStats();

        addChatStageStats(existing.totals, stats.totals);
        STAGES_IN_ORDER.forEach((stage) => {
          addChatStageStats(existing.byStage[stage], stats.byStage?.[stage]);
        });

        aggregatedByScenario.set(scenarioId, existing);
      });
    });

    return {
      allStats: aggregatedAll,
      byScenario: aggregatedByScenario,
    };
  }, [data?.daysData]);

  const dailyStageOptions = useMemo(
    () => [
      { value: DAILY_STAGE_ALL, label: 'All stages' },
      ...STAGES_IN_ORDER.map((stage) => ({
        value: stage,
        label: formatRoleplayStage(stage),
      })),
    ],
    [],
  );

  const scenarioStageOptions = useMemo(
    () => [
      { value: SCENARIO_STAGE_TOTALS, label: 'Totals' },
      ...STAGES_IN_ORDER.map((stage) => ({
        value: stage,
        label: formatRoleplayStage(stage),
      })),
    ],
    [],
  );

  const stageMatrixScenarioOptions = useMemo(
    () => [
      { value: STAGE_MATRIX_SCENARIO_TOTALS, label: 'Totals' },
      ...[...byScenario.keys()]
        .map((scenarioId) => ({
          value: scenarioId,
          label: buildScenarioLabel(
            scenarioId,
            scenarioMetadataById.get(scenarioId),
          ),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    ],
    [byScenario, scenarioMetadataById],
  );

  useEffect(() => {
    if (stageMatrixScenario === STAGE_MATRIX_SCENARIO_TOTALS) return;
    if (byScenario.has(stageMatrixScenario)) return;
    setStageMatrixScenario(STAGE_MATRIX_SCENARIO_TOTALS);
  }, [byScenario, stageMatrixScenario]);

  const coreMetricOptions = useMemo(
    () =>
      CORE_METRIC_DEFINITIONS.map((metric) => ({
        value: metric.key,
        label: metric.label,
      })),
    [],
  );

  const paywallMetricOptions = useMemo(
    () =>
      PAYWALL_METRIC_DEFINITIONS.map((metric) => ({
        value: metric.key,
        label: metric.label,
      })),
    [],
  );

  const activeDailyMetric =
    dailyLens === 'core'
      ? getCoreMetricDefinition(dailyCoreMetric)
      : getPaywallMetricDefinition(dailyPaywallMetric);
  const activeDailyMetricFormat =
    dailyLens === 'core'
      ? getCoreMetricDefinition(dailyCoreMetric).getPresentation(
          createEmptyChatStageStats(),
        ).format
      : getPaywallMetricDefinition(dailyPaywallMetric).getPresentation(
          createEmptyChatStageStats(),
          createEmptyPaywallData(),
        ).format;

  const coreTotalsCards = useMemo(
    () =>
      CORE_METRIC_DEFINITIONS.map((metric) => {
        const presentation = metric.getPresentation(allStats.totals);

        return (
          <MetricCard
            key={metric.key}
            label={metric.key === 'left' ? 'Left (no messages)' : metric.label}
            value={formatPresentationValue(presentation)}
            meta={presentation.meta}
          />
        );
      }),
    [allStats.totals],
  );

  const subscriptionTotalsCards = useMemo(
    () =>
      PAYWALL_METRIC_DEFINITIONS.map((metric) => {
        const presentation = metric.getPresentation(
          allStats.totals,
          allStats.totals.subscription,
        );

        return (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={formatPresentationValue(presentation)}
            meta={presentation.meta}
          />
        );
      }),
    [allStats.totals],
  );

  const airTotalsCards = useMemo(
    () =>
      PAYWALL_METRIC_DEFINITIONS.map((metric) => {
        const presentation = metric.getPresentation(
          allStats.totals,
          allStats.totals.air,
        );

        return (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={formatPresentationValue(presentation)}
            meta={presentation.meta}
          />
        );
      }),
    [allStats.totals],
  );

  const dailyChartData = useMemo(() => {
    return [...(data?.daysData ?? [])]
      .sort((left, right) => left.day.localeCompare(right.day))
      .map((item) => {
        const stats = getStageStats(item.data.all, dailyStage);
        const presentation =
          dailyLens === 'core'
            ? getCoreMetricDefinition(dailyCoreMetric).getPresentation(stats)
            : getPaywallMetricDefinition(dailyPaywallMetric).getPresentation(
                stats,
                getPaywallData(stats, dailyLens),
              );

        return {
          day: item.day,
          presentation,
        };
      })
      .filter((item) => Number.isFinite(item.presentation.value));
  }, [dailyCoreMetric, dailyLens, dailyPaywallMetric, dailyStage, data?.daysData]);

  const formatChartAxisValue = useCallback(
    (value: number) =>
      formatPresentationValue({
        value,
        format: activeDailyMetricFormat,
      }),
    [activeDailyMetricFormat],
  );

  const stageMatrixColumns = useMemo(() => {
    if (stageMatrixLens === 'core') {
      return [
        { key: 'name', label: 'Stage' },
        ...CORE_METRIC_DEFINITIONS.map((metric) => ({
          key: metric.key,
          label: metric.label,
        })),
      ];
    }

    return [
      { key: 'name', label: 'Stage' },
      ...PAYWALL_METRIC_DEFINITIONS.map((metric) => ({
        key: metric.key,
        label: metric.label,
      })),
    ];
  }, [stageMatrixLens]);

  const selectedStageMatrixStats = useMemo(
    () =>
      stageMatrixScenario === STAGE_MATRIX_SCENARIO_TOTALS
        ? allStats
        : byScenario.get(stageMatrixScenario) ??
          createEmptyAggregatedScenarioStats(),
    [allStats, byScenario, stageMatrixScenario],
  );

  const stageMatrixRows = useMemo(() => {
    const rows = [
      {
        label: 'Totals',
        stats: selectedStageMatrixStats.totals,
      },
      ...STAGES_IN_ORDER.map((stage) => ({
        label: formatRoleplayStage(stage),
        stats: selectedStageMatrixStats.byStage[stage],
      })),
    ];

    if (stageMatrixLens === 'core') {
      return rows.map((row) => ({
        name: (
          <div className={`${s.tableCell} ${s.nameCell}`}>
            <Typography variant="body">{row.label}</Typography>
          </div>
        ),
        ...Object.fromEntries(
          CORE_METRIC_DEFINITIONS.map((metric) => {
            const presentation = metric.getPresentation(row.stats);

            if (row.label === 'Totals' && metric.key === 'left') {
              return [
                metric.key,
                buildMetricCell({
                  ...presentation,
                  meta: presentation.meta
                    ? `${presentation.meta} (no messages)`
                    : '(no messages)',
                }),
              ];
            }

            return [metric.key, buildMetricCell(presentation)];
          }),
        ),
      }));
    }

    return rows.map((row) => {
      const paywall = getPaywallData(row.stats, stageMatrixLens);

      return {
        name: (
          <div className={`${s.tableCell} ${s.nameCell}`}>
            <Typography variant="body">{row.label}</Typography>
          </div>
        ),
        ...Object.fromEntries(
          PAYWALL_METRIC_DEFINITIONS.map((metric) => [
            metric.key,
            buildMetricCell(metric.getPresentation(row.stats, paywall)),
          ]),
        ),
      };
    });
  }, [selectedStageMatrixStats, stageMatrixLens]);

  const activeScenarioSort =
    scenarioLens === 'core' ? scenarioCoreSort : scenarioPaywallSort;

  const scenarioSortOptions =
    scenarioLens === 'core' ? CORE_SORT_OPTIONS : PAYWALL_SORT_OPTIONS;

  const scenarioBreakdownColumns = useMemo(() => {
    if (scenarioLens === 'core') {
      return [
        { key: 'name', label: 'Character + Scenario' },
        ...CORE_METRIC_DEFINITIONS.map((metric) => ({
          key: metric.key,
          label: metric.label,
        })),
      ];
    }

    return [
      { key: 'name', label: 'Character + Scenario' },
      ...PAYWALL_METRIC_DEFINITIONS.map((metric) => ({
        key: metric.key,
        label: metric.label,
      })),
    ];
  }, [scenarioLens]);

  const scenarioBreakdownRows = useMemo(() => {
    const rows = [...byScenario.entries()].map(([scenarioId, stats]) => {
      const selectedStats = getStageStats(stats, scenarioStage);
      const label = buildScenarioLabel(
        scenarioId,
        scenarioMetadataById.get(scenarioId),
      );

      return {
        scenarioId,
        label,
        stats: selectedStats,
        paywall:
          scenarioLens === 'core'
            ? null
            : getPaywallData(selectedStats, scenarioLens),
      };
    });

    if (scenarioLens === 'core') {
      rows.sort((left, right) =>
        sortCoreRows(
          {
            label: left.label,
            stats: left.stats,
          },
          {
            label: right.label,
            stats: right.stats,
          },
          activeScenarioSort as CoreSortKey,
        ),
      );

      return rows.map((row) => ({
        name: (
          <div className={`${s.tableCell} ${s.nameCell}`}>
            <Typography variant="body">{row.label}</Typography>
          </div>
        ),
        ...Object.fromEntries(
          CORE_METRIC_DEFINITIONS.map((metric) => [
            metric.key,
            buildMetricCell(metric.getPresentation(row.stats)),
          ]),
        ),
      }));
    }

    rows.sort((left, right) =>
      sortPaywallRows(
        {
          label: left.label,
          stats: left.stats,
          paywall: left.paywall ?? createEmptyPaywallData(),
        },
        {
          label: right.label,
          stats: right.stats,
          paywall: right.paywall ?? createEmptyPaywallData(),
        },
        activeScenarioSort as PaywallSortKey,
      ),
    );

    return rows.map((row) => {
      const paywall = row.paywall ?? createEmptyPaywallData();

      return {
        name: (
          <div className={`${s.tableCell} ${s.nameCell}`}>
            <Typography variant="body">{row.label}</Typography>
          </div>
        ),
        ...Object.fromEntries(
          PAYWALL_METRIC_DEFINITIONS.map((metric) => [
            metric.key,
            buildMetricCell(metric.getPresentation(row.stats, paywall)),
          ]),
        ),
      };
    });
  }, [
    activeScenarioSort,
    byScenario,
    scenarioCoreSort,
    scenarioLens,
    scenarioMetadataById,
    scenarioPaywallSort,
    scenarioStage,
  ]);

  const stageMatrixSkeletonRows = useMemo(
    () =>
      buildTableSkeletonRows(
        stageMatrixColumns.map((column) => column.key),
      ),
    [stageMatrixColumns],
  );

  const scenarioBreakdownSkeletonRows = useMemo(
    () =>
      buildTableSkeletonRows(
        scenarioBreakdownColumns.map((column) => column.key),
      ),
    [scenarioBreakdownColumns],
  );

  const hasGlobalData = (data?.daysData?.length ?? 0) > 0;

  const { ref: chartRef, width: chartWidth } =
    useElementWidth<HTMLDivElement>();

  return (
    <AppShell>
      <Container className={s.page} size="wide">
        <div className={s.header}>
          <Typography variant="h2">Conversions</Typography>
        </div>

        <Stack gap="24px">
          {error ? (
            <Alert
              tone="danger"
              title="Unable to load conversions"
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
              UTC dates. Start cannot be earlier than June 17, 2026. End cannot
              be later than the previous UTC day.
            </Typography>
          </div>

          <Section title="Core totals">
            {isLoading && !data ? (
              <Grid columns={CORE_METRIC_DEFINITIONS.length} gap={4}>
                {buildMetricCardSkeletons('core', CORE_METRIC_DEFINITIONS.length)}
              </Grid>
            ) : (
              <Grid columns={CORE_METRIC_DEFINITIONS.length} gap={4}>
                {coreTotalsCards}
              </Grid>
            )}
          </Section>

          <Section title="Subscription">
            {isLoading && !data ? (
              <Grid columns={PAYWALL_METRIC_DEFINITIONS.length} gap={4}>
                {buildMetricCardSkeletons(
                  'subscription',
                  PAYWALL_METRIC_DEFINITIONS.length,
                )}
              </Grid>
            ) : (
              <Grid columns={PAYWALL_METRIC_DEFINITIONS.length} gap={4}>
                {subscriptionTotalsCards}
              </Grid>
            )}
          </Section>

          <Section title="Air">
            {isLoading && !data ? (
              <Grid columns={PAYWALL_METRIC_DEFINITIONS.length} gap={4}>
                {buildMetricCardSkeletons(
                  'air',
                  PAYWALL_METRIC_DEFINITIONS.length,
                )}
              </Grid>
            ) : (
              <Grid columns={PAYWALL_METRIC_DEFINITIONS.length} gap={4}>
                {airTotalsCards}
              </Grid>
            )}
          </Section>

          <Section title="Daily">
            <div className={s.sectionControls}>
              <FormRow columns={3}>
                <Field label="Stage" className={s.filterField}>
                  <Select
                    options={dailyStageOptions}
                    value={dailyStage}
                    onChange={(value) => setDailyStage(value as DailyStageKey)}
                    size="sm"
                    fullWidth
                  />
                </Field>
                <Field label="Lens" className={s.filterField}>
                  <Select
                    options={LENS_OPTIONS}
                    value={dailyLens}
                    onChange={(value) => setDailyLens(value as Lens)}
                    size="sm"
                    fullWidth
                  />
                </Field>
                <Field label="Metric" className={s.filterField}>
                  <Select
                    options={
                      dailyLens === 'core'
                        ? coreMetricOptions
                        : paywallMetricOptions
                    }
                    value={
                      dailyLens === 'core' ? dailyCoreMetric : dailyPaywallMetric
                    }
                    onChange={(value) => {
                      if (dailyLens === 'core') {
                        setDailyCoreMetric(value as CoreMetricKey);
                        return;
                      }

                      setDailyPaywallMetric(value as PaywallMetricKey);
                    }}
                    size="sm"
                    fullWidth
                  />
                </Field>
              </FormRow>
            </div>

            <Card className={s.panel} padding="md">
              {isLoading && !data ? (
                <Skeleton height={260} />
              ) : dailyChartData.length ? (
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
                        numTicks={Math.min(6, dailyChartData.length)}
                      />
                      <AnimatedAxis
                        orientation="left"
                        numTicks={4}
                        tickFormat={(value) =>
                          formatChartAxisValue(Number(value))
                        }
                      />
                      <AnimatedLineSeries
                        dataKey={activeDailyMetric.label}
                        data={dailyChartData}
                        xAccessor={(datum) => datum.day}
                        yAccessor={(datum) => datum.presentation.value}
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
                                {formatPresentationValue(datum.presentation)}
                              </Typography>
                              {datum.presentation.meta ? (
                                <Typography
                                  variant="caption"
                                  as="div"
                                  className={s.tableMeta}
                                >
                                  {datum.presentation.meta}
                                </Typography>
                              ) : null}
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

          <Section
            title="Stage matrix"
            actions={
              <div className={s.stageActions}>
                <Field className={`${s.filterField} ${s.breakdownField}`}>
                  <Select
                    options={stageMatrixScenarioOptions}
                    value={stageMatrixScenario}
                    onChange={setStageMatrixScenario}
                    size="sm"
                  />
                </Field>

                <Typography variant="caption" tone="muted">
                  Lens
                </Typography>
                <ButtonGroup attached className={s.toggleGroup}>
                  {LENS_OPTIONS.map((option) => {
                    const isActive = option.value === stageMatrixLens;

                    return (
                      <Button
                        key={option.value}
                        size="sm"
                        variant={isActive ? 'secondary' : 'ghost'}
                        onClick={() => setStageMatrixLens(option.value)}
                        disabled={isActive}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </ButtonGroup>
              </div>
            }
          >
            {isLoading && !data ? (
              <Table
                columns={stageMatrixColumns}
                rows={stageMatrixSkeletonRows}
                scrollable
                minWidth={
                  stageMatrixLens === 'core'
                    ? CORE_TABLE_MIN_WIDTH
                    : PAYWALL_TABLE_MIN_WIDTH
                }
              />
            ) : !hasGlobalData ? (
              <EmptyState
                title="No stage data for this period"
                description="Try adjusting the date range."
              />
            ) : (
              <Table
                columns={stageMatrixColumns}
                rows={stageMatrixRows}
                scrollable
                minWidth={
                  stageMatrixLens === 'core'
                    ? CORE_TABLE_MIN_WIDTH
                    : PAYWALL_TABLE_MIN_WIDTH
                }
              />
            )}
          </Section>

          <Section title="Scenario breakdown">
            <div className={s.sectionControls}>
              <FormRow columns={3}>
                <Field label="Stage" className={s.filterField}>
                  <Select
                    options={scenarioStageOptions}
                    value={scenarioStage}
                    onChange={(value) =>
                      setScenarioStage(value as ScenarioStageKey)
                    }
                    size="sm"
                    fullWidth
                  />
                </Field>
                <Field label="Lens" className={s.filterField}>
                  <Select
                    options={LENS_OPTIONS}
                    value={scenarioLens}
                    onChange={(value) => setScenarioLens(value as Lens)}
                    size="sm"
                    fullWidth
                  />
                </Field>
                <Field label="Sort by" className={s.filterField}>
                  <Select
                    options={scenarioSortOptions}
                    value={activeScenarioSort}
                    onChange={(value) => {
                      if (scenarioLens === 'core') {
                        setScenarioCoreSort(value as CoreSortKey);
                        return;
                      }

                      setScenarioPaywallSort(value as PaywallSortKey);
                    }}
                    size="sm"
                    fullWidth
                  />
                </Field>
              </FormRow>
            </div>

            {isLoading && !data ? (
              <Table
                columns={scenarioBreakdownColumns}
                rows={scenarioBreakdownSkeletonRows}
                scrollable
                minWidth={
                  scenarioLens === 'core'
                    ? CORE_TABLE_MIN_WIDTH
                    : PAYWALL_TABLE_MIN_WIDTH
                }
              />
            ) : scenarioBreakdownRows.length === 0 ? (
              <EmptyState
                title="No conversions found"
                description="Try another date range."
              />
            ) : (
              <Table
                columns={scenarioBreakdownColumns}
                rows={scenarioBreakdownRows}
                scrollable
                minWidth={
                  scenarioLens === 'core'
                    ? CORE_TABLE_MIN_WIDTH
                    : PAYWALL_TABLE_MIN_WIDTH
                }
              />
            )}
          </Section>
        </Stack>
      </Container>
    </AppShell>
  );
}
