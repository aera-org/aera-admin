import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useWebUsers } from '@/app/web-users';
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
import { type IWebUser, UserWebStatus } from '@/common/types';
import { AppShell } from '@/components/templates';

import {
  formatDate,
  formatWebUserMeta,
  formatWebUserName,
  getWebSubscriptionStatus,
} from '../webFormat';
import s from '../WebPage.module.scss';

type AnonymousFilter = '' | 'registered' | 'anonymous';

type QueryUpdate = {
  search?: string;
  anonymous?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

const ANONYMOUS_OPTIONS = [
  { label: 'All users', value: '' },
  { label: 'Registered', value: 'registered' },
  { label: 'Anonymous', value: 'anonymous' },
];

const ORDER_OPTIONS = [
  { label: 'Newest first', value: 'DESC' },
  { label: 'Oldest first', value: 'ASC' },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_ORDER = 'DESC';
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

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

function resolveAnonymous(value: string | null): AnonymousFilter {
  return value === 'registered' || value === 'anonymous' ? value : '';
}

export function WebUsersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const anonymous = resolveAnonymous(searchParams.get('anonymous'));
  const rawOrder = searchParams.get('order');
  const order = rawOrder === 'ASC' ? 'ASC' : DEFAULT_ORDER;
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
      setOrDelete('anonymous', update.anonymous);
      if (update.order !== undefined) {
        setOrDelete('order', update.order === DEFAULT_ORDER ? '' : update.order);
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
      isAnonymous: anonymous ? anonymous === 'anonymous' : undefined,
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [anonymous, normalizedSearch, order, page, pageSize],
  );

  const { data, error, isLoading, refetch } = useWebUsers(queryParams);

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
      { key: 'subscription', label: 'Subscription' },
      { key: 'credits', label: 'Credits' },
      {
        key: 'lastActivity',
        label: <span className={s.alignRight}>Last activity</span>,
      },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      users.map((user) => {
        const subscription = getWebSubscriptionStatus(user.subscription);
        return {
          user: (
            <div className={s.cell}>
              <Typography variant="body">{formatWebUserName(user)}</Typography>
              <Typography variant="caption" tone="muted">
                {formatWebUserMeta(user)}
              </Typography>
            </div>
          ),
          status: (
            <div className={s.badges}>
              {user.status === UserWebStatus.Active ? (
                <Badge tone="success">Active</Badge>
              ) : (
                <Badge tone="danger" outline>
                  Inactive
                </Badge>
              )}
              {user.isAnonymous ? <Badge outline>Anonymous</Badge> : null}
            </div>
          ),
          subscription: (
            <div className={s.cell}>
              <Badge tone={subscription.tone} outline={subscription.outline}>
                {subscription.label}
              </Badge>
              {subscription.meta ? (
                <Typography variant="caption" tone="muted">
                  {subscription.meta}
                </Typography>
              ) : null}
            </div>
          ),
          credits: (
            <Typography variant="body" tone="muted">
              {user.credits}
            </Typography>
          ),
          lastActivity: (
            <Typography variant="caption" tone="muted" className={s.alignRight}>
              {formatDate(user.lastActivityAt)}
            </Typography>
          ),
        };
      }),
    [users],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        user: (
          <div className={s.cell} key={`web-user-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={220} height={10} />
          </div>
        ),
        status: <Skeleton width={70} height={20} />,
        subscription: <Skeleton width={90} height={20} />,
        credits: <Skeleton width={40} height={12} />,
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

  const openUser = (user: IWebUser) => navigate(`/web/users/${user.id}`);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Web users</Typography>
          </div>
        </div>

        <div className={s.filterRow}>
          <Field
            className={s.filterField}
            label="Search"
            labelFor="web-users-search"
          >
            <Input
              id="web-users-search"
              placeholder="Search by name, username or email"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              iconLeft={<MagnifyingGlassIcon />}
              fullWidth
            />
          </Field>
          <Field label="Type" labelFor="web-users-anonymous">
            <Select
              id="web-users-anonymous"
              options={ANONYMOUS_OPTIONS}
              value={anonymous}
              size="sm"
              variant="ghost"
              onChange={(value) =>
                updateSearchParams({ anonymous: value, page: 1 })
              }
            />
          </Field>
          <Field label="Order" labelFor="web-users-order">
            <Select
              id="web-users-order"
              options={ORDER_OPTIONS}
              value={order}
              size="sm"
              variant="ghost"
              onChange={(value) => updateSearchParams({ order: value, page: 1 })}
            />
          </Field>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load web users"
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
            title="No web users found"
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
