import { useMemo, useState } from 'react';

import {
  useCreateScenarioVideoV2,
  useDeleteScenarioVideo,
  useUpdateScenarioVideoV2,
} from '@/app/characters';
import { notifyError } from '@/app/toast';
import { PencilLineIcon, PlusIcon, TrashIcon } from '@/assets/icons';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  Select,
  Stack,
  Switch,
  Typography,
} from '@/atoms';
import { isX } from '@/common/is-x';
import {
  FileDir,
  type IFile,
  type IScenarioVideo,
  type Pose,
  RoleplayStage,
  STAGES_IN_ORDER,
} from '@/common/types';
import { formatPose, poseOptions } from '@/common/utils';
import { ConfirmModal, Drawer, FileUpload } from '@/components/molecules';

import s from '../CharacterDetailsPage.module.scss';

type ScenarioVideosV2SectionProps = {
  characterId: string | null;
  scenarioId: string;
  videos: IScenarioVideo[];
  formatDate: (value: string | null | undefined) => string;
};

type CreateVideoValues = {
  pose: Pose | '';
  stage: RoleplayStage | '';
  isPaid: '' | 'true' | 'false';
  forFeed: boolean;
};

type EditVideoValues = {
  pose: Pose | '';
  stage: RoleplayStage | '';
  isPaid: '' | 'true' | 'false';
  forFeed: boolean;
  isActive: boolean;
};

const VIDEO_ACCEPT =
  'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v';
const EMPTY_CREATE_VALUES: CreateVideoValues = {
  pose: '',
  stage: '',
  isPaid: '',
  forFeed: false,
};
const EMPTY_EDIT_VALUES: EditVideoValues = {
  pose: '',
  stage: '',
  isPaid: '',
  forFeed: false,
  isActive: false,
};

const STAGE_LABELS: Record<RoleplayStage, string> = {
  [RoleplayStage.Acquaintance]: 'Acquaintance',
  [RoleplayStage.Flirting]: 'Flirting',
  [RoleplayStage.Seduction]: 'Seduction',
  [RoleplayStage.Resistance]: 'Resistance',
  [RoleplayStage.Undressing]: 'Undressing',
  [RoleplayStage.Prelude]: 'Prelude',
  [RoleplayStage.Sex]: 'Sex',
  [RoleplayStage.Aftercare]: 'Aftercare',
};

const stageOptions = [
  { value: '', label: 'No stage' },
  ...STAGES_IN_ORDER.map((stage) => ({
    value: stage,
    label: STAGE_LABELS[stage],
  })),
];

const paidOptions = [
  { value: '', label: 'Not set' },
  { value: 'true', label: 'Paid' },
  { value: 'false', label: 'Free' },
];

function formatStage(value: RoleplayStage | null | undefined) {
  return value ? STAGE_LABELS[value] : '-';
}

function serializePaidValue(value: boolean | null | undefined) {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
}

