import type { ReactNode } from 'react';

import {
  Checkbox,
  Field,
  FormRow,
  Input,
  Select,
  Stack,
  Textarea,
} from '@/atoms';
import {
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
  stages: RoleplayStage[];
  pose: Pose | '';
  angle: PhotoAngle | '';
  prompt: string;
};

export type PosePromptFormErrors = Partial<
  Record<keyof PosePromptFormValues, string>
>;

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
    </>
  );
}
