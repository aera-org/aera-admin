import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  useCreateCharacterStory,
  useDeleteCharacterStory,
  useReorderCharacterStories,
  useUpdateCharacterStory,
} from '@/app/characters';
import { PlusIcon, TrashIcon } from '@/assets/icons';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  Select,
  Skeleton,
  Stack,
  Switch,
  Typography,
} from '@/atoms';
import {
  FileDir,
  type ICharacterDetails,
  type IFile,
  StoryType,
} from '@/common/types';
import { ConfirmModal, Drawer, FileUpload } from '@/components/molecules';

import s from '../CharacterDetailsPage.module.scss';

type StoriesSectionProps = {
  characterId: string | null;
  stories: ICharacterDetails['stories'];
  isLoading: boolean;
};

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v';

const STORY_TYPE_OPTIONS = [
  { label: 'Photo', value: StoryType.Photo },
  { label: 'Video', value: StoryType.Video },
];

function getStoryTypeLabel(type: StoryType) {
  if (type === StoryType.Video) return 'Video';
  return 'Photo';
}

function getSortedStoryIds(stories: ICharacterDetails['stories']) {
  return [...stories]
    .sort((left, right) => {
      if (left.idx !== right.idx) return left.idx - right.idx;
      return left.id.localeCompare(right.id);
    })
    .map((story) => story.id);
}

function moveStory(
  storyIds: string[],
  draggedStoryId: string,
  targetStoryId: string,
) {
  const draggedIndex = storyIds.indexOf(draggedStoryId);
  const targetIndex = storyIds.indexOf(targetStoryId);

  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
    return storyIds;
  }

  const next = [...storyIds];
  const [movedItem] = next.splice(draggedIndex, 1);
  next.splice(targetIndex, 0, movedItem);
  return next;
}

