import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useQueries } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useCharacters } from '@/app/characters';
import { getCharacterDetails } from '@/app/characters/charactersApi';
import { useDeletePost, usePosts } from '@/app/posts';
import {
  Alert,
  Button,
  Container,
  EmptyState,
  Field,
  Input,
  Pagination,
  Select,
  Stack,
  Typography,
} from '@/atoms';
import type { ICharacterDetails, IPost } from '@/common/types';
import { formatCharacterSelectLabel } from '@/common/utils';
import { ConfirmModal } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import { PostItemCard, PostItemCardSkeleton } from './components/PostItemCard';
import { PostUpsertDrawer } from './components/PostUpsertDrawer';
import s from './PostsPage.module.scss';

type QueryUpdate = {
  search?: string;
  characterId?: string;
  scenarioId?: string;
  page?: number;
  pageSize?: number;
  isActive?: string;
};

type ScenarioOption = {
  label: string;
  value: string;
};

type ScenarioLookupItem = {
  characterId: string;
  scenarioId: string;
};

const CHARACTER_LIST_LIMIT = 1000;
const SCENARIO_STALE_TIME = 15 * 60 * 1000;
const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [12, 24, 48];
const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_BOOLEAN_FILTER = 'all';

const BOOLEAN_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Yes', value: 'true' },
  { label: 'No', value: 'false' },
];

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
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

function resolveBooleanFilter(value: string | null) {
  if (value === 'true' || value === 'false' || value === 'all') {
    return value;
  }
  return DEFAULT_BOOLEAN_FILTER;
}

function formatScenarioOptionLabel(
  character: Pick<ICharacterDetails, 'name' | 'type'>,
  scenarioName: string,
) {
  return `${formatCharacterSelectLabel(character.name, character.type)} · ${scenarioName}`;
}

