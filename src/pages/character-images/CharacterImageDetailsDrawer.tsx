import { useCharacterImageDetails } from '@/app/character-images';
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
  Typography,
} from '@/atoms';
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

  const flags = data
    ? [
        {
          label: data.isPregenerated ? 'Pregenerated' : 'Generated',
          tone: data.isPregenerated
            ? ('accent' as const)
            : ('warning' as const),
          outline: !data.isPregenerated,
        },
        {
          label: data.isPromotional ? 'Promotional' : 'Regular',
          tone: data.isPromotional ? ('warning' as const) : ('accent' as const),
          outline: !data.isPromotional,
        },
      ]
    : [];

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
                <div>
                  <Typography variant="caption" tone="muted">
                    Anal
                  </Typography>
                  <Typography variant="body">
                    {data.isAnal ? 'Yes' : 'No'}
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
              <div className={s.badges}>
                {flags.map((flag) => (
                  <Badge
                    key={flag.label}
                    tone={flag.tone}
                    outline={flag.outline}
                  >
                    {flag.label}
                  </Badge>
                ))}
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
