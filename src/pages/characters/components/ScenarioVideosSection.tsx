import { useMemo, useState } from 'react';

import {
  useCreateScenarioVideo,
  useDeleteScenarioVideo,
  useUpdateScenarioVideo,
} from '@/app/characters';
import { notifyError } from '@/app/toast';
import { PencilLineIcon, PlusIcon, TrashIcon } from '@/assets/icons';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  Modal,
  Select,
  Stack,
  Switch,
  Typography,
} from '@/atoms';
import {
  FileDir,
  type IFile,
  type IScenarioVideo,
  type Pose,
} from '@/common/types';
import { formatPose, poseOptions } from '@/common/utils';
import { ConfirmModal, Drawer, FileUpload } from '@/components/molecules';

import s from '../CharacterDetailsPage.module.scss';

type ScenarioVideosSectionProps = {
  characterId: string | null;
  scenarioId: string;
  videos: IScenarioVideo[];
  formatDate: (value: string | null | undefined) => string;
};

type CreateVideoValues = {
  pose: Pose | '';
};

const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v';
const EMPTY_CREATE_VALUES: CreateVideoValues = {
  pose: '',
};

export function ScenarioVideosSection({
  characterId,
  scenarioId,
  videos,
  formatDate,
}: ScenarioVideosSectionProps) {
  const createMutation = useCreateScenarioVideo();
  const updateMutation = useUpdateScenarioVideo();
  const deleteMutation = useDeleteScenarioVideo();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createValues, setCreateValues] =
    useState<CreateVideoValues>(EMPTY_CREATE_VALUES);
  const [createFile, setCreateFile] = useState<IFile | null>(null);
  const [createShowErrors, setCreateShowErrors] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<IScenarioVideo | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<IScenarioVideo | null>(null);
  const [editIsActive, setEditIsActive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IScenarioVideo | null>(null);
  const [updatingVideoId, setUpdatingVideoId] = useState<string | null>(null);

  const createValidationErrors = useMemo(() => {
    if (!createShowErrors) return {};
    return {
      videoId: createFile?.id ? undefined : 'Upload a video.',
      pose: createValues.pose ? undefined : 'Select a pose.',
    };
  }, [createFile?.id, createShowErrors, createValues.pose]);

  const isCreateValid = Boolean(createFile?.id && createValues.pose);

  const openCreateDrawer = () => {
    setCreateValues(EMPTY_CREATE_VALUES);
    setCreateFile(null);
    setCreateShowErrors(false);
    setIsCreateOpen(true);
  };

  const closeCreateDrawer = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const openEditModal = (video: IScenarioVideo) => {
    setEditTarget(video);
    setEditIsActive(video.isActive);
  };

  const closeEditModal = () => {
    if (updateMutation.isPending) return;
    setEditTarget(null);
  };

  const handleCreate = async () => {
    if (!characterId) return;
    if (!isCreateValid || !createFile?.id || !createValues.pose) {
      setCreateShowErrors(true);
      return;
    }

    await createMutation.mutateAsync({
      characterId,
      scenarioId,
      payload: {
        videoId: createFile.id,
        pose: createValues.pose,
      },
    });

    setIsCreateOpen(false);
    setCreateFile(null);
    setCreateValues(EMPTY_CREATE_VALUES);
    setCreateShowErrors(false);
  };

  const handleActiveChange = async (
    video: IScenarioVideo,
    isActive: boolean,
  ) => {
    if (!characterId) return;

    setUpdatingVideoId(video.id);
    try {
      await updateMutation.mutateAsync({
        characterId,
        scenarioId,
        id: video.id,
        payload: { isActive },
      });
    } finally {
      setUpdatingVideoId((current) => (current === video.id ? null : current));
    }
  };

  const handleEditSave = async () => {
    if (!editTarget) return;

    await handleActiveChange(editTarget, editIsActive);
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!characterId || !deleteTarget) return;

    await deleteMutation.mutateAsync({
      characterId,
      scenarioId,
      id: deleteTarget.id,
    });

    setDeleteTarget(null);
    if (detailsTarget?.id === deleteTarget.id) {
      setDetailsTarget(null);
    }
  };

  return (
    <div className={s.scenarioVideosSection}>
      <div className={s.sectionHeader}>
        <Typography variant="h3">Videos</Typography>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<PlusIcon />}
          onClick={openCreateDrawer}
          disabled={!characterId || createMutation.isPending}
        >
          Add video
        </Button>
      </div>

      {videos.length === 0 ? (
        <EmptyState
          title="No videos"
          description="Add the first scenario video."
          action={
            <Button
              variant="secondary"
              onClick={openCreateDrawer}
              disabled={!characterId}
            >
              Add video
            </Button>
          }
        />
      ) : (
        <div className={s.scenarioVideoGrid}>
          {videos.map((video) => {
            const isUpdating =
              updateMutation.isPending && updatingVideoId === video.id;

            return (
              <div
                key={video.id}
                className={s.scenarioVideoCard}
                role="button"
                tabIndex={0}
                onClick={() => setDetailsTarget(video)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setDetailsTarget(video);
                  }
                }}
              >
                <div className={s.scenarioVideoOverlay}>
                  <Badge tone={video.isActive ? 'success' : 'warning'}>
                    {video.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className={s.scenarioVideoHoverActions}>
                    <IconButton
                      aria-label="Edit video"
                      tooltip="Edit"
                      icon={<PencilLineIcon />}
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(video);
                      }}
                      disabled={!characterId || updateMutation.isPending}
                    />
                    <IconButton
                      aria-label="Delete video"
                      tooltip="Delete"
                      icon={<TrashIcon />}
                      variant="ghost"
                      tone="danger"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(video);
                      }}
                      disabled={!characterId || deleteMutation.isPending}
                    />
                  </div>
                </div>

                <div className={s.scenarioVideoMeta}>
                  <Typography variant="body">{formatPose(video.pose)}</Typography>
                  <Switch
                    checked={video.isActive}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      void handleActiveChange(video, event.target.checked);
                    }}
                    disabled={!characterId || isUpdating}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Drawer
        open={isCreateOpen}
        title="Add video"
        className={s.scenarioVideoDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateDrawer();
          } else {
            setIsCreateOpen(true);
          }
        }}
      >
        <Stack gap="16px">
          <FileUpload
            label="Video"
            folder={FileDir.Public}
            accept={VIDEO_ACCEPT}
            value={createFile}
            onChange={setCreateFile}
            onError={(message) =>
              notifyError(new Error(message), 'Unable to upload video.')
            }
          />
          {createValidationErrors.videoId ? (
            <Typography variant="caption" tone="danger">
              {createValidationErrors.videoId}
            </Typography>
          ) : null}

          <Field
            label="Pose"
            labelFor="scenario-video-create-pose"
            error={createValidationErrors.pose}
          >
            <Select
              id="scenario-video-create-pose"
              value={createValues.pose}
              options={poseOptions}
              onChange={(value) =>
                setCreateValues((prev) => ({ ...prev, pose: value as Pose }))
              }
              placeholder="Select pose"
              invalid={Boolean(createValidationErrors.pose)}
              fullWidth
            />
          </Field>

          <div className={s.storyDrawerActions}>
            <Button
              variant="secondary"
              onClick={closeCreateDrawer}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              Add video
            </Button>
          </div>
        </Stack>
      </Drawer>

      <Drawer
        open={Boolean(detailsTarget)}
        title="Scenario video"
        className={s.scenarioVideoDetailsDrawer}
        onOpenChange={(open) => {
          if (!open) setDetailsTarget(null);
        }}
      >
        {detailsTarget ? (
          <Stack gap="16px">
            {detailsTarget.video?.url ? (
              <video
                className={s.scenarioVideoDetails}
                src={detailsTarget.video.url}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <div className={s.scenarioVideoDetailsPlaceholder}>
                <Typography variant="caption" tone="muted">
                  No video
                </Typography>
              </div>
            )}

            <Field label="Pose">
              <Typography variant="body">
                {formatPose(detailsTarget.pose)}
              </Typography>
            </Field>
            <Field label="Status">
              <Badge tone={detailsTarget.isActive ? 'success' : 'warning'}>
                {detailsTarget.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </Field>
            <Field label="Created">
              <Typography variant="body">
                {formatDate(detailsTarget.createdAt)}
              </Typography>
            </Field>
            <Field label="Updated">
              <Typography variant="body">
                {formatDate(detailsTarget.updatedAt)}
              </Typography>
            </Field>
          </Stack>
        ) : null}
      </Drawer>

      <Modal
        open={Boolean(editTarget)}
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
              onClick={() => void handleEditSave()}
              loading={updateMutation.isPending}
              disabled={updateMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="12px">
          <Typography variant="body" tone="muted">
            The video file and pose are fixed after creation. Update the active
            state here.
          </Typography>
          <Switch
            checked={editIsActive}
            onChange={(event) => setEditIsActive(event.target.checked)}
            label={editIsActive ? 'Active' : 'Inactive'}
            disabled={updateMutation.isPending}
          />
        </Stack>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete video"
        description={
          deleteTarget
            ? `Delete ${formatPose(deleteTarget.pose)} video? This cannot be undone.`
            : 'Delete this video? This cannot be undone.'
        }
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
