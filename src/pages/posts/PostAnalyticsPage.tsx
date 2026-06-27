import { useQueries } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { formatCount } from '@/app/analytics';
import { useCharacters } from '@/app/characters';
import { getCharacterDetails } from '@/app/characters/charactersApi';
import { usePostAnalytics } from '@/app/posts';
import {
  Alert,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  Input,
  Section,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import {
  type ICharacterDetails,
  type IPost,
  type PostsStats,
  PostType,
} from '@/common/types';
import { formatCharacterSelectLabel } from '@/common/utils';
import { AppShell } from '@/components/templates';

import { PostUpsertDrawer } from './components/PostUpsertDrawer';
import s from './PostAnalyticsPage.module.scss';

type QueryUpdate = {
  start?: string;
  end?: string;
  scenarioId?: string;
  sort?: string;
};

type ScenarioOption = {
  label: string;
  value: string;
};

type ScenarioLookupItem = {
  characterId: string;
  scenarioId: string;
};

type SortKey = 'opened' | 'started' | 'bought';

type AnalyticsRow = {
  post: IPost;
  stats: PostsStats;
  scenarioLabel: string;
  sortValue: number;
};

const CHARACTER_LIST_LIMIT = 1000;
const SCENARIO_STALE_TIME = 15 * 60 * 1000;
const MIN_START_DATE = '2026-06-25';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_SORT: SortKey = 'opened';
const TABLE_MIN_WIDTH = 760;

const SORT_OPTIONS: Array<{ label: string; value: SortKey }> = [
  { label: 'Opened', value: 'opened' },
  { label: 'Started', value: 'started' },
  { label: 'Bought', value: 'bought' },
];

function toDateId(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateId(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isValidDateId(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE_PATTERN.test(value)) return false;
  const parsed = parseDateId(value);
  return toDateId(parsed) === value;
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

function resolveSort(value: string | null): SortKey {
  if (value === 'started' || value === 'bought' || value === 'opened') {
    return value;
  }
  return DEFAULT_SORT;
}

function formatScenarioOptionLabel(
  character: Pick<ICharacterDetails, 'name' | 'type'>,
  scenarioName: string,
) {
  return `${formatCharacterSelectLabel(character.name, character.type)} · ${scenarioName}`;
}

function getRate(count: number, opened: number) {
  if (opened <= 0) return 0;
  return count / opened;
}

function formatPercent(count: number, opened: number) {
  return `${formatCount(getRate(count, opened) * 100, 1)}%`;
}

function MetricCell({
  value,
  opened,
}: {
  value: number;
  opened: number;
}) {
  return (
    <div className={s.metricCell}>
      <Typography variant="body">{formatPercent(value, opened)}</Typography>
      <Typography variant="caption" tone="muted">
        {formatCount(value)}
      </Typography>
    </div>
  );
}

function PreviewCell({ post }: { post: IPost }) {
  const imageUrl = post.img?.url ?? '';
  const videoUrl = post.video?.url ?? '';
  const scenarioName = post.scenario?.name || 'Custom character';

  if (imageUrl) {
    return (
      <img
        className={s.previewMedia}
        src={imageUrl}
        alt={scenarioName}
        loading="lazy"
      />
    );
  }

  if (post.type === PostType.Video && videoUrl) {
    return (
      <video
        className={s.previewMedia}
        src={videoUrl}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <div className={s.previewPlaceholder}>
      <Typography variant="caption" tone="muted">
        No preview
      </Typography>
    </div>
  );
}

function getSortValue(stats: PostsStats, sort: SortKey) {
  if (sort === 'opened') return stats.opened;
  return getRate(stats[sort], stats.opened);
}

export function PostAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingPost, setEditingPost] = useState<IPost | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const rawStart = searchParams.get('start');
  const rawEnd = searchParams.get('end');
  const rawScenarioId = searchParams.get('scenarioId') ?? '';
  const rawSort = searchParams.get('sort');

  const maxSelectableDate = useMemo(() => {
    const today = toDateId(new Date());
    return today < MIN_START_DATE ? MIN_START_DATE : today;
  }, []);
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
  const scenarioFilter = rawScenarioId.trim();
  const sort = resolveSort(rawSort);

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

      if (update.scenarioId !== undefined) {
        const nextScenarioId = update.scenarioId.trim();
        if (nextScenarioId) {
          next.set('scenarioId', nextScenarioId);
        } else {
          next.delete('scenarioId');
        }
      }

      if (update.sort !== undefined) {
        const nextSort = resolveSort(update.sort);
        if (nextSort === DEFAULT_SORT) {
          next.delete('sort');
        } else {
          next.set('sort', nextSort);
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (start === rawStart && end === rawEnd) return;
    updateSearchParams({ start, end }, true);
  }, [end, rawEnd, rawStart, start, updateSearchParams]);

  const characterQueryParams = useMemo(
    () => ({
      order: 'ASC',
      skip: 0,
      take: CHARACTER_LIST_LIMIT,
    }),
    [],
  );

  const { data: characterData, isLoading: isCharactersLoading } =
    useCharacters(characterQueryParams);

  const scenarioQueryResults = useQueries({
    queries: (characterData?.data ?? []).map((character) => ({
      queryKey: ['character', character.id] as const,
      queryFn: () => getCharacterDetails(character.id),
      staleTime: SCENARIO_STALE_TIME,
    })),
  });

  const scenarioOptionData = useMemo(() => {
    const optionMap = new Map<string, ScenarioOption>();
    const lookupMap = new Map<string, ScenarioLookupItem>();
    const characters = characterData?.data ?? [];

    for (const [index, character] of characters.entries()) {
      const details = scenarioQueryResults[index]?.data;
      if (!details) continue;

      for (const scenario of details.scenarios) {
        optionMap.set(scenario.id, {
          label: formatScenarioOptionLabel(
            {
              name: character.name,
              type: character.type,
            },
            scenario.name || 'Untitled',
          ),
          value: scenario.id,
        });
        lookupMap.set(scenario.id, {
          characterId: character.id,
          scenarioId: scenario.id,
        });
      }
    }

    return {
      options: [
        { label: 'All scenarios', value: '' },
        ...Array.from(optionMap.values()).sort((left, right) =>
          left.label.localeCompare(right.label),
        ),
      ],
      lookup: lookupMap,
    };
  }, [characterData?.data, scenarioQueryResults]);

  const areScenarioOptionsLoading =
    isCharactersLoading ||
    scenarioQueryResults.some((query) => query.isLoading);

  useEffect(() => {
    if (!scenarioFilter || areScenarioOptionsLoading) return;

    const exists = scenarioOptionData.options.some(
      (option) => option.value === scenarioFilter,
    );
    if (!exists) {
      updateSearchParams({ scenarioId: '' }, true);
    }
  }, [
    areScenarioOptionsLoading,
    scenarioFilter,
    scenarioOptionData.options,
    updateSearchParams,
  ]);

  const analyticsParams = useMemo(
    () => ({
      start,
      end,
      scenarioId: scenarioFilter || undefined,
    }),
    [end, scenarioFilter, start],
  );

  const { data, error, isLoading, refetch } = usePostAnalytics(analyticsParams);

  const analyticsRows = useMemo<AnalyticsRow[]>(() => {
    return (data?.posts ?? [])
      .map((post) => {
        const stats = data?.data[post.id] ?? {
          opened: 0,
          started: 0,
          bought: 0,
        };
        const scenarioLabel = post.scenario?.name || 'Custom character';

        return {
          post,
          stats,
          scenarioLabel,
          sortValue: getSortValue(stats, sort),
        };
      })
      .sort((left, right) => {
        if (right.sortValue !== left.sortValue) {
          return right.sortValue - left.sortValue;
        }
        if (sort !== 'opened' && right.stats[sort] !== left.stats[sort]) {
          return right.stats[sort] - left.stats[sort];
        }
        if (right.stats.opened !== left.stats.opened) {
          return right.stats.opened - left.stats.opened;
        }
        return left.scenarioLabel.localeCompare(right.scenarioLabel);
      });
  }, [data?.data, data?.posts, sort]);

  const tableRows = useMemo(
    () =>
      analyticsRows.map(({ post, stats, scenarioLabel }) => ({
        preview: (
          <div className={s.previewFrame}>
            <PreviewCell post={post} />
          </div>
        ),
        scenario: (
          <div className={s.scenarioCell}>
            <Typography variant="body">{scenarioLabel}</Typography>
            <Typography variant="caption" tone="muted">
              {post.type === PostType.Video ? 'Video' : 'Image'}
            </Typography>
          </div>
        ),
        opened: (
          <Typography variant="body" className={s.alignRight}>
            {formatCount(stats.opened)}
          </Typography>
        ),
        started: <MetricCell value={stats.started} opened={stats.opened} />,
        bought: <MetricCell value={stats.bought} opened={stats.opened} />,
      })),
    [analyticsRows],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, index) => ({
        preview: <Skeleton key={`preview-${index}`} height={48} width={48} />,
        scenario: (
          <div className={s.scenarioCell}>
            <Skeleton key={`scenario-${index}`} height={18} width={180} />
            <Skeleton key={`type-${index}`} height={12} width={64} />
          </div>
        ),
        opened: (
          <div className={s.alignRight}>
            <Skeleton key={`opened-${index}`} height={16} width={56} />
          </div>
        ),
        started: <Skeleton key={`started-${index}`} height={40} width={72} />,
        bought: <Skeleton key={`bought-${index}`} height={40} width={72} />,
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && analyticsRows.length === 0;
  const showTable = !showEmpty && !error;

  const columns = useMemo(
    () => [
      { key: 'preview', label: 'Preview' },
      { key: 'scenario', label: 'Scenario' },
      {
        key: 'opened',
        label: (
          <Typography variant="caption" as="span" className={s.alignRight}>
            Opened
          </Typography>
        ),
      },
      {
        key: 'started',
        label: (
          <Typography variant="caption" as="span" className={s.alignRight}>
            Started
          </Typography>
        ),
      },
      {
        key: 'bought',
        label: (
          <Typography variant="caption" as="span" className={s.alignRight}>
            Bought
          </Typography>
        ),
      },
    ],
    [],
  );

  const openDetails = (post: IPost) => {
    setEditingPost(post);
    setIsDrawerOpen(true);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      setEditingPost(null);
    }
  };

  const drawerScenarioId = editingPost?.scenario?.id ?? scenarioFilter;
  const drawerScenarioLookup = drawerScenarioId
    ? scenarioOptionData.lookup.get(drawerScenarioId) ?? null
    : null;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Post Analytics</Typography>
            <Typography variant="meta" tone="muted">
              Review post conversion from opens to paid starts.
            </Typography>
          </div>
        </div>

        <div className={s.filters}>
          <FormRow columns={3}>
            <Field label="Post created from" labelFor="post-analytics-start">
              <Input
                id="post-analytics-start"
                type="date"
                size="sm"
                min={MIN_START_DATE}
                max={maxSelectableDate}
                value={start}
                onChange={(event) =>
                  updateSearchParams({ start: event.target.value })
                }
                fullWidth
              />
            </Field>
            <Field label="Post created to" labelFor="post-analytics-end">
              <Input
                id="post-analytics-end"
                type="date"
                size="sm"
                min={MIN_START_DATE}
                max={maxSelectableDate}
                value={end}
                onChange={(event) =>
                  updateSearchParams({ end: event.target.value })
                }
                fullWidth
              />
            </Field>
            <Field label="Scenario" labelFor="post-analytics-scenario">
              <Select
                id="post-analytics-scenario"
                options={scenarioOptionData.options}
                value={scenarioFilter}
                size="sm"
                placeholder={
                  areScenarioOptionsLoading
                    ? 'Loading scenarios...'
                    : 'All scenarios'
                }
                disabled={areScenarioOptionsLoading}
                onChange={(value) => updateSearchParams({ scenarioId: value })}
                fullWidth
              />
            </Field>
          </FormRow>

          <div className={s.sortRow}>
            <Field label="Sort" labelFor="post-analytics-sort" layout="inline">
              <Select
                id="post-analytics-sort"
                options={SORT_OPTIONS}
                value={sort}
                size="sm"
                variant="ghost"
                onChange={(value) => updateSearchParams({ sort: value })}
                fitContent
              />
            </Field>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load post analytics"
              description={
                error instanceof Error ? error.message : 'Please try again.'
              }
              tone="warning"
            />
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : null}

        {showEmpty ? (
          <EmptyState
            title="No post analytics found"
            description="Adjust the filters to see post analytics."
          />
        ) : null}

        {showTable ? (
          <Section title="Posts">
            <Table
              columns={columns}
              rows={showSkeleton ? skeletonRows : tableRows}
              scrollable
              minWidth={TABLE_MIN_WIDTH}
              getRowProps={
                showSkeleton
                  ? undefined
                  : (_, index) => {
                      const row = analyticsRows[index];
                      if (!row) return {};
                      return {
                        className: s.clickableRow,
                        role: 'button',
                        tabIndex: 0,
                        onClick: () => openDetails(row.post),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDetails(row.post);
                          }
                        },
                      };
                    }
              }
            />
          </Section>
        ) : null}
      </Container>

      <PostUpsertDrawer
        open={isDrawerOpen}
        onOpenChange={handleDrawerOpenChange}
        post={editingPost}
        initialCharacterId={drawerScenarioLookup?.characterId}
        initialScenarioId={editingPost?.scenario?.id ?? scenarioFilter}
      />
    </AppShell>
  );
}
