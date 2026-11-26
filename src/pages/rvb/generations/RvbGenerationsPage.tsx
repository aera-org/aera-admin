import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useRvbGenerations } from '@/app/rvb';
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
  Tag,
  Typography,
} from '@/atoms';
import {
  type IRvbGeneration,
  RvbGenerationStatus,
  RvbGenerationType,
} from '@/common/types';
import { AppShell } from '@/components/templates';

import {
  DEFAULT_PAGE_SIZE,
  formatDate,
  formatRvbUserMeta,
  formatRvbUserName,
  GENERATION_STATUS_LABELS,
  GENERATION_STATUS_TONES,
  GENERATION_TYPE_LABELS,
  generationStatusOptions,
  generationTypeOptions,
  ORDER_OPTIONS,
  PAGE_SIZE_OPTIONS,
  parsePageSize,
  parsePositiveNumber,
  resolveEnum,
} from '../rvbFormat';
import s from '../RvbPage.module.scss';

type QueryUpdate = {
  userId?: string;
  status?: string;
  type?: string;
  createdAfter?: string;
  createdBefore?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

const DEFAULT_ORDER = 'DESC';

export function RvbGenerationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = searchParams.get('userId') ?? '';
  const status = resolveEnum(
    searchParams.get('status'),
    Object.values(RvbGenerationStatus),
  );
  const type = resolveEnum(
    searchParams.get('type'),
    Object.values(RvbGenerationType),
  );
  const createdAfter = searchParams.get('createdAfter') ?? '';
  const createdBefore = searchParams.get('createdBefore') ?? '';
  const order = searchParams.get('order') === 'ASC' ? 'ASC' : DEFAULT_ORDER;
  const page = parsePositiveNumber(searchParams.get('page'), 1);
  const pageSize = parsePageSize(searchParams.get('pageSize'));

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);
      const setOrDelete = (key: string, value: string | undefined) => {
        if (value === undefined) return;
        if (value) next.set(key, value);
        else next.delete(key);
      };

      setOrDelete('userId', update.userId);
      setOrDelete('status', update.status);
      setOrDelete('type', update.type);
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

  const queryParams = useMemo(
    () => ({
      userId: userId || undefined,
      status: status || undefined,
      type: type || undefined,
      createdAfter: createdAfter || undefined,
      createdBefore: createdBefore || undefined,
      order: order as 'ASC' | 'DESC',
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [createdAfter, createdBefore, order, page, pageSize, status, type, userId],
  );

  const { data, error, isLoading, refetch } = useRvbGenerations(queryParams);
  const generations = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.total ?? 0;
  const effectiveTake = data?.take ?? pageSize;
  const effectiveSkip = data?.skip ?? (page - 1) * pageSize;
  const totalPages = total > 0 ? Math.ceil(total / effectiveTake) : 1;

  useEffect(() => {
    if (!data || total === 0 || page <= totalPages) return;
    updateSearchParams({ page: totalPages }, true);
  }, [data, page, total, totalPages, updateSearchParams]);

  const filteredUser = useMemo(
    () => generations.find((item) => item.user?.id === userId)?.user ?? null,
    [generations, userId],
  );

  const columns = useMemo(
    () => [
      { key: 'preview', label: '' },
      { key: 'generation', label: 'Generation' },
      { key: 'status', label: 'Status' },
      { key: 'credits', label: 'Credits' },
      { key: 'user', label: 'User' },
      { key: 'prompt', label: 'Prompt' },
      { key: 'created', label: <span className={s.alignRight}>Created</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      generations.map((item) => {
        const previewUrl = item.photo?.url ?? item.ref1?.url ?? null;
        return {
          preview: previewUrl ? (
            <img className={s.thumb} src={previewUrl} alt="" loading="lazy" />
          ) : (
            <div className={s.thumb} />
          ),
          generation: (
            <div className={s.cell}>
              <Typography variant="body">
                {item.type ? GENERATION_TYPE_LABELS[item.type] : 'Type not set'}
              </Typography>
              <Typography variant="caption" tone="muted">
                {[
                  item.duration ? `${item.duration}s` : null,
                  item.resolution ? `${item.resolution}p` : null,
                  item.aspectRatio,
                ]
                  .filter(Boolean)
                  .join(' · ') || item.id}
              </Typography>
            </div>
          ),
          status: (
            <Badge tone={GENERATION_STATUS_TONES[item.status]}>
              {GENERATION_STATUS_LABELS[item.status]}
            </Badge>
          ),
          credits: (
            <Typography variant="body" tone="muted">
              {item.credits}
            </Typography>
          ),
          user: item.user ? (
            <div className={s.cell}>
              <Typography variant="body">
                {formatRvbUserName(item.user)}
              </Typography>
              <Typography variant="caption" tone="muted">
                {formatRvbUserMeta(item.user)}
              </Typography>
            </div>
          ) : (
            <Typography variant="body" tone="muted">
              -
            </Typography>
          ),
          prompt: (
            <Typography variant="body" tone={item.prompt ? undefined : 'muted'}>
              {item.prompt?.name ?? '-'}
            </Typography>
          ),
          created: (
            <Typography variant="caption" tone="muted" className={s.alignRight}>
              {formatDate(item.createdAt)}
            </Typography>
          ),
        };
      }),
    [generations],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        preview: (
          <Skeleton key={`rvb-generation-${index}`} width={40} height={40} />
        ),
        generation: <Skeleton width={140} height={12} />,
        status: <Skeleton width={70} height={20} />,
        credits: <Skeleton width={40} height={12} />,
        user: <Skeleton width={160} height={12} />,
        prompt: <Skeleton width={120} height={12} />,
        created: <Skeleton width={120} height={12} />,
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && generations.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const openGeneration = (item: IRvbGeneration) =>
    navigate(`/rvb/generations/${item.id}`);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">RVB generations</Typography>
          </div>
        </div>

        <div className={s.filterRow}>
          <Field label="Status" labelFor="rvb-generations-status">
            <Select
              id="rvb-generations-status"
              options={[
                { label: 'Any status', value: '' },
                ...generationStatusOptions,
              ]}
              value={status}
              size="sm"
              variant="ghost"
              onChange={(value) =>
                updateSearchParams({ status: value, page: 1 })
              }
            />
          </Field>
          <Field label="Type" labelFor="rvb-generations-type">
            <Select
              id="rvb-generations-type"
              options={[
                { label: 'Any type', value: '' },
                ...generationTypeOptions,
              ]}
              value={type}
              size="sm"
              variant="ghost"
              onChange={(value) => updateSearchParams({ type: value, page: 1 })}
            />
          </Field>
          <Field
            className={s.filterFieldSm}
            label="Created after"
            labelFor="rvb-generations-created-after"
          >
            <Input
              id="rvb-generations-created-after"
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
            labelFor="rvb-generations-created-before"
          >
            <Input
              id="rvb-generations-created-before"
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
          <Field label="Order" labelFor="rvb-generations-order">
            <Select
              id="rvb-generations-order"
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
              title="Unable to load RVB generations"
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
            title="No RVB generations found"
            description="Try adjusting the filters and date range."
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
                      const item = generations[index];
                      if (!item) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => openGeneration(item),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openGeneration(item);
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
