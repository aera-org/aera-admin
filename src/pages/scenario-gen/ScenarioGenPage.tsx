import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCharacters } from '@/app/characters';
import { useDeleteScenarioGen, useScenarioGens } from '@/app/scenario-gen';
import { PlusIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  Input,
  Pagination,
  Select,
  Skeleton,
  Table,
  Typography,
} from '@/atoms';
import type { IScenarioGen } from '@/common/types';
import { formatCharacterSelectLabel } from '@/common/utils';
import { ConfirmModal } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import s from './ScenarioGenPage.module.scss';

type QueryUpdate = {
  search?: string;
  order?: string;
  page?: number;
  pageSize?: number;
  characterId?: string;
  isSaved?: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const ORDER_OPTIONS = [
  { label: 'Newest first', value: 'DESC' },
  { label: 'Oldest first', value: 'ASC' },
];

const ORDER_VALUES = new Set(ORDER_OPTIONS.map((option) => option.value));
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_ORDER = 'DESC';
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SAVED_FILTER = 'all';
const SEARCH_DEBOUNCE_MS = 400;

const SAVED_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Saved', value: 'true' },
  { label: 'Drafts', value: 'false' },
];

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

function resolveSavedFilter(value: string | null) {
  if (value === 'true' || value === 'false' || value === 'all') return value;
  return DEFAULT_SAVED_FILTER;
}

function buildCharacterLabel(
  item: IScenarioGen,
  characterNames: Map<string, string>,
) {
  return (
    item.characterName ||
    characterNames.get(item.characterId) ||
    item.characterId
  );
}

