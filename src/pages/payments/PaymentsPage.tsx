import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCharacterDetails, useCharacters } from '@/app/characters';
import { usePayments } from '@/app/payments';
import { usePlans } from '@/app/plans';
import { useUsers } from '@/app/users';
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
import type { ITgUser, PlanType } from '@/common/types';
import { formatCharacterSelectLabel } from '@/common/utils';
import { AppShell } from '@/components/templates';
import { SearchSelect } from '@/molecules';

import s from './PaymentsPage.module.scss';

type QueryUpdate = {
  planId?: string;
  userId?: string;
  characterId?: string;
  scenarioId?: string;
  ref?: string;
  createdAfter?: string;
  createdBefore?: string;
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
  }, [delay, value]);

  return debounced;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

function formatUserName(user: ITgUser) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  const username = user.username?.trim();
  if (username) return `@${username}`;
  return 'Unknown user';
}

function formatUserMeta(user: ITgUser) {
  const username = user.username?.trim();
  return username ? `@${username} / ${user.id}` : user.id;
}

function formatPlanType(type: PlanType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
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

function RefFilter({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const isDirty = useRef(false);
  const debouncedValue = useDebouncedValue(value, SEARCH_DEBOUNCE_MS).trim();

  useEffect(() => {
    if (!isDirty.current) return;
    isDirty.current = false;
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  return (
    <Field className={s.filterField} label="Ref" labelFor="payment-ref">
      <Input
        id="payment-ref"
        value={value}
        size="sm"
        onChange={(event) => {
          isDirty.current = true;
          setValue(event.target.value);
        }}
        placeholder="Exact ref"
        fullWidth
      />
    </Field>
  );
}

export function PaymentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPlanId = searchParams.get('planId') ?? '';
  const rawUserId = searchParams.get('userId') ?? '';
  const rawCharacterId = searchParams.get('characterId') ?? '';
  const rawScenarioId = searchParams.get('scenarioId') ?? '';
  const rawRef = searchParams.get('ref') ?? '';
  const rawCreatedAfter = searchParams.get('createdAfter') ?? '';
  const rawCreatedBefore = searchParams.get('createdBefore') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const planId = rawPlanId.trim();
  const userId = rawUserId.trim();
  const characterId = rawCharacterId.trim();
  const scenarioId = rawScenarioId.trim();
  const ref = rawRef.trim();
  const createdAfter = rawCreatedAfter.trim();
  const createdBefore = rawCreatedBefore.trim();
  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);

  const [userSearch, setUserSearch] = useState('');
  const [characterSearch, setCharacterSearch] = useState('');
  const debouncedUserSearch = useDebouncedValue(userSearch, SEARCH_DEBOUNCE_MS);
  const debouncedCharacterSearch = useDebouncedValue(
    characterSearch,
    SEARCH_DEBOUNCE_MS,
  );

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);
      const updateString = (key: string, value: string) => {
        const normalized = value.trim();
        if (normalized) next.set(key, normalized);
        else next.delete(key);
      };

      if (update.planId !== undefined) updateString('planId', update.planId);
      if (update.userId !== undefined) updateString('userId', update.userId);
      if (update.characterId !== undefined) {
        updateString('characterId', update.characterId);
      }
      if (update.scenarioId !== undefined) {
        updateString('scenarioId', update.scenarioId);
      }
      if (update.ref !== undefined) updateString('ref', update.ref);
      if (update.createdAfter !== undefined) {
        updateString('createdAfter', update.createdAfter);
      }
      if (update.createdBefore !== undefined) {
        updateString('createdBefore', update.createdBefore);
      }

      if (update.order !== undefined) {
        if (update.order && update.order !== DEFAULT_ORDER) {
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

  const handleRefChange = useCallback(
    (value: string) => {
      const normalized = value.trim();
      if (normalized === ref) return;

      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (normalized) next.set('ref', normalized);
          else next.delete('ref');
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [ref, setSearchParams],
  );

  useEffect(() => {
    const update: QueryUpdate = {};
    let shouldNormalize = false;

    if (rawOrder && !ORDER_VALUES.has(rawOrder)) {
      update.order = DEFAULT_ORDER;
      shouldNormalize = true;
    }
    if (rawPage && rawPage !== String(page)) {
      update.page = page;
      shouldNormalize = true;
    }
    if (rawPageSize && rawPageSize !== String(pageSize)) {
      update.pageSize = pageSize;
      shouldNormalize = true;
    }

    if (shouldNormalize) updateSearchParams(update, true);
  }, [page, pageSize, rawOrder, rawPage, rawPageSize, updateSearchParams]);

  const usersQuery = useUsers({
    search: debouncedUserSearch.trim() || undefined,
    order: 'DESC',
    skip: 0,
    take: 20,
  });
  const charactersQuery = useCharacters({
    search: debouncedCharacterSearch.trim() || undefined,
    order: 'ASC',
    skip: 0,
    take: 20,
  });
  const plansQuery = usePlans({ order: 'ASC', skip: 0, take: 1000 });
  const characterDetailsQuery = useCharacterDetails(characterId || null);

  const userOptions = useMemo(
    () =>
      (usersQuery.data?.data ?? []).map((user) => ({
        id: user.id,
        label: formatUserName(user),
        meta: formatUserMeta(user),
      })),
    [usersQuery.data?.data],
  );

  const characterOptions = useMemo(
    () =>
      (charactersQuery.data?.data ?? []).map((character) => ({
        id: character.id,
        label: formatCharacterSelectLabel(character.name, character.type),
        meta: character.id,
      })),
    [charactersQuery.data?.data],
  );

  const planOptions = useMemo(
    () => [
      { label: 'Any', value: '' },
      ...(plansQuery.data?.data ?? []).map((plan) => ({
        label: `${plan.code} · ${formatPlanType(plan.type)}`,
        value: plan.id,
      })),
    ],
    [plansQuery.data?.data],
  );

  const scenarioOptions = useMemo(() => {
    if (!characterId) {
      return [{ label: 'Select character first', value: '', disabled: true }];
    }
    if (characterDetailsQuery.isLoading && !characterDetailsQuery.data) {
      return [{ label: 'Loading scenarios...', value: '', disabled: true }];
    }

    return [
      { label: 'Any', value: '' },
      ...(characterDetailsQuery.data?.scenarios ?? []).map((scenario) => ({
        label: scenario.name || scenario.id,
        value: scenario.id,
      })),
    ];
  }, [
    characterDetailsQuery.data,
    characterDetailsQuery.isLoading,
    characterId,
  ]);

  const selectedUserLabel = useMemo(
    () => userOptions.find((option) => option.id === userId)?.label ?? '',
    [userId, userOptions],
  );
  const selectedCharacterLabel = useMemo(
    () =>
      characterOptions.find((option) => option.id === characterId)?.label ?? '',
    [characterId, characterOptions],
  );

  useEffect(() => {
    if (!scenarioId) return;
    if (!characterId) {
      updateSearchParams({ scenarioId: '', page: 1 }, true);
      return;
    }
    if (!characterDetailsQuery.data) return;
    const exists = characterDetailsQuery.data.scenarios.some(
      (scenario) => scenario.id === scenarioId,
    );
    if (!exists) updateSearchParams({ scenarioId: '', page: 1 }, true);
  }, [characterDetailsQuery.data, characterId, scenarioId, updateSearchParams]);

  const queryParams = useMemo(
    () => ({
      planId: planId || undefined,
      userId: userId || undefined,
      characterId: characterId || undefined,
      scenarioId: scenarioId || undefined,
      ref: ref || undefined,
      createdAfter: createdAfter || undefined,
      createdBefore: createdBefore || undefined,
      order: order as 'ASC' | 'DESC',
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [
      characterId,
      createdAfter,
      createdBefore,
      order,
      page,
      pageSize,
      planId,
      ref,
      scenarioId,
      userId,
    ],
  );

  const { data, error, isLoading, refetch } = usePayments(queryParams);
  const payments = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.total ?? 0;
  const effectiveTake = data?.take ?? pageSize;
  const effectiveSkip = data?.skip ?? (page - 1) * pageSize;
  const totalPages = total > 0 ? Math.ceil(total / effectiveTake) : 1;

  useEffect(() => {
    if (!data || total === 0 || page <= totalPages) return;
    updateSearchParams({ page: totalPages }, true);
  }, [data, page, total, totalPages, updateSearchParams]);

  const columns = useMemo(
    () => [
      { key: 'payment', label: 'Payment' },
      { key: 'amount', label: <span className={s.alignRight}>Amount</span> },
      { key: 'plan', label: 'Plan' },
      { key: 'user', label: 'User' },
      { key: 'character', label: 'Character' },
      { key: 'scenario', label: 'Scenario' },
      { key: 'ref', label: 'Ref' },
      { key: 'created', label: <span className={s.alignRight}>Created</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      payments.map((payment) => ({
        payment: (
          <Typography variant="caption" tone="muted">
            {payment.id}
          </Typography>
        ),
        amount: (
          <Typography variant="body" className={s.alignRight}>
            {payment.amount.toLocaleString()}
          </Typography>
        ),
        plan: (
          <div className={s.entityCell}>
            <Typography variant="body">{payment.plan.code}</Typography>
            <Typography variant="caption" tone="muted">
              {formatPlanType(payment.plan.type)}
            </Typography>
          </div>
        ),
        user: (
          <div className={s.userCell}>
            <Button
              variant="text"
              size="sm"
              className={s.linkButton}
              onClick={() => navigate(`/users/${payment.user.id}`)}
            >
              {formatUserName(payment.user)}
            </Button>
            <Typography variant="caption" tone="muted">
              {formatUserMeta(payment.user)}
            </Typography>
          </div>
        ),
        character: payment.character ? (
          <Button
            variant="text"
            size="sm"
            className={s.linkButton}
            onClick={() => navigate(`/characters/${payment.character!.id}`)}
          >
            {formatCharacterSelectLabel(
              payment.character.name,
              payment.character.type,
            )}
          </Button>
        ) : (
          <Typography variant="body" tone="muted">
            -
          </Typography>
        ),
        scenario: (
          <Typography
            variant="body"
            tone={payment.scenario ? undefined : 'muted'}
          >
            {payment.scenario?.name || '-'}
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
    [navigate, payments],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        payment: <Skeleton key={`payment-${index}`} width={180} height={12} />,
        amount: <Skeleton width={60} height={12} />,
        plan: <Skeleton width={120} height={12} />,
        user: <Skeleton width={180} height={12} />,
        character: <Skeleton width={140} height={12} />,
        scenario: <Skeleton width={140} height={12} />,
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
        <Typography variant="h2">Payments</Typography>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Plan"
              labelFor="payment-plan"
            >
              <Select
                id="payment-plan"
                options={planOptions}
                value={planId}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ planId: value, page: 1 })
                }
                disabled={plansQuery.isLoading && !plansQuery.data}
              />
            </Field>
            <Field
              className={s.filterField}
              label="User"
              labelFor="payment-user"
            >
              <SearchSelect
                id="payment-user"
                value={userId}
                valueLabel={selectedUserLabel}
                options={userOptions}
                search={userSearch}
                onSearchChange={setUserSearch}
                onSelect={(value) =>
                  updateSearchParams({ userId: value, page: 1 })
                }
                placeholder={
                  usersQuery.isLoading ? 'Loading users...' : 'Select user'
                }
                loading={usersQuery.isLoading}
                disabled={usersQuery.isLoading}
                emptyLabel="No users found."
              />
            </Field>
            <Field
              className={s.filterField}
              label="Character"
              labelFor="payment-character"
            >
              <SearchSelect
                id="payment-character"
                value={characterId}
                valueLabel={selectedCharacterLabel}
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
                  charactersQuery.isLoading
                    ? 'Loading characters...'
                    : 'Select character'
                }
                loading={charactersQuery.isLoading}
                disabled={charactersQuery.isLoading}
                emptyLabel="No characters found."
              />
            </Field>
            <Field
              className={s.filterField}
              label="Scenario"
              labelFor="payment-scenario"
            >
              <Select
                id="payment-scenario"
                options={scenarioOptions}
                value={characterId ? scenarioId : ''}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ scenarioId: value, page: 1 })
                }
                disabled={!characterId || characterDetailsQuery.isLoading}
              />
            </Field>
          </div>

          <div className={s.filterRow}>
            <RefFilter
              key={rawRef}
              initialValue={rawRef}
              onChange={handleRefChange}
            />
            <Field
              className={s.filterFieldSm}
              label="Created after"
              labelFor="payment-created-after"
            >
              <Input
                id="payment-created-after"
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
              labelFor="payment-created-before"
            >
              <Input
                id="payment-created-before"
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
            <Field
              className={s.filterFieldSm}
              label="Order"
              labelFor="payment-order"
            >
              <Select
                id="payment-order"
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
              title="Unable to load payments"
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
            title="No payments found"
            description="Try adjusting the filters and date range."
          />
        ) : null}

        {showTable ? (
          <div className={s.tableWrap}>
            <Table
              columns={columns}
              rows={showSkeleton ? skeletonRows : rows}
            />
          </div>
        ) : null}

        {showFooter ? (
          <div className={s.footer}>
            <Typography variant="caption" tone="muted">
              Showing {rangeStart}-{rangeEnd} of {total.toLocaleString()}
            </Typography>
            <div className={s.paginationRow}>
              <Field label="Page size" labelFor="payment-page-size">
                <Select
                  id="payment-page-size"
                  size="sm"
                  variant="ghost"
                  value={String(pageSize)}
                  options={PAGE_SIZE_OPTIONS.map((value) => ({
                    label: String(value),
                    value: String(value),
                  }))}
                  onChange={(value) =>
                    updateSearchParams({ pageSize: Number(value), page: 1 })
                  }
                />
              </Field>
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={(nextPage) => updateSearchParams({ page: nextPage })}
              />
            </div>
          </div>
        ) : null}
      </Container>
    </AppShell>
  );
}
