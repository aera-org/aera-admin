import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useVideoPrompts } from '@/app/video-prompts';
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
  Stack,
  Table,
  Typography,
} from '@/atoms';
import { type IVideoPrompt, Pose } from '@/common/types';
import { formatPose, poseOptions } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './VideoPromptsPage.module.scss';

type StatusFilter = '' | 'active' | 'inactive';

type QueryUpdate = {
  search?: string;
  pose?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

const PAGE_SIZE_OPTIONS = [20, 40, 50, 100];
const DEFAULT_PAGE_SIZE = 40;
const SEARCH_DEBOUNCE_MS = 400;

const STATUS_OPTIONS = [
  { label: 'Any status', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
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
  return Object.values(Pose).includes(value as Pose) ? (value as Pose) : '';
}

function resolveStatusFilter(value: string | null): StatusFilter {
  return value === 'active' || value === 'inactive' ? value : '';
}

function VideoPromptFlags({ item }: { item: IVideoPrompt }) {
  return (
    <div className={s.flags}>
      {!item.isActive ? <Badge tone="warning">Inactive</Badge> : null}
      {item.withMan ? <Badge outline>With man</Badge> : null}
      {item.isFirstFrame ? <Badge outline>First frame</Badge> : null}
      {item.isAnal ? <Badge outline>Anal</Badge> : null}
    </div>
  );
}

export function VideoPromptsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawPose = searchParams.get('pose');
  const rawStatus = searchParams.get('status');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);
  const poseFilter = resolvePoseFilter(rawPose);
  const statusFilter = resolveStatusFilter(rawStatus);

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      const setOrDelete = (key: string, value: string | undefined) => {
        if (value === undefined) return;
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      };

      setOrDelete('search', update.search?.trim());
      setOrDelete('pose', update.pose);
      setOrDelete('status', update.status);

      if (update.page !== undefined) {
        setOrDelete('page', update.page > 1 ? String(update.page) : '');
      }
      if (update.pageSize !== undefined) {
        setOrDelete(
          'pageSize',
          update.pageSize !== DEFAULT_PAGE_SIZE ? String(update.pageSize) : '',
        );
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

  useEffect(() => {
    const invalidPose = rawPose && !poseFilter;
    const invalidStatus = rawStatus && !statusFilter;
    if (!invalidPose && !invalidStatus) return;
    updateSearchParams(
      {
        pose: invalidPose ? '' : undefined,
        status: invalidStatus ? '' : undefined,
      },
      true,
    );
  }, [poseFilter, rawPose, rawStatus, statusFilter, updateSearchParams]);

  const queryParams = useMemo(
    () => ({
      search: normalizedSearch || undefined,
      pose: poseFilter || undefined,
      isActive: statusFilter ? statusFilter === 'active' : undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [normalizedSearch, page, pageSize, poseFilter, statusFilter],
  );

  const { data, error, isLoading, refetch } = useVideoPrompts(queryParams);

  const items = useMemo(() => data?.data ?? [], [data]);
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

  const columns = useMemo(
    () => [
      { key: 'idx', label: 'Idx' },
      { key: 'name', label: 'Name' },
      { key: 'pose', label: 'Pose' },
      { key: 'flags', label: 'Flags' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      items.map((item) => ({
        idx: (
          <Typography variant="body" tone="muted">
            {item.idx ?? '-'}
          </Typography>
        ),
        name: <Typography variant="body">{item.name}</Typography>,
        pose: <Typography variant="body">{formatPose(item.pose)}</Typography>,
        flags: <VideoPromptFlags item={item} />,
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(item.updatedAt)}
          </Typography>
        ),
      })),
    [items],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        idx: <Skeleton key={`vp-idx-skel-${index}`} width={24} height={12} />,
        name: <Skeleton width={220} height={12} />,
        pose: <Skeleton width={100} height={12} />,
        flags: <Skeleton width={120} height={12} />,
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && items.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const openEditPage = (item: IVideoPrompt) => {
    navigate(`/video-prompts/${item.id}`);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Video prompts</Typography>
          </div>
          <Button
            iconLeft={<PlusIcon />}
            onClick={() => navigate('/video-prompts/new')}
          >
            Create video prompt
          </Button>
        </div>

        <div className={s.filterRow}>
          <Field
            className={s.filterField}
            label="Search"
            labelFor="video-prompts-search"
          >
            <Input
              id="video-prompts-search"
              placeholder="Search by name"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              iconLeft={<MagnifyingGlassIcon />}
              fullWidth
            />
          </Field>
          <Field label="Pose" labelFor="video-prompts-pose">
            <Select
              id="video-prompts-pose"
              options={[{ label: 'Any pose', value: '' }, ...poseOptions]}
              value={poseFilter}
              size="sm"
              variant="ghost"
              onChange={(value) => updateSearchParams({ pose: value, page: 1 })}
            />
          </Field>
          <Field label="Status" labelFor="video-prompts-status">
            <Select
              id="video-prompts-status"
              options={STATUS_OPTIONS}
              value={statusFilter}
              size="sm"
              variant="ghost"
              onChange={(value) =>
                updateSearchParams({ status: value, page: 1 })
              }
            />
          </Field>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load video prompts"
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
            title="No video prompts found"
            description="Create a video prompt to get started."
            action={
              <Button onClick={() => navigate('/video-prompts/new')}>
                Create video prompt
              </Button>
            }
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
                      const item = items[index];
                      if (!item) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => openEditPage(item),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openEditPage(item);
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
    </AppShell>
  );
}
