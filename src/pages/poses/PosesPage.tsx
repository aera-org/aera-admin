import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  createPosePrompt,
  getPosePromptDetails,
  getPosePrompts,
  updatePosePrompt,
  usePosePrompts,
} from '@/app/pose-prompts';
import { notifyError, notifySuccess } from '@/app/toast';
import { DownloadIcon, PlusIcon, UploadIcon } from '@/assets/icons';
import {
  Alert,
  Button,
  ButtonGroup,
  Container,
  EmptyState,
  Field,
  IconButton,
  Input,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import type {
  CreatePosePromptDto,
  IPosePrompt,
  IPosePromptDetails,
} from '@/common/types';
import { AppShell } from '@/components/templates';

import s from './PosesPage.module.scss';
import {
  buildPosesTransferFileName,
  buildPosesTransferPayload,
  downloadPosesTransferFile,
  parsePosesTransferFile,
} from './poseTransfer';

type QueryUpdate = {
  search?: string;
  page?: number;
  pageSize?: number;
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];
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

export function PosesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [normalizedSearch, page, pageSize],
  );

  const { data, error, isLoading, refetch } = usePosePrompts(queryParams);

  const poses = useMemo(() => data?.data ?? [], [data]);
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
      { key: 'name', label: 'Name' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      poses.map((pose) => ({
        name: <Typography variant="body">{pose.name}</Typography>,
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(pose.updatedAt)}
          </Typography>
        ),
      })),
    [poses],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        name: <Skeleton key={`pose-name-skel-${index}`} width={220} height={12} />,
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && poses.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const openEditPage = (pose: IPosePrompt) => {
    navigate(`/poses/${pose.id}`);
  };

  const fetchAllPosePromptSummaries = useCallback(async () => {
    const all: IPosePrompt[] = [];
    let skip = 0;
    const take = 200;

    while (true) {
      const pageData = await getPosePrompts({
        skip,
        take,
      });
      all.push(...pageData.data);
      skip += pageData.data.length;
      if (skip >= pageData.total || pageData.data.length === 0) {
        break;
      }
    }

    return all;
  }, []);

  const fetchAllPosePromptDetails = useCallback(async () => {
    const summaries = await fetchAllPosePromptSummaries();
    return Promise.all(summaries.map((pose) => getPosePromptDetails(pose.id)));
  }, [fetchAllPosePromptSummaries]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const details = await fetchAllPosePromptDetails();
      const payload = buildPosesTransferPayload(details);
      downloadPosesTransferFile(payload, buildPosesTransferFileName());
      notifySuccess('Poses exported.', 'Poses exported.');
    } catch (error) {
      notifyError(error, 'Unable to export poses.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportButtonClick = () => {
    if (isImporting || isExporting) return;
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);

    try {
      const imported = await parsePosesTransferFile(file);
      const existing = await fetchAllPosePromptDetails();
      const existingByIdx = new Map<number, IPosePromptDetails>();
      const duplicateIdx: number[] = [];

      for (const pose of existing) {
        const alreadyExists = existingByIdx.get(pose.idx);
        if (alreadyExists) {
          duplicateIdx.push(pose.idx);
          continue;
        }
        existingByIdx.set(pose.idx, pose);
      }

      if (duplicateIdx.length > 0) {
        const uniqueDuplicateIdx = Array.from(new Set(duplicateIdx)).sort(
          (a, b) => a - b,
        );
        throw new Error(
          `Existing poses contain duplicate idx values: ${uniqueDuplicateIdx.join(', ')}.`,
        );
      }

      let created = 0;
      let updated = 0;

      for (const pose of imported.poses) {
        const payload: CreatePosePromptDto = {
          idx: pose.idx,
          isAnal: pose.isAnal,
          stages: pose.stages,
          pose: pose.pose,
          angle: pose.angle,
          prompt: pose.prompt,
        };

        const existingPose = existingByIdx.get(pose.idx);
        if (existingPose) {
          await updatePosePrompt(existingPose.id, payload);
          updated += 1;
          continue;
        }

        await createPosePrompt(payload);
        created += 1;
      }

      await queryClient.invalidateQueries({ queryKey: ['pose-prompts'] });
      notifySuccess(
        'Poses imported.',
        `Imported ${imported.poses.length} poses: ${updated} updated, ${created} created.`,
      );
    } catch (error) {
      notifyError(error, 'Unable to import poses.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Poses</Typography>
          </div>
          <ButtonGroup>
            <IconButton
              aria-label="Export poses"
              tooltip="Export poses"
              icon={<DownloadIcon />}
              variant="ghost"
              onClick={handleExport}
              loading={isExporting}
              disabled={isImporting}
            />
            <IconButton
              aria-label="Import poses"
              tooltip="Import poses"
              icon={<UploadIcon />}
              variant="ghost"
              onClick={handleImportButtonClick}
              loading={isImporting}
              disabled={isExporting}
            />
            <Button
              iconLeft={<PlusIcon />}
              onClick={() => navigate('/poses/new')}
              disabled={isExporting || isImporting}
            >
              Create pose
            </Button>
          </ButtonGroup>
          <input
            ref={importInputRef}
            className={s.hiddenInput}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFileChange}
          />
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field className={s.filterField} label="Search" labelFor="poses-search">
              <Input
                id="poses-search"
                placeholder="Search by name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load poses"
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
            title="No poses found"
            description="Create a pose to get started."
            action={
              <Button onClick={() => navigate('/poses/new')}>Create pose</Button>
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
                      const pose = poses[index];
                      if (!pose) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => openEditPage(pose),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openEditPage(pose);
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
