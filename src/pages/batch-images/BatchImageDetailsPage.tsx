import { ReloadIcon } from '@radix-ui/react-icons';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useBatchImageDetails,
  useDeleteBatchImage,
  useDeleteBatchImageItem,
  useRegenerateBatchImageItem,
  useUpdateBatchImage,
} from '@/app/batch-images';
import { DownloadIcon, PencilLineIcon, TrashIcon, VideoIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  Grid,
  IconButton,
  Input,
  Modal,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import {
  BatchImgItemStatus,
  type IBatchImgItem,
} from '@/common/types';
import { ConfirmModal, Drawer } from '@/components/molecules';
import { AppShell } from '@/components/templates';
import {
  ImageToVideoDrawer,
  type ImageToVideoSource,
} from '@/pages/videos/components/ImageToVideoDrawer';

import s from './BatchImageDetailsPage.module.scss';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

function getStatusTone(status: BatchImgItemStatus) {
  if (status === BatchImgItemStatus.Ready) return 'success';
  if (status === BatchImgItemStatus.Failed) return 'danger';
  if (status === BatchImgItemStatus.Generating) return 'warning';
  return 'accent';
}

function getStatusLabel(status: BatchImgItemStatus) {
  if (status === BatchImgItemStatus.Generating) return 'Generating';
  if (status === BatchImgItemStatus.Ready) return 'Ready';
  if (status === BatchImgItemStatus.Failed) return 'Failed';
  return 'Pending';
}

export function BatchImageDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const batchImageId = id ?? '';

  const { data, error, isLoading, refetch } = useBatchImageDetails(
    batchImageId || null,
    null,
    {
      refetchInterval: (current) => {
        if (!current?.items?.length) return false;
        const hasActive = current.items.some(
          (item) =>
            item.status === BatchImgItemStatus.Pending ||
            item.status === BatchImgItemStatus.Generating,
        );
        return hasActive ? 5000 : false;
      },
    },
  );
  const updateMutation = useUpdateBatchImage();
  const deleteMutation = useDeleteBatchImage();
  const regenerateItemMutation = useRegenerateBatchImageItem();
  const deleteItemMutation = useDeleteBatchImageItem();

  const [activeItem, setActiveItem] = useState<IBatchImgItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<IBatchImgItem | null>(null);
  const [imageToVideoSource, setImageToVideoSource] =
    useState<ImageToVideoSource | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editShowErrors, setEditShowErrors] = useState(false);
  const [editName, setEditName] = useState('');
  const [regeneratingItemId, setRegeneratingItemId] = useState<string | null>(
    null,
  );

  const editValidationError = useMemo(() => {
    if (!editShowErrors) return undefined;
    if (!editName.trim()) return 'Enter a name.';
    return undefined;
  }, [editName, editShowErrors]);

  const items =
    data?.items.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) ?? [];
  const itemsLabel = data ? `Generated items (${items.length})` : 'Generated items';

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;

  const closeItemModal = () => setActiveItem(null);

  const buildImageToVideoSource = (
    item: IBatchImgItem,
  ): ImageToVideoSource | null => {
    if (!item.file?.id) return null;

    return {
      startFrameId: item.file.id,
      scenarioId: data?.scenario?.id ?? data?.scenarioId ?? undefined,
      characterName: data?.name,
      prompt: item.prompt || data?.prompt || '',
    };
  };

  const openEditModal = () => {
    if (!data) return;
    setEditName(data.name ?? '');
    setEditShowErrors(false);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (updateMutation.isPending) return;
    setIsEditOpen(false);
  };

  const handleEdit = async () => {
    if (!batchImageId) return;
    if (!editName.trim()) {
      setEditShowErrors(true);
      return;
    }

    await updateMutation.mutateAsync({
      id: batchImageId,
      payload: {
        name: editName.trim(),
      },
    });
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    if (!batchImageId) return;
    await deleteMutation.mutateAsync(batchImageId);
    navigate('/batch-images');
  };

  const handleRegenerateItem = async (item: IBatchImgItem) => {
    if (!batchImageId) return;
    setRegeneratingItemId(item.id);
    try {
      await regenerateItemMutation.mutateAsync({
        id: batchImageId,
        itemId: item.id,
      });
    } finally {
      setRegeneratingItemId((prev) => (prev === item.id ? null : prev));
    }
  };

  const handleDeleteItem = async () => {
    if (!batchImageId || !itemToDelete) return;
    await deleteItemMutation.mutateAsync({
      id: batchImageId,
      itemId: itemToDelete.id,
    });
    if (activeItem?.id === itemToDelete.id) {
      setActiveItem(null);
    }
    setItemToDelete(null);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Batch image details</Typography>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <div className={s.headerActions}>
            <IconButton
              aria-label="Edit batch image"
              icon={<PencilLineIcon />}
              tooltip="Edit batch image"
              variant="text"
              onClick={openEditModal}
              disabled={!data || updateMutation.isPending}
            />
            <IconButton
              aria-label="Delete batch image"
              icon={<TrashIcon />}
              tooltip="Delete batch image"
              variant="ghost"
              tone="danger"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!data || deleteMutation.isPending}
            />
            <Button variant="ghost" onClick={() => navigate('/batch-images')}>
              Back
            </Button>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load batch image"
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
            title="Batch image not found"
            description="Check the ID."
          />
        ) : null}

        {showSkeleton ? (
          <Stack className={s.content} gap="24px">
            <div className={s.detailsGrid}>
              <Skeleton width={160} height={12} />
              <Skeleton width={220} height={16} />
              <Skeleton width={140} height={12} />
              <Skeleton width={180} height={16} />
              <Skeleton width={120} height={12} />
              <Skeleton width={120} height={16} />
              <Skeleton width={140} height={12} />
              <Skeleton width={180} height={16} />
              <Skeleton width={120} height={12} />
              <Skeleton width={200} height={16} />
            </div>
            <Grid columns={3} gap={16}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div className={s.itemCard} key={`item-skel-${index}`}>
                  <Skeleton height={180} />
                </div>
              ))}
            </Grid>
          </Stack>
        ) : null}

        {data ? (
          <div className={s.content}>
            <div className={s.detailsGrid}>
              <Field label="Name">
                <Typography variant="body">{data.name}</Typography>
              </Field>
              <Field label="LoRA">
                <Typography variant="body" tone="muted">
                  {data.lora?.fileName || '-'}
                </Typography>
              </Field>
              <Field label="Trigger word">
                <Typography variant="body" tone="muted">
                  {data.lora?.triggerWord || '-'}
                </Typography>
              </Field>
              <Field label="Count">
                <Typography variant="body">
                  {data.count.toLocaleString()}
                </Typography>
              </Field>
              <Field label="Prompt" className={s.fullWidth}>
                <Typography variant="body">{data.prompt || '-'}</Typography>
              </Field>
              <Field label="Updated">
                <Typography variant="body">
                  {formatDate(data.updatedAt)}
                </Typography>
              </Field>
              <Field label="Created">
                <Typography variant="body">
                  {formatDate(data.createdAt)}
                </Typography>
              </Field>
            </div>

            <div className={s.itemsHeader}>
              <Typography variant="h3">{itemsLabel}</Typography>
            </div>

            {items.length === 0 ? (
              <EmptyState
                title="No generated items"
                description="Items will appear here after generation starts."
              />
            ) : (
              <Grid columns={3} gap={16}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={s.itemCard}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveItem(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveItem(item);
                      }
                    }}
                  >
                    <div className={s.itemMedia}>
                      {item.file?.url ? (
                        <img
                          className={s.itemImage}
                          src={item.file.url}
                          alt={item.file.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className={s.itemPlaceholder}>
                          <Typography variant="caption" tone="muted">
                            {[
                              BatchImgItemStatus.Pending,
                              BatchImgItemStatus.Generating,
                            ].includes(item.status)
                              ? 'Generating...'
                              : 'No image'}
                          </Typography>
                        </div>
                      )}
                      <div className={s.itemActions}>
                        {item.file?.url ? (
                          <IconButton
                            as="a"
                            href={item.file.url}
                            download={item.file.name}
                            rel="noopener"
                            aria-label="Download image"
                            tooltip="Download"
                            size="sm"
                            variant="ghost"
                            icon={<DownloadIcon />}
                            // @ts-expect-error Radix types are wrong
                            onClick={(event) => event.stopPropagation()}
                          />
                        ) : null}
                        {item.file?.id ? (
                          <IconButton
                            aria-label="Generate video"
                            tooltip="Generate video"
                            size="sm"
                            variant="ghost"
                            icon={<VideoIcon />}
                            disabled={
                              regenerateItemMutation.isPending ||
                              deleteItemMutation.isPending
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              setImageToVideoSource(
                                buildImageToVideoSource(item),
                              );
                            }}
                          />
                        ) : null}
                        <IconButton
                          aria-label="Regenerate item"
                          tooltip="Regenerate item"
                          size="sm"
                          variant="ghost"
                          icon={<ReloadIcon />}
                          loading={
                            regenerateItemMutation.isPending &&
                            regeneratingItemId === item.id
                          }
                          disabled={
                            regenerateItemMutation.isPending ||
                            deleteItemMutation.isPending
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRegenerateItem(item);
                          }}
                        />
                        <IconButton
                          aria-label="Delete item"
                          tooltip="Delete item"
                          size="sm"
                          variant="ghost"
                          tone="danger"
                          icon={<TrashIcon />}
                          disabled={
                            deleteItemMutation.isPending ||
                            regenerateItemMutation.isPending
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            setItemToDelete(item);
                          }}
                        />
                      </div>
                    </div>
                    <div className={s.itemMeta}>
                      <Badge tone={getStatusTone(item.status)}>
                        {getStatusLabel(item.status)}
                      </Badge>
                      <Typography variant="caption" tone="muted">
                        {formatDate(item.createdAt)}
                      </Typography>
                    </div>
                  </div>
                ))}
              </Grid>
            )}
          </div>
        ) : null}
      </Container>

      <Drawer
        open={Boolean(activeItem)}
        title="Item details"
        className={s.itemDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeItemModal();
          }
        }}
      >
        {activeItem ? (
          <div className={s.modalContent}>
            <div className={s.previewFrame}>
              {activeItem.file?.url ? (
                <img
                  className={s.preview}
                  src={activeItem.file.url}
                  alt={activeItem.file.name}
                />
              ) : (
                <Typography variant="caption" tone="muted">
                  {[
                    BatchImgItemStatus.Pending,
                    BatchImgItemStatus.Generating,
                  ].includes(activeItem.status)
                    ? 'Generating...'
                    : 'No image available.'
                  }
                </Typography>
              )}
            </div>
            <Field label="Status">
              <Badge tone={getStatusTone(activeItem.status)}>
                {getStatusLabel(activeItem.status)}
              </Badge>
            </Field>
            <Field label="Prompt">
              <Typography as="pre" variant="caption" className={s.promptText}>
                {activeItem.prompt || '-'}
              </Typography>
            </Field>
            <Field label="Updated">
              <Typography variant="body">
                {formatDate(activeItem.updatedAt)}
              </Typography>
            </Field>
            <Field label="Created">
              <Typography variant="body">
                {formatDate(activeItem.createdAt)}
              </Typography>
            </Field>
            <div className={s.modalActions}>
              <Button variant="secondary" onClick={closeItemModal}>
                Close
              </Button>
              {activeItem.file?.id ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setImageToVideoSource(buildImageToVideoSource(activeItem));
                    setActiveItem(null);
                  }}
                >
                  Generate video
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => {
                  handleRegenerateItem(activeItem);
                }}
                loading={
                  regenerateItemMutation.isPending &&
                  regeneratingItemId === activeItem.id
                }
                disabled={regenerateItemMutation.isPending}
              >
                Regenerate item
              </Button>
              <Button
                variant="ghost"
                tone="danger"
                onClick={() => setItemToDelete(activeItem)}
                disabled={deleteItemMutation.isPending}
              >
                Delete item
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={isEditOpen}
        title="Edit batch image"
        onClose={closeEditModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeEditModal}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              loading={updateMutation.isPending}
              disabled={!editName.trim() || updateMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Field
          label="Name"
          labelFor="batch-image-edit-name"
          error={editValidationError}
        >
          <Input
            id="batch-image-edit-name"
            size="sm"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            placeholder="Batch image name"
            fullWidth
          />
        </Field>
      </Modal>

      <ConfirmModal
        open={isDeleteOpen}
        title="Delete batch image?"
        description="This will permanently remove the batch image and all generated items."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setIsDeleteOpen(false);
        }}
      />

      <ConfirmModal
        open={Boolean(itemToDelete)}
        title="Delete item?"
        description="This will permanently remove this generated item."
        confirmLabel="Delete item"
        tone="danger"
        isConfirming={deleteItemMutation.isPending}
        onConfirm={handleDeleteItem}
        onClose={() => {
          if (deleteItemMutation.isPending) return;
          setItemToDelete(null);
        }}
      />

      {imageToVideoSource ? (
        <ImageToVideoDrawer
          source={imageToVideoSource}
          onClose={() => setImageToVideoSource(null)}
        />
      ) : null}
    </AppShell>
  );
}
