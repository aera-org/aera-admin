import { useMemo, useState } from 'react';

import {
  useCharacterImageDetails,
  useUpdateCharacterImage,
} from '@/app/character-images';
import { DownloadIcon, SaveIcon, VideoIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  Skeleton,
  Stack,
  Switch,
  Typography,
} from '@/atoms';
import type {
  ICharacterImageDetails,
  UpdateCharacterImageDto,
} from '@/common/types';
import { formatPose, USER_REQUEST_FIELD_CONFIG } from '@/common/utils';
import { Drawer } from '@/components/molecules';
import {
  ImageToVideoDrawer,
  type ImageToVideoSource,
} from '@/pages/videos/components/ImageToVideoDrawer';

import s from './CharacterImageDetailsDrawer.module.scss';

type CharacterImageDetailsDrawerProps = {
  imageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FlagsDraft = {
  imageId: string | null;
  isPromotional?: boolean;
  isAnal?: boolean;
};

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

function formatStage(value: string | null | undefined) {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildImageToVideoSource(
  image: ICharacterImageDetails,
): ImageToVideoSource | null {
  if (!image.file?.id || !image.scenario?.id) return null;

  return {
    startFrameId: image.file.id,
    scenarioId: image.scenario.id,
    characterName: image.character?.name,
    posePromptId: image.posePrompt?.id ?? image.posePromptId,
    posePromptName: image.posePrompt?.name,
  };
}

export function CharacterImageDetailsDrawer({
  imageId,
  open,
  onOpenChange,
}: CharacterImageDetailsDrawerProps) {
  const { data, error, isLoading, refetch } = useCharacterImageDetails(
    open ? imageId : null,
  );
  const updateMutation = useUpdateCharacterImage();
  const pregenerateMutation = useUpdateCharacterImage();
  const [flagsDraft, setFlagsDraft] = useState<FlagsDraft>({
    imageId: null,
  });
  const [imageToVideoSource, setImageToVideoSource] =
    useState<ImageToVideoSource | null>(null);

  const userRequestEntries = data
    ? Object.entries(USER_REQUEST_FIELD_CONFIG).map(([fieldKey, config]) => {
        const value =
          fieldKey === 'faceExpression'
            ? data.userRequest?.faceExpression?.trim()
            : data.userRequest?.[
                fieldKey as Exclude<
                  keyof typeof USER_REQUEST_FIELD_CONFIG,
                  'faceExpression'
                >
              ]?.join(', ');

        return {
          label: config.label,
          value: value || '-',
        };
      })
    : [];

  const effectiveFlags = useMemo(() => {
    if (!data) {
      return {
        isPromotional: false,
        isAnal: false,
      };
    }

    const isCurrentDraft = flagsDraft.imageId === data.id;

    return {
      isPromotional: isCurrentDraft
        ? (flagsDraft.isPromotional ?? data.isPromotional)
        : data.isPromotional,
      isAnal: isCurrentDraft
        ? (flagsDraft.isAnal ?? Boolean(data.isAnal))
        : Boolean(data.isAnal),
    };
  }, [data, flagsDraft.imageId, flagsDraft.isAnal, flagsDraft.isPromotional]);

  const hasFlagChanges = useMemo(() => {
    if (!data) return false;
    return (
      effectiveFlags.isPromotional !== data.isPromotional ||
      effectiveFlags.isAnal !== Boolean(data.isAnal)
    );
  }, [data, effectiveFlags.isAnal, effectiveFlags.isPromotional]);

  const videoSource = data ? buildImageToVideoSource(data) : null;

  const handleSaveFlags = async () => {
    if (!data) return;

    const payload: UpdateCharacterImageDto = {};
    if (effectiveFlags.isPromotional !== data.isPromotional) {
      payload.isPromotional = effectiveFlags.isPromotional;
    }
    if (effectiveFlags.isAnal !== Boolean(data.isAnal)) {
      payload.isAnal = effectiveFlags.isAnal;
    }
    if (Object.keys(payload).length === 0) return;

    await updateMutation.mutateAsync({
      id: data.id,
      payload,
    });
  };

  const handleMarkPregenerated = async () => {
    if (!data || data.isPregenerated || pregenerateMutation.isPending) return;

    try {
      await pregenerateMutation.mutateAsync({
        id: data.id,
        payload: { isPregenerated: true },
      });
    } catch {
      // useUpdateCharacterImage handles error notification.
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        title="Image details"
        description={data?.id}
        className={s.drawer}
      >
        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load image"
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

        {isLoading && !data ? (
          <div className={s.content}>
            <div className={s.mediaColumn}>
              <div className={s.previewSection}>
                <Skeleton width={120} height={12} />
                <div className={s.previewFrame}>
                  <Skeleton width="100%" height="100%" />
                </div>
              </div>
              <div className={s.previewSection}>
                <Skeleton width={120} height={12} />
                <div className={s.previewFrame}>
                  <Skeleton width="100%" height="100%" />
                </div>
              </div>
            </div>
            <div className={s.detailsColumn}>
              <Skeleton width={220} height={16} />
              <Skeleton width={180} height={16} />
              <Skeleton width={260} height={16} />
              <Skeleton width={200} height={16} />
            </div>
          </div>
        ) : null}

        {!isLoading && !error && !data ? (
          <EmptyState
            title="Image not found"
            description="Check the image ID."
          />
        ) : null}

        {data ? (
          <div className={s.content}>
            <div className={s.mediaColumn}>
              <div className={s.previewSection}>
                <Typography variant="meta" tone="muted">
                  Image
                </Typography>
                <div className={s.previewFrame}>
                  {data.file?.url ? (
                    <>
                      <div className={s.previewActions}>
                        {videoSource ? (
                          <IconButton
                            aria-label="Generate video"
                            tooltip="Generate video"
                            variant="ghost"
                            size="sm"
                            icon={<VideoIcon />}
                            onClick={() => setImageToVideoSource(videoSource)}
                          />
                        ) : null}
                        {!data.isPregenerated ? (
                          <IconButton
                            aria-label="Mark as pregenerated"
                            tooltip="Mark as pregenerated"
                            variant="ghost"
                            size="sm"
                            icon={<SaveIcon />}
                            loading={pregenerateMutation.isPending}
                            disabled={pregenerateMutation.isPending}
                            onClick={handleMarkPregenerated}
                          />
                        ) : null}
                        <IconButton
                          as="a"
                          href={data.file.url}
                          download={data.file.name}
                          rel="noopener"
                          aria-label="Download image"
                          tooltip="Download image"
                          variant="ghost"
                          size="sm"
                          icon={<DownloadIcon />}
                        />
                      </div>
                      <img
                        className={s.preview}
                        src={data.file.url}
                        alt={data.file.name}
                      />
                    </>
                  ) : (
                    <div className={s.previewPlaceholder}>
                      <Typography variant="caption" tone="muted">
                        No image available.
                      </Typography>
                    </div>
                  )}
                </div>
              </div>

              {data.blurredFile?.url ? (
                <div className={s.previewSection}>
                  <Typography variant="meta" tone="muted">
                    Blurred
                  </Typography>
                  <div className={s.previewFrame}>
                    <img
                      className={s.preview}
                      src={data.blurredFile.url}
                      alt={data.blurredFile.name}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className={s.detailsColumn}>
              <Field label="Description">
                <Typography variant="body">
                  {data.description || '-'}
                </Typography>
              </Field>

              <Field label="Request context">
                <Stack gap="12px">
                  {userRequestEntries.map((entry) => (
                    <div key={entry.label}>
                      <Typography variant="caption" tone="muted">
                        {entry.label}
                      </Typography>
                      <Typography variant="body">{entry.value}</Typography>
                    </div>
                  ))}
                  <div>
                    <Typography variant="caption" tone="muted">
                      Pose
                    </Typography>
                    <Typography variant="body">
                      {data.pose ? formatPose(data.pose) : '-'}
                    </Typography>
                  </div>
                </Stack>
              </Field>

              <Field label="Character">
                <Typography variant="body">
                  {data.character?.name || '-'}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {data.character?.id || '-'}
                </Typography>
              </Field>

              <Field label="Scenario">
                <Typography variant="body">
                  {data.scenario?.name || '-'}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {data.scenario?.id || '-'}
                </Typography>
              </Field>

              <Field label="Stage">
                <Typography variant="body">
                  {formatStage(data.stage)}
                </Typography>
              </Field>

              <Field label="Flags">
                <div className={s.flagEditor}>
                  <div className={s.flagStatus}>
                    <Badge
                      tone={data.isPregenerated ? 'accent' : 'warning'}
                      outline={!data.isPregenerated}
                    >
                      {data.isPregenerated ? 'Pregenerated' : 'Generated'}
                    </Badge>
                  </div>
                  <Switch
                    checked={effectiveFlags.isPromotional}
                    disabled={updateMutation.isPending}
                    onChange={(event) =>
                      setFlagsDraft({
                        imageId: data.id,
                        isAnal: effectiveFlags.isAnal,
                        isPromotional: event.target.checked,
                      })
                    }
                    label={
                      effectiveFlags.isPromotional ? 'Promotional' : 'Regular'
                    }
                  />
                  <Switch
                    checked={effectiveFlags.isAnal}
                    disabled={updateMutation.isPending}
                    onChange={(event) =>
                      setFlagsDraft({
                        imageId: data.id,
                        isPromotional: effectiveFlags.isPromotional,
                        isAnal: event.target.checked,
                      })
                    }
                    label={effectiveFlags.isAnal ? 'Anal' : 'Not anal'}
                  />
                  <div className={s.flagActions}>
                    <Button
                      size="sm"
                      onClick={handleSaveFlags}
                      loading={updateMutation.isPending}
                      disabled={!hasFlagChanges || updateMutation.isPending}
                    >
                      Save
                    </Button>
                  </div>
                </div>
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
          </div>
        ) : null}
      </Drawer>
      {imageToVideoSource ? (
        <ImageToVideoDrawer
          source={imageToVideoSource}
          onClose={() => setImageToVideoSource(null)}
        />
      ) : null}
    </>
  );
}
