import type { ReactNode } from 'react';

import {
  Checkbox,
  Field,
  FormRow,
  Input,
  Select,
  Stack,
  Switch,
  Textarea,
} from '@/atoms';
import {
  type CreatePosePromptDto,
  PhotoAngle,
  Pose,
  RoleplayStage,
  STAGES_IN_ORDER,
} from '@/common/types';
import { photoAngleOptions, poseOptions } from '@/common/utils';

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

export type PosePromptFormValues = {
  idx: string;
  note: string;
  isAnal: boolean;
  isActive: boolean;
  strength: string;
  stages: RoleplayStage[];
  pose: Pose | '';
  angle: PhotoAngle | '';
  prompt: string;
  videoPrompt: string;
};

export type PosePromptFormErrors = Partial<
  Record<keyof PosePromptFormValues, string>
>;

export function getEmptyPosePromptFormValues(): PosePromptFormValues {
  return {
    idx: '',
    note: '',
    isAnal: false,
    isActive: true,
    strength: '',
    stages: [],
    pose: '',
    angle: '',
    prompt: '',
    videoPrompt: '',
  };
}

export function parseIdx(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

export function parseStrength(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0.1 || parsed > 1) return null;
  return parsed;
}

export function getPosePromptFormErrors(
  values: PosePromptFormValues,
): PosePromptFormErrors {
  const errors: PosePromptFormErrors = {};

  if (parseIdx(values.idx) === null) {
    errors.idx = 'Enter a non-negative integer.';
  }
  if (values.stages.length === 0) {
    errors.stages = 'Select at least one stage.';
  }
  if (values.isAnal && !values.stages.includes(RoleplayStage.Sex)) {
    errors.isAnal = 'Anal poses must include the Sex stage.';
  }
  if (values.strength.trim() && parseStrength(values.strength) === null) {
    errors.strength = 'Enter a value from 0.1 to 1, or leave empty.';
  }
  if (!values.pose) {
    errors.pose = 'Select a pose.';
  }
  if (!values.angle) {
    errors.angle = 'Select an angle.';
  }
  if (!values.prompt.trim()) {
    errors.prompt = 'Enter prompt text.';
  }

  return errors;
}

export function toPosePromptPayload(
  values: PosePromptFormValues,
): CreatePosePromptDto {
  return {
    idx: parseIdx(values.idx) as CreatePosePromptDto['idx'],
    note: values.note.trim() || undefined,
    isAnal: values.isAnal,
    isActive: values.isActive,
    strength: parseStrength(values.strength),
    stages: values.stages,
    pose: values.pose as CreatePosePromptDto['pose'],
    angle: values.angle as CreatePosePromptDto['angle'],
    prompt: values.prompt.trim(),
    videoPrompt: values.videoPrompt.trim() || undefined,
  };
}

type PosePromptFormProps = {
  values: PosePromptFormValues;
  errors: PosePromptFormErrors;
  disabled?: boolean;
  beforePrompt?: ReactNode;
  onChange: (
    field: keyof PosePromptFormValues | RoleplayStage,
    value: string | boolean,
  ) => void;
};

export function PosePromptForm({
  values,
  errors,
  disabled = false,
  beforePrompt,
  onChange,
}: PosePromptFormProps) {
  return (
    <>
      <FormRow columns={2}>
        <Field label="Index" labelFor="pose-idx" error={errors.idx}>
          <Input
            id="pose-idx"
            size="sm"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={values.idx}
            onChange={(event) => onChange('idx', event.target.value)}
            placeholder="0"
            disabled={disabled}
            fullWidth
          />
        </Field>

        <Field label="Pose" labelFor="pose-meta-pose" error={errors.pose}>
          <Select
            id="pose-meta-pose"
            size="sm"
            value={values.pose}
            options={poseOptions}
            onChange={(value) =>
              onChange('pose', value as PosePromptFormValues['pose'])
            }
            placeholder="Select pose"
            disabled={disabled}
            fullWidth
          />
        </Field>
      </FormRow>

      <FormRow columns={2}>
        <Field label="Angle" labelFor="pose-meta-angle" error={errors.angle}>
          <Select
            id="pose-meta-angle"
            size="sm"
            value={values.angle}
            options={photoAngleOptions}
            onChange={(value) =>
              onChange('angle', value as PosePromptFormValues['angle'])
            }
            placeholder="Select angle"
            disabled={disabled}
            fullWidth
          />
        </Field>

        <Field label="Anal" error={errors.isAnal}>
          <Stack gap="12px">
            <Checkbox
              id="pose-is-anal"
              checked={values.isAnal}
              onChange={(event) => onChange('isAnal', event.target.checked)}
              label="Anal"
              disabled={disabled}
            />
          </Stack>
        </Field>
      </FormRow>

      <FormRow columns={2}>
        <Field label="Status" labelFor="pose-is-active">
          <Switch
            id="pose-is-active"
            checked={values.isActive}
            onChange={(event) => onChange('isActive', event.target.checked)}
            label={values.isActive ? 'Active' : 'Inactive'}
            disabled={disabled}
          />
        </Field>

        <Field
          label="Strength"
          labelFor="pose-strength"
          hint="Optional. From 0.1 to 1. Leave empty for default."
          error={errors.strength}
        >
          <Input
            id="pose-strength"
            size="sm"
            type="number"
            min={0.1}
            max={1}
            step={0.1}
            inputMode="decimal"
            value={values.strength}
            onChange={(event) => onChange('strength', event.target.value)}
            placeholder="Default"
            disabled={disabled}
            fullWidth
          />
        </Field>
      </FormRow>

      <Field label="Stages" error={errors.stages}>
        <FormRow columns={2}>
          {STAGES_IN_ORDER.map((stage) => (
            <Checkbox
              key={stage}
              checked={values.stages.includes(stage)}
              onChange={(event) => onChange(stage, event.target.checked)}
              label={STAGE_LABELS[stage]}
              disabled={disabled}
            />
          ))}
        </FormRow>
      </Field>

      {beforePrompt}

      <Field label="Note" labelFor="pose-note" error={errors.note}>
        <Textarea
          id="pose-note"
          size="sm"
          value={values.note}
          onChange={(event) => onChange('note', event.target.value)}
          rows={3}
          disabled={disabled}
          placeholder="Optional"
          fullWidth
        />
      </Field>

      <Field label="Prompt" labelFor="pose-prompt" error={errors.prompt}>
        <Textarea
          id="pose-prompt"
          size="sm"
          value={values.prompt}
          onChange={(event) => onChange('prompt', event.target.value)}
          rows={10}
          disabled={disabled}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          fullWidth
        />
      </Field>

      <Field label="Video prompt" labelFor="pose-video-prompt">
        <Textarea
          id="pose-video-prompt"
          size="sm"
          value={values.videoPrompt}
          onChange={(event) => onChange('videoPrompt', event.target.value)}
          rows={10}
          disabled={disabled}
          placeholder="Optional"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          fullWidth
        />
      </Field>
    </>
  );
}
