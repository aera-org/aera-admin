import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCharacterDetails, useCharacters } from '@/app/characters';
import { useGifts } from '@/app/gifts';
import { useInAppPurchases } from '@/app/in-app-purchases';
import { useUsers } from '@/app/users';
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
import type {
  ICharacter,
  ITgUser,
} from '@/common/types';
import { InAppPurchaseType } from '@/common/types';
import { formatCharacterSelectLabel, formatPose } from '@/common/utils';
import { AppShell } from '@/components/templates';
import { SearchSelect } from '@/molecules';

import s from './AirPurchasesPage.module.scss';

type QueryUpdate = {
  userId?: string;
  type?: InAppPurchaseType | '';
  before?: string;
  after?: string;
  giftId?: string;
  scenarioId?: string;
  characterId?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

const ORDER_OPTIONS = [
  { label: 'Ascending', value: 'ASC' },
  { label: 'Descending', value: 'DESC' },
];

const TYPE_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Video', value: InAppPurchaseType.Video },
  { label: 'Gift', value: InAppPurchaseType.Gift },
  { label: 'Custom character', value: InAppPurchaseType.CustomCharacter },
  { label: 'Custom scenario', value: InAppPurchaseType.CustomScenario },
];

const ORDER_VALUES = new Set(ORDER_OPTIONS.map((option) => option.value));
const TYPE_VALUES = new Set(
  Object.values(InAppPurchaseType) as Array<InAppPurchaseType>,
);
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_ORDER = 'DESC';
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

const PURCHASE_TYPE_LABELS: Record<InAppPurchaseType, string> = {
  [InAppPurchaseType.Video]: 'Video',
  [InAppPurchaseType.Gift]: 'Gift',
  [InAppPurchaseType.CustomCharacter]: 'Custom character',
  [InAppPurchaseType.CustomScenario]: 'Custom scenario',
};

const PURCHASE_TYPE_TONES: Record<
  InAppPurchaseType,
  'accent' | 'success' | 'warning' | 'danger'
> = {
  [InAppPurchaseType.Video]: 'accent',
  [InAppPurchaseType.Gift]: 'success',
  [InAppPurchaseType.CustomCharacter]: 'warning',
  [InAppPurchaseType.CustomScenario]: 'danger',
};

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

function formatUserName(user: ITgUser) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  const username = user.username?.trim();
  if (username) return `@${username}`;
  return 'Unknown user';
}

function buildCharacterPath(character: ICharacter) {
  return character.isCustom
    ? `/custom-characters/${character.id}`
    : `/characters/${character.id}`;
}

