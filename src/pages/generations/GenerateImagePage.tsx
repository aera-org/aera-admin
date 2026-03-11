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
import { CharacterType, RoleplayStage, STAGES_IN_ORDER } from '@/common/types';
import { AppShell } from '@/components/templates';

import { SearchSelect } from './components/SearchSelect';
import s from './GenerateImagePage.module.scss';

const PAGE_SIZE = 50;

const SEARCH_DEBOUNCE_MS = 300;

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

const TYPE_LABELS: Record<CharacterType, string> = {
  [CharacterType.Realistic]: 'Realistic',
  [CharacterType.Anime]: 'Anime',
};

function formatStage(stage: RoleplayStage) {
  return STAGE_LABELS[stage] ?? stage;
}

function formatType(type: CharacterType) {
  return TYPE_LABELS[type] ?? type;
}

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
    stage: '' as RoleplayStage | '',
    type: '' as CharacterType | '',
    mainLoraId: '',
    secondLoraId: '',
    userRequest: '',
  });
  const [showErrors, setShowErrors] = useState(false);
  const [characterSearch, setCharacterSearch] = useState('');
  const [mainLoraSearch, setMainLoraSearch] = useState('');
  const [secondLoraSearch, setsecondLoraSearch] = useState('');
  const debouncedCharacterSearch = useDebouncedValue(
    characterSearch,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedMainLoraSearch = useDebouncedValue(
    mainLoraSearch,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedsecondLoraSearch = useDebouncedValue(
    secondLoraSearch,
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
    data: secondLoraData,
    error: secondLoraError,
    isLoading: issecondLorasLoading,
  } = useLoras({
    search: debouncedsecondLoraSearch || undefined,
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
      stage?: string;
      type?: string;
      mainLoraId?: string;
      secondLoraId?: string;
      userRequest?: string;
    } = {};
    if (!values.characterId) result.characterId = 'Select a character.';
    if (!values.scenarioId) result.scenarioId = 'Select a scenario.';
    if (!values.stage) result.stage = 'Select a stage.';
    if (!values.type) result.type = 'Select a type.';
    if (values.secondLoraId && !values.mainLoraId) {
      result.secondLoraId = 'Select main LoRA first.';
    }
    if (
      values.mainLoraId &&
      values.secondLoraId &&
      values.mainLoraId === values.secondLoraId
    ) {
      result.secondLoraId = 'Secondary LoRA must differ from main LoRA.';
    }
    if (!values.userRequest.trim()) result.userRequest = 'Enter a request.';
    return result;
  }, [showErrors, values]);

  const isValid = useMemo(
    () =>
      Boolean(
        values.characterId &&
        values.scenarioId &&
        values.stage &&
        values.type &&
        (!values.secondLoraId || values.mainLoraId) &&
        (!values.secondLoraId || values.mainLoraId !== values.secondLoraId) &&
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
      stage: values.stage as RoleplayStage,
      type: values.type as CharacterType,
      mainLoraId: values.mainLoraId || undefined,
      secondLoraId: values.secondLoraId || undefined,
      userRequest: values.userRequest.trim(),
    });
    if (response?.id) {
      navigate(`/generations/${response.id}`);
    }
  };

  const blockingError =
    characterError || mainLoraError || secondLoraError || detailsError;
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
  const secondLoraOptions = [
    {
      id: '',
      label: 'No secondary LoRA',
      meta: undefined,
    },
    ...(secondLoraData?.data ?? [])
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
  const stageOptions = useMemo(
    () =>
      STAGES_IN_ORDER.map((stage) => ({
        label: formatStage(stage),
        value: stage,
      })),
    [],
  );
  const typeOptions = useMemo(
    () =>
      Object.values(CharacterType).map((type) => ({
        label: formatType(type),
        value: type,
      })),
    [],
  );

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
          <FormRow columns={3}>
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
                  values.characterId
                    ? 'Select scenario'
                    : 'Select character first'
                }
                onChange={(value) =>
                  setValues((prev) => ({ ...prev, scenarioId: value }))
                }
                fullWidth
                disabled={!values.characterId || createMutation.isPending}
                invalid={Boolean(errors.scenarioId)}
              />
            </Field>
            <Field
              label="Stage"
              labelFor="generation-stage"
              error={errors.stage}
            >
              <Select
                id="generation-stage"
                size="sm"
                options={stageOptions}
                value={values.stage}
                placeholder="Select stage"
                onChange={(value) =>
                  setValues((prev) => ({
                    ...prev,
                    stage: value as RoleplayStage,
                  }))
                }
                fullWidth
                disabled={createMutation.isPending}
                invalid={Boolean(errors.stage)}
              />
            </Field>
          </FormRow>

          <FormRow columns={3}>
            <Field label="Type" labelFor="generation-type" error={errors.type}>
              <Select
                id="generation-type"
                size="sm"
                options={typeOptions}
                value={values.type}
                placeholder="Select type"
                onChange={(value) =>
                  setValues((prev) => ({
                    ...prev,
                    type: value as CharacterType,
                  }))
                }
                fullWidth
                disabled={createMutation.isPending}
                invalid={Boolean(errors.type)}
              />
            </Field>
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
                    secondLoraId:
                      !value || prev.secondLoraId === value
                        ? ''
                        : prev.secondLoraId,
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
              error={errors.secondLoraId}
            >
              <SearchSelect
                id="generation-secondary-lora"
                options={secondLoraOptions}
                value={values.secondLoraId}
                search={secondLoraSearch}
                onSearchChange={setsecondLoraSearch}
                onSelect={(value) =>
                  setValues((prev) => ({ ...prev, secondLoraId: value }))
                }
                placeholder={
                  values.mainLoraId
                    ? 'Select secondary LoRA'
                    : 'Select main LoRA first'
                }
                disabled={!values.mainLoraId || createMutation.isPending}
                loading={issecondLorasLoading}
                invalid={Boolean(errors.secondLoraId)}
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
