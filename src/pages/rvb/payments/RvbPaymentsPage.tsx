import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { formatCount, formatUsd } from '@/app/analytics';
import { useRvbPayments, useRvbPlans } from '@/app/rvb';
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
  Tag,
  Typography,
} from '@/atoms';
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
  toUsd,
  useDebouncedValue,
} from '../rvbFormat';
import s from '../RvbPage.module.scss';

type QueryUpdate = {
  planId?: string;
  userId?: string;
  ref?: string;
  createdAfter?: string;
  createdBefore?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

const DEFAULT_ORDER = 'DESC';
// Plans are a short list; load them in one page for the filter.
const PLANS_TAKE = 200;

export function RvbPaymentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const planId = searchParams.get('planId') ?? '';
  const userId = searchParams.get('userId') ?? '';
  const rawRef = searchParams.get('ref') ?? '';
  const createdAfter = searchParams.get('createdAfter') ?? '';
  const createdBefore = searchParams.get('createdBefore') ?? '';
  const order = searchParams.get('order') === 'ASC' ? 'ASC' : DEFAULT_ORDER;
  const page = parsePositiveNumber(searchParams.get('page'), 1);
  const pageSize = parsePageSize(searchParams.get('pageSize'));

  const [refInput, setRefInput] = useState(rawRef);
  const debouncedRef = useDebouncedValue(refInput, SEARCH_DEBOUNCE_MS).trim();

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);
      const setOrDelete = (key: string, value: string | undefined) => {
        if (value === undefined) return;
        if (value) next.set(key, value);
        else next.delete(key);
      };

      setOrDelete('planId', update.planId);
      setOrDelete('userId', update.userId);
      setOrDelete('ref', update.ref?.trim());
      setOrDelete('createdAfter', update.createdAfter);
      setOrDelete('createdBefore', update.createdBefore);
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
    setRefInput(rawRef);
  }, [rawRef]);

  useEffect(() => {
    if (debouncedRef === rawRef) return;
    updateSearchParams({ ref: debouncedRef, page: 1 }, true);
  }, [debouncedRef, rawRef, updateSearchParams]);

  const { data: plansData } = useRvbPlans({ skip: 0, take: PLANS_TAKE });
  const planOptions = useMemo(
    () => [
      { label: 'Any plan', value: '' },
      ...(plansData?.data ?? []).map((plan) => ({
        label: plan.code,
        value: plan.id,
      })),
    ],
    [plansData?.data],
  );

  const queryParams = useMemo(
    () => ({
      planId: planId || undefined,
      userId: userId || undefined,
      ref: rawRef || undefined,
      createdAfter: createdAfter || undefined,
      createdBefore: createdBefore || undefined,
      order: order as 'ASC' | 'DESC',
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [
      createdAfter,
      createdBefore,
      order,
      page,
      pageSize,
      planId,
      rawRef,
      userId,
    ],
  );

  const { data, error, isLoading, refetch } = useRvbPayments(queryParams);
  const payments = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.total ?? 0;
  const totalSum = Number(data?.totalSum ?? 0);
  const starPrice = Number(data?.starPrice ?? 0);
  const effectiveTake = data?.take ?? pageSize;
  const effectiveSkip = data?.skip ?? (page - 1) * pageSize;
  const totalPages = total > 0 ? Math.ceil(total / effectiveTake) : 1;

  useEffect(() => {
    if (!data || total === 0 || page <= totalPages) return;
    updateSearchParams({ page: totalPages }, true);
  }, [data, page, total, totalPages, updateSearchParams]);

  // The user filter comes from a user page; show who it is when we can.
  const filteredUser = useMemo(
    () => payments.find((payment) => payment.user?.id === userId)?.user ?? null,
    [payments, userId],
  );

  const columns = useMemo(
    () => [
      { key: 'payment', label: 'Payment' },
      { key: 'amount', label: <span className={s.alignRight}>Stars</span> },
      { key: 'usd', label: <span className={s.alignRight}>$</span> },
      { key: 'plan', label: 'Plan' },
      { key: 'user', label: 'User' },
      { key: 'ref', label: 'Ref' },
      { key: 'created', label: <span className={s.alignRight}>Created</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      payments.map((payment) => ({
        payment: (
          <div className={s.idCell} title={payment.id}>
            <Typography variant="caption" tone="muted" truncate>
              {payment.id}
            </Typography>
          </div>
        ),
        amount: (
          <Typography variant="body" className={s.alignRight}>
            {payment.amount.toLocaleString()}
          </Typography>
        ),
        usd: (
          <Typography variant="body" className={s.alignRight}>
            {formatUsd(toUsd(payment.amount, starPrice))}
          </Typography>
        ),
        plan: (
          <Typography variant="body" tone={payment.plan ? undefined : 'muted'}>
            {payment.plan?.code ?? '-'}
          </Typography>
        ),
        user: payment.user ? (
          <div className={s.cell}>
            <Button
              variant="text"
              size="sm"
              onClick={() => navigate(`/rvb/users/${payment.user!.id}`)}
            >
              {formatRvbUserName(payment.user)}
            </Button>
            <Typography variant="caption" tone="muted">
              {formatRvbUserMeta(payment.user)}
            </Typography>
          </div>
        ) : (
          <Typography variant="body" tone="muted">
            -
          </Typography>
        ),
        ref: (
          <Typography variant="body" tone={payment.ref ? undefined : 'muted'}>
            {payment.ref || '-'}
          </Typography>
        ),
        created: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(payment.createdAt)}
          </Typography>
        ),
      })),
    [navigate, payments, starPrice],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        payment: (
          <Skeleton key={`rvb-payment-${index}`} width={100} height={12} />
        ),
        amount: <Skeleton width={60} height={12} />,
        usd: <Skeleton width={60} height={12} />,
        plan: <Skeleton width={100} height={12} />,
        user: <Skeleton width={160} height={12} />,
        ref: <Skeleton width={100} height={12} />,
        created: <Skeleton width={120} height={12} />,
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && payments.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">RVB payments</Typography>
          </div>
        </div>

        <div className={s.filterRow}>
          <Field
            className={s.filterField}
            label="Ref"
            labelFor="rvb-payments-ref"
          >
            <Input
              id="rvb-payments-ref"
              size="sm"
              value={refInput}
              onChange={(event) => setRefInput(event.target.value)}
              placeholder="Any ref"
              fullWidth
            />
          </Field>
          <Field label="Plan" labelFor="rvb-payments-plan">
            <Select
              id="rvb-payments-plan"
              options={planOptions}
              value={planId}
              size="sm"
              variant="ghost"
              onChange={(value) =>
                updateSearchParams({ planId: value, page: 1 })
              }
            />
          </Field>
          <Field
            className={s.filterFieldSm}
            label="Created after"
            labelFor="rvb-payments-created-after"
          >
            <Input
              id="rvb-payments-created-after"
              type="date"
              size="sm"
              value={createdAfter}
              onChange={(event) =>
                updateSearchParams({
                  createdAfter: event.target.value,
                  page: 1,
                })
              }
              fullWidth
            />
          </Field>
          <Field
            className={s.filterFieldSm}
            label="Created before"
            labelFor="rvb-payments-created-before"
          >
            <Input
              id="rvb-payments-created-before"
              type="date"
              size="sm"
              value={createdBefore}
              onChange={(event) =>
                updateSearchParams({
                  createdBefore: event.target.value,
                  page: 1,
                })
              }
              fullWidth
            />
          </Field>
          <Field label="Order" labelFor="rvb-payments-order">
            <Select
              id="rvb-payments-order"
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

        {userId ? (
          <div className={s.badges}>
            <Tag onRemove={() => updateSearchParams({ userId: '', page: 1 })}>
              User: {filteredUser ? formatRvbUserName(filteredUser) : userId}
            </Tag>
          </div>
        ) : null}

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load RVB payments"
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
            title="No RVB payments found"
            description="Try adjusting the filters and date range."
          />
        ) : null}

        {showTable ? (
          <div className={s.tableWrap}>
            {showFooter ? (
              <Typography variant="meta" tone="muted">
                {formatCount(totalSum)} stars /{' '}
                {formatUsd(toUsd(totalSum, starPrice))}
              </Typography>
            ) : null}

            <Table
              columns={columns}
              rows={showSkeleton ? skeletonRows : rows}
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