export function AirPurchasesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawUserId = searchParams.get('userId') ?? '';
  const rawType = searchParams.get('type');
  const rawBefore = searchParams.get('before') ?? '';
  const rawAfter = searchParams.get('after') ?? '';
  const rawGiftId = searchParams.get('giftId') ?? '';
  const rawScenarioId = searchParams.get('scenarioId') ?? '';
  const rawCharacterId = searchParams.get('characterId') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const userId = rawUserId.trim();
  const before = rawBefore.trim();
  const after = rawAfter.trim();
  const giftId = rawGiftId.trim();
  const scenarioId = rawScenarioId.trim();
  const characterId = rawCharacterId.trim();
  const type = TYPE_VALUES.has(rawType as InAppPurchaseType)
    ? (rawType as InAppPurchaseType)
    : undefined;

  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);

  const [userSearch, setUserSearch] = useState('');
  const [characterSearch, setCharacterSearch] = useState('');
  const [giftSearch, setGiftSearch] = useState('');
  const debouncedUserSearch = useDebouncedValue(userSearch, SEARCH_DEBOUNCE_MS);
  const debouncedCharacterSearch = useDebouncedValue(
    characterSearch,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedGiftSearch = useDebouncedValue(giftSearch, SEARCH_DEBOUNCE_MS);

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.userId !== undefined) {
        const nextUserId = update.userId.trim();
        if (nextUserId) {
          next.set('userId', nextUserId);
        } else {
          next.delete('userId');
        }
      }

      if (update.type !== undefined) {
        if (update.type) {
          next.set('type', update.type);
        } else {
          next.delete('type');
        }
      }

      if (update.before !== undefined) {
        const nextBefore = update.before.trim();
        if (nextBefore) {
          next.set('before', nextBefore);
        } else {
          next.delete('before');
        }
      }

      if (update.after !== undefined) {
        const nextAfter = update.after.trim();
        if (nextAfter) {
          next.set('after', nextAfter);
        } else {
          next.delete('after');
        }
      }

      if (update.giftId !== undefined) {
        const nextGiftId = update.giftId.trim();
        if (nextGiftId) {
          next.set('giftId', nextGiftId);
        } else {
          next.delete('giftId');
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

      if (update.characterId !== undefined) {
        const nextCharacterId = update.characterId.trim();
        if (nextCharacterId) {
          next.set('characterId', nextCharacterId);
        } else {
          next.delete('characterId');
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

  const userQueryParams = useMemo(
    () => ({
      search: debouncedUserSearch.trim() || undefined,
      order: 'DESC',
      skip: 0,
      take: 20,
    }),
    [debouncedUserSearch],
  );
  const { data: usersData, isLoading: isUsersLoading } = useUsers(
    userQueryParams,
  );

  const characterQueryParams = useMemo(
    () => ({
      search: debouncedCharacterSearch.trim() || undefined,
      order: 'ASC',
      skip: 0,
      take: 20,
    }),
    [debouncedCharacterSearch],
  );
  const { data: charactersData, isLoading: isCharactersLoading } =
    useCharacters(characterQueryParams);

  const giftQueryParams = useMemo(
    () => ({
      search: debouncedGiftSearch.trim() || undefined,
      order: 'ASC',
      skip: 0,
      take: 20,
    }),
    [debouncedGiftSearch],
  );
  const { data: giftsData, isLoading: isGiftsLoading } = useGifts(
    giftQueryParams,
  );

  const { data: characterDetails, isLoading: isScenariosLoading } =
    useCharacterDetails(characterId || null);

  const userOptions = useMemo(
    () =>
      (usersData?.data ?? []).map((user) => ({
        id: user.id,
        label: formatUserName(user),
        meta: user.id,
      })),
    [usersData?.data],
  );

  const characterOptions = useMemo(
    () =>
      (charactersData?.data ?? []).map((character) => ({
        id: character.id,
        label: formatCharacterSelectLabel(character.name, character.type),
        meta: character.id,
      })),
    [charactersData?.data],
  );

  const giftOptions = useMemo(
    () =>
      (giftsData?.data ?? []).map((gift) => ({
        id: gift.id,
        label: gift.name,
        meta: gift.id,
      })),
    [giftsData?.data],
  );

  const scenarioSelectOptions = useMemo(() => {
    if (!characterId) {
      return [{ label: 'Select character first', value: '', disabled: true }];
    }
    if (isScenariosLoading && !characterDetails) {
      return [{ label: 'Loading scenarios...', value: '', disabled: true }];
    }

    const options = (characterDetails?.scenarios ?? []).map((scenario) => ({
      label: scenario.name,
      value: scenario.id,
    }));

    if (scenarioId && !options.some((option) => option.value === scenarioId)) {
      options.push({ label: scenarioId, value: scenarioId });
    }

    return [{ label: 'All scenarios', value: '' }, ...options];
  }, [characterDetails, characterId, isScenariosLoading, scenarioId]);

  const selectedUserLabel = useMemo(() => {
    const selected = userOptions.find((option) => option.id === userId);
    return selected?.label ?? '';
  }, [userId, userOptions]);

  const selectedCharacterLabel = useMemo(() => {
    const selected = characterOptions.find((option) => option.id === characterId);
    return selected?.label ?? '';
  }, [characterId, characterOptions]);

  const selectedGiftLabel = useMemo(() => {
    const selected = giftOptions.find((option) => option.id === giftId);
    return selected?.label ?? '';
  }, [giftId, giftOptions]);

  useEffect(() => {
    if (!characterId && scenarioId) {
      updateSearchParams({ scenarioId: '', page: 1 }, true);
    }
  }, [characterId, scenarioId, updateSearchParams]);

  useEffect(() => {
    if (!characterId || !scenarioId || !characterDetails) return;
    const exists = characterDetails.scenarios.some(
      (scenario) => scenario.id === scenarioId,
    );
    if (!exists) {
      updateSearchParams({ scenarioId: '', page: 1 }, true);
    }
  }, [characterDetails, characterId, scenarioId, updateSearchParams]);

  const queryParams = useMemo(
    () => ({
      userId: userId || undefined,
      type,
      before: before || undefined,
      after: after || undefined,
      giftId: giftId || undefined,
      scenarioId: scenarioId || undefined,
      characterId: characterId || undefined,
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [
      userId,
      type,
      before,
      after,
      giftId,
      scenarioId,
      characterId,
      order,
      page,
      pageSize,
    ],
  );

  const { data, error, isLoading, refetch } = useInAppPurchases(queryParams);

  const purchases = useMemo(() => data?.data ?? [], [data?.data]);
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
      { key: 'type', label: 'Type' },
      { key: 'amount', label: <span className={s.alignRight}>Amount</span> },
      { key: 'character', label: 'Character' },
      { key: 'scenario', label: 'Scenario' },
      { key: 'video', label: 'Video' },
      { key: 'gift', label: 'Gift' },
      { key: 'user', label: 'User' },
      { key: 'date', label: <span className={s.alignRight}>Date</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      purchases.map((purchase) => ({
        type: (
          <Badge tone={PURCHASE_TYPE_TONES[purchase.type]} outline>
            {PURCHASE_TYPE_LABELS[purchase.type]}
          </Badge>
        ),
        amount: (
          <Typography variant="body" className={s.alignRight}>
            {purchase.amount.toLocaleString()}
          </Typography>
        ),
        character: purchase.character ? (
          <div className={s.entityCell}>
            <Button
              variant="text"
              size="sm"
              className={s.linkButton}
              onClick={() => navigate(buildCharacterPath(purchase.character!))}
            >
              {formatCharacterSelectLabel(
                purchase.character.name,
                purchase.character.type,
              )}
            </Button>
          </div>
        ) : (
          <Typography variant="body" tone="muted">
            -
          </Typography>
        ),
        scenario: (
          <Typography variant="body">
            {purchase.scenario?.name?.trim() || '-'}
          </Typography>
        ),
        video: (
          <Typography variant="body">
            {purchase.video ? formatPose(purchase.video.pose) : '-'}
          </Typography>
        ),
        gift: (
          <Typography variant="body">
            {purchase.gift?.name?.trim() || '-'}
          </Typography>
        ),
        user: purchase.user ? (
          <div className={s.userCell}>
            <Button
              variant="text"
              size="sm"
              className={s.linkButton}
              onClick={() => navigate(`/users/${purchase.userId}`)}
            >
              {formatUserName(purchase.user)}
            </Button>
            <Typography variant="caption" tone="muted">
              {purchase.userId}
            </Typography>
          </div>
        ) : (
          <Typography variant="body" tone="muted">
            -
          </Typography>
        ),
        date: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(purchase.createdAt)}
          </Typography>
        ),
      })),
    [navigate, purchases],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        type: <Skeleton width={120} height={24} key={`purchase-type-${index}`} />,
        amount: (
          <div className={s.alignRight}>
            <Skeleton width={72} height={12} />
          </div>
        ),
        character: (
          <div className={s.entityCell}>
            <Skeleton width={140} height={12} />
          </div>
        ),
        scenario: <Skeleton width={110} height={12} />,
        video: <Skeleton width={90} height={12} />,
        gift: <Skeleton width={100} height={12} />,
        user: (
          <div className={s.userCell}>
            <Skeleton width={120} height={12} />
            <Skeleton width={90} height={10} />
          </div>
        ),
        date: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && purchases.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.titleBlock}>
          <Typography variant="h2">Air Purchases</Typography>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterFieldSm}
              label="Type"
              labelFor="air-purchases-type"
            >
              <Select
                id="air-purchases-type"
                options={TYPE_OPTIONS}
                value={type ?? ''}
                size="md"
                onChange={(value) =>
                  updateSearchParams({
                    type: (value as InAppPurchaseType | '') ?? '',
                    page: 1,
                  })
                }
              />
            </Field>
            <Field
              className={s.filterField}
              label="Character"
              labelFor="air-purchases-character"
            >
              <SearchSelect
                id="air-purchases-character"
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
                  isCharactersLoading ? 'Loading characters...' : 'Select character'
                }
                loading={isCharactersLoading}
                disabled={isCharactersLoading}
                emptyLabel="No characters found."
              />
            </Field>

            <Field
              className={s.filterField}
              label="Scenario"
              labelFor="air-purchases-scenario"
            >
              <Select
                id="air-purchases-scenario"
                options={scenarioSelectOptions}
                value={characterId ? scenarioId : ''}
                fullWidth
                placeholder="Select scenario"
                disabled={!characterId || isScenariosLoading}
                onChange={(value) =>
                  updateSearchParams({ scenarioId: value, page: 1 })
                }
              />
            </Field>
            <Field className={s.filterField} label="User" labelFor="air-purchases-user">
              <SearchSelect
                id="air-purchases-user"
                value={userId}
                valueLabel={selectedUserLabel}
                options={userOptions}
                search={userSearch}
                onSearchChange={setUserSearch}
                onSelect={(value) => updateSearchParams({ userId: value, page: 1 })}
                placeholder={isUsersLoading ? 'Loading users...' : 'Select user'}
                loading={isUsersLoading}
                disabled={isUsersLoading}
                emptyLabel="No users found."
              />
            </Field>
          </div>


          <div className={s.filterRow}>
          <Field
              className={s.filterFieldSm}
              label="From"
              labelFor="air-purchases-after"
            >
              <Input
                id="air-purchases-after"
                size="sm"
                type="date"
                value={after}
                onChange={(event) =>
                  updateSearchParams({ after: event.target.value, page: 1 })
                }
                fullWidth
              />
            </Field>
            <Field
              className={s.filterFieldSm}
              label="To"
              labelFor="air-purchases-before"
            >
              <Input
                id="air-purchases-before"
                size="sm"
                type="date"
                value={before}
                onChange={(event) =>
                  updateSearchParams({ before: event.target.value, page: 1 })
                }
                fullWidth
              />
            </Field>
            <Field className={s.filterField} label="Gift" labelFor="air-purchases-gift">
              <SearchSelect
                id="air-purchases-gift"
                value={giftId}
                valueLabel={selectedGiftLabel}
                options={giftOptions}
                search={giftSearch}
                onSearchChange={setGiftSearch}
                onSelect={(value) => updateSearchParams({ giftId: value, page: 1 })}
                placeholder={isGiftsLoading ? 'Loading gifts...' : 'Select gift'}
                loading={isGiftsLoading}
                disabled={isGiftsLoading}
                emptyLabel="No gifts found."
              />
            </Field>
            <Field
              className={s.filterFieldSm}
              label="Order"
              labelFor="air-purchases-order"
            >
              <Select
                id="air-purchases-order"
                options={ORDER_OPTIONS}
                value={order}
                variant='ghost'
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
              title="Unable to load air purchases"
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
            title="No air purchases found"
            description="Try adjusting the filters and date range."
          />
        ) : null}

        {showTable ? (
          <div className={s.tableWrap}>
            {showFooter ? (
              <Typography variant="meta" tone="muted">
                Total: {total.toLocaleString()}
              </Typography>
            ) : null}

            <Table columns={columns} rows={showSkeleton ? skeletonRows : rows} />
          </div>
        ) : null}

        {showFooter ? (
          <div className={s.footer}>
            <Typography variant="caption" tone="muted">
              Showing {rangeStart}-{rangeEnd} of {total.toLocaleString()}
            </Typography>
            <div className={s.paginationRow}>
              <Field label="Page size" labelFor="air-purchases-page-size">
                <Select
                  id="air-purchases-page-size"
                  size="sm"
                  variant="ghost"
                  value={String(pageSize)}
                  options={PAGE_SIZE_OPTIONS.map((value) => ({
                    label: String(value),
                    value: String(value),
                  }))}
                  onChange={(value) =>
                    updateSearchParams({
                      pageSize: Number(value),
                      page: 1,
                    })
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
