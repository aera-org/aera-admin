import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCharacterDetails, useCharacters } from '@/app/characters';
import { useImgGenerations } from '@/app/img-generations';
import { DownloadIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  EmptyState,
  Field,
  IconButton,
  Input,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import {
  type IImgGeneration,
  ImgGenerationStatus,
  type RoleplayStage,
  STAGES_IN_ORDER,
} from '@/common/types';
import { AppShell } from '@/components/templates';

import s from './GenerationsPage.module.scss';

type QueryUpdate = {
  search?: string;
  characterId?: string;
  scenarioId?: string;
  stage?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

const ORDER_OPTIONS = [
  { label: 'Ascending', value: 'ASC' },
  { label: 'Descending', value: 'DESC' },
];

const ORDER_VALUES = new Set(ORDER_OPTIONS.map((option) => option.value));
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_ORDER = 'DESC';
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_STAGE_FILTER = 'all';
const SEARCH_DEBOUNCE_MS = 400;

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

function resolveStageFilter(value: string | null) {
  if (!value || value === DEFAULT_STAGE_FILTER) return DEFAULT_STAGE_FILTER;
  if (STAGES_IN_ORDER.includes(value as RoleplayStage)) {
    return value;
  }
  return DEFAULT_STAGE_FILTER;
}

function formatStage(value: RoleplayStage | null | undefined) {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildContext(generation: IImgGeneration) {
  const scenario = generation.scenario?.name?.trim();
  const stage = formatStage(generation.stage);
  return [scenario, stage].filter(Boolean).join(' · ');
}

function getStatusMeta(status: ImgGenerationStatus) {
  if (status === ImgGenerationStatus.Ready) {
    return { label: 'Ready', tone: 'success' as const, outline: false };
  }
  if (status === ImgGenerationStatus.Failed) {
    return { label: 'Failed', tone: 'danger' as const, outline: false };
  }
  return { label: 'Generating', tone: 'warning' as const, outline: true };
}

export function GenerationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawCharacterId = searchParams.get('characterId') ?? '';
  const rawScenarioId = searchParams.get('scenarioId') ?? '';
  const rawStage = searchParams.get('stage');
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const characterFilter = rawCharacterId.trim();
  const scenarioFilter = rawScenarioId.trim();
  const stageFilter = resolveStageFilter(rawStage);
  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);

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

      if (update.characterId !== undefined) {
        const nextCharacterId = update.characterId.trim();
        if (nextCharacterId) {
          next.set('characterId', nextCharacterId);
        } else {
          next.delete('characterId');
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

      if (update.stage !== undefined) {
        if (update.stage && update.stage !== DEFAULT_STAGE_FILTER) {
          next.set('stage', update.stage);
        } else {
          next.delete('stage');
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
      order: 'ASC',
      skip: 0,
      take: 1000,
    }),
    [],
  );

  const { data: characterData, isLoading: isCharactersLoading } =
    useCharacters(characterQueryParams);
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

  const characterOptions = useMemo(() => {
    const options = (characterData?.data ?? []).map((character) => ({
      label: character.name,
      value: character.id,
    }));

    if (
      characterFilter &&
      filterCharacterDetails &&
      !options.some((option) => option.value === characterFilter)
    ) {
      options.unshift({
        label: filterCharacterDetails.name,
        value: filterCharacterDetails.id,
      });
    }

    return [{ label: 'All characters', value: '' }, ...options];
  }, [characterData?.data, characterFilter, filterCharacterDetails]);

  const scenarioOptions = useMemo(
    () => [
      { label: 'All scenarios', value: '' },
      ...(filterCharacterDetails?.scenarios ?? []).map((scenario) => ({
        label: scenario.name || 'Untitled',
        value: scenario.id,
      })),
    ],
    [filterCharacterDetails?.scenarios],
  );

  const stageOptions = useMemo(
    () => [
      { label: 'All stages', value: DEFAULT_STAGE_FILTER },
      ...STAGES_IN_ORDER.map((stage) => ({
        label: formatStage(stage),
        value: stage,
      })),
    ],
    [],
  );

  const queryParams = useMemo(
    () => ({
      search: normalizedSearch || undefined,
      characterId: characterFilter || undefined,
      scenarioId: scenarioFilter || undefined,
      stage:
        stageFilter === DEFAULT_STAGE_FILTER
          ? undefined
          : (stageFilter as RoleplayStage),
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [
      characterFilter,
      normalizedSearch,
      order,
      page,
      pageSize,
      scenarioFilter,
      stageFilter,
    ],
  );

  const { data, error, isLoading, refetch } = useImgGenerations(queryParams);

  const generations = data?.data ?? [];
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

  const skeletonCards = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => (
        <Card
          key={`generation-skel-${index}`}
          padding="md"
          className={s.generationCard}
        >
          <div className={s.cardHeader}>
            <div className={s.titleBlock}>
              <Skeleton width={160} height={12} />
              <Skeleton width={120} height={10} />
            </div>
            <Skeleton width={90} height={20} />
          </div>
          <div className={s.previewFrame}>
            <Skeleton height="100%" />
          </div>
          <div className={s.meta}>
            <div className={s.loraBlock}>
              <Skeleton width={140} height={12} />
              <Skeleton width={100} height={10} />
              <Skeleton width={120} height={12} />
            </div>
            <div className={s.footerMeta}>
              <Skeleton width={120} height={10} />
              <Skeleton width={110} height={10} />
            </div>
          </div>
        </Card>
      )),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && generations.length === 0;
  const showGallery = !showEmpty && !error;
  const showFooter = showGallery && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Generations</Typography>
          </div>
          <Button onClick={() => navigate('/generations/new')}>Generate</Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Search"
              labelFor="generations-search"
            >
              <Input
                id="generations-search"
                placeholder="Search by character name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Character" labelFor="generations-character">
              <Select
                id="generations-character"
                options={characterOptions}
                value={characterFilter}
                size="sm"
                variant="ghost"
                placeholder={
                  isCharactersLoading
                    ? 'Loading characters...'
                    : 'All characters'
                }
                disabled={isCharactersLoading}
                onChange={(value) =>
                  updateSearchParams({
                    characterId: value,
                    scenarioId: '',
                    page: 1,
                  })
                }
              />
            </Field>
            <Field label="Scenario" labelFor="generations-scenario">
              <Select
                id="generations-scenario"
                options={scenarioOptions}
                value={scenarioFilter}
                size="sm"
                variant="ghost"
                placeholder={
                  characterFilter
                    ? isFilterCharacterLoading
                      ? 'Loading scenarios...'
                      : 'All scenarios'
                    : 'Select character first'
                }
                disabled={!characterFilter || isFilterCharacterLoading}
                onChange={(value) =>
                  updateSearchParams({ scenarioId: value, page: 1 })
                }
              />
            </Field>
            <Field label="Stage" labelFor="generations-stage">
              <Select
                id="generations-stage"
                options={stageOptions}
                value={stageFilter}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ stage: value, page: 1 })
                }
              />
            </Field>
            <Field label="Order" labelFor="generations-order">
              <Select
                id="generations-order"
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
              title="Unable to load generations"
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
            title="No generations found"
            description="Try adjusting your search."
          />
        ) : null}

        {showGallery ? (
          <div className={s.galleryWrap}>
            <div className={s.galleryGrid}>
              {showSkeleton
                ? skeletonCards
                : generations.map((generation) => {
                    const status = getStatusMeta(generation.status);
                    const hasImage = Boolean(
                      generation.status === ImgGenerationStatus.Ready &&
                      generation.file?.url,
                    );

                    return (
                      <Card
                        key={generation.id}
                        padding="md"
                        className={s.generationCard}
                        role="link"
                        tabIndex={0}
                        onClick={() =>
                          navigate(`/generations/${generation.id}`)
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/generations/${generation.id}`);
                          }
                        }}
                      >
                        <div className={s.cardHeader}>
                          <div className={s.titleBlock}>
                            <Typography variant="body">
                              {generation.character.name}
                            </Typography>
                            <Typography variant="caption" tone="muted">
                              {buildContext(generation) || generation.id}
                            </Typography>
                            <Typography variant="caption" tone="muted">
                              {generation.posePrompt?.name}
                            </Typography>
                          </div>
                          <Badge tone={status.tone} outline={status.outline}>
                            {status.label}
                          </Badge>
                        </div>

                        <div className={s.previewFrame}>
                          {hasImage ? (
                            <>
                              <img
                                className={s.previewImage}
                                src={generation.file?.url ?? ''}
                                alt={`Generation ${generation.id}`}
                                loading="lazy"
                              />
                              <div className={s.previewActions}>
                                <IconButton
                                  as="a"
                                  href={generation.file?.url ?? undefined}
                                  download={generation.file?.name}
                                  rel="noopener"
                                  aria-label="Download generation"
                                  tooltip="Download generation"
                                  variant="ghost"
                                  size="sm"
                                  icon={<DownloadIcon />}
                                  // @ts-expect-error Radix anchor event types are incorrect
                                  onClick={(event) => event.stopPropagation()}
                                />
                              </div>
                            </>
                          ) : generation.status ===
                            ImgGenerationStatus.Generating ? (
                            <Skeleton height="100%" />
                          ) : generation.status ===
                            ImgGenerationStatus.Failed ? (
                            <div className={s.previewPlaceholder}>
                              <Typography variant="caption" tone="muted">
                                Generation failed.
                              </Typography>
                            </div>
                          ) : (
                            <div className={s.previewPlaceholder}>
                              <Typography variant="caption" tone="muted">
                                Waiting for image.
                              </Typography>
                            </div>
                          )}
                        </div>

                        <div className={s.meta}>
                          <div className={s.loraBlock}>
                            {generation.mainLora ? (
                              <Typography variant="caption" tone="muted">
                                Main: {generation.mainLora.fileName}
                              </Typography>
                            ) : null}
                            {generation.secondLora ? (
                              <Typography variant="caption" tone="muted">
                                Secondary: {generation.secondLora.fileName}
                              </Typography>
                            ) : null}
                            {!generation.mainLora && !generation.secondLora ? (
                              <Typography variant="caption" tone="muted">
                                No LoRAs
                              </Typography>
                            ) : null}
                          </div>
                          <div className={s.footerMeta}>
                            <Typography variant="caption" tone="muted">
                              {generation.id}
                            </Typography>
                            <Typography variant="caption" tone="muted">
                              {formatDate(generation.createdAt)}
                            </Typography>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
            </div>

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
    </AppShell>
  );
}
