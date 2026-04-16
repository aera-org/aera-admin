import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCreateCustomCharacter } from '@/app/characters';
import { useUsers } from '@/app/users';
import { PlusIcon } from '@/assets/icons';
import {
  Button,
  Container,
  Divider,
  Field,
  FormRow,
  Input,
  Select,
  Stack,
  Typography,
} from '@/atoms';
import {
  CharacterBodyType,
  CharacterBreastSize,
  CharacterEthnicity,
  CharacterEyeColor,
  CharacterHairColor,
  CharacterHairStyle,
  CharacterType,
  type CustomCharacterCreateDto,
  type ITgUser,
} from '@/common/types';
import { AppShell } from '@/components/templates';
import { SearchSelect } from '@/molecules';

import {
  BODY_TYPE_OPTIONS,
  BREAST_SIZE_OPTIONS,
  ETHNICITY_OPTIONS,
  EYE_COLOR_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
} from '../characters/characterAttributeOptions';
import s from './CustomCharacterCreatePage.module.scss';

type FormValues = {
  name: string;
  age: string;
  hairColor: CharacterHairColor;
  ethnicity: CharacterEthnicity;
  bodyType: CharacterBodyType;
  hairStyle: CharacterHairStyle;
  eyeColor: CharacterEyeColor;
  breastSize: CharacterBreastSize;
  type: CharacterType;
  userId: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const AGE_MIN = 18;
const AGE_MAX = 55;
const SEARCH_DEBOUNCE_MS = 400;

const TYPE_OPTIONS = [
  { label: 'Realistic', value: CharacterType.Realistic },
  { label: 'Anime', value: CharacterType.Anime },
];

const DEFAULT_VALUES: FormValues = {
  name: '',
  age: '',
  hairColor: CharacterHairColor.Blond,
  ethnicity: CharacterEthnicity.Caucasian,
  bodyType: CharacterBodyType.Average,
  hairStyle: CharacterHairStyle.Straight,
  eyeColor: CharacterEyeColor.Brown,
  breastSize: CharacterBreastSize.Medium,
  type: CharacterType.Realistic,
  userId: '',
};

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function parseAge(value: string) {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed)) return null;
  if (parsed < AGE_MIN || parsed > AGE_MAX) return null;
  return parsed;
}

function getErrors(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.userId.trim()) {
    errors.userId = 'Select a user.';
  }
  if (!values.name.trim()) {
    errors.name = 'Enter a name.';
  }
  if (parseAge(values.age) === null) {
    errors.age = `Enter an age from ${AGE_MIN} to ${AGE_MAX}.`;
  }
  if (!values.hairColor) {
    errors.hairColor = 'Select a hair color.';
  }
  if (!values.hairStyle) {
    errors.hairStyle = 'Select a hair style.';
  }
  if (!values.eyeColor) {
    errors.eyeColor = 'Select an eye color.';
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
  if (!values.type) {
    errors.type = 'Select a type.';
  }

  return errors;
}

function formatUserName(user: ITgUser) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  const username = user.username?.trim();
  if (username) return `@${username}`;
  return 'Unknown user';
}

function formatUserMeta(user: ITgUser) {
  const username = user.username?.trim();
  if (username) {
    return `@${username} / ${user.id}`;
  }
  return user.id;
}

