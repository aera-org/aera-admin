import { PlusIcon, TrashIcon } from '@/assets/icons';
import {
  Button,
  Checkbox,
  Field,
  FormRow,
  IconButton,
  Input,
  Select,
  Switch,
  Textarea,
} from '@/atoms';
import type { Pose } from '@/common/types';
import { poseOptions } from '@/common/utils';

import s from './VideoPromptForm.module.scss';
import type {
  VideoPromptFormChange,
  VideoPromptFormErrors,
  VideoPromptFormValues,
} from './videoPromptFormValues';

const poseSelectOptions = [{ label: 'No pose', value: '' }, ...poseOptions];

type VideoPromptFormProps = {
  values: VideoPromptFormValues;
  errors: VideoPromptFormErrors;
  disabled?: boolean;
  onChange: VideoPromptFormChange;
};

export function VideoPromptForm({
  values,
  errors,
  disabled = false,
  onChange,
}: VideoPromptFormProps) {
  const updateShot = (index: number, value: string) => {
    onChange(
      'shots',
      values.shots.map((shot, i) => (i === index ? value : shot)),
    );
  };

  const removeShot = (index: number) => {
    const next = values.shots.filter((_, i) => i !== index);
    onChange('shots', next.length > 0 ? next : ['']);
  };

  const addShot = () => {
    onChange('shots', [...values.shots, '']);
  };

  return (
    <>
      <FormRow columns={2}>
        <Field label="Name" labelFor="video-prompt-name" error={errors.name}>
          <Input
            id="video-prompt-name"
            size="sm"
            value={values.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="Kneeling tease v1"
            disabled={disabled}
            fullWidth
          />
        </Field>

        <Field
          label="Index"
          labelFor="video-prompt-idx"
          hint="Optional."
          error={errors.idx}
        >
          <Input
            id="video-prompt-idx"
            size="sm"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={values.idx}
            onChange={(event) => onChange('idx', event.target.value)}
            placeholder="-"
            disabled={disabled}
            fullWidth
          />
        </Field>
      </FormRow>

      <FormRow columns={2}>
        <Field label="Pose" labelFor="video-prompt-pose" hint="Optional.">
          <Select
            id="video-prompt-pose"
            size="sm"
            value={values.pose}
            options={poseSelectOptions}
            onChange={(value) => onChange('pose', value as Pose | '')}
            disabled={disabled}
            fullWidth
          />
        </Field>

        <Field
          label="Strength"
          labelFor="video-prompt-strength"
          hint="Optional. LoRA strength from 0 to 1. Leave empty for default."
          error={errors.strength}
        >
          <Input
            id="video-prompt-strength"
            size="sm"
            type="number"
            min={0}
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

      <FormRow columns={2}>
        <Field label="Status" labelFor="video-prompt-is-active">
          <Switch
            id="video-prompt-is-active"
            checked={values.isActive}
            onChange={(event) => onChange('isActive', event.target.checked)}
            label={values.isActive ? 'Active' : 'Inactive'}
            disabled={disabled}
          />
        </Field>

        <Field label="Flags">
          <div className={s.flags}>
            <Checkbox
              id="video-prompt-with-man"
              checked={values.withMan}
              onChange={(event) => onChange('withMan', event.target.checked)}
              label="With man"
              disabled={disabled}
            />
            <Checkbox
              id="video-prompt-first-frame"
              checked={values.isFirstFrame}
              onChange={(event) =>
                onChange('isFirstFrame', event.target.checked)
              }
              label="First frame"
              disabled={disabled}
            />
            <Checkbox
              id="video-prompt-is-anal"
              checked={values.isAnal}
              onChange={(event) => onChange('isAnal', event.target.checked)}
              label="Anal"
              disabled={disabled}
            />
          </div>
        </Field>
      </FormRow>

      <Field label="Shots" error={errors.shots}>
        <div className={s.shots}>
          {values.shots.map((shot, index) => (
            <div key={index} className={s.shot}>
              <div className={s.shotInput}>
                <Textarea
                  id={`video-prompt-shot-${index}`}
                  aria-label={`Shot ${index + 1}`}
                  size="sm"
                  value={shot}
                  onChange={(event) => updateShot(index, event.target.value)}
                  rows={2}
                  placeholder={`Shot ${index + 1}`}
                  disabled={disabled}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  fullWidth
                />
              </div>
              <IconButton
                aria-label={`Remove shot ${index + 1}`}
                tooltip="Remove shot"
                icon={<TrashIcon />}
                variant="ghost"
                tone="danger"
                onClick={() => removeShot(index)}
                disabled={disabled || values.shots.length === 1}
              />
            </div>
          ))}
          <div className={s.shotsFooter}>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<PlusIcon />}
              onClick={addShot}
              disabled={disabled}
            >
              Add shot
            </Button>
          </div>
        </div>
      </Field>

      <Field label="Sound" labelFor="video-prompt-sound" error={errors.sound}>
        <Textarea
          id="video-prompt-sound"
          size="sm"
          value={values.sound}
          onChange={(event) => onChange('sound', event.target.value)}
          rows={3}
          disabled={disabled}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          fullWidth
        />
      </Field>

      <FormRow columns={2}>
        <Field
          label="Default environment"
          labelFor="video-prompt-environment"
          hint="Optional."
        >
          <Input
            id="video-prompt-environment"
            size="sm"
            value={values.environment}
            onChange={(event) => onChange('environment', event.target.value)}
            placeholder="cozy bedroom"
            disabled={disabled}
            fullWidth
          />
        </Field>

        <Field
          label="Default clothes"
          labelFor="video-prompt-clothes"
          hint="Optional."
        >
          <Input
            id="video-prompt-clothes"
            size="sm"
            value={values.clothes}
            onChange={(event) => onChange('clothes', event.target.value)}
            placeholder="black lingerie"
            disabled={disabled}
            fullWidth
          />
        </Field>
      </FormRow>
    </>
  );
}
