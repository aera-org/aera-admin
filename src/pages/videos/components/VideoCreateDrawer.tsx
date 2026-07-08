import { useEffect, useMemo, useState } from 'react';

import { useCharacterDetails, useCharacters } from '@/app/characters';
import { usePosePrompts } from '@/app/pose-prompts';
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
  type IVideoGenerationCreateDto,
  VideoAspectRatio,
  VideoQuality,
  VideoResolution,
} from '@/common/types';
import { formatCharacterSelectLabel } from '@/common/utils';
import { Drawer, FileUpload } from '@/components/molecules';
import { SearchSelect } from '@/pages/generations/components/SearchSelect';

import s from './VideoCreateDrawer.module.scss';

type VideoCreateDrawerProps = {
  onClose: () => void;
  onSuccess: (id: string) => void;
  initialValues?: VideoCreateInitialValues;
};

type CreateVideoValues = {
  name: string;
  characterId: string;
  scenarioId: string;
  posePromptId: string;
  quality: VideoQuality;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  duration: string;
  prompt: string;
};

type SelectOption = {
  id: string;
  label: string;
  meta?: string;
};

type ScenarioOption = {
  label: string;
  value: string;
};

export type VideoCreateInitialValues = Partial<CreateVideoValues> & {
  startFrame?: IFile | null;
  characterOption?: SelectOption;
  scenarioOption?: ScenarioOption;
  posePromptOption?: SelectOption;
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
const MIN_DURATION = 1;
const EMPTY_VALUES: CreateVideoValues = {
  name: '',
  characterId: '',
  scenarioId: '',
  posePromptId: '',
  quality: VideoQuality.Low,
  resolution: VideoResolution.Medium,
  aspectRatio: VideoAspectRatio.Square,
  duration: '10',
  prompt: '',
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

function mergeSelectedOption<T extends { id: string }>(
  options: T[],
  selected?: T,
) {
  if (!selected) return options;
  if (options.some((option) => option.id === selected.id)) return options;
  return [selected, ...options];
}

function buildInitialValues(initialValues?: VideoCreateInitialValues) {
  return {
    name: initialValues?.name ?? EMPTY_VALUES.name,
    characterId: initialValues?.characterId ?? EMPTY_VALUES.characterId,
    scenarioId: initialValues?.scenarioId ?? EMPTY_VALUES.scenarioId,
    posePromptId: initialValues?.posePromptId ?? EMPTY_VALUES.posePromptId,
    quality: initialValues?.quality ?? EMPTY_VALUES.quality,
    resolution: initialValues?.resolution ?? EMPTY_VALUES.resolution,
    aspectRatio: initialValues?.aspectRatio ?? EMPTY_VALUES.aspectRatio,
    duration: initialValues?.duration ?? EMPTY_VALUES.duration,
    prompt: initialValues?.prompt ?? EMPTY_VALUES.prompt,
  };
}

export function VideoCreateDrawer({
  initialValues,
  onClose,
  onSuccess,
}: VideoCreateDrawerProps) {
  const [values, setValues] = useState<CreateVideoValues>(() =>
    buildInitialValues(initialValues),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [startFrame, setStartFrame] = useState<IFile | null>(
    () => initialValues?.startFrame ?? null,
  );
  const [characterSearch, setCharacterSearch] = useState('');
  const [posePromptSearch, setPosePromptSearch] = useState('');

  const createMutation = useCreateVideoGeneration();
  const debouncedCharacterSearch = useDebouncedValue(characterSearch, 300);
  const debouncedPosePromptSearch = useDebouncedValue(posePromptSearch, 300);

  const { data: characterData, isLoading: isCharactersLoading } = useCharacters({
    search: debouncedCharacterSearch.trim() || undefined,
    order: 'ASC',
    skip: 0,
    take: 20,
  });
  const { data: posePromptData, isLoading: isPosePromptsLoading } =
    usePosePrompts({
      search: debouncedPosePromptSearch.trim() || undefined,
      skip: 0,
      take: 20,
    });
  const { data: selectedCharacterDetails, isLoading: isScenariosLoading } =
    useCharacterDetails(values.characterId || null);

  const initialCharacterOption = initialValues?.characterOption;
  const initialScenarioOption = initialValues?.scenarioOption;
  const initialPosePromptOption = initialValues?.posePromptOption;
  const parsedDuration = parsePositiveInteger(values.duration);
  const selectedPosePromptId =
    values.scenarioId && values.posePromptId ? values.posePromptId : '';
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
        parsedDuration !== null && parsedDuration >= MIN_DURATION
          ? undefined
          : `Enter a value of ${MIN_DURATION} or more.`,
      prompt:
        !requiresPrompt || values.prompt.trim() ? undefined : 'Enter a prompt.',
      startFrame: startFrame?.id ? undefined : 'Upload a start frame.',
    };
  }, [
    parsedDuration,
    showErrors,
    startFrame?.id,
    values.aspectRatio,
    values.name,
    values.prompt,
    values.quality,
    values.resolution,
    requiresPrompt,
  ]);

  const isValid = useMemo(
    () =>
      Boolean(
        values.name.trim() &&
          (!requiresPrompt || values.prompt.trim()) &&
          startFrame?.id &&
          isVideoQuality(values.quality) &&
          isVideoResolution(values.resolution) &&
          isVideoAspectRatio(values.aspectRatio) &&
          parsedDuration !== null &&
          parsedDuration >= MIN_DURATION,
      ),
    [
      parsedDuration,
      startFrame?.id,
      values.aspectRatio,
      values.name,
      values.prompt,
      values.quality,
      values.resolution,
      requiresPrompt,
    ],
  );

  const characterOptions = useMemo(
    () =>
      mergeSelectedOption(
        (characterData?.data ?? []).map((character) => ({
          id: character.id,
          label: formatCharacterSelectLabel(character.name, character.type),
          meta: character.id,
        })),
        initialCharacterOption,
      ),
    [characterData?.data, initialCharacterOption],
  );
  const scenarioOptions = useMemo(() => {
    const options = [
      { label: 'No scenario', value: '' },
      ...(selectedCharacterDetails?.scenarios ?? []).map((scenario) => ({
        label: scenario.name,
        value: scenario.id,
      })),
    ];

    if (
      initialScenarioOption &&
      !options.some(
        (option) => option.value === initialScenarioOption.value,
      )
    ) {
      options.push(initialScenarioOption);
    }

    return options;
  }, [initialScenarioOption, selectedCharacterDetails?.scenarios]);
  const posePromptOptions = useMemo(
    () =>
      mergeSelectedOption(
        [
          { id: '', label: 'No pose prompt' },
          ...(posePromptData?.data ?? []).map((posePrompt) => ({
            id: posePrompt.id,
            label: posePrompt.name,
            meta: posePrompt.id,
          })),
        ],
        initialPosePromptOption,
      ),
    [initialPosePromptOption, posePromptData?.data],
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

    const payload: IVideoGenerationCreateDto = {
      name: values.name.trim(),
      scenarioId: values.scenarioId || undefined,
      posePromptId: selectedPosePromptId || undefined,
      quality: values.quality,
      resolution: values.resolution,
      aspectRatio: values.aspectRatio,
      duration: parsedDuration!,
      startFrameId: startFrame!.id,
    };

    if (!selectedPosePromptId) {
      payload.prompt = values.prompt.trim();
    }

    const result = await createMutation.mutateAsync(payload);

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
            label="Character"
            labelFor="video-create-character"
          >
            <SearchSelect
              id="video-create-character"
              value={values.characterId}
              valueLabel={initialCharacterOption?.label}
              options={characterOptions}
              search={characterSearch}
              onSearchChange={setCharacterSearch}
              onSelect={(value) =>
                setValues((prev) => ({
                  ...prev,
                  characterId: value,
                  scenarioId: '',
                  posePromptId: '',
                }))
              }
              placeholder={
                isCharactersLoading ? 'Loading characters...' : 'Select character'
              }
              loading={isCharactersLoading}
              disabled={createMutation.isPending}
            />
          </Field>
          <Field
            label="Scenario"
            labelFor="video-create-scenario"
          >
            <Select
              id="video-create-scenario"
              size="sm"
              options={scenarioOptions}
              value={values.scenarioId}
              onChange={(value) =>
                setValues((prev) => ({
                  ...prev,
                  scenarioId: value,
                  posePromptId: value ? prev.posePromptId : '',
                }))
              }
              placeholder={
                values.characterId
                  ? isScenariosLoading
                    ? 'Loading scenarios...'
                    : 'Select scenario'
                  : 'Select character first'
              }
              fullWidth
              disabled={
                !values.characterId ||
                isScenariosLoading ||
                createMutation.isPending
              }
            />
          </Field>
        </FormRow>

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

        <Field label="Pose prompt" labelFor="video-create-pose-prompt">
          <SearchSelect
            id="video-create-pose-prompt"
            value={values.scenarioId ? values.posePromptId : ''}
            valueLabel={initialPosePromptOption?.label}
            options={posePromptOptions}
            search={posePromptSearch}
            onSearchChange={setPosePromptSearch}
            onSelect={(value) =>
              setValues((prev) => ({ ...prev, posePromptId: value }))
            }
            placeholder={
              values.scenarioId
                ? isPosePromptsLoading
                  ? 'Loading pose prompts...'
                  : 'Select pose prompt'
                : 'Select scenario first'
            }
            loading={isPosePromptsLoading}
            loadingLabel="Loading pose prompts..."
            emptyLabel="No pose prompts found."
            disabled={!values.scenarioId || createMutation.isPending}
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