export function ScenarioGenPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');
  const rawCharacterId = searchParams.get('characterId') ?? '';
  const rawIsSaved = searchParams.get('isSaved');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const [itemToDelete, setItemToDelete] = useState<IScenarioGen | null>(null);

  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);
  const savedFilter = resolveSavedFilter(rawIsSaved);

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

      if (update.isSaved !== undefined) {
        if (update.isSaved && update.isSaved !== DEFAULT_SAVED_FILTER) {
          next.set('isSaved', update.isSaved);
        } else {
          next.delete('isSaved');
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

  const queryParams = useMemo(() => {
    const isSaved =
      savedFilter === 'all' ? undefined : savedFilter === 'true';

    return {
      search: normalizedSearch || undefined,
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
      characterId: rawCharacterId || undefined,
      isSaved,
    };
  }, [normalizedSearch, order, page, pageSize, rawCharacterId, savedFilter]);

  const { data, error, isLoading } = useScenarioGens(queryParams);
  const deleteMutation = useDeleteScenarioGen();
  const { data: charactersData, isLoading: areCharactersLoading } =
    useCharacters(
      {
        order: 'ASC',
        skip: 0,
        take: 500,
      },
      {
        placeholderData: (previousData) => previousData,
      },
    );

  const items = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.total ?? 0;
  const effectiveTake = data?.take ?? pageSize;
  const effectiveSkip = data?.skip ?? (page - 1) * pageSize;
  const totalPages = total > 0 ? Math.ceil(total / effectiveTake) : 1;
  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && items.length === 0;
  const showFooter = !showSkeleton && !showEmpty && !error;
  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd = total === 0 ? 0 : effectiveSkip + items.length;

  const characterOptions = useMemo(
    () => [
      { label: 'All characters', value: '' },
      ...((charactersData?.data ?? []).map((character) => ({
        label: formatCharacterSelectLabel(character.name, character.type),
        value: character.id,
      })) ?? []),
    ],
    [charactersData?.data],
  );

  const characterNames = useMemo(
    () =>
      new Map(
        (charactersData?.data ?? []).map((character) => [
          character.id,
          character.name,
        ]),
      ),
    [charactersData?.data],
  );

  useEffect(() => {
    if (!data || total === 0) return;
    if (page > totalPages) {
      updateSearchParams({ page: totalPages }, true);
    }
  }, [data, page, total, totalPages, updateSearchParams]);

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Scenario' },
      { key: 'character', label: 'Character' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: <span className={s.alignRight}>Updated</span> },
      { key: 'actions', label: <span className={s.alignRight}>Actions</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      items.map((item) => ({
        name: (
          <div className={s.primaryCell}>
            <Typography variant="body">{item.name || 'Untitled'}</Typography>
            <Typography variant="caption" tone="muted">
              {item.id}
            </Typography>
          </div>
        ),
        character: (
          <Typography variant="body" tone="muted">
            {buildCharacterLabel(item, characterNames)}
          </Typography>
        ),
        status: item.isSaved ? (
          <Badge tone="success">Saved</Badge>
        ) : (
          <Badge outline>Draft</Badge>
        ),
        updatedAt: (
          <Typography variant="body" tone="muted" align="right">
            {formatDate(item.updatedAt)}
          </Typography>
        ),
        actions: (
          <div className={s.rowActions}>
            <Button
              variant="text"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/scenario-gen/${item.id}`);
              }}
            >
              Open
            </Button>
            <Button
              variant="text"
              size="sm"
              tone="danger"
              onClick={(event) => {
                event.stopPropagation();
                setItemToDelete(item);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      })),
    [characterNames, items, navigate],
  );

  const handleDelete = async () => {
    if (!itemToDelete) return;
    await deleteMutation.mutateAsync(itemToDelete.id);
    setItemToDelete(null);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Scenario Gen</Typography>
            <Typography variant="body" tone="muted">
              Generate scenario drafts, review the output, and save the final
              slug into character scenarios.
            </Typography>
          </div>
          <Button
            iconLeft={<PlusIcon />}
            onClick={() => navigate('/scenario-gen/new')}
          >
            Generate scenario
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              label="Search"
              labelFor="scenario-gen-search"
              className={s.filterField}
            >
              <Input
                id="scenario-gen-search"
                size="sm"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                placeholder="Search by generated scenario name"
                fullWidth
              />
            </Field>

            <Field
              label="Character"
              labelFor="scenario-gen-character"
              className={s.filterField}
            >
              <Select
                id="scenario-gen-character"
                size="sm"
                options={characterOptions}
                value={rawCharacterId}
                onChange={(value) =>
                  updateSearchParams({ characterId: value, page: 1 })
                }
                placeholder={
                  areCharactersLoading
                    ? 'Loading characters...'
                    : 'All characters'
                }
                fullWidth
              />
            </Field>
          </div>

          <div className={s.filterRow}>
            <Field label="Status" labelFor="scenario-gen-status">
              <Select
                id="scenario-gen-status"
                size="sm"
                options={SAVED_FILTER_OPTIONS}
                value={savedFilter}
                onChange={(value) =>
                  updateSearchParams({ isSaved: value, page: 1 })
                }
                fullWidth
              />
            </Field>

            <Field label="Order" labelFor="scenario-gen-order">
              <Select
                id="scenario-gen-order"
                size="sm"
                options={ORDER_OPTIONS}
                value={order}
                onChange={(value) =>
                  updateSearchParams({ order: value, page: 1 })
                }
                fullWidth
              />
            </Field>
          </div>
        </div>

        {error ? (
          <Alert
            title="Unable to load generated scenarios"
            description={
              error instanceof Error ? error.message : 'Please try again.'
            }
            tone="warning"
          />
        ) : null}

        {showSkeleton ? (
          <div className={s.skeletonTable}>
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </div>
        ) : null}

        {showEmpty ? (
          <EmptyState
            title="No generated scenarios found"
            description="Adjust the filters or generate a new scenario."
            action={
              <Button
                iconLeft={<PlusIcon />}
                onClick={() => navigate('/scenario-gen/new')}
              >
                Generate scenario
              </Button>
            }
          />
        ) : null}

        {!showSkeleton && !showEmpty ? (
          <div className={s.tableWrap}>
            <Table
              columns={columns}
              rows={rows}
              getRowProps={(_, index) => {
                const item = items[index];
                return {
                  className: s.row,
                  onClick: () => navigate(`/scenario-gen/${item.id}`),
                };
              }}
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

        <ConfirmModal
          open={Boolean(itemToDelete)}
          title="Delete generated scenario"
          description={
            itemToDelete
              ? `Delete "${itemToDelete.name || 'Untitled'}"? This cannot be undone.`
              : undefined
          }
          confirmLabel="Delete"
          tone="danger"
          isConfirming={deleteMutation.isPending}
          onConfirm={handleDelete}
          onClose={() => {
            if (!deleteMutation.isPending) {
              setItemToDelete(null);
            }
          }}
        />
      </Container>
    </AppShell>
  );
}
