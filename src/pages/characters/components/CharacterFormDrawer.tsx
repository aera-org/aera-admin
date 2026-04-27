import { useEffect, useMemo, useState } from 'react';

import { useLoras } from '@/app/loras';
import { notifyError } from '@/app/toast';
import {
  Button,
  Checkbox,
  Divider,
  Field,
  FormRow,
  Input,
  Select,
  Stack,
  Switch,
  Textarea,
  Typography,
} from '@/atoms';
import {
  CharacterBodyType,
  CharacterBreastSize,
  CharacterEthnicity,
  CharacterEyeColor,
  CharacterHairColor,
  CharacterHairStyle,
  CharacterPersonality,
  CharacterType,
  FileDir,
  type IFile,
} from '@/common/types';
import { characterTypeOptions } from '@/common/utils';
import { Drawer, FileUpload } from '@/components/molecules';

import {
  BODY_TYPE_OPTIONS,
  BREAST_SIZE_OPTIONS,
  ETHNICITY_OPTIONS,
  EYE_COLOR_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  PERSONALITY_OPTIONS,
} from '../characterAttributeOptions';
import s from './CharacterFormDrawer.module.scss';
import { LoraSelect } from './LoraSelect';

export type CharacterFormValues = {
  name: string;
  emoji: string;
  type: CharacterType;
  gender: string;
  age: string;
  hairColor: CharacterHairColor;
  hairStyle: CharacterHairStyle;
  eyeColor: CharacterEyeColor;
  ethnicity: CharacterEthnicity;
  bodyType: CharacterBodyType;
  breastSize: CharacterBreastSize;
  isActive: boolean;
  isFeatured: boolean;
  loraId: string;
  description: string;
  personality: CharacterPersonality[];
  avatarId: string;
  promoImgId: string;
};

export type CharacterLoraOption = {
  id: string;
  fileName: string;
};

export const DEFAULT_CHARACTER_FORM_VALUES: CharacterFormValues = {
  name: '',
  emoji: '',
  type: CharacterType.Realistic,
  gender: 'female',
  age: '',
  hairColor: CharacterHairColor.Blond,
  hairStyle: CharacterHairStyle.Straight,
  eyeColor: CharacterEyeColor.Brown,
  ethnicity: CharacterEthnicity.Caucasian,
  bodyType: CharacterBodyType.Average,
  breastSize: CharacterBreastSize.Medium,
  isActive: true,
  isFeatured: false,
  loraId: '',
  description: '',
  personality: [],
  avatarId: '',
  promoImgId: '',
};

type CharacterFormDrawerProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  initialValues: CharacterFormValues;
  initialAvatarFile?: IFile | null;
  initialPromoFile?: IFile | null;
  initialLoraOption?: CharacterLoraOption | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CharacterFormValues) => Promise<void>;
  isSubmitting?: boolean;
  requireDirty?: boolean;
  showStatus?: boolean;
  showType?: boolean;
  showPersonality?: boolean;
};

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function normalizePersonality(values: CharacterPersonality[]) {
  return PERSONALITY_OPTIONS.map((option) => option.value).filter((value) =>
    values.includes(value),
  );
}

