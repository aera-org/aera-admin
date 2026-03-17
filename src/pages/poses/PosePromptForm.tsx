import { Field, FormRow, Input, Textarea } from '@/atoms';

export type PosePromptFormValues = {
  name: string;
  pose: string;
  angle: string;
  details: string;
  prompt: string;
};

export type PosePromptFormErrors = Partial<
  Record<keyof PosePromptFormValues, string>
>;

type PosePromptFormProps = {
  values: PosePromptFormValues;
  errors: PosePromptFormErrors;
  disabled?: boolean;
  onChange: (field: keyof PosePromptFormValues, value: string) => void;
};

export function PosePromptForm({
  values,
  errors,
  disabled = false,
  onChange,
}: PosePromptFormProps) {
  return (
    <>
      <FormRow columns={3}>
        <Field label="Name" labelFor="pose-name" error={errors.name}>
          <Input
            id="pose-name"
            size="sm"
            value={values.name}
            onChange={(event) => onChange('name', event.target.value)}
            disabled={disabled}
            fullWidth
          />
        </Field>

        <Field label="Pose" labelFor="pose-meta-pose" error={errors.pose}>
          <Input
            id="pose-meta-pose"
            size="sm"
            value={values.pose}
            onChange={(event) => onChange('pose', event.target.value)}
            disabled={disabled}
            fullWidth
          />
        </Field>

        <Field label="Angle" labelFor="pose-meta-angle" error={errors.angle}>
          <Input
            id="pose-meta-angle"
            size="sm"
            value={values.angle}
            onChange={(event) => onChange('angle', event.target.value)}
            disabled={disabled}
            fullWidth
          />
        </Field>
      </FormRow>

      <Field
        label="Details"
        labelFor="pose-meta-details"
        error={errors.details}
      >
        <Textarea
          id="pose-meta-details"
          size="sm"
          value={values.details}
          onChange={(event) => onChange('details', event.target.value)}
          rows={2}
          disabled={disabled}
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