function parsePaidValue(value: '' | 'true' | 'false') {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function formatPayment(value: boolean | null | undefined) {
  if (value === true) return 'Paid';
  if (value === false) return 'Free';
  return '-';
}

function buildVideoLabel(video: IScenarioVideo) {
  const parts = [formatPose(video.pose), formatStage(video.stage)].filter(
    (value) => value !== '-',
  );
  return parts.length > 0 ? parts.join(' · ') : 'Video';
}

function compareVideosByStatusAndPose(
  left: IScenarioVideo,
  right: IScenarioVideo,
) {
  if (left.isActive !== right.isActive) {
    return left.isActive ? -1 : 1;
  }

  if (!left.pose && right.pose) return 1;
  if (left.pose && !right.pose) return -1;
  if (!left.pose && !right.pose) return 0;

  return formatPose(left.pose).localeCompare(formatPose(right.pose), undefined, {
    sensitivity: 'base',
  });
}

export function ScenarioVideosV2Section({
  characterId,
  scenarioId,
  videos,
  formatDate,
}: ScenarioVideosV2SectionProps) {
  const createMutation = useCreateScenarioVideoV2();
  const updateMutation = useUpdateScenarioVideoV2();
  const deleteMutation = useDeleteScenarioVideo();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createValues, setCreateValues] =
    useState<CreateVideoValues>(EMPTY_CREATE_VALUES);
  const [createFile, setCreateFile] = useState<IFile | null>(null);
  const [createStartFrame, setCreateStartFrame] = useState<IFile | null>(null);
  const [createShowErrors, setCreateShowErrors] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<IScenarioVideo | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<IScenarioVideo | null>(null);
  const [editValues, setEditValues] =
    useState<EditVideoValues>(EMPTY_EDIT_VALUES);
  const [editStartFrame, setEditStartFrame] = useState<IFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IScenarioVideo | null>(null);
  const [updatingVideoId, setUpdatingVideoId] = useState<string | null>(null);

  const createValidationErrors = useMemo(() => {
    if (!createShowErrors) return {};
    return {
      videoId: createFile?.id ? undefined : 'Upload a video.',
    };
  }, [createFile?.id, createShowErrors]);
  const sortedVideos = useMemo(
    () =>
      videos
        .map((video, index) => ({ video, index }))
        .sort((left, right) => {
          const order = compareVideosByStatusAndPose(left.video, right.video);
          return order || left.index - right.index;
        })
        .map(({ video }) => video),
    [videos],
  );

  const isCreateValid = Boolean(createFile?.id);

  const openCreateDrawer = () => {
    setCreateValues(EMPTY_CREATE_VALUES);
    setCreateFile(null);
    setCreateStartFrame(null);
    setCreateShowErrors(false);
    setIsCreateOpen(true);
  };

  const closeCreateDrawer = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const openEditDrawer = (video: IScenarioVideo) => {
    setEditTarget(video);
    setEditStartFrame(video.startFrame ?? null);
    setEditValues({
      pose: video.pose ?? '',
      stage: video.stage ?? '',
      isPaid: serializePaidValue(video.isPaid),
      forFeed: video.forFeed,
      isActive: video.isActive,
    });
  };

  const closeEditDrawer = () => {
    if (updateMutation.isPending) return;
    setEditTarget(null);
    setEditStartFrame(null);
  };

  const handleCreate = async () => {
    if (!characterId || !isCreateValid || !createFile?.id) {
      setCreateShowErrors(true);
      return;
    }

    await createMutation.mutateAsync({
      characterId,
      scenarioId,
      payload: {
        videoId: createFile.id,
        startFrameId: createStartFrame?.id || undefined,
        pose: createValues.pose || undefined,
        stage: createValues.stage || undefined,
        isPaid: parsePaidValue(createValues.isPaid),
        forFeed: createValues.forFeed,
      },
    });

    setIsCreateOpen(false);
    setCreateFile(null);
    setCreateStartFrame(null);
    setCreateValues(EMPTY_CREATE_VALUES);
    setCreateShowErrors(false);
  };

  const handleQuickActiveChange = async (
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
        payload: {
          isActive,
          startFrameId: video.startFrame?.id ?? null,
          pose: video.pose ?? null,
          stage: video.stage ?? null,
          isPaid: video.isPaid ?? undefined,
          forFeed: video.forFeed,
        },
      });
    } finally {
      setUpdatingVideoId((current) => (current === video.id ? null : current));
    }
  };

  const handleEditSave = async () => {
    if (!characterId || !editTarget) return;

    await updateMutation.mutateAsync({
      characterId,
      scenarioId,
      id: editTarget.id,
      payload: {
        isActive: editValues.isActive,
        startFrameId: editStartFrame?.id ?? null,
        pose: editValues.pose || null,
        stage: editValues.stage || null,
        isPaid: parsePaidValue(editValues.isPaid),
        forFeed: editValues.forFeed,
      },
    });

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
          {sortedVideos.map((video) => {
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
                  <div className={s.scenarioVideoStatusBadges}>
                    <Badge tone={video.isActive ? 'success' : 'warning'}>
                      {video.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {video.forFeed && isX ? <Badge>Feed</Badge> : null}
                  </div>
                  <div className={s.scenarioVideoHoverActions}>
                    <IconButton
                      aria-label="Edit video"
                      tooltip="Edit"
                      icon={<PencilLineIcon />}
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditDrawer(video);
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
                  <div>
                    <Typography variant="body">{buildVideoLabel(video)}</Typography>
                    <Typography variant="caption" tone="muted">
                      {formatPayment(video.isPaid)}
                    </Typography>
                  </div>
                  <Switch
                    checked={video.isActive}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      void handleQuickActiveChange(video, event.target.checked);
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

          <FileUpload
            label="Start frame"
            folder={FileDir.Public}
            value={createStartFrame}
            onChange={setCreateStartFrame}
            onError={(message) =>
              notifyError(new Error(message), 'Unable to upload start frame.')
            }
          />

          <Field label="Pose" labelFor="scenario-video-v2-create-pose">
            <Select
              id="scenario-video-v2-create-pose"
              value={createValues.pose}
              options={[{ value: '', label: 'No pose' }, ...poseOptions]}
              onChange={(value) =>
                setCreateValues((prev) => ({ ...prev, pose: value as Pose | '' }))
              }
              placeholder="Select pose"
              fullWidth
            />
          </Field>

          <Field label="Stage" labelFor="scenario-video-v2-create-stage">
            <Select
              id="scenario-video-v2-create-stage"
              value={createValues.stage}
              options={stageOptions}
              onChange={(value) =>
                setCreateValues((prev) => ({
                  ...prev,
                  stage: value as RoleplayStage | '',
                }))
              }
              placeholder="Select stage"
              fullWidth
            />
          </Field>

          <Field label="Payment" labelFor="scenario-video-v2-create-paid">
            <Select
              id="scenario-video-v2-create-paid"
              value={createValues.isPaid}
              options={paidOptions}
              onChange={(value) =>
                setCreateValues((prev) => ({
                  ...prev,
                  isPaid: value as '' | 'true' | 'false',
                }))
              }
              placeholder="Select payment"
              fullWidth
            />
          </Field>

          {isX && <Switch
            checked={createValues.forFeed}
            onChange={(event) =>
              setCreateValues((prev) => ({
                ...prev,
                forFeed: event.target.checked,
              }))
            }
            label="Feed"
            disabled={createMutation.isPending}
          />}

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
            <Field label="Stage">
              <Typography variant="body">
                {formatStage(detailsTarget.stage)}
              </Typography>
            </Field>
            <Field label="Payment">
              <Typography variant="body">
                {formatPayment(detailsTarget.isPaid)}
              </Typography>
            </Field>
            <Field label="Start frame">
              {detailsTarget.startFrame?.url ? (
                <img
                  className={s.scenarioVideoStartFrame}
                  src={detailsTarget.startFrame.url}
                  alt={detailsTarget.startFrame.name}
                />
              ) : (
                <Typography variant="body">-</Typography>
              )}
            </Field>
            {isX && <Field label="Feed">
              <Typography variant="body">
                {detailsTarget.forFeed ? 'Yes' : 'No'}
              </Typography>
            </Field>}
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

      <Drawer
        open={Boolean(editTarget)}
        title="Edit video"
        className={s.scenarioVideoDrawer}
        onOpenChange={(open) => {
          if (!open) closeEditDrawer();
        }}
      >
        <Stack gap="16px">
          <Typography variant="body" tone="muted">
            The video file is fixed after creation. Update the metadata here.
          </Typography>

          <FileUpload
            label="Start frame"
            folder={FileDir.Public}
            value={editStartFrame}
            onChange={setEditStartFrame}
            onError={(message) =>
              notifyError(new Error(message), 'Unable to upload start frame.')
            }
          />

          <Field label="Pose" labelFor="scenario-video-v2-edit-pose">
            <Select
              id="scenario-video-v2-edit-pose"
              value={editValues.pose}
              options={[{ value: '', label: 'No pose' }, ...poseOptions]}
              onChange={(value) =>
                setEditValues((prev) => ({ ...prev, pose: value as Pose | '' }))
              }
              placeholder="Select pose"
              fullWidth
            />
          </Field>

          <Field label="Stage" labelFor="scenario-video-v2-edit-stage">
            <Select
              id="scenario-video-v2-edit-stage"
              value={editValues.stage}
              options={stageOptions}
              onChange={(value) =>
                setEditValues((prev) => ({
                  ...prev,
                  stage: value as RoleplayStage | '',
                }))
              }
              placeholder="Select stage"
              fullWidth
            />
          </Field>

          <Field label="Payment" labelFor="scenario-video-v2-edit-paid">
            <Select
              id="scenario-video-v2-edit-paid"
              value={editValues.isPaid}
              options={paidOptions}
              onChange={(value) =>
                setEditValues((prev) => ({
                  ...prev,
                  isPaid: value as '' | 'true' | 'false',
                }))
              }
              placeholder="Select payment"
              fullWidth
            />
          </Field>

          {isX && <Switch
            checked={editValues.forFeed}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                forFeed: event.target.checked,
              }))
            }
            label="Feed"
            disabled={updateMutation.isPending}
          />}

          <Switch
            checked={editValues.isActive}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                isActive: event.target.checked,
              }))
            }
            label={editValues.isActive ? 'Active' : 'Inactive'}
            disabled={updateMutation.isPending}
          />

          <div className={s.storyDrawerActions}>
            <Button
              variant="secondary"
              onClick={closeEditDrawer}
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
        </Stack>
      </Drawer>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete video"
        description={
          deleteTarget
            ? `Delete ${buildVideoLabel(deleteTarget)}? This cannot be undone.`
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