export function PostsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawCharacterId = searchParams.get('characterId') ?? '';
  const rawScenarioId = searchParams.get('scenarioId') ?? '';
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');
  const rawIsActive = searchParams.get('isActive');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<IPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IPost | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const characterFilter = rawCharacterId.trim();
  const scenarioFilter = rawScenarioId.trim();
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);
  const activeFilter = resolveBooleanFilter(rawIsActive);

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

      if (update.isActive !== undefined) {
        if (update.isActive && update.isActive !== DEFAULT_BOOLEAN_FILTER) {
          next.set('isActive', update.isActive);
        } else {
          next.delete('isActive');
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

  const characterOptions = useMemo(
    () => [
      { label: 'All characters', value: '' },
      ...(characterData?.data ?? [])
        .map((character) => ({
          label: formatCharacterSelectLabel(character.name, character.type),
          value: character.id,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    ],
    [characterData?.data],
  );

  const derivedCharacterId = scenarioFilter
    ? scenarioOptionData.lookup.get(scenarioFilter)?.characterId ?? ''
    : '';
  const effectiveCharacterId = characterFilter || derivedCharacterId;
  const scenarioOptions = useMemo(
    () =>
      scenarioOptionData.options.filter(
        (option) =>
          !option.value ||
          !effectiveCharacterId ||
          scenarioOptionData.lookup.get(option.value)?.characterId ===
            effectiveCharacterId,
      ),
    [effectiveCharacterId, scenarioOptionData.lookup, scenarioOptionData.options],
  );
  const areScenarioOptionsLoading =
    isCharactersLoading ||
    scenarioQueryResults.some((query) => query.isLoading);

  useEffect(() => {
    if (!characterFilter || isCharactersLoading) return;

    const exists = (characterData?.data ?? []).some(
      (character) => character.id === characterFilter,
    );
    if (!exists) {
      updateSearchParams({ characterId: '', scenarioId: '', page: 1 }, true);
    }
  }, [characterData?.data, characterFilter, isCharactersLoading, updateSearchParams]);

  useEffect(() => {
    if (!scenarioFilter || areScenarioOptionsLoading) return;

    const exists = scenarioOptions.some((option) => option.value === scenarioFilter);
    if (!exists) {
      updateSearchParams({ scenarioId: '', page: 1 }, true);
    }
  }, [
    areScenarioOptionsLoading,
    scenarioFilter,
    scenarioOptions,
    updateSearchParams,
  ]);

  const queryParams = useMemo(() => {
    const isActive =
      activeFilter === 'all' ? undefined : activeFilter === 'true';

    return {
      search: normalizedSearch || undefined,
      scenarioId: scenarioFilter || undefined,
      isActive,
      skip: (page - 1) * pageSize,
      take: pageSize,
    };
  }, [activeFilter, normalizedSearch, page, pageSize, scenarioFilter]);

  const { data, error, isLoading, refetch } = usePosts(queryParams);
  const deleteMutation = useDeletePost();

  const posts = data?.data ?? [];
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

  const postSkeletonCards = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => (
        <PostItemCardSkeleton key={`post-skeleton-${index}`} />
      )),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && posts.length === 0;
  const showContent = !showEmpty && !error;
  const showFooter = showContent && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const drawerScenarioId = editingPost?.scenario.id ?? scenarioFilter;
  const drawerScenarioLookup = drawerScenarioId
    ? scenarioOptionData.lookup.get(drawerScenarioId) ?? null
    : null;

  const handleCreate = () => {
    setEditingPost(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (post: IPost) => {
    setEditingPost(post);
    setIsDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      setEditingPost(null);
    }
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Posts</Typography>
            <Typography variant="meta" tone="muted">
              Manage post content from one list.
            </Typography>
          </div>
          <div className={s.headerActions}>
            <Button onClick={handleCreate}>Create post</Button>
          </div>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field className={s.filterField} label="Search" labelFor="posts-search">
              <Input
                id="posts-search"
                placeholder="Search posts"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>

            <Field className={s.characterField} label="Character" labelFor="posts-character">
              <Select
                id="posts-character"
                options={characterOptions}
                value={effectiveCharacterId}
                size="sm"
                variant="ghost"
                placeholder={isCharactersLoading ? 'Loading characters...' : 'All characters'}
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

            <Field className={s.scenarioField} label="Scenario" labelFor="posts-scenario">
              <Select
                id="posts-scenario"
                options={scenarioOptions}
                value={scenarioFilter}
                size="sm"
                variant="ghost"
                placeholder={
                  effectiveCharacterId
                    ? areScenarioOptionsLoading
                      ? 'Loading scenarios...'
                      : 'All scenarios'
                    : 'Select character first'
                }
                disabled={!effectiveCharacterId || areScenarioOptionsLoading}
                onChange={(value) => updateSearchParams({ scenarioId: value, page: 1 })}
              />
            </Field>

            <Field
              className={s.booleanField}
              label="Active"
              labelFor="posts-active"
            >
              <Select
                id="posts-active"
                options={BOOLEAN_FILTER_OPTIONS}
                value={activeFilter}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ isActive: value, page: 1 })
                }
              />
            </Field>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load posts"
              description={error instanceof Error ? error.message : 'Please try again.'}
              tone="warning"
            />
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : null}

        {showEmpty ? (
          <EmptyState
            title="No posts found"
            description="Adjust your filters or create a new post."
            action={<Button onClick={handleCreate}>Create post</Button>}
          />
        ) : null}

        {showContent ? (
          <div className={s.galleryWrap}>
            <div className={s.galleryGrid}>
              {showSkeleton
                ? postSkeletonCards
                : posts.map((post) => (
                    <PostItemCard
                      key={post.id}
                      item={post}
                      onSelect={handleEdit}
                      onDelete={setDeleteTarget}
                      isDeleting={
                        deleteMutation.isPending && deleteTarget?.id === post.id
                      }
                    />
                  ))}
            </div>
          </div>
        ) : null}

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
                  onChange={(nextPage) => updateSearchParams({ page: nextPage })}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </Container>

      <PostUpsertDrawer
        open={isDrawerOpen}
        onOpenChange={handleDrawerOpenChange}
        post={editingPost}
        initialCharacterId={
          editingPost
            ? drawerScenarioLookup?.characterId
            : effectiveCharacterId || drawerScenarioLookup?.characterId
        }
        initialScenarioId={editingPost ? editingPost.scenario.id : scenarioFilter}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete post"
        description="Delete this post? This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
      />
    </AppShell>
  );
}
