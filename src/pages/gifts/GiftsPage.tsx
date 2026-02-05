import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCreateGift, useGifts } from '@/app/gifts';
import { notifyError } from '@/app/toast';
import { PlusIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Textarea,
  Typography,
} from '@/atoms';
import { FileDir, type IGift, type IFile } from '@/common/types';
import { FileUpload } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import s from './GiftsPage.module.scss';

type QueryUpdate = {
  search?: string;
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

export function GiftsPage() {
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
  const [createFile, setCreateFile] = useState<IFile | null>(null);
  const [createValues, setCreateValues] = useState({
    name: '',
    description: '',
    price: '',
    isActive: true,
    imgId: '',
  });

  const createMutation = useCreateGift();

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

  const { data, error, isLoading, refetch } = useGifts(queryParams);

  const gifts = data?.data ?? [];
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
      { key: 'gift', label: 'Gift' },
      { key: 'price', label: 'Price' },
      { key: 'status', label: 'Status' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      gifts.map((gift) => ({
        gift: (
          <div className={s.giftCell}>
            <Typography variant="body">{gift.name}</Typography>
            <Typography variant="caption" tone="muted">
              {gift.id}
            </Typography>
          </div>
        ),
        price: (
          <Typography variant="body" tone="muted">
            {gift.price.toLocaleString()}
          </Typography>
        ),
        status: gift.isActive ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="warning" outline>
            Inactive
          </Badge>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(gift.updatedAt)}
          </Typography>
        ),
      })),
    [gifts],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        gift: (
          <div className={s.giftCell} key={`gift-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        price: <Skeleton width={80} height={12} />,
        status: <Skeleton width={80} height={20} />,
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && gifts.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const createValidationErrors = useMemo(() => {
    if (!createShowErrors) return {};
    const errors: { name?: string; description?: string; price?: string; imgId?: string } = {};
    if (!createValues.name.trim()) {
      errors.name = 'Enter a name.';
    }
    if (!createValues.description.trim()) {
      errors.description = 'Enter a description.';
    }
    if (!createValues.price.trim()) {
      errors.price = 'Enter a price.';
    } else if (!Number.isFinite(Number(createValues.price)) || Number(createValues.price) <= 0) {
      errors.price = 'Enter a positive number.';
    }
    if (!createValues.imgId) {
      errors.imgId = 'Upload an image.';
    }
    return errors;
  }, [createShowErrors, createValues.description, createValues.imgId, createValues.name, createValues.price]);

  const createIsValid = useMemo(
    () =>
      Boolean(
        createValues.name.trim() &&
          createValues.description.trim() &&
          createValues.imgId &&
          createValues.price.trim() &&
          Number(createValues.price) > 0,
      ),
    [createValues.description, createValues.imgId, createValues.name, createValues.price],
  );

  const openCreateModal = () => {
    setCreateValues({
      name: '',
      description: '',
      price: '',
      isActive: true,
      imgId: '',
    });
    setCreateFile(null);
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
      description: createValues.description.trim()
        ? undefined
        : 'Enter a description.',
      price: createValues.price.trim()
        ? Number(createValues.price) > 0
          ? undefined
          : 'Enter a positive number.'
        : 'Enter a price.',
      imgId: createValues.imgId ? undefined : 'Upload an image.',
    };
    if (errors.name || errors.description || errors.price || errors.imgId) {
      setCreateShowErrors(true);
      return;
    }

    const result = await createMutation.mutateAsync({
      name: createValues.name.trim(),
      description: createValues.description.trim(),
      price: Number(createValues.price),
      imgId: createValues.imgId,
      isActive: createValues.isActive,
    });

    setIsCreateOpen(false);
    if (result?.id) {
      navigate(`/gifts/${result.id}`);
    }
  };

  const openDetails = (gift: IGift) => {
    navigate(`/gifts/${gift.id}`);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Gifts</Typography>
          </div>
          <Button iconLeft={<PlusIcon />} onClick={openCreateModal}>
            New gift
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Search"
              labelFor="gifts-search"
            >
              <Input
                id="gifts-search"
                placeholder="Search by name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Order" labelFor="gifts-order">
              <Select
                id="gifts-order"
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
              title="Unable to load gifts"
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
            title="No gifts found"
            description="Create a gift to get started."
            action={<Button onClick={openCreateModal}>New gift</Button>}
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
                      const gift = gifts[index];
                      if (!gift) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => openDetails(gift),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDetails(gift);
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

      <Modal
        open={isCreateOpen}
        title="New gift"
        onClose={closeCreateModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeCreateModal}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={
                !createIsValid ||
                createMutation.isPending ||
                Boolean(
                  createValidationErrors.name ||
                    createValidationErrors.description ||
                    createValidationErrors.price ||
                    createValidationErrors.imgId,
                )
              }
            >
              Create
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Name"
              labelFor="gift-create-name"
              error={createValidationErrors.name}
            >
              <Input
                id="gift-create-name"
                size="sm"
                value={createValues.name}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Gift name"
                fullWidth
              />
            </Field>
            <Field
              label="Price"
              labelFor="gift-create-price"
              error={createValidationErrors.price}
            >
              <Input
                id="gift-create-price"
                size="sm"
                type="number"
                min={1}
                step={1}
                value={createValues.price}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    price: event.target.value,
                  }))
                }
                placeholder="0"
                fullWidth
              />
            </Field>
          </FormRow>

          <Field
            label="Description"
            labelFor="gift-create-description"
            error={createValidationErrors.description}
          >
            <Textarea
              id="gift-create-description"
              value={createValues.description}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={4}
              fullWidth
            />
          </Field>

          <Field label="Status">
            <Switch
              checked={createValues.isActive}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  isActive: event.target.checked,
                }))
              }
              label={createValues.isActive ? 'Active' : 'Inactive'}
            />
          </Field>

          <div>
            <FileUpload
              label="Image file"
              folder={FileDir.Public}
              value={createFile}
              onChange={(file) => {
                setCreateFile(file);
                setCreateValues((prev) => ({
                  ...prev,
                  imgId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
            {createValidationErrors.imgId ? (
              <Typography
                variant="caption"
                tone="warning"
                className={s.fileError}
              >
                {createValidationErrors.imgId}
              </Typography>
            ) : null}
          </div>
        </Stack>
      </Modal>
    </AppShell>
  );
}
