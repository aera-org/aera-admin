import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { useVideoPrompts } from '@/app/video-prompts';
import { Field, RadioGroup, Select, Stack, Textarea, Typography } from '@/atoms';
import { isX } from '@/common/is-x';
import type { VideoModel } from '@/common/types';
import { SearchSelect } from '@/pages/generations/components/SearchSelect';

import {
  isMh3,
  MODEL_OPTIONS,
  REFERENCE_VAR_VALUE,
  showsVars,
  type VarMode,
  type VarValue,
  type VideoModelErrors,
  type VideoModelValues,
  type VideoPromptOption,
  type VideoVarKey,
} from './videoModel.utils';

const SEARCH_DEBOUNCE_MS = 300;

const VAR_MODE_OPTIONS: { label: string; value: VarMode }[] = [
  { label: 'From pose', value: 'pose' },
  { label: 'From reference', value: 'reference' },
  { label: 'Custom', value: 'custom' },
];

const VAR_LABELS: Record<VideoVarKey, string> = {
  environment: 'Environment',
  clothes: 'Clothes',
};

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

type VarFieldProps = {
  id: string;
  label: string;
  value: VarValue;
  error?: string;
  disabled?: boolean;
  onChange: (next: VarValue) => void;
};

function VarField({ id, label, value, error, disabled, onChange }: VarFieldProps) {
  return (
    <Field label={label} labelFor={`${id}-custom`} error={error}>
      <Stack gap="8px">
        <RadioGroup
          name={id}
          value={value.mode}
          options={VAR_MODE_OPTIONS}
          onChange={(mode) => onChange({ ...value, mode: mode as VarMode })}
          disabled={disabled}
        />
        {value.mode === 'custom' ? (
          <Textarea
            id={`${id}-custom`}
            size="sm"
            rows={3}
            value={value.custom}
            onChange={(event) =>
              onChange({ ...value, custom: event.target.value })
            }
            placeholder={`Describe ${label.toLowerCase()}`}
            disabled={disabled}
            invalid={Boolean(error)}
            fullWidth
          />
        ) : null}
        {value.mode === 'reference' ? (
          <Typography variant="caption" tone="muted">
            Sends “{REFERENCE_VAR_VALUE}”.
          </Typography>
        ) : null}
      </Stack>
    </Field>
  );
}

type VideoModelFieldsProps = {
  idPrefix: string;
  values: VideoModelValues;
  errors?: VideoModelErrors;
  disabled?: boolean;
  initialVideoPromptOption?: VideoPromptOption;
  onChange: (next: VideoModelValues) => void;
  /** Pose prompt field, rendered when the model is not MH3. */
  children?: ReactNode;
};

export function VideoModelFields({
  idPrefix,
  values,
  errors = {},
  disabled = false,
  initialVideoPromptOption,
  onChange,
  children,
}: VideoModelFieldsProps) {
  const mh3 = isMh3(values);
  const [videoPromptSearch, setVideoPromptSearch] = useState('');
  const debouncedSearch = useDebouncedValue(
    videoPromptSearch,
    SEARCH_DEBOUNCE_MS,
  );

  const { data: videoPromptData, isLoading: isVideoPromptsLoading } =
    useVideoPrompts(
      {
        search: debouncedSearch.trim() || undefined,
        skip: 0,
        take: 100,
      },
      mh3,
    );

  const videoPromptOptions = useMemo(() => {
    const options: VideoPromptOption[] = (videoPromptData?.data ?? []).map(
      (videoPrompt) => ({
        id: videoPrompt.id,
        label: videoPrompt.name,
        meta: videoPrompt.id,
      }),
    );
    if (
      initialVideoPromptOption &&
      !options.some((option) => option.id === initialVideoPromptOption.id)
    ) {
      options.unshift(initialVideoPromptOption);
    }
    return [{ id: '', label: 'No video prompt' }, ...options];
  }, [initialVideoPromptOption, videoPromptData?.data]);

  return (
    <>
      {isX ? (
        <Field label="Model" labelFor={`${idPrefix}-model`}>
          <Select
            id={`${idPrefix}-model`}
            size="sm"
            options={MODEL_OPTIONS}
            value={values.model}
            onChange={(value) =>
              onChange({ ...values, model: value as VideoModel })
            }
            disabled={disabled}
            fullWidth
          />
        </Field>
      ) : null}

      {mh3 ? (
        <Field label="Video prompt" labelFor={`${idPrefix}-video-prompt`}>
          <SearchSelect
            id={`${idPrefix}-video-prompt`}
            value={values.videoPromptId}
            valueLabel={initialVideoPromptOption?.label}
            options={videoPromptOptions}
            search={videoPromptSearch}
            onSearchChange={setVideoPromptSearch}
            onSelect={(value) => onChange({ ...values, videoPromptId: value })}
            placeholder={
              isVideoPromptsLoading
                ? 'Loading video prompts...'
                : 'Select video prompt'
            }
            loading={isVideoPromptsLoading}
            loadingLabel="Loading video prompts..."
            emptyLabel="No video prompts found."
            disabled={disabled}
          />
        </Field>
      ) : (
        children
      )}

      {showsVars(values) ? (
        <>
          <VarField
            id={`${idPrefix}-environment`}
            label={VAR_LABELS.environment}
            value={values.environment}
            error={errors.environment}
            disabled={disabled}
            onChange={(next) => onChange({ ...values, environment: next })}
          />
          <VarField
            id={`${idPrefix}-clothes`}
            label={VAR_LABELS.clothes}
            value={values.clothes}
            error={errors.clothes}
            disabled={disabled}
            onChange={(next) => onChange({ ...values, clothes: next })}
          />
        </>
      ) : null}
    </>
  );
}