export function CustomCharacterCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateCustomCharacter();
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);
  const [showErrors, setShowErrors] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebouncedValue(
    userSearch,
    SEARCH_DEBOUNCE_MS,
  );

  const userQueryParams = useMemo(
    () => ({
      search: debouncedUserSearch.trim() || undefined,
      order: 'DESC',
      skip: 0,
      take: 20,
    }),
    [debouncedUserSearch],
  );
  const { data: usersData, isLoading: isUsersLoading } =
    useUsers(userQueryParams);

  const userOptions = useMemo(
    () =>
      (usersData?.data ?? []).map((user) => ({
        id: user.id,
        label: formatUserName(user),
        meta: formatUserMeta(user),
      })),
    [usersData?.data],
  );

  const selectedUserLabel = useMemo(() => {
    const selected = userOptions.find((option) => option.id === values.userId);
    return selected?.label ?? '';
  }, [userOptions, values.userId]);

  const errors = useMemo(
    () => (showErrors ? getErrors(values) : {}),
    [showErrors, values],
  );
  const isValid = useMemo(
    () => Object.keys(getErrors(values)).length === 0,
    [values],
  );

  const handleCreate = async () => {
    const nextErrors = getErrors(values);
    if (Object.keys(nextErrors).length > 0) {
      setShowErrors(true);
      return;
    }

    const payload: CustomCharacterCreateDto = {
      name: values.name.trim(),
      age: parseAge(values.age) as number,
      hairColor: values.hairColor,
      ethnicity: values.ethnicity,
      bodyType: values.bodyType,
      hairStyle: values.hairStyle,
      eyeColor: values.eyeColor,
      breastSize: values.breastSize,
      type: values.type,
      userId: values.userId.trim(),
    };

    await createMutation.mutateAsync(payload);
    navigate(`/custom-characters?userId=${encodeURIComponent(payload.userId)}`);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Create custom character</Typography>
          </div>
          <Button variant="ghost" onClick={() => navigate('/custom-characters')}>
            Back to custom characters
          </Button>
        </div>

        <Stack gap="20px" className={s.form}>
          <div className={s.section}>
            <div className={s.sectionHeader}>
              <Typography variant="control">Owner</Typography>
              <Typography variant="meta" tone="muted">
                Custom characters are always attached to one user.
              </Typography>
            </div>

            <Field
              label="User"
              labelFor="custom-character-create-user"
              error={errors.userId}
            >
              <SearchSelect
                id="custom-character-create-user"
                value={values.userId}
                valueLabel={selectedUserLabel}
                options={userOptions}
                search={userSearch}
                onSearchChange={setUserSearch}
                onSelect={(value) =>
                  setValues((prev) => ({ ...prev, userId: value }))
                }
                placeholder={isUsersLoading ? 'Loading users...' : 'Select user'}
                loading={isUsersLoading}
                disabled={isUsersLoading}
                invalid={Boolean(errors.userId)}
                emptyLabel="No users found."
              />
            </Field>
          </div>

          <Divider />

          <div className={s.section}>
            <div className={s.sectionHeader}>
              <Typography variant="control">Profile</Typography>
              <Typography variant="meta" tone="muted">
                Basic identity fields for the generated custom character.
              </Typography>
            </div>

            <FormRow columns={3}>
              <Field
                label="Name"
                labelFor="custom-character-create-name"
                error={errors.name}
              >
                <Input
                  id="custom-character-create-name"
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

              <Field
                label="Age"
                labelFor="custom-character-create-age"
                error={errors.age}
              >
                <Input
                  id="custom-character-create-age"
                  size="sm"
                  type="number"
                  min={AGE_MIN}
                  max={AGE_MAX}
                  value={values.age}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      age: event.target.value,
                    }))
                  }
                  fullWidth
                />
              </Field>

              <Field label="Type" labelFor="custom-character-create-type">
                <Select
                  id="custom-character-create-type"
                  size="sm"
                  options={TYPE_OPTIONS}
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
            </FormRow>
          </div>

          <Divider />

          <div className={s.section}>
            <div className={s.sectionHeader}>
              <Typography variant="control">Appearance</Typography>
              <Typography variant="meta" tone="muted">
                Physical attributes passed to the custom character generator.
              </Typography>
            </div>

            <Stack gap="16px">
              <FormRow columns={3}>
                <Field
                  label="Hair color"
                  labelFor="custom-character-create-hair-color"
                  error={errors.hairColor}
                >
                  <Select
                    id="custom-character-create-hair-color"
                    size="sm"
                    options={HAIR_COLOR_OPTIONS}
                    value={values.hairColor}
                    onChange={(value) =>
                      setValues((prev) => ({
                        ...prev,
                        hairColor: value as CharacterHairColor,
                      }))
                    }
                    fullWidth
                  />
                </Field>

                <Field
                  label="Hair style"
                  labelFor="custom-character-create-hair-style"
                  error={errors.hairStyle}
                >
                  <Select
                    id="custom-character-create-hair-style"
                    size="sm"
                    options={HAIR_STYLE_OPTIONS}
                    value={values.hairStyle}
                    onChange={(value) =>
                      setValues((prev) => ({
                        ...prev,
                        hairStyle: value as CharacterHairStyle,
                      }))
                    }
                    fullWidth
                  />
                </Field>

                <Field
                  label="Eye color"
                  labelFor="custom-character-create-eye-color"
                  error={errors.eyeColor}
                >
                  <Select
                    id="custom-character-create-eye-color"
                    size="sm"
                    options={EYE_COLOR_OPTIONS}
                    value={values.eyeColor}
                    onChange={(value) =>
                      setValues((prev) => ({
                        ...prev,
                        eyeColor: value as CharacterEyeColor,
                      }))
                    }
                    fullWidth
                  />
                </Field>
              </FormRow>

              <FormRow columns={3}>
                <Field
                  label="Ethnicity"
                  labelFor="custom-character-create-ethnicity"
                  error={errors.ethnicity}
                >
                  <Select
                    id="custom-character-create-ethnicity"
                    size="sm"
                    options={ETHNICITY_OPTIONS}
                    value={values.ethnicity}
                    onChange={(value) =>
                      setValues((prev) => ({
                        ...prev,
                        ethnicity: value as CharacterEthnicity,
                      }))
                    }
                    fullWidth
                  />
                </Field>

                <Field
                  label="Body type"
                  labelFor="custom-character-create-body-type"
                  error={errors.bodyType}
                >
                  <Select
                    id="custom-character-create-body-type"
                    size="sm"
                    options={BODY_TYPE_OPTIONS}
                    value={values.bodyType}
                    onChange={(value) =>
                      setValues((prev) => ({
                        ...prev,
                        bodyType: value as CharacterBodyType,
                      }))
                    }
                    fullWidth
                  />
                </Field>

                <Field
                  label="Breast size"
                  labelFor="custom-character-create-breast-size"
                  error={errors.breastSize}
                >
                  <Select
                    id="custom-character-create-breast-size"
                    size="sm"
                    options={BREAST_SIZE_OPTIONS}
                    value={values.breastSize}
                    onChange={(value) =>
                      setValues((prev) => ({
                        ...prev,
                        breastSize: value as CharacterBreastSize,
                      }))
                    }
                    fullWidth
                  />
                </Field>
              </FormRow>
            </Stack>
          </div>

          <div className={s.actions}>
            <Button
              variant="secondary"
              onClick={() => navigate('/custom-characters')}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              iconLeft={<PlusIcon />}
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!isValid || createMutation.isPending}
            >
              Create custom character
            </Button>
          </div>
        </Stack>
      </Container>
    </AppShell>
  );
}
