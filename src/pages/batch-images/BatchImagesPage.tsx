import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useBatchImages, useCreateBatchImage } from '@/app/batch-images';
import { useLoras } from '@/app/loras';
import { PlusIcon } from '@/assets/icons';
import {
  Alert,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  Input,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Textarea,
  Typography,
} from '@/atoms';
import type { IBatchImgSet } from '@/common/types';
import { Drawer, LoraSelect } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import s from './BatchImagesPage.module.scss';

type QueryUpdate = {
  search?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

type CreateBatchImageValues = {
  name: string;
  count: string;
  prompt: string;
  loraId: string;
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
const LORA_SEARCH_DEBOUNCE_MS = 300;
const MIN_COUNT = 1;
const EMPTY_CREATE_VALUES: CreateBatchImageValues = {
  name: '',
  count: String(MIN_COUNT),
  prompt: '',
  loraId: '',
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

function parseCount(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_COUNT) return null;
  return parsed;
}

export function BatchImagesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createShowErrors, setCreateShowErrors] = useState(false);
  const [createValues, setCreateValues] =
    useState<CreateBatchImageValues>(EMPTY_CREATE_VALUES);
  const [loraSearch, setLoraSearch] = useState('');
  const debouncedLoraSearch = useDebouncedValue(
    loraSearch,
    LORA_SEARCH_DEBOUNCE_MS,
  );

  const createMutation = useCreateBatchImage();
  const loraQueryParams = useMemo(
    () => ({
      search: debouncedLoraSearch.trim() || undefined,
      order: 'DESC',
      skip: 0,
      take: 100,
    }),
    [debouncedLoraSearch],
  );
  const { data: loraData, isLoading: isLoraLoading } =
    useLoras(loraQueryParams);

  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);

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
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [normalizedSearch, order, page, pageSize],
  );

  const { data, error, isLoading, refetch } = useBatchImages(queryParams);

  const batchImages = useMemo(() => data?.data ?? [], [data]);
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
      { key: 'name', label: 'Batch image' },
      { key: 'count', label: <span className={s.alignRight}>Count</span> },
      { key: 'created', label: <span className={s.alignRight}>Created</span> },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      batchImages.map((batchImage) => ({
        name: (
          <div className={s.nameCell}>
            <Typography variant="body">{batchImage.name}</Typography>
            <Typography variant="caption" tone="muted">
              {batchImage.id}
            </Typography>
          </div>
        ),
        count: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {batchImage.count.toLocaleString()}
          </Typography>
        ),
        created: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(batchImage.createdAt)}
          </Typography>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(batchImage.updatedAt)}
          </Typography>
        ),
      })),
    [batchImages],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        name: (
          <div className={s.nameCell} key={`batch-image-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        count: (
          <div className={s.alignRight}>
            <Skeleton width={48} height={12} />
          </div>
        ),
        created: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && batchImages.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);
  const parsedCount = parseCount(createValues.count);
  const loraOptions = useMemo(() => loraData?.data ?? [], [loraData?.data]);

  const createValidationErrors = useMemo(() => {
    if (!createShowErrors) return {};

    return {
      name: createValues.name.trim() ? undefined : 'Enter a name.',
      count:
        parsedCount !== null
          ? undefined
          : `Enter a value of ${MIN_COUNT} or more.`,
      prompt: createValues.prompt.trim() ? undefined : 'Enter a prompt.',
      loraId: createValues.loraId ? undefined : 'Select a LoRA.',
    };
  }, [
    createShowErrors,
    createValues.loraId,
    createValues.name,
    createValues.prompt,
    parsedCount,
  ]);

  const openCreateModal = () => {
    setCreateValues(EMPTY_CREATE_VALUES);
    setLoraSearch('');
    setCreateShowErrors(false);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const handleCreate = async () => {
    const errors = {
      name: createValues.name.trim() ? undefined : 'Enter a name.',
      count:
        parsedCount !== null
          ? undefined
          : `Enter a value of ${MIN_COUNT} or more.`,
      prompt: createValues.prompt.trim() ? undefined : 'Enter a prompt.',
      loraId: createValues.loraId ? undefined : 'Select a LoRA.',
    };

    if (errors.name || errors.count || errors.prompt || errors.loraId) {
      setCreateShowErrors(true);
      return;
    }

    const result = await createMutation.mutateAsync({
      name: createValues.name.trim(),
      count: parsedCount!,
      prompt: createValues.prompt.trim(),
      loraId: createValues.loraId,
    });

    setIsCreateOpen(false);
    if (result?.id) {
      navigate(`/batch-images/${result.id}`);
    }
  };

  const openDetails = (batchImage: IBatchImgSet) => {
    navigate(`/batch-images/${batchImage.id}`);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Promo Images</Typography>
          </div>
          <Button iconLeft={<PlusIcon />} onClick={openCreateModal}>
            New batch image
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Search"
              labelFor="batch-images-search"
            >
              <Input
                id="batch-images-search"
                placeholder="Search by name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Order" labelFor="batch-images-order">
              <Select
                id="batch-images-order"
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
              title="Unable to load batch images"
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
            title="No batch images found"
            description="Adjust your filters to see results."
            action={<Button onClick={openCreateModal}>New batch image</Button>}
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
                      const batchImage = batchImages[index];
                      if (!batchImage) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => openDetails(batchImage),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDetails(batchImage);
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

      <Drawer
        open={isCreateOpen}
        title="New batch image"
        className={s.createDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateModal();
          } else {
            setIsCreateOpen(true);
          }
        }}
      >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Name"
              labelFor="batch-image-create-name"
              error={createValidationErrors.name}
            >
              <Input
                id="batch-image-create-name"
                size="sm"
                value={createValues.name}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Batch image name"
                fullWidth
              />
            </Field>
            <Field
              label="Count"
              labelFor="batch-image-create-count"
              error={createValidationErrors.count}
            >
              <Input
                id="batch-image-create-count"
                type="number"
                min={MIN_COUNT}
                size="sm"
                value={createValues.count}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    count: event.target.value,
                  }))
                }
                placeholder={String(MIN_COUNT)}
                fullWidth
              />
            </Field>
          </FormRow>

          <Field
            label="LoRA"
            labelFor="batch-image-create-lora"
            error={createValidationErrors.loraId}
          >
            <LoraSelect
              id="batch-image-create-lora"
              value={createValues.loraId}
              options={loraOptions.map((lora) => ({
                id: lora.id,
                fileName: lora.fileName,
              }))}
              search={loraSearch}
              onSearchChange={setLoraSearch}
              onSelect={(value) =>
                setCreateValues((prev) => ({ ...prev, loraId: value }))
              }
              placeholder={isLoraLoading ? 'Loading LoRAs...' : 'Select LoRA'}
              disabled={isLoraLoading}
              loading={isLoraLoading}
            />
          </Field>

          <Field
            label="Prompt"
            labelFor="batch-image-create-prompt"
            error={createValidationErrors.prompt}
          >
            <Textarea
              id="batch-image-create-prompt"
              size="sm"
              value={createValues.prompt}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  prompt: event.target.value,
                }))
              }
              rows={8}
              placeholder="Describe the image batch to generate"
              fullWidth
            />
          </Field>

          <div>
            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              Create batch image
            </Button>
          </div>
        </Stack>
      </Drawer>
    </AppShell>
  );
}
