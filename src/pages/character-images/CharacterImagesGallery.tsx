import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { DownloadIcon, TrashIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import type { ICharacterImage } from '@/common/types';

import { CharacterImageDetailsDrawer } from './CharacterImageDetailsDrawer';
import s from './CharacterImagesPage.module.scss';
import { formatDate, formatStage, PAGE_SIZE_OPTIONS } from './characterImagesShared';

type CharacterImagesGalleryProps = {
  images: ICharacterImage[];
  total: number;
  effectiveSkip: number;
  effectiveTake: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  hasLoadedData: boolean;
  error: unknown;
  selectedImageId: string | null;
  detailsOpen?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry: () => void;
  onImageOpen: (imageId: string) => void;
  onImageClose: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onDeleteImage?: (imageId: string) => void;
  deletePendingId?: string | null;
  deleteDisabled?: boolean;
};

export function CharacterImagesGallery({
  images,
  total,
  effectiveSkip,
  effectiveTake,
  page,
  pageSize,
  totalPages,
  isLoading,
  hasLoadedData,
  error,
  selectedImageId,
  detailsOpen,
  emptyTitle = 'No images found',
  emptyDescription = 'No images match the current filters.',
  emptyAction,
  onRetry,
  onImageOpen,
  onImageClose,
  onPageChange,
  onPageSizeChange,
  onDeleteImage,
  deletePendingId = null,
  deleteDisabled = false,
}: CharacterImagesGalleryProps) {
  const skeletonCards = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => (
        <Card
          key={`image-skeleton-${index}`}
          padding="md"
          className={s.imageCard}
        >
          <div className={s.cardHeader}>
            <div className={s.cardTitleBlock}>
              <Skeleton width={140} height={12} />
              <Skeleton width={180} height={10} />
            </div>
          </div>
          <div className={s.previewFrame}>
            <Skeleton width="100%" height="100%" />
          </div>
          <div className={s.cardMeta}>
            <Skeleton width={200} height={12} />
            <div className={s.badges}>
              <Skeleton width={96} height={20} />
              <Skeleton width={88} height={20} />
            </div>
            <div className={s.cardFooter}>
              <Skeleton width={110} height={10} />
              <Skeleton width={120} height={10} />
            </div>
          </div>
        </Card>
      )),
    [],
  );

  const showSkeleton = isLoading && !hasLoadedData;
  const showEmpty = !showSkeleton && !error && images.length === 0;
  const showGallery = !showEmpty && !error;
  const showFooter = showGallery && !showSkeleton;
  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  return (
    <>
      {error ? (
        <Stack className={s.state} gap="12px">
          <Alert
            title="Unable to load images"
            description={
              error instanceof Error ? error.message : 'Please try again.'
            }
            tone="warning"
          />
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </Stack>
      ) : null}

      {showEmpty ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : null}

      {showGallery ? (
        <div className={s.galleryWrap}>
          <div className={s.galleryGrid}>
            {showSkeleton
              ? skeletonCards
              : images.map((image) => (
                  <Card
                    key={image.id}
                    padding="md"
                    className={s.imageCard}
                    role="button"
                    tabIndex={0}
                    onClick={() => onImageOpen(image.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onImageOpen(image.id);
                      }
                    }}
                  >
                    <div className={s.cardHeader}>
                      <div className={s.cardTitleBlock}>
                        <Typography variant="body" truncate>
                          {image.character?.name || 'Unknown character'}
                        </Typography>
                        <Typography variant="caption" tone="muted" truncate>
                          {image.scenario?.name || '-'} ·{' '}
                          {formatStage(image.stage)}
                        </Typography>
                      </div>
                    </div>

                    <div className={s.previewFrame}>
                      {image.file?.url ? (
                        <>
                          <img
                            className={s.previewImage}
                            src={image.file.url}
                            alt={image.file.name || image.description || image.id}
                            loading="lazy"
                          />
                          <div className={s.previewActions}>
                            <IconButton
                              as="a"
                              href={image.file.url}
                              download={image.file.name}
                              rel="noopener"
                              aria-label="Download image"
                              tooltip="Download image"
                              variant="ghost"
                              size="sm"
                              icon={<DownloadIcon />}
                              // @ts-expect-error Radix anchor event types are incorrect
                              onClick={(event) => event.stopPropagation()}
                            />
                            {onDeleteImage ? (
                              <IconButton
                                aria-label="Delete image"
                                tooltip="Delete image"
                                variant="ghost"
                                tone="danger"
                                size="sm"
                                icon={<TrashIcon />}
                                loading={deletePendingId === image.id}
                                disabled={deleteDisabled}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDeleteImage(image.id);
                                }}
                              />
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <div className={s.previewPlaceholder}>
                          <Typography variant="caption" tone="muted">
                            No image available.
                          </Typography>
                        </div>
                      )}
                    </div>

                    <div className={s.cardMeta}>
                      <Typography variant="caption" tone="muted">
                        {image.description || ''}
                      </Typography>
                      <div className={s.badges}>
                        <Badge
                          tone={image.isPregenerated ? 'accent' : 'warning'}
                          outline={!image.isPregenerated}
                        >
                          {image.isPregenerated ? 'Pregenerated' : 'Generated'}
                        </Badge>
                        {image.isPromotional && (
                          <Badge
                            tone={image.isPromotional ? 'warning' : 'accent'}
                            outline={!image.isPromotional}
                          >
                            {image.isPromotional ? 'Promotional' : 'Regular'}
                          </Badge>
                        )}
                      </div>
                      <div className={s.cardFooter}>
                        <Typography variant="caption" tone="muted">
                          {formatDate(image.updatedAt)}
                        </Typography>
                      </div>
                    </div>
                  </Card>
                ))}
          </div>

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
                  onChange={(value) => onPageSizeChange(Number(value))}
                  fitContent
                />
                {totalPages > 1 ? (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onChange={onPageChange}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <CharacterImageDetailsDrawer
        imageId={selectedImageId}
        open={detailsOpen ?? Boolean(selectedImageId)}
        onOpenChange={(open) => {
          if (!open) {
            onImageClose();
          }
        }}
      />
    </>
  );
}
