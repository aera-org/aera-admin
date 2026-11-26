import { Link, useNavigate, useParams } from 'react-router-dom';

import { useRvbGeneration } from '@/app/rvb';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  Grid,
  Section,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import type { IFile } from '@/common/types';
import { AppShell } from '@/components/templates';

import {
  formatDate,
  formatRvbUserMeta,
  formatRvbUserName,
  GENERATION_STATUS_LABELS,
  GENERATION_STATUS_TONES,
  GENERATION_TYPE_LABELS,
} from '../rvbFormat';
import s from '../RvbPage.module.scss';

type MediaItem = {
  label: string;
  file: IFile | null;
  kind: 'image' | 'video';
};

function MediaPreview({ label, file, kind }: MediaItem) {
  return (
    <div className={s.mediaItem}>
      <Typography variant="caption" tone="muted">
        {label}
      </Typography>
      {file?.url ? (
        kind === 'video' ? (
          <video
            className={s.mediaPreview}
            src={file.url}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <a href={file.url} target="_blank" rel="noreferrer">
            <img className={s.mediaPreview} src={file.url} alt={label} />
          </a>
        )
      ) : (
        <div className={s.mediaPlaceholder}>
          <Typography variant="caption" tone="muted">
            None
          </Typography>
        </div>
      )}
    </div>
  );
}

export function RvbGenerationDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, error, isLoading, refetch } = useRvbGeneration(id ?? null);

  const media: MediaItem[] = data
    ? [
        { label: 'First photo', file: data.ref1, kind: 'image' },
        { label: 'Second photo', file: data.ref2, kind: 'image' },
        { label: 'Result video', file: data.video, kind: 'video' },
        { label: 'Result photo', file: data.photo, kind: 'image' },
      ]
    : [];

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">RVB generation</Typography>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load RVB generation"
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

        {!isLoading && !error && !data ? (
          <EmptyState
            title="Generation not found"
            description="Check the ID."
          />
        ) : null}

        <Section title="Overview">
          {isLoading && !data ? (
            <Grid columns={3}>
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={`overview-${index}`} width={180} height={14} />
              ))}
            </Grid>
          ) : data ? (
            <Grid columns={3}>
              <Field label="Status">
                <div>
                  <Badge tone={GENERATION_STATUS_TONES[data.status]}>
                    {GENERATION_STATUS_LABELS[data.status]}
                  </Badge>
                </div>
              </Field>
              <Field label="Type">
                <Typography variant="body">
                  {data.type ? GENERATION_TYPE_LABELS[data.type] : 'Not set'}
                </Typography>
              </Field>
              <Field label="Credits">
                <Typography variant="body">{data.credits}</Typography>
              </Field>
              <Field label="User">
                {data.user ? (
                  <div className={s.cell}>
                    <Button
                      as={Link}
                      to={`/rvb/users/${data.user.id}`}
                      variant="text"
                      size="sm"
                    >
                      {formatRvbUserName(data.user)}
                    </Button>
                    <Typography variant="caption" tone="muted">
                      {formatRvbUserMeta(data.user)}
                    </Typography>
                  </div>
                ) : (
                  <Typography variant="body">-</Typography>
                )}
              </Field>
              <Field label="Prompt">
                {data.prompt ? (
                  <Button
                    as={Link}
                    to={`/video-prompts/${data.prompt.id}`}
                    variant="text"
                    size="sm"
                  >
                    {data.prompt.name}
                  </Button>
                ) : (
                  <Typography variant="body">-</Typography>
                )}
              </Field>
              <Field label="Video">
                <Typography variant="body">
                  {[
                    data.duration ? `${data.duration}s` : null,
                    data.resolution ? `${data.resolution}p` : null,
                    data.aspectRatio,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '-'}
                </Typography>
              </Field>
              <Field label="Created">
                <Typography variant="body">
                  {formatDate(data.createdAt)}
                </Typography>
              </Field>
              <Field label="Updated">
                <Typography variant="body">
                  {formatDate(data.updatedAt)}
                </Typography>
              </Field>
            </Grid>
          ) : null}
        </Section>

        {data ? (
          <Section title="Media">
            <div className={s.media}>
              {media.map((item) => (
                <MediaPreview key={item.label} {...item} />
              ))}
            </div>
          </Section>
        ) : null}
      </Container>
    </AppShell>
  );
}
