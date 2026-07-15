import { useEffect, useMemo, useState } from 'react';

import { usePosePrompts } from '@/app/pose-prompts';
import { useCreateVideoGeneration } from '@/app/video-generations';
import { Button, Field, FormRow, Input, Select, Stack, Textarea } from '@/atoms';
import {
  type IVideoGenerationCreateDto,
  VideoAspectRatio,
  VideoQuality,
  VideoResolution,
} from '@/common/types';
import { Drawer } from '@/components/molecules';
import { SearchSelect } from '@/pages/generations/components/SearchSelect';

import s from './ImageToVideoDrawer.module.scss';

export type ImageToVideoSource = {
  startFrameId: string;
  scenarioId?: string;
  characterName?: string;
  posePromptId?: string;
  posePromptName?: string;
  prompt?: string;
};

type ImageToVideoDrawerProps = {
  source: ImageToVideoSource;
  onClose: () => void;
};

type ImageToVideoValues = {
  name: string;
  quality: VideoQuality;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  duration: string;
  posePromptId: string;
  prompt: string;
};

type SearchOption = {
  id: string;
  label: string;
  meta?: string;
};

const QUALITY_OPTIONS = [
  { label: 'Low (24)', value: VideoQuality.Low },
  { label: 'Medium (30)', value: VideoQuality.Medium },
  { label: 'High (60)', value: VideoQuality.High },
];

const RESOLUTION_OPTIONS = [
  { label: '720p', value: String(VideoResolution.Low) },
  { label: '1024p', value: String(VideoResolution.Medium) },
];

const ASPECT_RATIO_OPTIONS = [
  { label: 'Square (1:1)', value: VideoAspectRatio.Square },
  { label: 'Standard (3:4)', value: VideoAspectRatio.Standard },
  { label: 'Horizontal (16:9)', value: VideoAspectRatio.Horizontal },
  { label: 'Vertical (9:16)', value: VideoAspectRatio.Vertical },
];

const VIDEO_QUALITY_VALUES = new Set(Object.values(VideoQuality));
const VIDEO_RESOLUTION_VALUES = new Set(Object.values(VideoResolution));
const VIDEO_ASPECT_RATIO_VALUES = new Set(Object.values(VideoAspectRatio));
const MIN_DURATION = 1;
const SEARCH_DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function parsePositiveInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_DURATION) return null;
  return parsed;
}

function isVideoQuality(value: string): value is VideoQuality {
  return VIDEO_QUALITY_VALUES.has(value as VideoQuality);
}

function isVideoResolution(value: number): value is VideoResolution {
  return VIDEO_RESOLUTION_VALUES.has(value as VideoResolution);
}

function isVideoAspectRatio(value: string): value is VideoAspectRatio {
  return VIDEO_ASPECT_RATIO_VALUES.has(value as VideoAspectRatio);
}

function mergeSelectedOption(options: SearchOption[], selected?: SearchOption) {
  if (!selected) return options;
  if (options.some((option) => option.id === selected.id)) return options;
  return [selected, ...options];
}

function buildDefaultName(source: ImageToVideoSource) {
  const characterName = source.characterName?.trim();
  const poseName = source.posePromptName?.trim();
  const fallback = characterName ? `${characterName} video` : 'Video';

  return [characterName, poseName].filter(Boolean).join(' ') || fallback;
}

function buildInitialValues(source: ImageToVideoSource): ImageToVideoValues {
  return {
    name: buildDefaultName(source),
    quality: VideoQuality.Low,
    resolution: VideoResolution.Medium,
    aspectRatio: VideoAspectRatio.Square,
    duration: '10',
    posePromptId: source.posePromptId ?? '',
    prompt: source.prompt ?? '',
  };
}

