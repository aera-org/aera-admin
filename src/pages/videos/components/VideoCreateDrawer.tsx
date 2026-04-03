import { useEffect, useMemo, useState } from 'react';

import { useLoras } from '@/app/loras';
import { notifyError } from '@/app/toast';
import { useCreateVideoGeneration } from '@/app/video-generations';
import {
  Button,
  Field,
  FormRow,
  Input,
  Select,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import {
  FileDir,
  type IFile,
  VideoAspectRatio,
  VideoQuality,
  VideoResolution,
} from '@/common/types';
import { Drawer, FileUpload, LoraSelect } from '@/components/molecules';

import s from './VideoCreateDrawer.module.scss';

type VideoCreateDrawerProps = {
  onClose: () => void;
  onSuccess: (id: string) => void;
};

type CreateVideoValues = {
  name: string;
  quality: VideoQuality;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  duration: string;
  count: string;
  prompt: string;
  highLoraId: string;
  lowLoraId: string;
};

const QUALITY_OPTIONS = [
  { label: 'Low (24)', value: VideoQuality.Low },
  { label: 'Medium (30)', value: VideoQuality.Medium },
  { label: 'High (60)', value: VideoQuality.High },
];

const RESOLUTION_OPTIONS = [
  { label: '720p', value: String(VideoResolution.Low) },
  { label: '1024p', value: String(VideoResolution.Medium) },
  // { label: '1440p', value: String(VideoResolution.High) },
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
const LORA_SEARCH_DEBOUNCE_MS = 300;
const MIN_DURATION = 1;
const MIN_COUNT = 1;
const EMPTY_VALUES: CreateVideoValues = {
  name: '',
  quality: VideoQuality.Medium,
  resolution: VideoResolution.Medium,
  aspectRatio: VideoAspectRatio.Vertical,
  duration: '5',
  count: '1',
  prompt: '',
  highLoraId: '',
  lowLoraId: '',
};

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
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
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

export function VideoCreateDrawer({
  onClose,
  onSuccess,
}: VideoCreateDrawerProps) {
  const [values, setValues] = useState<CreateVideoValues>(EMPTY_VALUES);
  const [showErrors, setShowErrors] = useState(false);
  const [startFrame, setStartFrame] = useState<IFile | null>(null);
  const [highLoraSearch, setHighLoraSearch] = useState('');
  const [lowLoraSearch, setLowLoraSearch] = useState('');

  const createMutation = useCreateVideoGeneration();
  const debouncedHighLoraSearch = useDebouncedValue(
    highLoraSearch,
    LORA_SEARCH_DEBOUNCE_MS,
  );
  const debouncedLowLoraSearch = useDebouncedValue(
    lowLoraSearch,
    LORA_SEARCH_DEBOUNCE_MS,
  );

  const { data: highLoraData, isLoading: isHighLoraLoading } = useLoras({
    search: debouncedHighLoraSearch.trim() || undefined,
    order: 'DESC',
    skip: 0,
    take: 20,
  });
  const { data: lowLoraData, isLoading: isLowLoraLoading } = useLoras({
    search: debouncedLowLoraSearch.trim() || undefined,
    order: 'DESC',
    skip: 0,
    take: 20,
  });

  const parsedDuration = parsePositiveInteger(values.duration);
  const parsedCount = parsePositiveInteger(values.count);

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
        parsedDuration !== null && parsedDuration >= MIN_DURATION
          ? undefined
          : `Enter a value of ${MIN_DURATION} or more.`,
      count:
        parsedCount !== null && parsedCount >= MIN_COUNT
          ? undefined
          : `Enter a value of ${MIN_COUNT} or more.`,
      prompt: values.prompt.trim() ? undefined : 'Enter a prompt.',
      startFrame: startFrame?.id ? undefined : 'Upload a start frame.',
    };
  }, [
    parsedCount,
    parsedDuration,
    showErrors,
    startFrame?.id,
    values.aspectRatio,
    values.name,
    values.prompt,
    values.quality,
    values.resolution,
  ]);

  const isValid = useMemo(
    () =>
      Boolean(
        values.name.trim() &&
        values.prompt.trim() &&
        startFrame?.id &&
        isVideoQuality(values.quality) &&
        isVideoResolution(values.resolution) &&
        isVideoAspectRatio(values.aspectRatio) &&
        parsedDuration !== null &&
        parsedDuration >= MIN_DURATION &&
        parsedCount !== null &&
        parsedCount >= MIN_COUNT,
      ),
    [
      parsedCount,
      parsedDuration,
      startFrame?.id,
      values.aspectRatio,
      values.name,
      values.prompt,
      values.quality,
      values.resolution,
    ],
  );

  const highLoraOptions = useMemo(
    () => highLoraData?.data ?? [],
    [highLoraData?.data],
  );
  const lowLoraOptions = useMemo(
    () => lowLoraData?.data ?? [],
    [lowLoraData?.data],
  );

  const handleClose = () => {
    if (createMutation.isPending) return;
    onClose();
  };

  const handleCreate = async () => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }

    const result = await createMutation.mutateAsync({
      name: values.name.trim(),
      quality: values.quality,
      resolution: values.resolution,
      aspectRatio: values.aspectRatio,
      duration: parsedDuration!,
      count: parsedCount!,
      prompt: values.prompt.trim(),
      startFrameId: startFrame!.id,
      highLoraId: values.highLoraId || undefined,
      lowLoraId: values.lowLoraId || undefined,
    });

    onClose();
    if (result?.id) {
      onSuccess(result.id);
    }
  };

  return (
    <Drawer
      open
      title="New video"
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
          labelFor="video-create-name"
          error={validationErrors.name}
        >
          <Input
            id="video-create-name"
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
            labelFor="video-create-quality"
            error={validationErrors.quality}
          >
            <Select
              id="video-create-quality"
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
            labelFor="video-create-resolution"
            error={validationErrors.resolution}
          >
            <Select
              id="video-create-resolution"
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
            labelFor="video-create-aspect-ratio"
            error={validationErrors.aspectRatio}
          >
            <Select
              id="video-create-aspect-ratio"
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
            labelFor="video-create-duration"
            error={validationErrors.duration}
          >
            <Input
              id="video-create-duration"
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

        <Field
          label="Count"
          labelFor="video-create-count"
          error={validationErrors.count}
        >
          <Input
            id="video-create-count"
            type="number"
            min={MIN_COUNT}
            size="sm"
            value={values.count}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, count: event.target.value }))
            }
            placeholder={String(MIN_COUNT)}
            fullWidth
          />
        </Field>

        <Field
          label="Prompt"
          labelFor="video-create-prompt"
          error={validationErrors.prompt}
        >
          <Textarea
            id="video-create-prompt"
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

        <FileUpload
          label="Start frame"
          folder={FileDir.Public}
          value={startFrame}
          onChange={setStartFrame}
          onError={(message) =>
            notifyError(new Error(message), 'Unable to upload start frame.')
          }
        />
        {validationErrors.startFrame ? (
          <Typography className={s.errorText} variant="caption">
            {validationErrors.startFrame}
          </Typography>
        ) : null}

        <FormRow columns={2}>
          <Field label="High LoRA" labelFor="video-create-high-lora">
            <LoraSelect
              id="video-create-high-lora"
              value={values.highLoraId}
              options={highLoraOptions.map((lora) => ({
                id: lora.id,
                fileName: lora.fileName,
              }))}
              search={highLoraSearch}
              onSearchChange={setHighLoraSearch}
              onSelect={(value) =>
                setValues((prev) => ({ ...prev, highLoraId: value }))
              }
              placeholder={
                isHighLoraLoading ? 'Loading LoRAs...' : 'Select LoRA'
              }
              disabled={isHighLoraLoading}
              loading={isHighLoraLoading}
            />
          </Field>
          <Field label="Low LoRA" labelFor="video-create-low-lora">
            <LoraSelect
              id="video-create-low-lora"
              value={values.lowLoraId}
              options={lowLoraOptions.map((lora) => ({
                id: lora.id,
                fileName: lora.fileName,
              }))}
              search={lowLoraSearch}
              onSearchChange={setLowLoraSearch}
              onSelect={(value) =>
                setValues((prev) => ({ ...prev, lowLoraId: value }))
              }
              placeholder={
                isLowLoraLoading ? 'Loading LoRAs...' : 'Select LoRA'
              }
              disabled={isLowLoraLoading}
              loading={isLowLoraLoading}
            />
          </Field>
        </FormRow>

        <div className={s.actions}>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            loading={createMutation.isPending}
            disabled={!isValid || createMutation.isPending}
          >
            Create
          </Button>
        </div>
      </Stack>
    </Drawer>
  );
}
