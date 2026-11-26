import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useRvbUsers } from '@/app/rvb';
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
import type { IRvbUser } from '@/common/types';
import { AppShell } from '@/components/templates';

import {
  DEFAULT_PAGE_SIZE,
  formatDate,
  formatRvbUserMeta,
  formatRvbUserName,
  ORDER_OPTIONS,
  PAGE_SIZE_OPTIONS,
  parsePageSize,
  parsePositiveNumber,
  SEARCH_DEBOUNCE_MS,
  useDebouncedValue,
} from '../rvbFormat';
import s from '../RvbPage.module.scss';
import { RvbUserBadges } from './RvbUserBadges';

type StartedFilter = '' | 'started' | 'not-started';

type QueryUpdate = {
  search?: string;
  started?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

const DEFAULT_ORDER = 'DESC';

const STARTED_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'Started', value: 'started' },
  { label: 'Not started', value: 'not-started' },
];

function resolveStarted(value: string | null): StartedFilter {
  return value === 'started' || value === 'not-started' ? value : '';
}

export function RvbUsersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const started = resolveStarted(searchParams.get('started'));
  const order = searchParams.get('order') === 'ASC' ? 'ASC' : DEFAULT_ORDER;
  const page = parsePositiveNumber(searchParams.get('page'), 1);
  const pageSize = parsePageSize(searchParams.get('pageSize'));

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);
      const setOrDelete = (key: string, value: string | undefined) => {
        if (value === undefined) return;
        if (value) next.set(key, value);
        else next.delete(key);
      };

      setOrDelete('search', update.search?.trim());
      setOrDelete('started', update.started);
      if (update.order !== undefined) {
        setOrDelete(
          'order',
          update.order === DEFAULT_ORDER ? '' : update.order,
        );
      }
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

  const queryParams = useMemo(
    () => ({
      search: normalizedSearch || undefined,
      started: started ? started === 'started' : undefined,
      order: order as 'ASC' | 'DESC',
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [normalizedSearch, order, page, pageSize, started],
  );

  const { data, error, isLoading, refetch } = useRvbUsers(queryParams);

  const users = useMemo(() => data?.data ?? [], [data?.data]);
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
      { key: 'user', label: 'User' },
      { key: 'status', label: 'Status' },
      { key: 'credits', label: 'Credits' },
      { key: 'locale', label: 'Language / country' },
      { key: 'ref', label: 'Ref' },
      {
        key: 'lastActivity',
        label: <span className={s.alignRight}>Last activity</span>,
      },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      users.map((user) => ({
        user: (
          <div className={s.cell}>
            <Typography variant="body">{formatRvbUserName(user)}</Typography>
            <Typography variant="caption" tone="muted">
              {formatRvbUserMeta(user)}
            </Typography>
          </div>
        ),
        status: <RvbUserBadges user={user} />,
        credits: (
          <Typography variant="body" tone="muted">
            {user.credits}
          </Typography>
        ),
        locale: (
          <Typography variant="body" tone="muted">
            {[user.languageUI ?? user.languageCode, user.country]
              .filter(Boolean)
              .join(' / ') || '-'}
          </Typography>
        ),
        ref: (
          <Typography variant="body" tone={user.ref ? undefined : 'muted'}>
            {user.ref || '-'}
          </Typography>
        ),
        lastActivity: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(user.lastActivityAt)}
          </Typography>
        ),
      })),
    [users],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        user: (
          <div className={s.cell} key={`rvb-user-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={140} height={10} />
          </div>
        ),
        status: <Skeleton width={70} height={20} />,
        credits: <Skeleton width={40} height={12} />,
        locale: <Skeleton width={60} height={12} />,
        ref: <Skeleton width={80} height={12} />,
        lastActivity: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && users.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const openUser = (user: IRvbUser) => navigate(`/rvb/users/${user.id}`);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">RVB users</Typography>
          </div>
        </div>

        <div className={s.filterRow}>
          <Field
            className={s.filterField}
            label="Search"
            labelFor="rvb-users-search"
          >
            <Input
              id="rvb-users-search"
              placeholder="Search by username or exact Telegram ID"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              iconLeft={<MagnifyingGlassIcon />}
              fullWidth
            />
          </Field>
          <Field label="Generation" labelFor="rvb-users-started">
            <Select
              id="rvb-users-started"
              options={STARTED_OPTIONS}
              value={started}
              size="sm"
              variant="ghost"
              onChange={(value) =>
                updateSearchParams({ started: value, page: 1 })
              }
            />
          </Field>
          <Field label="Order" labelFor="rvb-users-order">
            <Select
              id="rvb-users-order"
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

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load RVB users"
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
            title="No RVB users found"
            description="Try adjusting your search or filters."
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
                      const user = users[index];
                      if (!user) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => openUser(user),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openUser(user);
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
                      updateSearchParams({ pageSize: Number(value), page: 1 })
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
