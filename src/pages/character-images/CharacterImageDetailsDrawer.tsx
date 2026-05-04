import { useEffect, useMemo, useState } from 'react';

import {
  useCharacterImageDetails,
  useUpdateCharacterImage,
} from '@/app/character-images';
import { DownloadIcon } from '@/assets/icons';
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
import type { UpdateCharacterImageDto } from '@/common/types';
import {
  formatPose,
  USER_REQUEST_FIELD_CONFIG,
} from '@/common/utils';
import { Drawer } from '@/components/molecules';

import s from './CharacterImageDetailsDrawer.module.scss';

type CharacterImageDetailsDrawerProps = {
  imageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function CharacterImageDetailsDrawer({
  imageId,
  open,
  onOpenChange,
}: CharacterImageDetailsDrawerProps) {
  const { data, error, isLoading, refetch } = useCharacterImageDetails(
    open ? imageId : null,
  );
  const updateMutation = useUpdateCharacterImage();
  const [flagsDraft, setFlagsDraft] = useState({
    isPromotional: false,
    isAnal: false,
  });

  useEffect(() => {
    if (!data) return;
    setFlagsDraft({
      isPromotional: data.isPromotional,
      isAnal: Boolean(data.isAnal),
    });
  }, [data]);

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

  const hasFlagChanges = useMemo(() => {
    if (!data) return false;
    return (
      flagsDraft.isPromotional !== data.isPromotional ||
      flagsDraft.isAnal !== Boolean(data.isAnal)
    );
  }, [data, flagsDraft.isAnal, flagsDraft.isPromotional]);

  const handleSaveFlags = async () => {
    if (!data) return;

    const payload: UpdateCharacterImageDto = {};
    if (flagsDraft.isPromotional !== data.isPromotional) {
      payload.isPromotional = flagsDraft.isPromotional;
    }
    if (flagsDraft.isAnal !== Boolean(data.isAnal)) {
      payload.isAnal = flagsDraft.isAnal;
    }
    if (Object.keys(payload).length === 0) return;

    await updateMutation.mutateAsync({
      id: data.id,
      payload,
    });
  };

  return (
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
        <EmptyState title="Image not found" description="Check the image ID." />
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
              <Typography variant="body">{data.description || '-'}</Typography>
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
              <Typography variant="body">{formatStage(data.stage)}</Typography>
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
                  checked={flagsDraft.isPromotional}
                  disabled={updateMutation.isPending}
                  onChange={(event) =>
                    setFlagsDraft((prev) => ({
                      ...prev,
                      isPromotional: event.target.checked,
                    }))
                  }
                  label={
                    flagsDraft.isPromotional ? 'Promotional' : 'Regular'
                  }
                />
                <Switch
                  checked={flagsDraft.isAnal}
                  disabled={updateMutation.isPending}
                  onChange={(event) =>
                    setFlagsDraft((prev) => ({
                      ...prev,
                      isAnal: event.target.checked,
                    }))
                  }
                  label={flagsDraft.isAnal ? 'Anal' : 'Not anal'}
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
  );
}
