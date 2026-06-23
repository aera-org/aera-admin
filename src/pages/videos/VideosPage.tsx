import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCharacterDetails, useCharacters } from '@/app/characters';
import { useVideoGenerations } from '@/app/video-generations';
import { PlusIcon } from '@/assets/icons';
import {
  Alert,
  Button,
  Container,
  EmptyState,
  Field,
  Input,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import type { IVideoGenerationSet, Pose } from '@/common/types';
import {
  Pose as PoseEnum,
  VideoAspectRatio,
  VideoQuality,
  VideoResolution,
} from '@/common/types';
import {
  formatCharacterSelectLabel,
  formatCharacterType,
  formatPose,
  poseOptions,
} from '@/common/utils';
import { AppShell } from '@/components/templates';
import { SearchSelect } from '@/pages/generations/components/SearchSelect';

import { VideoCreateDrawer } from './components/VideoCreateDrawer';
import s from './VideosPage.module.scss';

type QueryUpdate = {
  search?: string;
  order?: string;
  page?: number;
  pageSize?: number;
  characterId?: string;
  scenarioId?: string;
  pose?: string;
};

type SelectOption = {
  id: string;
  label: string;
  meta?: string;
};

const ORDER_OPTIONS = [
  { label: 'Ascending', value: 'ASC' },
  { label: 'Descending', value: 'DESC' },
];

const ORDER_VALUES = new Set(ORDER_OPTIONS.map((option) => option.value));
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_ORDER = 'DESC';
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_POSE_FILTER = 'all';
const SEARCH_DEBOUNCE_MS = 400;
const POSE_VALUES = new Set(Object.values(PoseEnum));
const POSE_FILTER_OPTIONS = [
  { label: 'All poses', value: DEFAULT_POSE_FILTER },
  ...poseOptions.map((option) => ({
    label: option.label,
    value: option.value,
  })),
];

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

function parsePositiveNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parsePageSize(value: string | null) {
  const parsed = parsePositiveNumber(value, DEFAULT_PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

function resolvePoseFilter(value: string | null) {
  if (!value || value === DEFAULT_POSE_FILTER) return DEFAULT_POSE_FILTER;
  if (POSE_VALUES.has(value as Pose)) return value;
  return DEFAULT_POSE_FILTER;
}

function formatQuality(value: VideoQuality) {
  if (value === VideoQuality.Low) return 'Low';
  if (value === VideoQuality.Medium) return 'Medium';
  return 'High';
}

function formatResolution(value: VideoResolution) {
  return `${value}p`;
}

function formatAspectRatio(value: VideoAspectRatio) {
  if (value === VideoAspectRatio.Square) return 'Square';
  if (value === VideoAspectRatio.Standard) return 'Standard';
  if (value === VideoAspectRatio.Horizontal) return 'Horizontal';
  return 'Vertical';
}

function formatScenarioLabel(scenario: IVideoGenerationSet['scenario']) {
  if (!scenario) return '-';
  return `${scenario.character.name} - ${scenario.name} (${formatCharacterType(scenario.character.type)})`;
}

function mergeSelectedOption<T extends SelectOption>(
  options: T[],
  selected?: T,
) {
  if (!selected) return options;
  if (options.some((option) => option.id === selected.id)) return options;
  return [selected, ...options];
}

export function VideosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');
  const rawCharacterId = searchParams.get('characterId') ?? '';
  const rawScenarioId = searchParams.get('scenarioId') ?? '';
  const rawPose = searchParams.get('pose');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [characterSearch, setCharacterSearch] = useState('');
  const debouncedCharacterSearch = useDebouncedValue(characterSearch, 300);

  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);
  const characterFilter = rawCharacterId.trim();
  const scenarioFilter = rawScenarioId.trim();
  const poseFilter = resolvePoseFilter(rawPose);

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.search !== undefined) {
        const nextSearch = update.search.trim();
        if (nextSearch) {
          next.set('search', nextSearch);
        } else {
          next.delete('search');
        }
      }

      if (update.order !== undefined) {
        if (update.order && update.order !== DEFAULT_ORDER) {
          next.set('order', update.order);
        } else {
          next.delete('order');
        }
      }

      if (update.page !== undefined) {
        if (update.page > 1) {
          next.set('page', String(update.page));
        } else {
          next.delete('page');
        }
      }

      if (update.pageSize !== undefined) {
        if (update.pageSize !== DEFAULT_PAGE_SIZE) {
          next.set('pageSize', String(update.pageSize));
        } else {
          next.delete('pageSize');
        }
      }

      if (update.characterId !== undefined) {
        if (update.characterId) {
          next.set('characterId', update.characterId);
        } else {
          next.delete('characterId');
        }
      }

      if (update.scenarioId !== undefined) {
        if (update.scenarioId) {
          next.set('scenarioId', update.scenarioId);
        } else {
          next.delete('scenarioId');
        }
      }

      if (update.pose !== undefined) {
        if (update.pose && update.pose !== DEFAULT_POSE_FILTER) {
          next.set('pose', update.pose);
        } else {
          next.delete('pose');
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    setSearchInput(rawSearch);
  }, [rawSearch]);

  useEffect(() => {
    if (normalizedSearch === rawSearch) return;
    updateSearchParams({ search: normalizedSearch, page: 1 }, true);
  }, [normalizedSearch, rawSearch, updateSearchParams]);

  const characterQueryParams = useMemo(
    () => ({
      search: debouncedCharacterSearch || undefined,
      order: 'ASC',
      skip: 0,
      take: 20,
    }),
    [debouncedCharacterSearch],
  );

  const { data: characterData, isLoading: isCharactersLoading } = useCharacters(
    characterQueryParams,
  );
  const { data: filterCharacterDetails, isLoading: isFilterCharacterLoading } =
    useCharacterDetails(characterFilter || null);

  useEffect(() => {
    if (!scenarioFilter) return;
    if (!characterFilter) {
      updateSearchParams({ scenarioId: '', page: 1 }, true);
      return;
    }
    if (!filterCharacterDetails) return;
    const exists = filterCharacterDetails.scenarios.some(
      (scenario) => scenario.id === scenarioFilter,
    );
    if (!exists) {
      updateSearchParams({ scenarioId: '', page: 1 }, true);
    }
  }, [
    characterFilter,
    filterCharacterDetails,
    scenarioFilter,
    updateSearchParams,
  ]);

  const queryParams = useMemo(
    () => ({
      search: normalizedSearch || undefined,
      scenarioId: scenarioFilter || undefined,
      pose:
        poseFilter === DEFAULT_POSE_FILTER
          ? undefined
          : (poseFilter as Pose),
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [normalizedSearch, order, page, pageSize, poseFilter, scenarioFilter],
  );

  const { data, error, isLoading, refetch } = useVideoGenerations(queryParams);

  const videos = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;
  const effectiveTake = data?.take ?? pageSize;
  const effectiveSkip = data?.skip ?? (page - 1) * pageSize;
  const totalPages = total > 0 ? Math.ceil(total / effectiveTake) : 1;

  useEffect(() => {
    if (!data || total === 0) return;
    if (page > totalPages) {
      updateSearchParams({ page: totalPages }, true);
    }
  }, [data, page, total, totalPages, updateSearchParams]);

  const characterOptions = useMemo(
    () =>
      mergeSelectedOption(
        (characterData?.data ?? []).map((character) => ({
          id: character.id,
          label: formatCharacterSelectLabel(character.name, character.type),
          meta: character.id,
        })),
        filterCharacterDetails
          ? {
              id: filterCharacterDetails.id,
              label: formatCharacterSelectLabel(
                filterCharacterDetails.name,
                filterCharacterDetails.type,
              ),
              meta: filterCharacterDetails.id,
            }
          : undefined,
      ),
    [characterData?.data, filterCharacterDetails],
  );

  const scenarioOptions = useMemo(() => {
    return (filterCharacterDetails?.scenarios ?? []).map((scenario) => ({
      label: scenario.name,
      value: scenario.id,
    }));
  }, [filterCharacterDetails?.scenarios]);

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Video' },
      { key: 'scenario', label: 'Scenario' },
      { key: 'pose', label: 'Pose' },
      { key: 'quality', label: 'Quality' },
      { key: 'resolution', label: 'Resolution' },
      { key: 'aspectRatio', label: 'Aspect ratio' },
      { key: 'duration', label: <span className={s.alignRight}>Duration</span> },
      { key: 'count', label: <span className={s.alignRight}>Count</span> },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      videos.map((video) => ({
        name: (
          <div className={s.nameCell}>
            <Typography variant="body">{video.name}</Typography>
            <Typography variant="caption" tone="muted">
              {video.id}
            </Typography>
          </div>
        ),
        scenario: (
          <Typography variant="body" tone="muted">
            {formatScenarioLabel(video.scenario)}
          </Typography>
        ),
        pose: (
          <Typography variant="body" tone="muted">
            {formatPose(video.pose)}
          </Typography>
        ),
        quality: (
          <Typography variant="body" tone="muted">
            {formatQuality(video.quality)}
          </Typography>
        ),
        resolution: (
          <Typography variant="body" tone="muted">
            {formatResolution(video.resolution)}
          </Typography>
        ),
        aspectRatio: (
          <Typography variant="body" tone="muted">
            {formatAspectRatio(video.aspectRatio)}
          </Typography>
        ),
        duration: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {video.duration}s
          </Typography>
        ),
        count: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {video.count.toLocaleString()}
          </Typography>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(video.updatedAt)}
          </Typography>
        ),
      })),
    [videos],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        name: (
          <div className={s.nameCell} key={`video-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        scenario: <Skeleton width={180} height={12} />,
        pose: <Skeleton width={90} height={12} />,
        quality: <Skeleton width={80} height={12} />,
        resolution: <Skeleton width={80} height={12} />,
        aspectRatio: <Skeleton width={90} height={12} />,
        duration: (
          <div className={s.alignRight}>
            <Skeleton width={48} height={12} />
          </div>
        ),
        count: (
          <div className={s.alignRight}>
            <Skeleton width={48} height={12} />
          </div>
        ),
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && videos.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;
  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const openDetails = (video: IVideoGenerationSet) => {
    navigate(`/videos/${video.id}`);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Videos</Typography>
          </div>
          <Button iconLeft={<PlusIcon />} onClick={() => setIsCreateOpen(true)}>
            New video
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field className={s.filterField} label="Search" labelFor="videos-search">
              <Input
                id="videos-search"
                placeholder="Search by name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Character" labelFor="videos-character">
              <SearchSelect
                id="videos-character"
                value={characterFilter}
                options={characterOptions}
                search={characterSearch}
                onSearchChange={setCharacterSearch}
                onSelect={(value) =>
                  updateSearchParams({
                    characterId: value,
                    scenarioId: '',
                    page: 1,
                  })
                }
                placeholder={
                  isCharactersLoading ? 'Loading characters...' : 'Select character'
                }
                loading={isCharactersLoading}
              />
            </Field>
            <Field label="Scenario" labelFor="videos-scenario">
              <Select
                id="videos-scenario"
                options={scenarioOptions}
                value={characterFilter ? scenarioFilter : ''}
                size="sm"
                placeholder={
                  characterFilter
                    ? isFilterCharacterLoading
                      ? 'Loading scenarios...'
                      : 'Select scenario'
                    : 'Select character first'
                }
                onChange={(value) =>
                  updateSearchParams({ scenarioId: value, page: 1 })
                }
                disabled={!characterFilter || isFilterCharacterLoading}
                fullWidth
              />
            </Field>
            <Field label="Pose" labelFor="videos-pose">
              <Select
                id="videos-pose"
                options={POSE_FILTER_OPTIONS}
                value={poseFilter}
                size="sm"
                onChange={(value) =>
                  updateSearchParams({ pose: value, page: 1 })
                }
                fullWidth
              />
            </Field>
            <Field label="Order" labelFor="videos-order">
              <Select
                id="videos-order"
                options={ORDER_OPTIONS}
                value={order}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ order: value, page: 1 })
                }
              />
            </Field>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load videos"
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
            title="No videos found"
            description="Adjust your filters to see results."
            action={<Button onClick={() => setIsCreateOpen(true)}>New video</Button>}
          />
        ) : null}

        {showTable ? (
          <div className={s.tableWrap}>
            <Table
              columns={columns}
              rows={showSkeleton ? skeletonRows : rows}
              getRowProps={
                showSkeleton
                  ? undefined
                  : (_, index) => {
                      const video = videos[index];
                      if (!video) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => openDetails(video),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDetails(video);
                          }
                        },
                      };
                    }
              }
            />

            {showFooter ? (
              <div className={s.footer}>
                <Typography variant="meta" tone="muted">
                  {total === 0
                    ? 'No results'
                    : `Showing ${rangeStart}-${rangeEnd} of ${total.toLocaleString()}`}
                </Typography>
                <div className={s.paginationRow}>
                  <Select
                    options={PAGE_SIZE_OPTIONS.map((size) => ({
                      label: `${size} / page`,
                      value: String(size),
                    }))}
                    size="sm"
                    variant="ghost"
                    value={String(pageSize)}
                    onChange={(value) =>
                      updateSearchParams({
                        pageSize: Number(value),
                        page: 1,
                      })
                    }
                    fitContent
                  />
                  {totalPages > 1 ? (
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onChange={(nextPage) =>
                        updateSearchParams({ page: nextPage })
                      }
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Container>

      {isCreateOpen ? (
        <VideoCreateDrawer
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(id) => navigate(`/videos/${id}`)}
        />
      ) : null}
    </AppShell>
  );
}
