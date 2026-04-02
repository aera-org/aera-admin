import { ReloadIcon } from '@radix-ui/react-icons';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useCreateVideoGenerationItem,
  useDeleteVideoGeneration,
  useDeleteVideoGenerationItem,
  useRegenerateVideoGenerationItem,
  useUpdateVideoGeneration,
  useVideoGenerationDetails,
} from '@/app/video-generations';
import { PencilLineIcon, TrashIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import {
  type IVideoGenerationItem,
  VideoAspectRatio,
  VideoGenerationItemStatus,
  VideoQuality,
} from '@/common/types';
import { ConfirmModal } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import s from './VideoDetailsPage.module.scss';

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

function formatQuality(value: VideoQuality) {
  if (value === VideoQuality.Low) return 'Low';
  if (value === VideoQuality.Medium) return 'Medium';
  return 'High';
}

function formatAspectRatio(value: VideoAspectRatio) {
  if (value === VideoAspectRatio.Square) return 'Square';
  if (value === VideoAspectRatio.Standard) return 'Standard';
  if (value === VideoAspectRatio.Horizontal) return 'Horizontal';
  return 'Vertical';
}

function getStatusTone(status: VideoGenerationItemStatus) {
  if (status === VideoGenerationItemStatus.Ready) return 'success';
  if (status === VideoGenerationItemStatus.Failed) return 'danger';
  if (status === VideoGenerationItemStatus.Generating) return 'warning';
  return 'accent';
}

function getStatusLabel(status: VideoGenerationItemStatus) {
  if (status === VideoGenerationItemStatus.Generating) return 'Generating';
  if (status === VideoGenerationItemStatus.Ready) return 'Ready';
  if (status === VideoGenerationItemStatus.Failed) return 'Failed';
  return 'Pending';
}

export function VideoDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const videoId = id ?? '';

  const { data, error, isLoading, refetch } = useVideoGenerationDetails(
    videoId || null,
    null,
    {
      refetchInterval: (current) => {
        if (!current?.items?.length) return false;
        const hasActive = current.items.some(
          (item) =>
            item.status === VideoGenerationItemStatus.Pending ||
            item.status === VideoGenerationItemStatus.Generating,
        );
        return hasActive ? 5000 : false;
      },
    },
  );
  const updateMutation = useUpdateVideoGeneration();
  const createItemMutation = useCreateVideoGenerationItem();
  const deleteMutation = useDeleteVideoGeneration();
  const regenerateItemMutation = useRegenerateVideoGenerationItem();
  const deleteItemMutation = useDeleteVideoGenerationItem();

  const [itemToDelete, setItemToDelete] = useState<IVideoGenerationItem | null>(
    null,
  );
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
  const itemsLabel = data
    ? `Generated items (${items.length})`
    : 'Generated items';

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;

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
    if (!videoId) return;
    if (!editName.trim()) {
      setEditShowErrors(true);
      return;
    }

    await updateMutation.mutateAsync({
      id: videoId,
      payload: { name: editName.trim() },
    });
    setIsEditOpen(false);
  };

  const handleAddItem = async () => {
    if (!videoId) return;
    await createItemMutation.mutateAsync({ id: videoId });
  };

  const handleDelete = async () => {
    if (!videoId) return;
    await deleteMutation.mutateAsync(videoId);
    navigate('/videos');
  };

  const handleDeleteItem = async () => {
    if (!videoId || !itemToDelete) return;
    await deleteItemMutation.mutateAsync({
      id: videoId,
      itemId: itemToDelete.id,
    });
    setItemToDelete(null);
  };

  const handleRegenerateItem = async (item: IVideoGenerationItem) => {
    if (!videoId) return;
    setRegeneratingItemId(item.id);
    try {
      await regenerateItemMutation.mutateAsync({
        id: videoId,
        itemId: item.id,
      });
    } finally {
      setRegeneratingItemId((prev) => (prev === item.id ? null : prev));
    }
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Video details</Typography>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <div className={s.headerActions}>
            <Button
              variant="outline"
              onClick={handleAddItem}
              loading={createItemMutation.isPending}
              disabled={!data || createItemMutation.isPending}
            >
              Add item
            </Button>
            <IconButton
              aria-label="Edit video"
              icon={<PencilLineIcon />}
              tooltip="Edit video"
              variant="text"
              onClick={openEditModal}
              disabled={!data || updateMutation.isPending}
            />
            <IconButton
              aria-label="Delete video"
              icon={<TrashIcon />}
              tooltip="Delete video"
              variant="ghost"
              tone="danger"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!data || deleteMutation.isPending}
            />
            <Button variant="ghost" onClick={() => navigate('/videos')}>
              Back
            </Button>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load video"
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
          <EmptyState title="Video not found" description="Check the ID." />
        ) : null}

        {showSkeleton ? (
          <Stack className={s.content} gap="24px">
            <div className={s.summaryLayout}>
              <div className={s.summaryColumn}>
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
                <Skeleton height={120} />
              </div>
              <div className={s.mediaColumn}>
                <Skeleton height={320} />
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`video-item-skel-${index}`} height={220} />
            ))}
          </Stack>
        ) : null}

        {data ? (
          <div className={s.content}>
            <div className={s.summaryLayout}>
              <div className={s.summaryColumn}>
                <div className={s.detailsGrid}>
                  <Field label="Name">
                    <Typography variant="body">{data.name}</Typography>
                  </Field>
                  <Field label="Quality">
                    <Typography variant="body" tone="muted">
                      {formatQuality(data.quality)}
                    </Typography>
                  </Field>
                  <Field label="Resolution">
                    <Typography variant="body" tone="muted">
                      {data.resolution}p
                    </Typography>
                  </Field>
                  <Field label="Aspect ratio">
                    <Typography variant="body" tone="muted">
                      {formatAspectRatio(data.aspectRatio)}
                    </Typography>
                  </Field>
                  <Field label="Duration">
                    <Typography variant="body">{data.duration}s</Typography>
                  </Field>
                  <Field label="Count">
                    <Typography variant="body">
                      {data.count.toLocaleString()}
                    </Typography>
                  </Field>
                  <Field label="High LoRA">
                    <Typography variant="body" tone="muted">
                      {data.highLora?.fileName || '-'}
                    </Typography>
                  </Field>
                  <Field label="Low LoRA">
                    <Typography variant="body" tone="muted">
                      {data.lowLora?.fileName || '-'}
                    </Typography>
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
                <Field label="Prompt">
                  <Typography variant="body">{data.prompt || '-'}</Typography>
                </Field>
              </div>

              <div className={s.mediaColumn}>
                <Field label="Start frame">
                  <div className={s.mediaFrame}>
                    {data.startFrame?.url ? (
                      <img
                        className={s.startFrame}
                        src={data.startFrame.url}
                        alt={data.startFrame.name}
                        loading="lazy"
                      />
                    ) : (
                      <Typography variant="caption" tone="muted">
                        No frame available.
                      </Typography>
                    )}
                  </div>
                </Field>
              </div>
            </div>

            <div className={s.itemsHeader}>
              <Typography variant="h3">{itemsLabel}</Typography>
            </div>

            {items.length === 0 ? (
              <EmptyState
                title="No generated items"
                description="Use Add item to generate the first video."
              />
            ) : (
              <div className={s.itemList}>
                {items.map((item) => (
                  <div key={item.id} className={s.itemRow}>
                    <div className={s.itemPreview}>
                      {item.file?.url ? (
                        <video
                          className={s.video}
                          src={item.file.url}
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <Typography variant="caption" tone="muted">
                          {[
                            VideoGenerationItemStatus.Pending,
                            VideoGenerationItemStatus.Generating,
                          ].includes(item.status)
                            ? 'Generating...'
                            : 'No video'}
                        </Typography>
                      )}
                      <div className={s.itemPreviewActions}>
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
                          onClick={() => handleRegenerateItem(item)}
                        />
                        <IconButton
                          aria-label="Delete item"
                          tooltip="Delete item"
                          size="sm"
                          variant="ghost"
                          tone="danger"
                          icon={<TrashIcon />}
                          onClick={() => setItemToDelete(item)}
                          disabled={
                            deleteItemMutation.isPending ||
                            regenerateItemMutation.isPending
                          }
                        />
                      </div>
                    </div>

                    <div className={s.itemBody}>
                      <div className={s.itemMeta}>
                        <div className={s.itemMetaRow}>
                          <Badge tone={getStatusTone(item.status)}>
                            {getStatusLabel(item.status)}
                          </Badge>
                          <Typography variant="caption" tone="muted">
                            {item.id}
                          </Typography>
                        </div>
                      </div>

                      {/*<div className={s.itemActions}>*/}
                      {/*  {item.file?.url ? (*/}
                      {/*    <Button*/}
                      {/*      as="a"*/}
                      {/*      href={item.file.url}*/}
                      {/*      download={item.file.name}*/}
                      {/*      rel="noopener"*/}
                      {/*      variant="secondary"*/}
                      {/*      iconLeft={<DownloadIcon />}*/}
                      {/*    >*/}
                      {/*      Download*/}
                      {/*    </Button>*/}
                      {/*  ) : null}*/}
                      {/*</div>*/}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Container>

      <Modal
        open={isEditOpen}
        title="Edit video"
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
          labelFor="video-edit-name"
          error={editValidationError}
        >
          <Input
            id="video-edit-name"
            size="sm"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            placeholder="Video name"
            fullWidth
          />
        </Field>
      </Modal>

      <ConfirmModal
        open={isDeleteOpen}
        title="Delete video?"
        description="This will permanently remove the video and all generated items."
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
        description="This will permanently remove this generated video item."
        confirmLabel="Delete item"
        tone="danger"
        isConfirming={deleteItemMutation.isPending}
        onConfirm={handleDeleteItem}
        onClose={() => {
          if (deleteItemMutation.isPending) return;
          setItemToDelete(null);
        }}
      />
    </AppShell>
  );
}