function StoryPreview({
  story,
}: {
  story: ICharacterDetails['stories'][number];
}) {
  const fileUrl = story.file?.url ?? '';

  if (story.type === StoryType.Video && fileUrl) {
    return (
      <video
        className={s.storyPreview}
        src={fileUrl}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  if (fileUrl) {
    return (
      <img
        className={s.storyPreview}
        src={fileUrl}
        alt=""
        loading="lazy"
      />
    );
  }

  return (
    <div className={s.storyPreviewPlaceholder}>
      <Typography variant="caption" tone="muted">
        No preview
      </Typography>
    </div>
  );
}

export function StoriesSection({
  characterId,
  stories,
  isLoading,
}: StoriesSectionProps) {
  const createMutation = useCreateCharacterStory();
  const updateMutation = useUpdateCharacterStory();
  const reorderMutation = useReorderCharacterStories();
  const deleteMutation = useDeleteCharacterStory();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<StoryType>(StoryType.Photo);
  const [createFile, setCreateFile] = useState<IFile | null>(null);
  const [createShowErrors, setCreateShowErrors] = useState(false);
  const [orderedStoryIds, setOrderedStoryIds] = useState<string[]>([]);
  const [draggedStoryId, setDraggedStoryId] = useState<string | null>(null);
  const [dropTargetStoryId, setDropTargetStoryId] = useState<string | null>(null);
  const [togglingStoryId, setTogglingStoryId] = useState<string | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<
    ICharacterDetails['stories'][number] | null
  >(null);
  const dragInitialOrderRef = useRef<string[]>([]);
  const orderedStoryIdsRef = useRef<string[]>([]);

  useEffect(() => {
    setOrderedStoryIds(getSortedStoryIds(stories));
  }, [stories]);

  useEffect(() => {
    orderedStoryIdsRef.current = orderedStoryIds;
  }, [orderedStoryIds]);

  const baseStoryIds = useMemo(() => getSortedStoryIds(stories), [stories]);
  const storiesById = useMemo(
    () => new Map(stories.map((story) => [story.id, story])),
    [stories],
  );
  const orderedStories = useMemo(() => {
    const visible = orderedStoryIds
      .map((storyId) => storiesById.get(storyId))
      .filter((story): story is ICharacterDetails['stories'][number] =>
        Boolean(story),
      );

    if (visible.length === stories.length) {
      return visible;
    }

    return baseStoryIds
      .map((storyId) => storiesById.get(storyId))
      .filter((story): story is ICharacterDetails['stories'][number] =>
        Boolean(story),
      );
  }, [baseStoryIds, orderedStoryIds, stories.length, storiesById]);

  const createValidationError = useMemo(() => {
    if (!createShowErrors) return undefined;
    if (!createFile?.id) return 'Upload a file.';
    return undefined;
  }, [createFile?.id, createShowErrors]);

  const createAccept = createType === StoryType.Video ? VIDEO_ACCEPT : IMAGE_ACCEPT;

  const openCreateDrawer = () => {
    setCreateType(StoryType.Photo);
    setCreateFile(null);
    setCreateShowErrors(false);
    setIsCreateOpen(true);
  };

  const closeCreateDrawer = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const handleCreate = async () => {
    if (!characterId) return;
    if (!createFile?.id) {
      setCreateShowErrors(true);
      return;
    }

    await createMutation.mutateAsync({
      characterId,
      payload: {
        fileId: createFile.id,
        type: createType,
      },
    });

    setIsCreateOpen(false);
    setCreateFile(null);
    setCreateShowErrors(false);
  };

  const handleToggle = async (
    story: ICharacterDetails['stories'][number],
    isActive: boolean,
  ) => {
    if (!characterId) return;

    setTogglingStoryId(story.id);
    try {
      await updateMutation.mutateAsync({
        characterId,
        storyId: story.id,
        payload: {
          idx: story.idx,
          isActive,
        },
      });
    } finally {
      setTogglingStoryId((current) => (current === story.id ? null : current));
    }
  };

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    storyId: string,
  ) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', storyId);
    dragInitialOrderRef.current = orderedStoryIdsRef.current;
    setDraggedStoryId(storyId);
    setDropTargetStoryId(storyId);
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
    targetStoryId: string,
  ) => {
    event.preventDefault();
    if (!draggedStoryId || draggedStoryId === targetStoryId) return;

    setOrderedStoryIds((current) => moveStory(current, draggedStoryId, targetStoryId));
    setDropTargetStoryId(targetStoryId);
  };

  const resetDragState = () => {
    setDraggedStoryId(null);
    setDropTargetStoryId(null);
    dragInitialOrderRef.current = [];
  };

  const handleDragEnd = async () => {
    if (!characterId || !draggedStoryId) {
      resetDragState();
      return;
    }

    const previousOrder = dragInitialOrderRef.current;
    const nextOrder = orderedStoryIdsRef.current;
    resetDragState();

    if (
      previousOrder.length === nextOrder.length &&
      previousOrder.every((storyId, index) => storyId === nextOrder[index])
    ) {
      return;
    }

    try {
      await reorderMutation.mutateAsync({
        characterId,
        payload: { order: nextOrder },
      });
    } catch {
      setOrderedStoryIds(previousOrder);
    }
  };

  const handleDelete = async () => {
    if (!characterId || !storyToDelete) return;
    await deleteMutation.mutateAsync({
      characterId,
      storyId: storyToDelete.id,
    });
    setStoryToDelete(null);
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <Typography variant="h3">Stories</Typography>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<PlusIcon />}
          onClick={openCreateDrawer}
          disabled={!characterId}
        >
          Add story
        </Button>
      </div>

      {isLoading ? (
        <div className={s.storyGrid}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={`story-skeleton-${index}`} className={s.storyTile}>
              <Skeleton width="100%" height="100%" />
            </div>
          ))}
        </div>
      ) : orderedStories.length === 0 ? (
        <EmptyState
          title="No stories yet"
          description="Upload the first story for this character."
          action={
            <Button variant="secondary" onClick={openCreateDrawer}>
              Add story
            </Button>
          }
        />
      ) : (
        <div className={s.storyGrid}>
          {orderedStories.map((story) => {
            const isDragging = draggedStoryId === story.id;
            const isDropTarget = dropTargetStoryId === story.id && !isDragging;
            const isToggling = updateMutation.isPending && togglingStoryId === story.id;

            return (
              <div
                key={story.id}
                className={[
                  s.storyTile,
                  isDragging && s.storyTileDragging,
                  isDropTarget && s.storyTileDropTarget,
                ]
                  .filter(Boolean)
                  .join(' ')}
                draggable={!reorderMutation.isPending && !deleteMutation.isPending}
                onDragStart={(event) => handleDragStart(event, story.id)}
                onDragOver={(event) => handleDragOver(event, story.id)}
                onDrop={(event) => event.preventDefault()}
                onDragEnd={() => void handleDragEnd()}
              >
                <StoryPreview story={story} />

                <div className={s.storyTileOverlay}>
                  <Badge tone="accent">{getStoryTypeLabel(story.type)}</Badge>
                  <div className={s.storyTileControls}>
                    <Switch
                      checked={story.isActive}
                      onChange={(event) =>
                        void handleToggle(story, event.target.checked)
                      }
                      disabled={isToggling}
                    />
                    <IconButton
                      aria-label="Delete story"
                      tooltip="Delete"
                      icon={<TrashIcon />}
                      variant="ghost"
                      tone="danger"
                      size="sm"
                      onClick={() => setStoryToDelete(story)}
                      disabled={deleteMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Drawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Add story"
        className={s.storyDrawer}
      >
        <Stack gap="16px">
          <Field label="Type" labelFor="story-create-type">
            <Select
              id="story-create-type"
              value={createType}
              options={STORY_TYPE_OPTIONS}
              onChange={(value) => {
                setCreateType(value as StoryType);
                setCreateFile(null);
              }}
              fullWidth
            />
          </Field>

          <FileUpload
            label="File"
            folder={FileDir.Public}
            accept={createAccept}
            value={createFile}
            onChange={setCreateFile}
          />
          {createValidationError ? (
            <Typography variant="caption">{createValidationError}</Typography>
          ) : null}

          <div className={s.storyDrawerActions}>
            <Button
              variant="secondary"
              onClick={closeCreateDrawer}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} loading={createMutation.isPending}>
              Create
            </Button>
          </div>
        </Stack>
      </Drawer>

      <ConfirmModal
        open={Boolean(storyToDelete)}
        title="Delete story"
        description="This will permanently remove the story."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setStoryToDelete(null);
          }
        }}
      />
    </div>
  );
}