export function CharacterFormDrawer({
  open,
  title,
  submitLabel,
  initialValues,
  initialAvatarFile = null,
  initialPromoFile = null,
  initialLoraOption = null,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  requireDirty = false,
  showStatus = false,
  showType = false,
  showPersonality = false,
}: CharacterFormDrawerProps) {
  const [values, setValues] = useState(initialValues);
  const [avatarFile, setAvatarFile] = useState<IFile | null>(initialAvatarFile);
  const [promoFile, setPromoFile] = useState<IFile | null>(initialPromoFile);
  const [showErrors, setShowErrors] = useState(false);
  const [loraSearch, setLoraSearch] = useState('');
  const debouncedLoraSearch = useDebouncedValue(loraSearch, 300);

  const loraQueryParams = useMemo(
    () => ({
      search: debouncedLoraSearch || undefined,
      order: 'DESC',
      skip: 0,
      take: 50,
    }),
    [debouncedLoraSearch],
  );
  const { data: loraData, isLoading: isLoraLoading } =
    useLoras(loraQueryParams);

  const loraOptions = useMemo(() => {
    const list = loraData?.data ?? [];
    if (
      initialLoraOption &&
      !list.some((lora) => lora.id === initialLoraOption.id)
    ) {
      return [initialLoraOption, ...list];
    }
    return list;
  }, [initialLoraOption, loraData?.data]);

  useEffect(() => {
    if (!open) return;

    setValues(initialValues);
    setAvatarFile(initialAvatarFile);
    setPromoFile(initialPromoFile);
    setShowErrors(false);
    setLoraSearch('');
  }, [initialAvatarFile, initialPromoFile, initialValues, open]);

  const validationErrors = useMemo(() => {
    if (!showErrors) return {};

    const errors: {
      name?: string;
      loraId?: string;
      hairColor?: string;
      ethnicity?: string;
      bodyType?: string;
      breastSize?: string;
    } = {};

    if (!values.name.trim()) {
      errors.name = 'Enter a name.';
    }
    if (!values.loraId) {
      errors.loraId = 'Select a LoRA.';
    }
    if (!values.hairColor) {
      errors.hairColor = 'Select a hair color.';
    }
    if (!values.ethnicity) {
      errors.ethnicity = 'Select an ethnicity.';
    }
    if (!values.bodyType) {
      errors.bodyType = 'Select a body type.';
    }
    if (!values.breastSize) {
      errors.breastSize = 'Select a breast size.';
    }

    return errors;
  }, [
    showErrors,
    values.bodyType,
    values.breastSize,
    values.ethnicity,
    values.hairColor,
    values.loraId,
    values.name,
  ]);

  const isValid = useMemo(
    () =>
      Boolean(
        values.name.trim() &&
          values.loraId &&
          values.hairColor &&
          values.ethnicity &&
          values.bodyType &&
          values.breastSize,
      ),
    [
      values.bodyType,
      values.breastSize,
      values.ethnicity,
      values.hairColor,
      values.loraId,
      values.name,
    ],
  );

  const isDirty = useMemo(
    () =>
      values.name !== initialValues.name ||
      values.emoji !== initialValues.emoji ||
      values.type !== initialValues.type ||
      values.gender !== initialValues.gender ||
      values.age !== initialValues.age ||
      values.hairColor !== initialValues.hairColor ||
      values.hairStyle !== initialValues.hairStyle ||
      values.eyeColor !== initialValues.eyeColor ||
      values.ethnicity !== initialValues.ethnicity ||
      values.bodyType !== initialValues.bodyType ||
      values.breastSize !== initialValues.breastSize ||
      values.isActive !== initialValues.isActive ||
      values.isFeatured !== initialValues.isFeatured ||
      values.loraId !== initialValues.loraId ||
      values.description !== initialValues.description ||
      normalizePersonality(values.personality).join('|') !==
        normalizePersonality(initialValues.personality).join('|') ||
      values.avatarId !== initialValues.avatarId ||
      values.promoImgId !== initialValues.promoImgId,
    [initialValues, values],
  );

  const closeDrawer = () => {
    if (isSubmitting) return;
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const errors = {
      name: values.name.trim() ? undefined : 'Enter a name.',
      loraId: values.loraId ? undefined : 'Select a LoRA.',
      hairColor: values.hairColor ? undefined : 'Select a hair color.',
      ethnicity: values.ethnicity ? undefined : 'Select an ethnicity.',
      bodyType: values.bodyType ? undefined : 'Select a body type.',
      breastSize: values.breastSize ? undefined : 'Select a breast size.',
    };

    if (
      errors.name ||
      errors.loraId ||
      errors.hairColor ||
      errors.ethnicity ||
      errors.bodyType ||
      errors.breastSize
    ) {
      setShowErrors(true);
      return;
    }

    if (requireDirty && !isDirty) {
      return;
    }

    await onSubmit({
      ...values,
      name: values.name.trim(),
      emoji: values.emoji.trim(),
      gender: values.gender.trim(),
      description: values.description.trim(),
      personality: normalizePersonality(values.personality),
      promoImgId: values.promoImgId || '',
    });
  };

  const visibilityField = showStatus ? (
    <Field label="Status" labelFor="character-form-status">
      <Switch
        id="character-form-status"
        checked={values.isActive}
        onChange={(event) =>
          setValues((prev) => ({
            ...prev,
            isActive: event.target.checked,
          }))
        }
        label={values.isActive ? 'Active' : 'Inactive'}
      />
    </Field>
  ) : (
    <Field label="Featured" labelFor="character-form-featured">
      <Switch
        id="character-form-featured"
        checked={values.isFeatured}
        onChange={(event) =>
          setValues((prev) => ({
            ...prev,
            isFeatured: event.target.checked,
          }))
        }
        label={values.isFeatured ? 'Featured' : 'Not featured'}
      />
    </Field>
  );

  return (
    <Drawer
      open={open}
      title={title}
      className={s.drawer}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeDrawer();
        }
      }}
    >
      <Stack gap="20px" className={s.form}>
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <Typography variant="control">Core</Typography>
            <Typography variant="meta" tone="muted">
              Name, identity, and visibility settings.
            </Typography>
          </div>

          <Stack gap="16px">
            <FormRow columns={2}>
              <Field
                label="Name"
                labelFor="character-form-name"
                error={validationErrors.name}
              >
                <Input
                  id="character-form-name"
                  size="sm"
                  value={values.name}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  fullWidth
                />
              </Field>
              <Field label="Emoji" labelFor="character-form-emoji">
                <Input
                  id="character-form-emoji"
                  size="sm"
                  value={values.emoji}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      emoji: event.target.value,
                    }))
                  }
                  fullWidth
                />
              </Field>
            </FormRow>

            <FormRow columns={2}>
              {showType ? (
                <Field label="Type" labelFor="character-form-type">
                  <Select
                    id="character-form-type"
                    size="sm"
                    options={characterTypeOptions}
                    value={values.type}
                    onChange={(value) =>
                      setValues((prev) => ({
                        ...prev,
                        type: value as CharacterType,
                      }))
                    }
                    fullWidth
                  />
                </Field>
              ) : null}
              <Field label="Gender" labelFor="character-form-gender">
                <Select
                  id="character-form-gender"
                  size="sm"
                  options={[
                    { label: 'Female', value: 'female' },
                    { label: 'Male', value: 'male' },
                  ]}
                  value={values.gender}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, gender: value }))
                  }
                  fullWidth
                />
              </Field>
              {showType ? null : (
                <Field label="Age" labelFor="character-form-age">
                  <Input
                    id="character-form-age"
                    size="sm"
                    type="number"
                    min={18}
                    value={values.age}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        age: event.target.value,
                      }))
                    }
                    placeholder="18"
                    fullWidth
                  />
                </Field>
              )}
            </FormRow>

            <FormRow columns={2}>
              {showType ? (
                <Field label="Age" labelFor="character-form-age">
                  <Input
                    id="character-form-age"
                    size="sm"
                    type="number"
                    min={18}
                    value={values.age}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        age: event.target.value,
                      }))
                    }
                    placeholder="18"
                    fullWidth
                  />
                </Field>
              ) : null}
              {visibilityField}
            </FormRow>

            {showStatus ? (
              <FormRow columns={2}>
                <Field label="Featured" labelFor="character-form-featured">
                  <Switch
                    id="character-form-featured"
                    checked={values.isFeatured}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        isFeatured: event.target.checked,
                      }))
                    }
                    label={values.isFeatured ? 'Featured' : 'Not featured'}
                  />
                </Field>
              </FormRow>
            ) : null}
          </Stack>
        </div>

        <Divider />

        <div className={s.section}>
          <div className={s.sectionHeader}>
            <Typography variant="control">Appearance</Typography>
            <Typography variant="meta" tone="muted">
              Default physical attributes for the character profile.
            </Typography>
          </div>

          <Stack gap="16px">
            <FormRow columns={2}>
              <Field
                label="Hair color"
                labelFor="character-form-hair-color"
                error={validationErrors.hairColor}
              >
                <Select
                  id="character-form-hair-color"
                  size="sm"
                  options={HAIR_COLOR_OPTIONS}
                  value={values.hairColor}
                  onChange={(value) =>
                    setValues((prev) => ({
                      ...prev,
                      hairColor: value as CharacterHairColor,
                    }))
                  }
                  placeholder="Select hair color"
                  fullWidth
                />
              </Field>
              <Field label="Hair style" labelFor="character-form-hair-style">
                <Select
                  id="character-form-hair-style"
                  size="sm"
                  options={HAIR_STYLE_OPTIONS}
                  value={values.hairStyle}
                  onChange={(value) =>
                    setValues((prev) => ({
                      ...prev,
                      hairStyle: value as CharacterHairStyle,
                    }))
                  }
                  placeholder="Select hair style"
                  fullWidth
                />
              </Field>
            </FormRow>

            <FormRow columns={2}>
              <Field label="Eye color" labelFor="character-form-eye-color">
                <Select
                  id="character-form-eye-color"
                  size="sm"
                  options={EYE_COLOR_OPTIONS}
                  value={values.eyeColor}
                  onChange={(value) =>
                    setValues((prev) => ({
                      ...prev,
                      eyeColor: value as CharacterEyeColor,
                    }))
                  }
                  placeholder="Select eye color"
                  fullWidth
                />
              </Field>
              <Field
                label="Ethnicity"
                labelFor="character-form-ethnicity"
                error={validationErrors.ethnicity}
              >
                <Select
                  id="character-form-ethnicity"
                  size="sm"
                  options={ETHNICITY_OPTIONS}
                  value={values.ethnicity}
                  onChange={(value) =>
                    setValues((prev) => ({
                      ...prev,
                      ethnicity: value as CharacterEthnicity,
                    }))
                  }
                  placeholder="Select ethnicity"
                  fullWidth
                />
              </Field>
            </FormRow>

            <FormRow columns={2}>
              <Field
                label="Body type"
                labelFor="character-form-body-type"
                error={validationErrors.bodyType}
              >
                <Select
                  id="character-form-body-type"
                  size="sm"
                  options={BODY_TYPE_OPTIONS}
                  value={values.bodyType}
                  onChange={(value) =>
                    setValues((prev) => ({
                      ...prev,
                      bodyType: value as CharacterBodyType,
                    }))
                  }
                  placeholder="Select body type"
                  fullWidth
                />
              </Field>
              <Field
                label="Breast size"
                labelFor="character-form-breast-size"
                error={validationErrors.breastSize}
              >
                <Select
                  id="character-form-breast-size"
                  size="sm"
                  options={BREAST_SIZE_OPTIONS}
                  value={values.breastSize}
                  onChange={(value) =>
                    setValues((prev) => ({
                      ...prev,
                      breastSize: value as CharacterBreastSize,
                    }))
                  }
                  placeholder="Select breast size"
                  fullWidth
                />
              </Field>
            </FormRow>

            {showPersonality ? (
              <Field
                label="Personality"
                hint="Select the traits that apply to this character."
              >
                <div className={s.checkboxGroup}>
                  {PERSONALITY_OPTIONS.map((option) => {
                    const checkboxId = `character-form-personality-${option.value}`;

                    return (
                      <Checkbox
                        key={option.value}
                        id={checkboxId}
                        checked={values.personality.includes(option.value)}
                        onChange={(event) =>
                          setValues((prev) => ({
                            ...prev,
                            personality: event.target.checked
                              ? normalizePersonality([
                                  ...prev.personality,
                                  option.value,
                                ])
                              : prev.personality.filter(
                                  (value) => value !== option.value,
                                ),
                          }))
                        }
                        label={option.label}
                      />
                    );
                  })}
                </div>
              </Field>
            ) : null}
          </Stack>
        </div>

        <Divider />

        <div className={s.section}>
          <div className={s.sectionHeader}>
            <Typography variant="control">Generation</Typography>
            <Typography variant="meta" tone="muted">
              LoRA assignment and descriptive context.
            </Typography>
          </div>

          <Stack gap="16px">
            <Field
              label="LoRA"
              labelFor="character-form-lora"
              error={validationErrors.loraId}
            >
              <LoraSelect
                id="character-form-lora"
                value={values.loraId}
                options={loraOptions.map((lora) => ({
                  id: lora.id,
                  fileName: lora.fileName,
                }))}
                search={loraSearch}
                onSearchChange={setLoraSearch}
                onSelect={(value) =>
                  setValues((prev) => ({ ...prev, loraId: value }))
                }
                placeholder={isLoraLoading ? 'Loading LoRAs...' : 'Select LoRA'}
                disabled={isLoraLoading}
                loading={isLoraLoading}
              />
            </Field>

            <Field label="Description" labelFor="character-form-description">
              <Textarea
                id="character-form-description"
                size="sm"
                value={values.description}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={5}
                fullWidth
              />
            </Field>
          </Stack>
        </div>

        <Divider />

        <div className={s.section}>
          <div className={s.sectionHeader}>
            <Typography variant="control">Assets</Typography>
            <Typography variant="meta" tone="muted">
              Upload the visual files used across the admin.
            </Typography>
          </div>

          <Stack gap="16px">
            <FileUpload
              label="Avatar"
              folder={FileDir.Public}
              value={avatarFile}
              onChange={(file) => {
                setAvatarFile(file);
                setValues((prev) => ({
                  ...prev,
                  avatarId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload avatar.')
              }
            />
            <FileUpload
              label="Promo image"
              folder={FileDir.Public}
              value={promoFile}
              onChange={(file) => {
                setPromoFile(file);
                setValues((prev) => ({
                  ...prev,
                  promoImgId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
          </Stack>
        </div>

        <Divider />

        <div className={s.actions}>
          <Button
            variant="secondary"
            onClick={closeDrawer}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={
              !isValid ||
              isSubmitting ||
              (requireDirty && !isDirty) ||
              Boolean(
                validationErrors.name ||
                  validationErrors.loraId ||
                  validationErrors.hairColor ||
                  validationErrors.ethnicity ||
                  validationErrors.bodyType ||
                  validationErrors.breastSize,
              )
            }
          >
            {submitLabel}
          </Button>
        </div>
      </Stack>
    </Drawer>
  );
}
