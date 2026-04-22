import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useCharacterDetails, useCharacters } from '@/app/characters';
import {
  createImgGeneration,
  getImgGenerationDetails,
  useCreateImgGeneration,
} from '@/app/img-generations';
import { useLoras } from '@/app/loras';
import { usePosePrompts } from '@/app/pose-prompts';
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Field,
  FormRow,
  Grid,
  Select,
  Skeleton,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import {
  type IImgGenerationDetails,
  type ImgGenerationRequest,
  ImgGenerationStatus,
  RoleplayStage,
  STAGES_IN_ORDER,
} from '@/common/types';
import {
  formatCharacterSelectLabel,
  getVisibleUserRequestFieldKeys,
  requiresPosePrompt,
  USER_REQUEST_FIELD_CONFIG,
} from '@/common/utils';
import { AppShell } from '@/components/templates';

import { SearchSelect } from './components/SearchSelect';
import s from './GenerateImagePage.module.scss';
import type { GenerateImagePrefillState } from './generationReuse';
import {
  buildUserRequestDraft,
  buildUserRequestPayload,
  type GenerationUserRequestDraft,
  hasUserRequestContent,
  type UserRequestFieldKey,
} from './userRequest';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_BATCH_SIZE = 4;
const MAX_BATCH_SIZE = 10;
const BATCH_REQUEST_CONCURRENCY = 3;

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

const BATCH_OPTIONS = Array.from({ length: MAX_BATCH_SIZE }, (_, index) => {
  const value = String(index + 1);
  return {
    label: value,
    value,
  };
});

type GenerationFormValues = {
  characterId: string;
  scenarioId: string;
  stage: RoleplayStage | '';
  mainLoraId: string;
  secondLoraId: string;
  userRequest: GenerationUserRequestDraft;
  posePromptId: string;
};

type BatchItemState = 'queued' | 'submitting' | 'created' | 'failed';

type GenerationBatchItem = {
  clientId: string;
  index: number;
  createState: BatchItemState;
  generationId?: string;
  createError?: string;
};

type GenerationBatchSession = {
  id: string;
  size: number;
  submittedAt: number;
  items: GenerationBatchItem[];
};

