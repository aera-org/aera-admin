import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCharacterDetails, useCharacters } from '@/app/characters';
import { useCreateImgGeneration } from '@/app/img-generations';
import { useLoras } from '@/app/loras';
import {
  Alert,
  Button,
  Container,
  Field,
  FormRow,
  Select,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import { AppShell } from '@/components/templates';

import { SearchSelect } from './components/SearchSelect';
import s from './GenerateImagePage.module.scss';

const PAGE_SIZE = 50;

const SEARCH_DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function GenerateImagePage() {
  const navigate = useNavigate();
  const createMutation = useCreateImgGeneration();

  const [values, setValues] = useState({
    characterId: '',
    scenarioId: '',
    mainLoraId: '',
    secondaryLoraId: '',
    userRequest: '',
  });
  const [showErrors, setShowErrors] = useState(false);
  const [characterSearch, setCharacterSearch] = useState('');
  const [mainLoraSearch, setMainLoraSearch] = useState('');
  const [secondaryLoraSearch, setSecondaryLoraSearch] = useState('');
  const debouncedCharacterSearch = useDebouncedValue(
    characterSearch,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedMainLoraSearch = useDebouncedValue(
    mainLoraSearch,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedSecondaryLoraSearch = useDebouncedValue(
    secondaryLoraSearch,
    SEARCH_DEBOUNCE_MS,
  );

  const {
    data: characterData,
    error: characterError,
    isLoading: isCharactersLoading,
  } = useCharacters({
    search: debouncedCharacterSearch || undefined,
    order: 'ASC',
    skip: 0,
    take: PAGE_SIZE,
  });
  const {
    data: mainLoraData,
    error: mainLoraError,
    isLoading: isMainLorasLoading,
  } = useLoras({
    search: debouncedMainLoraSearch || undefined,
    order: 'DESC',
    skip: 0,
    take: PAGE_SIZE,
  });
  const {
    data: secondaryLoraData,
    error: secondaryLoraError,
    isLoading: isSecondaryLorasLoading,
  } = useLoras({
    search: debouncedSecondaryLoraSearch || undefined,
    order: 'DESC',
    skip: 0,
    take: PAGE_SIZE,
  });
  const { data: characterDetails, error: detailsError } = useCharacterDetails(
    values.characterId || null,
  );

  useEffect(() => {
    if (!values.characterId) return;
    setValues((prev) => ({
      ...prev,
      scenarioId: '',
    }));
  }, [values.characterId]);

  const scenarios = useMemo(
    () => (characterDetails ? characterDetails.scenarios : []),
    [characterDetails],
  );

  const errors = useMemo(() => {
    if (!showErrors) return {};
    const result: {
      characterId?: string;
      scenarioId?: string;
      mainLoraId?: string;
      secondaryLoraId?: string;
      userRequest?: string;
    } = {};
    if (!values.characterId) result.characterId = 'Select a character.';
    if (!values.scenarioId) result.scenarioId = 'Select a scenario.';
    if (values.secondaryLoraId && !values.mainLoraId) {
      result.secondaryLoraId = 'Select main LoRA first.';
    }
    if (
      values.mainLoraId &&
      values.secondaryLoraId &&
      values.mainLoraId === values.secondaryLoraId
    ) {
      result.secondaryLoraId = 'Secondary LoRA must differ from main LoRA.';
    }
    if (!values.userRequest.trim()) result.userRequest = 'Enter a request.';
    return result;
  }, [showErrors, values]);

  const isValid = useMemo(
    () =>
      Boolean(
        values.characterId &&
        values.scenarioId &&
        (!values.secondaryLoraId || values.mainLoraId) &&
        (!values.secondaryLoraId ||
          values.mainLoraId !== values.secondaryLoraId) &&
        values.userRequest.trim(),
      ),
    [values],
  );

  const handleSubmit = async () => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }
    const response = await createMutation.mutateAsync({
      characterId: values.characterId,
      scenarioId: values.scenarioId,
      mainLoraId: values.mainLoraId || undefined,
      secondaryLoraId: values.secondaryLoraId || undefined,
      userRequest: values.userRequest.trim(),
    });
    if (response?.id) {
      navigate(`/generations/${response.id}`);
    }
  };

  const blockingError =
    characterError || mainLoraError || secondaryLoraError || detailsError;
  const errorMessage =
    blockingError instanceof Error
      ? blockingError.message
      : 'Unable to load generation data.';

  const characterOptions = (characterData?.data ?? []).map((character) => ({
    id: character.id,
    label: character.name,
    meta: character.id,
  }));
  const mainLoraOptions = [
    {
      id: '',
      label: 'No main LoRA',
      meta: undefined,
    },
    ...(mainLoraData?.data ?? []).map((lora) => ({
      id: lora.id,
      label: lora.fileName,
      meta: lora.id,
    })),
  ];
  const secondaryLoraOptions = [
    {
      id: '',
      label: 'No secondary LoRA',
      meta: undefined,
    },
    ...(secondaryLoraData?.data ?? [])
      .filter((lora) => lora.id !== values.mainLoraId)
      .map((lora) => ({
        id: lora.id,
        label: lora.fileName,
        meta: lora.id,
      })),
  ];

  const scenarioOptions = scenarios.map((scenario) => ({
    label: scenario.name,
    value: scenario.id,
  }));

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Generate image</Typography>
          </div>
          <Button variant="secondary" onClick={() => navigate('/generations')}>
            Cancel
          </Button>
        </div>

        {blockingError ? (
          <Alert title="Unable to load data" description={errorMessage} />
        ) : null}

        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Character"
              labelFor="generation-character"
              error={errors.characterId}
            >
              <SearchSelect
                id="generation-character"
                options={characterOptions}
                value={values.characterId}
                search={characterSearch}
                onSearchChange={setCharacterSearch}
                onSelect={(value) =>
                  setValues((prev) => ({ ...prev, characterId: value }))
                }
                placeholder="Select character"
                disabled={createMutation.isPending}
                loading={isCharactersLoading}
                invalid={Boolean(errors.characterId)}
              />
            </Field>
            <Field
              label="Scenario"
              labelFor="generation-scenario"
              error={errors.scenarioId}
            >
              <Select
                id="generation-scenario"
                size="sm"
                options={scenarioOptions}
                value={values.scenarioId}
                placeholder={
                  values.characterId ? 'Select scenario' : 'Select character first'
                }
                onChange={(value) =>
                  setValues((prev) => ({ ...prev, scenarioId: value }))
                }
                fullWidth
                disabled={!values.characterId || createMutation.isPending}
                invalid={Boolean(errors.scenarioId)}
              />
            </Field>
          </FormRow>

          <FormRow columns={2}>
            <Field
              label="Main LoRA"
              labelFor="generation-main-lora"
              error={errors.mainLoraId}
            >
              <SearchSelect
                id="generation-main-lora"
                options={mainLoraOptions}
                value={values.mainLoraId}
                search={mainLoraSearch}
                onSearchChange={setMainLoraSearch}
                onSelect={(value) =>
                  setValues((prev) => ({
                    ...prev,
                    mainLoraId: value,
                    secondaryLoraId:
                      !value || prev.secondaryLoraId === value
                        ? ''
                        : prev.secondaryLoraId,
                  }))
                }
                placeholder="Select main LoRA"
                disabled={createMutation.isPending}
                loading={isMainLorasLoading}
                invalid={Boolean(errors.mainLoraId)}
              />
            </Field>
            <Field
              label="Secondary LoRA"
              labelFor="generation-secondary-lora"
              error={errors.secondaryLoraId}
            >
              <SearchSelect
                id="generation-secondary-lora"
                options={secondaryLoraOptions}
                value={values.secondaryLoraId}
                search={secondaryLoraSearch}
                onSearchChange={setSecondaryLoraSearch}
                onSelect={(value) =>
                  setValues((prev) => ({ ...prev, secondaryLoraId: value }))
                }
                placeholder={
                  values.mainLoraId
                    ? 'Select secondary LoRA'
                    : 'Select main LoRA first'
                }
                disabled={!values.mainLoraId || createMutation.isPending}
                loading={isSecondaryLorasLoading}
                invalid={Boolean(errors.secondaryLoraId)}
              />
            </Field>
          </FormRow>

          <Field
            label="User request"
            labelFor="generation-request"
            error={errors.userRequest}
          >
            <Textarea
              id="generation-request"
              invalid={Boolean(errors.userRequest)}
              value={values.userRequest}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  userRequest: event.target.value,
                }))
              }
              placeholder="Describe what to generate..."
              fullWidth
              disabled={createMutation.isPending}
            />
          </Field>
        </Stack>

        <div className={s.actions}>
          <Button
            onClick={handleSubmit}
            loading={createMutation.isPending}
            disabled={!isValid || createMutation.isPending}
          >
            Generate
          </Button>
        </div>
      </Container>
    </AppShell>
  );
}
