import { ReloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useDeleteImgGeneration,
  useImgGenerationDetails,
  useRegenerateImgGeneration,
} from '@/app/img-generations';
import { DownloadIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import { ImgGenerationStatus } from '@/common/types';
import {
  formatUserRequestForDisplay,
  resolveGenerationRequestMode,
  requiresPosePrompt,
} from '@/common/utils';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';
import { AppShell } from '@/components/templates';

import s from './GenerationDetailsPage.module.scss';
import type { GenerateImagePrefillState } from './generationReuse';

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

function formatLatency(value: number | undefined) {
  if (value === undefined || value === null) return '-';
  const seconds = value / 1000;
  return `${seconds.toFixed(2)}s`;
}

function formatStage(value: string | null | undefined) {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function GenerationDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, refetch } = useImgGenerationDetails(
    id ?? null,
  );
  const deleteMutation = useDeleteImgGeneration();
  const regenerateMutation = useRegenerateImgGeneration();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;
  const hasImage = Boolean(
    data?.status === ImgGenerationStatus.Ready && data.file?.url,
  );
  const isGenerating = data?.status === ImgGenerationStatus.Generating;
  const isFailed = data?.status === ImgGenerationStatus.Failed;
  const showLatency =
    data?.status === ImgGenerationStatus.Ready && data?.latency;
  const requestMode = data
    ? resolveGenerationRequestMode(
        data.stage,
        undefined,
        Boolean(data.posePrompt?.id ?? data.posePromptId),
      )
    : undefined;
  const userRequestEntries = data
    ? formatUserRequestForDisplay(data.userRequest, data.stage, requestMode)
    : [];

  const handleRegenerate = async () => {
    if (!id || isGenerating || regenerateMutation.isPending) return;
    await regenerateMutation.mutateAsync(id);
  };

  const handleReuse = () => {
    if (!data) return;

    const prefill: GenerateImagePrefillState = {
      characterId: data.character.id,
      characterName: data.character.name,
      scenarioId: data.scenario.id,
      scenarioName: data.scenario.name,
      stage: data.stage,
      mainLoraId: data.mainLora?.id,
      mainLoraName: data.mainLora?.fileName,
      secondLoraId: data.secondLora?.id,
      secondLoraName: data.secondLora?.fileName,
      userRequest: data.userRequest,
      posePromptId: data.posePrompt?.id ?? data.posePromptId,
      posePromptName: data.posePrompt?.name,
      requestMode,
    };

    navigate('/generations/new', { state: { prefill } });
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Generation</Typography>
          </div>
          <div className={s.headerActions}>
            <Button variant="secondary" onClick={handleReuse} disabled={!data}>
              Reuse
            </Button>
            <IconButton
              aria-label="Delete generation"
              icon={<TrashIcon />}
              tooltip="Delete generation"
              variant="ghost"
              tone="danger"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!id || deleteMutation.isPending}
            />
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load generation"
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
            title="Generation not found"
            description="Check the ID."
          />
        ) : null}

        {showSkeleton ? (
          <div className={s.content}>
            <div className={s.mediaColumn}>
              <Skeleton height={360} />
            </div>
            <div className={s.detailsColumn}>
              <Stack gap="16px">
                <Skeleton width={160} height={12} />
                <Skeleton width={140} height={12} />
                <Skeleton width={180} height={12} />
                <Skeleton width={120} height={12} />
              </Stack>
            </div>
          </div>
        ) : null}

        {data ? (
          <div className={s.content}>
            <div className={s.mediaColumn}>
              <div className={s.previewFrame}>
                {data ? (
                  <div className={s.previewActions}>
                    {hasImage ? (
                      <IconButton
                        as="a"
                        href={data.file?.url ?? undefined}
                        download={data.file?.name}
                        rel="noopener"
                        aria-label="Download generation"
                        icon={<DownloadIcon />}
                        tooltip="Download generation"
                        variant="ghost"
                        size="sm"
                      />
                    ) : null}
                    <IconButton
                      aria-label="Regenerate generation"
                      icon={<ReloadIcon />}
                      tooltip="Regenerate generation"
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerate}
                      loading={regenerateMutation.isPending}
                      disabled={
                        !id ||
                        isGenerating ||
                        regenerateMutation.isPending ||
                        deleteMutation.isPending
                      }
                    />
                  </div>
                ) : null}
                {hasImage ? (
                  <img
                    className={s.preview}
                    src={data.file?.url ?? ''}
                    alt="Generated image"
                  />
                ) : isGenerating ? (
                  <Skeleton height="100%" />
                ) : isFailed ? (
                  <EmptyState
                    title="Generation failed"
                    description="No image was produced."
                  />
                ) : (
                  <EmptyState
                    title="No image yet"
                    description="Image pending."
                  />
                )}
              </div>
              <Stack gap="12px">
                {requiresPosePrompt(data.stage, requestMode) ? (
                  <div>
                    <Typography variant="meta" tone="muted">
                      Pose prompt request
                    </Typography>
                    <Stack gap="8px">
                      <div>
                        <Typography variant="caption" tone="muted">
                          Pose prompt
                        </Typography>
                        <Typography variant="body">
                          {data.posePrompt?.name || data.posePromptId || '-'}
                        </Typography>
                      </div>
                      {data.posePromptId ? (
                        <div>
                          <Typography variant="caption" tone="muted">
                            Pose prompt ID
                          </Typography>
                          <Typography variant="body">
                            {data.posePromptId}
                          </Typography>
                        </div>
                      ) : null}
                      {userRequestEntries.map((entry) => (
                        <div key={entry.label}>
                          <Typography variant="caption" tone="muted">
                            {entry.label}
                          </Typography>
                          <Typography variant="body">{entry.value}</Typography>
                        </div>
                      ))}
                    </Stack>
                  </div>
                ) : (
                  <div>
                    <Typography variant="meta" tone="muted">
                      Request
                    </Typography>
                    {userRequestEntries.length > 0 ? (
                      <Stack gap="8px">
                        {userRequestEntries.map((entry) => (
                          <div key={entry.label}>
                            <Typography variant="caption" tone="muted">
                              {entry.label}
                            </Typography>
                            <Typography variant="body">{entry.value}</Typography>
                          </div>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body">-</Typography>
                    )}
                  </div>
                )}
                {data.prompt ? (
                  <div>
                    <Typography variant="meta" tone="muted">
                      Prompt
                    </Typography>
                    <Typography variant="body">{data.prompt}</Typography>
                  </div>
                ) : null}
              </Stack>
            </div>
            <div className={s.detailsColumn}>
              <Stack gap="16px">
                <div>
                  <Typography variant="meta" tone="muted">
                    Character
                  </Typography>
                  <Typography variant="body">{data.character.name}</Typography>
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    Scenario
                  </Typography>
                  <Typography variant="body">{data.scenario.name}</Typography>
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    Stage
                  </Typography>
                  <Typography variant="body">
                    {formatStage(data.stage)}
                  </Typography>
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    Main LoRA
                  </Typography>
                  {data.mainLora ? (
                    <>
                      <Typography variant="body">
                        {data.mainLora.fileName}
                      </Typography>
                      <Typography variant="caption" tone="muted">
                        {data.mainLora.id}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body" tone="muted">
                      -
                    </Typography>
                  )}
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    Secondary LoRA
                  </Typography>
                  {data.secondLora ? (
                    <>
                      <Typography variant="body">
                        {data.secondLora.fileName}
                      </Typography>
                      <Typography variant="caption" tone="muted">
                        {data.secondLora.id}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body" tone="muted">
                      -
                    </Typography>
                  )}
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    Status
                  </Typography>
                  {data.status === ImgGenerationStatus.Ready ? (
                    <Badge tone="success">Ready</Badge>
                  ) : data.status === ImgGenerationStatus.Failed ? (
                    <Badge tone="danger">Failed</Badge>
                  ) : (
                    <Badge tone="warning" outline>
                      Generating
                    </Badge>
                  )}
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    Created
                  </Typography>
                  <Typography variant="body">
                    {formatDate(data.createdAt)}
                  </Typography>
                </div>
                {showLatency ? (
                  <div>
                    <Typography variant="meta" tone="muted">
                      Latency
                    </Typography>
                    <div className={s.latencyGrid}>
                      <Typography variant="caption" tone="muted">
                        Prompt generation
                      </Typography>
                      <Typography variant="body">
                        {formatLatency(data.latency?.promptGeneration)}
                      </Typography>
                      <Typography variant="caption" tone="muted">
                        Image generation
                      </Typography>
                      <Typography variant="body">
                        {formatLatency(data.latency?.imageGeneration)}
                      </Typography>
                      <Typography variant="caption" tone="muted">
                        Image upload
                      </Typography>
                      <Typography variant="body">
                        {formatLatency(data.latency?.imageUpload)}
                      </Typography>
                    </div>
                  </div>
                ) : null}
                <div>
                  <Typography variant="meta" tone="muted">
                    Requested by
                  </Typography>
                  <Typography variant="body">
                    {data.madeBy?.firstName} {data.madeBy?.lastName}
                  </Typography>
                  <Typography variant="caption" tone="muted">
                    {data.madeBy?.email}
                  </Typography>
                </div>
              </Stack>
            </div>
          </div>
        ) : null}
      </Container>

      <ConfirmModal
        open={isDeleteOpen}
        title="Delete generation"
        description="Delete this generation? This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={async () => {
          if (!id) return;
          await deleteMutation.mutateAsync(id);
          setIsDeleteOpen(false);
          navigate('/generations');
        }}
        onClose={() => setIsDeleteOpen(false)}
      />
    </AppShell>
  );
}