function formatStage(stage: RoleplayStage) {
  return STAGE_LABELS[stage] ?? stage;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function mergeSelectedOption(
  options: Array<{ id: string; label: string; meta?: string }>,
  selected:
    | {
        id: string;
        label: string;
        meta?: string;
      }
    | undefined,
) {
  if (!selected?.id) return options;
  if (options.some((option) => option.id === selected.id)) return options;
  return [selected, ...options];
}

function buildInitialValues(
  prefill: GenerateImagePrefillState | null,
): GenerationFormValues {
  return {
    characterId: prefill?.characterId ?? '',
    scenarioId: prefill?.scenarioId ?? '',
    stage: (prefill?.stage ?? '') as RoleplayStage | '',
    mainLoraId: prefill?.mainLoraId ?? '',
    secondLoraId: prefill?.secondLoraId ?? '',
    userRequest: buildUserRequestDraft(prefill?.userRequest, prefill?.stage),
    posePromptId: prefill?.posePromptId ?? '',
  };
}

function buildGenerationRequest(
  values: GenerationFormValues,
): ImgGenerationRequest {
  const payload: ImgGenerationRequest = {
    characterId: values.characterId,
    scenarioId: values.scenarioId,
    stage: values.stage as RoleplayStage,
    mainLoraId: values.mainLoraId || undefined,
    secondLoraId: values.secondLoraId || undefined,
  };

  if (requiresPosePrompt(values.stage)) {
    payload.posePromptId = values.posePromptId;
  }

  payload.userRequest = buildUserRequestPayload(values.userRequest, values.stage);

  return payload;
}

function getBatchItemStatus(
  item: GenerationBatchItem,
  details: IImgGenerationDetails | undefined,
  detailsError: string | undefined,
) {
  if (item.createState === 'failed') {
    return {
      label: 'Request failed',
      tone: 'danger' as const,
      outline: false,
    };
  }
  if (item.createState === 'queued' || item.createState === 'submitting') {
    return {
      label: 'Starting',
      tone: 'accent' as const,
      outline: true,
    };
  }
  if (detailsError) {
    return {
      label: 'Status unavailable',
      tone: 'warning' as const,
      outline: true,
    };
  }
  if (details?.status === ImgGenerationStatus.Ready) {
    return {
      label: 'Ready',
      tone: 'success' as const,
      outline: false,
    };
  }
  if (details?.status === ImgGenerationStatus.Failed) {
    return {
      label: 'Failed',
      tone: 'danger' as const,
      outline: false,
    };
  }
  return {
    label: 'Generating',
    tone: 'warning' as const,
    outline: true,
  };
}

export function GenerateImagePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const createMutation = useCreateImgGeneration();
  const prefill =
    (location.state as { prefill?: GenerateImagePrefillState } | null)
      ?.prefill ?? null;

  const [values, setValues] = useState<GenerationFormValues>(() =>
    buildInitialValues(prefill),
  );
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);
  const [batchSession, setBatchSession] =
    useState<GenerationBatchSession | null>(null);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [characterSearch, setCharacterSearch] = useState('');
  const [mainLoraSearch, setMainLoraSearch] = useState('');
  const [secondLoraSearch, setSecondLoraSearch] = useState('');
  const [poseSearch, setPoseSearch] = useState('');
  const debouncedCharacterSearch = useDebouncedValue(
    characterSearch,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedMainLoraSearch = useDebouncedValue(
    mainLoraSearch,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedSecondLoraSearch = useDebouncedValue(
    secondLoraSearch,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedPoseSearch = useDebouncedValue(poseSearch, SEARCH_DEBOUNCE_MS);
  const previousCharacterIdRef = useRef(values.characterId);

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
    isLoading: isSecondLorasLoading,
  } = useLoras({
    search: debouncedSecondLoraSearch || undefined,
    order: 'DESC',
    skip: 0,
    take: PAGE_SIZE,
  });
  const {
    data: posePromptData,
    error: posePromptError,
    isLoading: isPosePromptsLoading,
  } = usePosePrompts({
    search: debouncedPoseSearch || undefined,
    skip: 0,
    take: PAGE_SIZE,
  });
  const { data: characterDetails, error: detailsError } = useCharacterDetails(
    values.characterId || null,
  );

  useEffect(() => {
    if (!values.characterId) {
      previousCharacterIdRef.current = '';
      return;
    }
    if (
      previousCharacterIdRef.current &&
      previousCharacterIdRef.current !== values.characterId
    ) {
      setValues((prev) => ({
        ...prev,
        scenarioId: '',
      }));
    }
    previousCharacterIdRef.current = values.characterId;
  }, [values.characterId]);

  const scenarios = useMemo(
    () => (characterDetails ? characterDetails.scenarios : []),
    [characterDetails],
  );
  const usesPosePromptFlow = requiresPosePrompt(values.stage);
  const visibleUserRequestFieldKeys = useMemo(
    () => getVisibleUserRequestFieldKeys(values.stage),
    [values.stage],
  );
  const userRequestErrorFieldKey = visibleUserRequestFieldKeys[0];

  const errors = useMemo(() => {
    if (!showErrors) return {};
    const result: {
      characterId?: string;
      scenarioId?: string;
      stage?: string;
      mainLoraId?: string;
      secondLoraId?: string;
      userRequest?: string;
      posePromptId?: string;
    } = {};
    if (!values.characterId) result.characterId = 'Select a character.';
    if (!values.scenarioId) result.scenarioId = 'Select a scenario.';
    if (!values.stage) result.stage = 'Select a stage.';
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
    if (usesPosePromptFlow) {
      if (!values.posePromptId) result.posePromptId = 'Select a pose prompt.';
    }
    if (
      !usesPosePromptFlow &&
      !hasUserRequestContent(values.userRequest, values.stage)
    ) {
      result.userRequest = 'Enter a request.';
    }
    return result;
  }, [showErrors, usesPosePromptFlow, values]);

  const isValid = useMemo(
    () =>
      Boolean(
        values.characterId &&
        values.scenarioId &&
        values.stage &&
        (!values.secondLoraId || values.mainLoraId) &&
        (!values.secondLoraId || values.mainLoraId !== values.secondLoraId) &&
        (usesPosePromptFlow
          ? values.posePromptId
          : hasUserRequestContent(values.userRequest, values.stage)),
      ),
    [usesPosePromptFlow, values],
  );

  const requestPayload = useMemo<ImgGenerationRequest>(
    () => buildGenerationRequest(values),
    [values],
  );

  const batchQueries = useQueries({
    queries: (batchSession?.items ?? []).map((item) => ({
      queryKey: item.generationId
        ? (['img-generation', item.generationId] as const)
        : (['img-generation-batch', item.clientId] as const),
      queryFn: () => getImgGenerationDetails(item.generationId ?? ''),
      enabled: Boolean(item.generationId),
      retry: 1,
      refetchInterval: (query: { state: { data?: IImgGenerationDetails } }) => {
        if (!item.generationId) return false;
        const data = query.state.data;
        return data &&
          data.status !== ImgGenerationStatus.Ready &&
          data.status !== ImgGenerationStatus.Failed
          ? 5000
          : data
            ? false
            : 5000;
      },
      refetchIntervalInBackground: true,
    })),
  });

  const batchItems = useMemo(
    () =>
      (batchSession?.items ?? []).map((item, index) => {
        const query = batchQueries[index];
        const details = query?.data;
        const detailsError =
          query?.error instanceof Error
            ? query.error.message
            : query?.error
              ? 'Unable to load generation status.'
              : undefined;

        return {
          ...item,
          details,
          detailsError,
          isStatusLoading:
            Boolean(item.generationId) &&
            Boolean((query?.isLoading || query?.isFetching) && !details),
        };
      }),
    [batchQueries, batchSession],
  );

  const batchSummary = useMemo(() => {
    if (!batchSession) return null;

    let started = 0;
    let ready = 0;
    let generating = 0;
    let failed = 0;
    let requestErrors = 0;
    let statusErrors = 0;

    for (const item of batchItems) {
      if (item.createState === 'failed') {
        requestErrors += 1;
        continue;
      }

      if (item.createState === 'created') {
        started += 1;
      }

      if (item.detailsError) {
        statusErrors += 1;
        generating += 1;
        continue;
      }

      if (item.details?.status === ImgGenerationStatus.Ready) {
        ready += 1;
        continue;
      }

      if (item.details?.status === ImgGenerationStatus.Failed) {
        failed += 1;
        continue;
      }

      if (item.createState === 'created') {
        generating += 1;
      }
    }

    const completed = ready + failed + requestErrors;
    const isComplete = completed === batchSession.size;
    const hasIssues = failed > 0 || requestErrors > 0 || statusErrors > 0;

    return {
      total: batchSession.size,
      started,
      ready,
      generating,
      failed,
      requestErrors,
      statusErrors,
      isComplete,
      title: isComplete
        ? hasIssues
          ? 'Batch finished with issues'
          : 'Batch finished'
        : isBatchSubmitting
          ? 'Starting batch'
          : 'Batch in progress',
      tone: hasIssues
        ? ('warning' as const)
        : isComplete
          ? ('success' as const)
          : ('info' as const),
    };
  }, [batchItems, batchSession, isBatchSubmitting]);

  const blockingError =
    characterError ||
    mainLoraError ||
    secondLoraError ||
    posePromptError ||
    detailsError;
  const errorMessage =
    blockingError instanceof Error
      ? blockingError.message
      : 'Unable to load generation data.';

  const isSubmitting = createMutation.isPending || isBatchSubmitting;

  const characterOptions = mergeSelectedOption(
    (characterData?.data ?? []).map((character) => ({
      id: character.id,
      label: formatCharacterSelectLabel(character.name, character.type),
      meta: character.id,
    })),
    prefill?.characterId &&
      values.characterId === prefill.characterId &&
      prefill.characterName
      ? {
          id: prefill.characterId,
          label: prefill.characterName,
          meta: prefill.characterId,
        }
      : undefined,
  );

  const scenarioOptions = mergeSelectedOption(
    scenarios.map((scenario) => ({
      id: scenario.id,
      label: scenario.name,
      meta: scenario.id,
    })),
    prefill?.scenarioId &&
      values.characterId === prefill.characterId &&
      values.scenarioId === prefill.scenarioId &&
      prefill.scenarioName
      ? {
          id: prefill.scenarioId,
          label: prefill.scenarioName,
          meta: prefill.scenarioId,
        }
      : undefined,
  ).map((scenario) => ({
    label: scenario.label,
    value: scenario.id,
  }));

  const mainLoraOptions = mergeSelectedOption(
    [
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
    ],
    prefill?.mainLoraId &&
      values.mainLoraId === prefill.mainLoraId &&
      prefill.mainLoraName
      ? {
          id: prefill.mainLoraId,
          label: prefill.mainLoraName,
          meta: prefill.mainLoraId,
        }
      : undefined,
  );

  const secondLoraOptions = mergeSelectedOption(
    [
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
    ],
    prefill?.secondLoraId &&
      values.secondLoraId === prefill.secondLoraId &&
      prefill.secondLoraName
      ? {
          id: prefill.secondLoraId,
          label: prefill.secondLoraName,
          meta: prefill.secondLoraId,
        }
      : undefined,
  );

  const posePromptOptions = mergeSelectedOption(
    (posePromptData?.data ?? []).map((posePrompt) => ({
      id: posePrompt.id,
      label: posePrompt.name,
      meta: posePrompt.id,
    })),
    prefill?.posePromptId &&
      values.posePromptId === prefill.posePromptId &&
      prefill.posePromptName
      ? {
          id: prefill.posePromptId,
          label: prefill.posePromptName,
          meta: prefill.posePromptId,
        }
      : undefined,
  );

  const stageOptions = useMemo(
    () =>
      STAGES_IN_ORDER.map((stage) => ({
        label: formatStage(stage),
        value: stage,
      })),
    [],
  );

  const updateBatchItem = (
    sessionId: string,
    clientId: string,
    updater: (item: GenerationBatchItem) => GenerationBatchItem,
  ) => {
    setBatchSession((previous) => {
      if (!previous || previous.id !== sessionId) return previous;
      return {
        ...previous,
        items: previous.items.map((item) =>
          item.clientId === clientId ? updater(item) : item,
        ),
      };
    });
  };

  const handleBatchSubmit = async () => {
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const items = Array.from({ length: batchSize }, (_, index) => ({
      clientId: `${sessionId}-${index + 1}`,
      index: index + 1,
      createState: 'queued' as const,
    }));

    setBatchSession({
      id: sessionId,
      size: batchSize,
      submittedAt: Date.now(),
      items,
    });
    setIsBatchSubmitting(true);

    let nextIndex = 0;
    const workerCount = Math.min(BATCH_REQUEST_CONCURRENCY, batchSize);

    const runWorker = async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        if (currentIndex >= items.length) {
          return;
        }

        const currentItem = items[currentIndex];
        updateBatchItem(sessionId, currentItem.clientId, (item) => ({
          ...item,
          createState: 'submitting',
          createError: undefined,
        }));

        try {
          const response = await createImgGeneration(requestPayload);
          updateBatchItem(sessionId, currentItem.clientId, (item) => ({
            ...item,
            createState: 'created',
            generationId: response.id,
            createError: undefined,
          }));
        } catch (error) {
          updateBatchItem(sessionId, currentItem.clientId, (item) => ({
            ...item,
            createState: 'failed',
            createError:
              error instanceof Error
                ? error.message
                : 'Unable to start generation.',
          }));
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }

    setShowErrors(false);

    if (batchSize === 1) {
      const response = await createMutation.mutateAsync(requestPayload);
      if (response?.id) {
        navigate(`/generations/${response.id}`);
      }
      return;
    }

    await handleBatchSubmit();
  };

  const handlePosePromptSelect = (value: string) => {
    setValues((prev) => ({ ...prev, posePromptId: value }));
  };

  const updateUserRequestField = (
    fieldKey: UserRequestFieldKey,
    value: string,
  ) => {
    setValues((prev) => ({
      ...prev,
      userRequest: {
        ...prev.userRequest,
        [fieldKey]: value,
      },
    }));
  };

  const renderUserRequestFields = (fieldKeys: UserRequestFieldKey[]) => {
    const rows: UserRequestFieldKey[][] = [];

    for (let index = 0; index < fieldKeys.length; index += 2) {
      rows.push(fieldKeys.slice(index, index + 2));
    }

    return rows.map((row) => (
      <FormRow key={row.join('-')} columns={row.length === 1 ? 1 : 2}>
        {row.map((fieldKey) => {
          const fieldConfig = USER_REQUEST_FIELD_CONFIG[fieldKey];
          const isErrorField = userRequestErrorFieldKey === fieldKey;

          return (
            <Field
              key={fieldKey}
              label={fieldConfig.label}
              labelFor={`generation-request-${fieldKey}`}
              error={isErrorField ? errors.userRequest : undefined}
            >
              <Textarea
                id={`generation-request-${fieldKey}`}
                invalid={Boolean(isErrorField && errors.userRequest)}
                value={values.userRequest[fieldKey]}
                onChange={(event) =>
                  updateUserRequestField(fieldKey, event.target.value)
                }
                placeholder={fieldConfig.placeholder}
                fullWidth
                disabled={isSubmitting}
              />
            </Field>
          );
        })}
      </FormRow>
    ));
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Generate image</Typography>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/generations')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>

        {batchSummary ? (
          <Alert
            tone={batchSummary.tone}
            title={batchSummary.title}
            description={
              <div className={s.batchSummary}>
                <Typography variant="caption" tone="muted">
                  Tracking {batchSummary.total} generations below.
                </Typography>
                <div className={s.batchSummaryBadges}>
                  <Badge>Batch {batchSummary.total}</Badge>
                  <Badge tone="accent" outline>
                    Started {batchSummary.started}/{batchSummary.total}
                  </Badge>
                  <Badge tone="success">Ready {batchSummary.ready}</Badge>
                  <Badge tone="warning" outline>
                    Generating {batchSummary.generating}
                  </Badge>
                  <Badge tone="danger">Failed {batchSummary.failed}</Badge>
                  {batchSummary.requestErrors > 0 ? (
                    <Badge tone="danger">
                      Request errors {batchSummary.requestErrors}
                    </Badge>
                  ) : null}
                  {batchSummary.statusErrors > 0 ? (
                    <Badge tone="warning" outline>
                      Status errors {batchSummary.statusErrors}
                    </Badge>
                  ) : null}
                </div>
              </div>
            }
          />
        ) : null}

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
                disabled={isSubmitting}
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
                disabled={!values.characterId || isSubmitting}
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
                disabled={isSubmitting}
                invalid={Boolean(errors.stage)}
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
                    secondLoraId:
                      !value || prev.secondLoraId === value
                        ? ''
                        : prev.secondLoraId,
                  }))
                }
                placeholder="Select main LoRA"
                disabled={isSubmitting}
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
                onSearchChange={setSecondLoraSearch}
                onSelect={(value) =>
                  setValues((prev) => ({ ...prev, secondLoraId: value }))
                }
                placeholder={
                  values.mainLoraId
                    ? 'Select secondary LoRA'
                    : 'Select main LoRA first'
                }
                disabled={!values.mainLoraId || isSubmitting}
                loading={isSecondLorasLoading}
                invalid={Boolean(errors.secondLoraId)}
              />
            </Field>
          </FormRow>

          <FormRow columns={3}>
            <Field label="Batch" labelFor="generation-batch">
              <Select
                id="generation-batch"
                size="sm"
                options={BATCH_OPTIONS}
                value={String(batchSize)}
                onChange={(value) => setBatchSize(Number(value))}
                fullWidth
                disabled={isSubmitting}
              />
            </Field>
          </FormRow>

          {usesPosePromptFlow ? (
            <>
              <FormRow columns={1}>
                <Field
                  label="Pose prompt"
                  labelFor="generation-sex-pose"
                  error={errors.posePromptId}
                >
                  <SearchSelect
                    id="generation-sex-pose"
                    value={values.posePromptId}
                    options={posePromptOptions.map((option) => ({
                      id: option.id,
                      label: option.label,
                      meta: option.meta,
                    }))}
                    search={poseSearch}
                    onSearchChange={setPoseSearch}
                    onSelect={handlePosePromptSelect}
                    placeholder={
                      isPosePromptsLoading
                        ? 'Loading pose prompts...'
                        : 'Select pose prompt'
                    }
                    disabled={isSubmitting}
                    loading={isPosePromptsLoading}
                    invalid={Boolean(errors.posePromptId)}
                    emptyLabel="No pose prompts found."
                    loadingLabel="Loading pose prompts..."
                  />
                </Field>
              </FormRow>
              {renderUserRequestFields(visibleUserRequestFieldKeys)}
            </>
          ) : (
            renderUserRequestFields(visibleUserRequestFieldKeys)
          )}
        </Stack>

        <div className={s.actions}>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!isValid || isSubmitting}
          >
            {batchSize === 1 ? 'Generate' : `Generate ${batchSize}`}
          </Button>
        </div>

        {batchSession ? (
          <div className={s.resultsSection}>
            <div className={s.resultsHeader}>
              <Typography variant="h3">Batch results</Typography>
              <Typography variant="caption" tone="muted">
                Each tile updates automatically as generations finish.
              </Typography>
            </div>

            <Grid columns={2} gap="16px" className={s.resultsGrid}>
              {batchItems.map((item) => {
                const status = getBatchItemStatus(
                  item,
                  item.details,
                  item.detailsError,
                );
                const hasImage = Boolean(
                  item.details?.status === ImgGenerationStatus.Ready &&
                  item.details.file?.url,
                );
                const showSkeleton =
                  item.createState === 'queued' ||
                  item.createState === 'submitting' ||
                  item.isStatusLoading ||
                  item.details?.status === ImgGenerationStatus.Generating;

                return (
                  <Card
                    key={item.clientId}
                    padding="md"
                    className={s.resultCard}
                  >
                    <div className={s.resultCardHeader}>
                      <Typography variant="body">#{item.index}</Typography>
                      <Badge tone={status.tone} outline={status.outline}>
                        {status.label}
                      </Badge>
                    </div>

                    <div className={s.resultPreview}>
                      {hasImage ? (
                        <img
                          className={s.resultImage}
                          src={item.details?.file?.url ?? ''}
                          alt={`Generated result ${item.index}`}
                          loading="lazy"
                        />
                      ) : showSkeleton ? (
                        <Skeleton height="100%" />
                      ) : item.createState === 'failed' ? (
                        <div className={s.resultPlaceholder}>
                          <Typography variant="caption" tone="muted">
                            Request could not be started.
                          </Typography>
                        </div>
                      ) : item.detailsError ? (
                        <div className={s.resultPlaceholder}>
                          <Typography variant="caption" tone="muted">
                            Status is temporarily unavailable.
                          </Typography>
                        </div>
                      ) : item.details?.status ===
                        ImgGenerationStatus.Failed ? (
                        <div className={s.resultPlaceholder}>
                          <Typography variant="caption" tone="muted">
                            Generation failed.
                          </Typography>
                        </div>
                      ) : (
                        <div className={s.resultPlaceholder}>
                          <Typography variant="caption" tone="muted">
                            Waiting for image.
                          </Typography>
                        </div>
                      )}
                    </div>

                    <div className={s.resultMeta}>
                      <Typography variant="caption" tone="muted">
                        {item.generationId ?? 'Starting request...'}
                      </Typography>
                      <Typography variant="caption" tone="muted">
                        {item.details?.prompt}
                      </Typography>
                      {item.createError ? (
                        <Typography
                          variant="caption"
                          className={s.errorText}
                          tone="muted"
                        >
                          {item.createError}
                        </Typography>
                      ) : null}
                      {!item.createError && item.detailsError ? (
                        <Typography
                          variant="caption"
                          className={s.errorText}
                          tone="muted"
                        >
                          {item.detailsError}
                        </Typography>
                      ) : null}
                    </div>

                    <div className={s.resultActions}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          item.generationId &&
                          navigate(`/generations/${item.generationId}`)
                        }
                        disabled={!item.generationId}
                      >
                        Open
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </Grid>
          </div>
        ) : null}
      </Container>
    </AppShell>
  );
}
