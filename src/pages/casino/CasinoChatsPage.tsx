import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCasinoChats } from '@/app/casino';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Field,
  FormRow,
  Input,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import type { CasinoOrder, CasinoOrderBy } from '@/common/types';

import s from './CasinoPages.module.scss';
import {
  CASINO_DEFAULT_ORDER,
  CASINO_DEFAULT_ORDER_BY,
  CASINO_DEFAULT_PAGE_SIZE,
  CASINO_PAGE_SIZE_OPTIONS,
  formatCasinoDate,
  formatCasinoFromDateTimeForApi,
  formatCasinoFromDateTimeInput,
  formatCasinoUser,
  formatCasinoUserMeta,
  normalizeCasinoDate,
  normalizeCasinoFromDateTime,
  normalizeCasinoFromDateTimeInput,
  parseCasinoLevel,
  parseCasinoPageSize,
  parsePositiveNumber,
} from './casinoUtils';

type QueryUpdate = {
  username?: string;
  level?: string;
  from?: string;
  to?: string;
  orderBy?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

const ORDER_BY_OPTIONS = [
  { label: 'Created', value: 'createdAt' },
  { label: 'Messages', value: 'messagesCount' },
];
const ORDER_BY_VALUES = new Set(ORDER_BY_OPTIONS.map((option) => option.value));

const ORDER_OPTIONS = [
  { label: 'Descending', value: 'DESC' },
  { label: 'Ascending', value: 'ASC' },
];
const ORDER_VALUES = new Set(ORDER_OPTIONS.map((option) => option.value));

export function CasinoChatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawUsername = searchParams.get('username') ?? '';
  const rawLevel = searchParams.get('level');
  const rawFrom = searchParams.get('from');
  const rawTo = searchParams.get('to');
  const rawOrderBy = searchParams.get('orderBy');
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const username = rawUsername.trim();
  const level = parseCasinoLevel(rawLevel);
  const levelValue = level === undefined ? '' : String(level);
  const from = normalizeCasinoFromDateTime(rawFrom);
  const fromInputValue = formatCasinoFromDateTimeInput(from);
  const to = normalizeCasinoDate(rawTo);
  const orderBy = ORDER_BY_VALUES.has(rawOrderBy ?? '')
    ? (rawOrderBy as CasinoOrderBy)
    : CASINO_DEFAULT_ORDER_BY;
  const order = ORDER_VALUES.has(rawOrder ?? '')
    ? (rawOrder as CasinoOrder)
    : CASINO_DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parseCasinoPageSize(rawPageSize);

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.username !== undefined) {
        const nextUsername = update.username.trim();
        if (nextUsername) next.set('username', nextUsername);
        else next.delete('username');
      }

      if (update.level !== undefined) {
        const nextLevel = parseCasinoLevel(update.level);
        if (nextLevel !== undefined) next.set('level', String(nextLevel));
        else next.delete('level');
      }

      if (update.from !== undefined) {
        next.set('from', normalizeCasinoFromDateTimeInput(update.from));
      }

      if (update.to !== undefined) {
        const nextTo = normalizeCasinoDate(update.to);
        if (nextTo) next.set('to', nextTo);
        else next.delete('to');
      }

      if (update.orderBy !== undefined) {
        if (
          ORDER_BY_VALUES.has(update.orderBy) &&
          update.orderBy !== CASINO_DEFAULT_ORDER_BY
        ) {
          next.set('orderBy', update.orderBy);
        } else {
          next.delete('orderBy');
        }
      }

      if (update.order !== undefined) {
        if (ORDER_VALUES.has(update.order) && update.order !== CASINO_DEFAULT_ORDER) {
          next.set('order', update.order);
        } else {
          next.delete('order');
        }
      }

      if (update.page !== undefined) {
        if (update.page > 1) next.set('page', String(update.page));
        else next.delete('page');
      }

      if (update.pageSize !== undefined) {
        if (update.pageSize !== CASINO_DEFAULT_PAGE_SIZE) {
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
    if (
      rawUsername === username &&
      (rawLevel ?? '') === levelValue &&
      rawFrom === from &&
      (rawTo ?? '') === to &&
      (rawOrderBy ?? CASINO_DEFAULT_ORDER_BY) === orderBy &&
      (rawOrder ?? CASINO_DEFAULT_ORDER) === order
    ) {
      return;
    }

    updateSearchParams(
      { username, level: levelValue, from, to, orderBy, order },
      true,
    );
  }, [
    from,
    levelValue,
    order,
    orderBy,
    rawFrom,
    rawLevel,
    rawOrder,
    rawOrderBy,
    rawTo,
    rawUsername,
    to,
    updateSearchParams,
    username,
  ]);

  const queryParams = useMemo(
    () => ({
      username: username || undefined,
      level,
      from: formatCasinoFromDateTimeForApi(from),
      to: to || undefined,
      orderBy,
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [from, level, order, orderBy, page, pageSize, to, username],
  );

  const { data, error, isLoading, refetch } = useCasinoChats(queryParams);
  const chats = useMemo(() => data?.data ?? [], [data?.data]);
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
      { key: 'chat', label: 'Chat' },
      { key: 'user', label: 'User' },
      { key: 'level', label: 'Level' },
      {
        key: 'messages',
        label: <span className={s.alignRight}>Messages</span>,
      },
      { key: 'created', label: <span className={s.alignRight}>Created</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      chats.map((chat) => ({
        chat: (
          <div className={s.chatCell}>
            <Typography variant="body">{chat.id}</Typography>
          </div>
        ),
        user: (
          <div className={s.userCell}>
            <Typography variant="body">{formatCasinoUser(chat.user)}</Typography>
            <Typography variant="caption" tone="muted">
              {formatCasinoUserMeta(chat.user)}
            </Typography>
          </div>
        ),
        level: (
          <Badge tone="accent" outline>
            {chat.level}
          </Badge>
        ),
        messages: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {chat.messagesCount.toLocaleString()}
          </Typography>
        ),
        created: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatCasinoDate(chat.createdAt)}
          </Typography>
        ),
      })),
    [chats],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        chat: <Skeleton key={`chat-${index}`} width={220} height={12} />,
        user: (
          <div className={s.userCell}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        level: <Skeleton width={56} height={20} />,
        messages: (
          <div className={s.alignRight}>
            <Skeleton width={48} height={12} />
          </div>
        ),
        created: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && chats.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;
  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.titleBlock}>
          <Typography variant="h2">Chats</Typography>
          <Typography variant="caption" tone="muted">
            Casino conversations
          </Typography>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate('/casino/analytics')}
        >
          Analytics
        </Button>
      </div>

      <div className={s.filters}>
        <FormRow columns={4}>
          <Field label="Username" labelFor="casino-username">
            <Input
              id="casino-username"
              value={username}
              size="sm"
              onChange={(event) =>
                updateSearchParams({ username: event.target.value, page: 1 })
              }
              fullWidth
            />
          </Field>
          <Field label="Level" labelFor="casino-level">
            <Input
              id="casino-level"
              type="number"
              min={0}
              step={1}
              value={levelValue}
              size="sm"
              onChange={(event) =>
                updateSearchParams({ level: event.target.value, page: 1 })
              }
              fullWidth
            />
          </Field>
          <Field label="From" labelFor="casino-from">
            <Input
              id="casino-from"
              type="datetime-local"
              value={fromInputValue}
              size="sm"
              onChange={(event) =>
                updateSearchParams({ from: event.target.value, page: 1 })
              }
              fullWidth
            />
          </Field>
          <Field label="To" labelFor="casino-to">
            <Input
              id="casino-to"
              type="date"
              value={to}
              size="sm"
              onChange={(event) =>
                updateSearchParams({ to: event.target.value, page: 1 })
              }
              fullWidth
            />
          </Field>
        </FormRow>
        <Typography variant="caption" tone="muted">
          From uses local date and time and is sent to the API as UTC. To
          remains date-only.
        </Typography>
        <FormRow columns={3}>
          <Field label="Order by" labelFor="casino-order-by">
            <Select
              id="casino-order-by"
              options={ORDER_BY_OPTIONS}
              value={orderBy}
              size="sm"
              variant="ghost"
              onChange={(value) =>
                updateSearchParams({ orderBy: value, page: 1 })
              }
              fullWidth
            />
          </Field>
          <Field label="Order" labelFor="casino-order">
            <Select
              id="casino-order"
              options={ORDER_OPTIONS}
              value={order}
              size="sm"
              variant="ghost"
              onChange={(value) => updateSearchParams({ order: value, page: 1 })}
              fullWidth
            />
          </Field>
          <Field label="Page size" labelFor="casino-page-size">
            <Select
              id="casino-page-size"
              options={CASINO_PAGE_SIZE_OPTIONS.map((size) => ({
                label: `${size} / page`,
                value: String(size),
              }))}
              value={String(pageSize)}
              size="sm"
              variant="ghost"
              onChange={(value) =>
                updateSearchParams({ pageSize: Number(value), page: 1 })
              }
              fullWidth
            />
          </Field>
        </FormRow>
      </div>

      {error ? (
        <Stack className={s.state} gap="12px">
          <Alert
            title="Unable to load casino chats"
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
          title="No casino chats found"
          description="Try adjusting your filters."
        />
      ) : null}

      {showTable ? (
        <div className={s.tableWrap}>
          <Table
            columns={columns}
            rows={showSkeleton ? skeletonRows : rows}
            scrollable
            minWidth={860}
            getRowProps={
              showSkeleton
                ? undefined
                : (_, index) => {
                    const chat = chats[index];
                    if (!chat) return {};
                    return {
                      className: s.clickableRow,
                      role: 'link',
                      tabIndex: 0,
                      onClick: () => navigate(`/casino/chats/${chat.id}`),
                      onKeyDown: (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/casino/chats/${chat.id}`);
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
    </div>
  );
}