export function ImageToVideoDrawer({
  source,
  onClose,
}: ImageToVideoDrawerProps) {
  const [values, setValues] = useState<ImageToVideoValues>(() =>
    buildInitialValues(source),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [posePromptSearch, setPosePromptSearch] = useState('');
  const createMutation = useCreateVideoGeneration();
  const debouncedPosePromptSearch = useDebouncedValue(
    posePromptSearch,
    SEARCH_DEBOUNCE_MS,
  );

  const { data: posePromptData, isLoading: isPosePromptsLoading } =
    usePosePrompts({
      search: debouncedPosePromptSearch.trim() || undefined,
      skip: 0,
      take: 100,
    });

  const initialPosePromptOption = useMemo(
    () =>
      source.posePromptId && source.posePromptName
        ? {
            id: source.posePromptId,
            label: source.posePromptName,
            meta: source.posePromptId,
          }
        : undefined,
    [source.posePromptId, source.posePromptName],
  );
  const posePromptOptions = useMemo(
    () =>
      mergeSelectedOption(
        (posePromptData?.data ?? []).map((posePrompt) => ({
          id: posePrompt.id,
          label: posePrompt.name,
          meta: posePrompt.id,
        })),
        initialPosePromptOption,
      ),
    [initialPosePromptOption, posePromptData?.data],
  );

  const parsedDuration = parsePositiveInteger(values.duration);
  const selectedPosePromptId = values.posePromptId;
  const requiresPrompt = !selectedPosePromptId;

  const validationErrors = useMemo(() => {
    if (!showErrors) return {};

    return {
      name: values.name.trim() ? undefined : 'Enter a name.',
      quality: isVideoQuality(values.quality) ? undefined : 'Select quality.',
      resolution: isVideoResolution(values.resolution)
        ? undefined
        : 'Select resolution.',
      aspectRatio: isVideoAspectRatio(values.aspectRatio)
        ? undefined
        : 'Select aspect ratio.',
      duration:
        parsedDuration !== null ? undefined : `Enter ${MIN_DURATION} or more.`,
      prompt:
        !requiresPrompt || values.prompt.trim() ? undefined : 'Enter a prompt.',
    };
  }, [
    parsedDuration,
    requiresPrompt,
    showErrors,
    values.aspectRatio,
    values.name,
    values.prompt,
    values.quality,
    values.resolution,
  ]);

  const isValid = Boolean(
    values.name.trim() &&
    (!requiresPrompt || values.prompt.trim()) &&
    isVideoQuality(values.quality) &&
    isVideoResolution(values.resolution) &&
    isVideoAspectRatio(values.aspectRatio) &&
    parsedDuration !== null,
  );

  const handleClose = () => {
    if (createMutation.isPending) return;
    onClose();
  };

  const handleGenerate = async () => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }

    const pendingWindow = window.open('about:blank', '_blank');
    if (pendingWindow) {
      pendingWindow.opener = null;
    }
    const payload: IVideoGenerationCreateDto = {
      name: values.name.trim(),
      scenarioId: source.scenarioId || undefined,
      posePromptId: selectedPosePromptId || undefined,
      quality: values.quality,
      resolution: values.resolution,
      aspectRatio: values.aspectRatio,
      duration: parsedDuration!,
      startFrameId: source.startFrameId,
    };

    if (!selectedPosePromptId) {
      payload.prompt = values.prompt.trim();
    }

    try {
      const result = await createMutation.mutateAsync(payload);
      if (result?.id) {
        const href = `${window.location.origin}/videos/${result.id}`;
        if (pendingWindow) {
          pendingWindow.location.href = href;
        } else {
          window.open(href, '_blank', 'noopener');
        }
      } else {
        pendingWindow?.close();
      }
      onClose();
    } catch {
      pendingWindow?.close();
    }
  };

  return (
    <Drawer
      open
      title="Generate video"
      className={s.drawer}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
    >
      <Stack gap="16px">
        <Field
          label="Name"
          labelFor="image-to-video-name"
          error={validationErrors.name}
        >
          <Input
            id="image-to-video-name"
            size="sm"
            value={values.name}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Video name"
            fullWidth
          />
        </Field>

        <FormRow columns={2}>
          <Field
            label="Quality"
            labelFor="image-to-video-quality"
            error={validationErrors.quality}
          >
            <Select
              id="image-to-video-quality"
              size="sm"
              options={QUALITY_OPTIONS}
              value={values.quality}
              onChange={(value) =>
                setValues((prev) => ({
                  ...prev,
                  quality: value as VideoQuality,
                }))
              }
              fullWidth
            />
          </Field>
          <Field
            label="Resolution"
            labelFor="image-to-video-resolution"
            error={validationErrors.resolution}
          >
            <Select
              id="image-to-video-resolution"
              size="sm"
              options={RESOLUTION_OPTIONS}
              value={String(values.resolution)}
              onChange={(value) =>
                setValues((prev) => ({
                  ...prev,
                  resolution: Number(value) as VideoResolution,
                }))
              }
              fullWidth
            />
          </Field>
        </FormRow>

        <FormRow columns={2}>
          <Field
            label="Aspect ratio"
            labelFor="image-to-video-aspect-ratio"
            error={validationErrors.aspectRatio}
          >
            <Select
              id="image-to-video-aspect-ratio"
              size="sm"
              options={ASPECT_RATIO_OPTIONS}
              value={values.aspectRatio}
              onChange={(value) =>
                setValues((prev) => ({
                  ...prev,
                  aspectRatio: value as VideoAspectRatio,
                }))
              }
              fullWidth
            />
          </Field>
          <Field
            label="Duration"
            labelFor="image-to-video-duration"
            error={validationErrors.duration}
          >
            <Input
              id="image-to-video-duration"
              type="number"
              min={MIN_DURATION}
              size="sm"
              value={values.duration}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, duration: event.target.value }))
              }
              placeholder={String(MIN_DURATION)}
              fullWidth
            />
          </Field>
        </FormRow>

        <Field label="Pose prompt" labelFor="image-to-video-pose-prompt">
          <SearchSelect
            id="image-to-video-pose-prompt"
            value={values.posePromptId}
            valueLabel={initialPosePromptOption?.label}
            options={[{ id: '', label: 'No pose prompt' }, ...posePromptOptions]}
            search={posePromptSearch}
            onSearchChange={setPosePromptSearch}
            onSelect={(value) =>
              setValues((prev) => ({ ...prev, posePromptId: value }))
            }
            placeholder={
              isPosePromptsLoading
                ? 'Loading pose prompts...'
                : 'Select pose prompt'
            }
            loading={isPosePromptsLoading}
            loadingLabel="Loading pose prompts..."
            emptyLabel="No pose prompts found."
            disabled={createMutation.isPending}
          />
        </Field>

        <Field
          label="Prompt"
          labelFor="image-to-video-prompt"
          error={validationErrors.prompt}
        >
          <Textarea
            id="image-to-video-prompt"
            size="sm"
            value={values.prompt}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, prompt: event.target.value }))
            }
            rows={6}
            placeholder="Describe the video to generate"
            fullWidth
          />
        </Field>

        <div className={s.actions}>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
          >
            Generate video
          </Button>
        </div>
      </Stack>
    </Drawer>
  );
}
