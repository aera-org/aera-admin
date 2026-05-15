import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  useCharacterImageVectorSearch,
  useDeleteCharacterImage,
} from '@/app/character-images';
import { useCharacterDetails, useCharacters } from '@/app/characters';
import { useUsers } from '@/app/users';
import {
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  Select,
  Stack,
  Switch,
  Textarea,
  Typography,
} from '@/atoms';
import type { CharacterImageVectorSearchPayload, ITgUser } from '@/common/types';
import { Pose, RoleplayStage, STAGES_IN_ORDER } from '@/common/types';
import {
  formatCharacterSelectLabel,
  getVisibleUserRequestFieldKeys,
  poseOptions,
  USER_REQUEST_FIELD_CONFIG,
} from '@/common/utils';
import { SearchSelect } from '@/components/molecules';
import { AppShell } from '@/components/templates';
import {
  buildUserRequestPayload,
  createEmptyUserRequestDraft,
  type GenerationUserRequestDraft,
  type UserRequestFieldKey,
} from '@/pages/generations/userRequest';

import { CharacterImagesGallery } from './CharacterImagesGallery';
import s from './CharacterImagesPage.module.scss';
import {
  DEFAULT_PAGE_SIZE,
  formatStage,
  parsePageSize,
  parsePositiveNumber,
} from './characterImagesShared';

type VectorSearchCriteria = Omit<
  CharacterImageVectorSearchPayload,
  'skip' | 'take'
>;

type SubmittedVectorSearch = {
  criteria: VectorSearchCriteria;
  criteriaKey: string;
  page: number;
  pageSize: number;
};

type QueryUpdate = {
  page?: number;
  pageSize?: number;
  isPregenerated?: boolean;
  readyOnly?: boolean;
  characterId?: string;
  scenarioId?: string;
  stage?: string;
  userId?: string;
  pose?: string;
  isAnal?: string;
  imageId?: string;
};

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_IS_PREGENERATED = true;
const DEFAULT_READY_ONLY = true;
const ANAL_FILTER_ALL = 'all';
const BOOLEAN_FILTER_VALUES = new Set(['true', 'false']);
const POSE_VALUES = new Set(Object.values(Pose));

const ANAL_FILTER_OPTIONS = [
  { label: 'Any', value: ANAL_FILTER_ALL },
  { label: 'Anal', value: 'true' },
  { label: 'Non-anal', value: 'false' },
];

const STAGE_OPTIONS = STAGES_IN_ORDER.map((stage) => ({
  label: formatStage(stage),
  value: stage,
}));

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function parseBooleanParam(value: string | null, fallback: boolean) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function resolveStage(value: string | null) {
  if (STAGES_IN_ORDER.includes(value as RoleplayStage)) {
    return value as RoleplayStage;
  }
  return '';
}

function resolvePose(value: string | null) {
  if (POSE_VALUES.has(value as Pose)) {
    return value as Pose;
  }
  return '';
}

function resolveAnalFilter(value: string | null) {
  if (value === ANAL_FILTER_ALL || BOOLEAN_FILTER_VALUES.has(value ?? '')) {
    return value ?? ANAL_FILTER_ALL;
  }
  return ANAL_FILTER_ALL;
}

function formatUserName(user: ITgUser) {
  const name = [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return name || user.username || user.id;
}

function formatUserMeta(user: ITgUser) {
  const username = user.username?.trim();
  return username ? `@${username} / ${user.id}` : user.id;
}

export function CharacterImagesVectorSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');
  const rawIsPregenerated = searchParams.get('isPregenerated');
  const rawReadyOnly = searchParams.get('readyOnly');
  const rawCharacterId = searchParams.get('characterId') ?? '';
  const rawScenarioId = searchParams.get('scenarioId') ?? '';
  const rawStage = searchParams.get('stage');
  const rawUserId = searchParams.get('userId') ?? '';
  const rawPose = searchParams.get('pose');
  const rawIsAnal = searchParams.get('isAnal');
  const rawImageId = searchParams.get('imageId') ?? '';

  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);
  const isPregenerated = parseBooleanParam(
    rawIsPregenerated,
    DEFAULT_IS_PREGENERATED,
  );
  const readyOnly = parseBooleanParam(rawReadyOnly, DEFAULT_READY_ONLY);
  const characterId = rawCharacterId.trim();
  const scenarioId = rawScenarioId.trim();
  const stage = resolveStage(rawStage);
  const userId = rawUserId.trim();
  const pose = resolvePose(rawPose);
  const analFilter = resolveAnalFilter(rawIsAnal);
  const selectedImageId = rawImageId.trim() || null;

  const [characterSearch, setCharacterSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRequest, setUserRequest] = useState<GenerationUserRequestDraft>(
    () => createEmptyUserRequestDraft(),
  );
  const [submittedSearch, setSubmittedSearch] =
    useState<SubmittedVectorSearch | null>(null);

  const debouncedCharacterSearch = useDebouncedValue(
    characterSearch,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedUserSearch = useDebouncedValue(userSearch, SEARCH_DEBOUNCE_MS);
  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.page !== undefined) {
        if (update.page > 1) {
          next.set('page', String(update.page));
        } else {
          next.delete('page');
        }
      }

      if (update.pageSize !== undefined) {
        if (update.pageSize !== DEFAULT_PAGE_SIZE) {
          next.set('pageSize', String(update.pageSize));
        } else {
          next.delete('pageSize');
        }
      }

      if (update.isPregenerated !== undefined) {
        if (update.isPregenerated !== DEFAULT_IS_PREGENERATED) {
          next.set('isPregenerated', String(update.isPregenerated));
        } else {
          next.delete('isPregenerated');
        }
      }

      if (update.readyOnly !== undefined) {
        if (update.readyOnly !== DEFAULT_READY_ONLY) {
          next.set('readyOnly', String(update.readyOnly));
        } else {
          next.delete('readyOnly');
        }
      }

      if (update.characterId !== undefined) {
        const nextCharacterId = update.characterId.trim();
        if (nextCharacterId) {
          next.set('characterId', nextCharacterId);
        } else {
          next.delete('characterId');
        }
      }

      if (update.scenarioId !== undefined) {
        const nextScenarioId = update.scenarioId.trim();
        if (nextScenarioId) {
          next.set('scenarioId', nextScenarioId);
        } else {
          next.delete('scenarioId');
        }
      }

      if (update.stage !== undefined) {
        if (update.stage) {
          next.set('stage', update.stage);
        } else {
          next.delete('stage');
        }
      }

      if (update.userId !== undefined) {
        const nextUserId = update.userId.trim();
        if (nextUserId) {
          next.set('userId', nextUserId);
        } else {
          next.delete('userId');
        }
      }

      if (update.pose !== undefined) {
        if (update.pose) {
          next.set('pose', update.pose);
        } else {
          next.delete('pose');
        }
      }

      if (update.isAnal !== undefined) {
        if (update.isAnal && update.isAnal !== ANAL_FILTER_ALL) {
          next.set('isAnal', update.isAnal);
        } else {
          next.delete('isAnal');
        }
      }

      if (update.imageId !== undefined) {
        if (update.imageId) {
          next.set('imageId', update.imageId);
        } else {
          next.delete('imageId');
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  const characterQueryParams = useMemo(
    () => ({
      search: debouncedCharacterSearch || undefined,
      order: 'ASC',
      skip: 0,
      take: 20,
    }),
    [debouncedCharacterSearch],
  );
  const { data: characterData, isLoading: isCharactersLoading } =
    useCharacters(characterQueryParams);

  const userQueryParams = useMemo(
    () => ({
      search: debouncedUserSearch || undefined,
      order: 'DESC',
      skip: 0,
      take: 20,
    }),
    [debouncedUserSearch],
  );
  const { data: usersData, isLoading: isUsersLoading } =
    useUsers(userQueryParams);

  const { data: characterDetails, isLoading: isScenariosLoading } =
    useCharacterDetails(characterId || null);

  const characterOptions = useMemo(
    () =>
      (characterData?.data ?? []).map((character) => ({
        id: character.id,
        label: formatCharacterSelectLabel(character.name, character.type),
        meta: character.id,
      })),
    [characterData?.data],
  );

  const userOptions = useMemo(
    () =>
      (usersData?.data ?? []).map((user) => ({
        id: user.id,
        label: formatUserName(user),
        meta: formatUserMeta(user),
      })),
    [usersData?.data],
  );

  const scenarioOptions = useMemo(
    () =>
      (characterDetails?.scenarios ?? []).map((scenario) => ({
        label: scenario.name || scenario.id,
        value: scenario.id,
      })),
    [characterDetails?.scenarios],
  );

  const scenarioSelectOptions = useMemo(() => {
    if (!characterId) {
      return [{ label: 'Select character first', value: '', disabled: true }];
    }
    if (isScenariosLoading) {
      return [{ label: 'Loading scenarios...', value: '', disabled: true }];
    }
    return scenarioOptions;
  }, [characterId, isScenariosLoading, scenarioOptions]);

  useEffect(() => {
    if (!scenarioId) return;
    if (!characterId) {
      updateSearchParams({ scenarioId: '', page: 1 }, true);
      return;
    }
    if (isScenariosLoading) return;
    const stillExists = scenarioOptions.some(
      (scenario) => scenario.value === scenarioId,
    );
    if (!stillExists) {
      updateSearchParams({ scenarioId: '', page: 1 }, true);
    }
  }, [
    characterId,
    isScenariosLoading,
    scenarioId,
    scenarioOptions,
    updateSearchParams,
  ]);

  const visibleUserRequestFieldKeys = useMemo(
    () => getVisibleUserRequestFieldKeys(stage || null),
    [stage],
  );

  const userRequestPayload = useMemo(
    () => buildUserRequestPayload(userRequest, stage || null),
    [stage, userRequest],
  );

  const currentSearchCriteria = useMemo<VectorSearchCriteria | null>(
    () => {
      if (!characterId || !scenarioId || !stage || !userRequestPayload) {
        return null;
      }

      return {
        isPregenerated,
        readyOnly,
        stage,
        characterId,
        scenarioId,
        userId: userId || undefined,
        pose: pose || undefined,
        isAnal:
          analFilter === ANAL_FILTER_ALL ? undefined : analFilter === 'true',
        userRequest: userRequestPayload,
      };
    },
    [
      analFilter,
      characterId,
      isPregenerated,
      pose,
      readyOnly,
      scenarioId,
      stage,
      userId,
      userRequestPayload,
    ],
  );

  const currentCriteriaKey = useMemo(
    () => (currentSearchCriteria ? JSON.stringify(currentSearchCriteria) : ''),
    [currentSearchCriteria],
  );

  useEffect(() => {
    if (!submittedSearch) return;
    if (submittedSearch.criteriaKey !== currentCriteriaKey) {
      setSubmittedSearch(null);
    }
  }, [currentCriteriaKey, submittedSearch]);

  const vectorSearchPayload = useMemo<CharacterImageVectorSearchPayload | null>(
    () => {
      if (!submittedSearch) return null;
      return {
        ...submittedSearch.criteria,
        skip: (submittedSearch.page - 1) * submittedSearch.pageSize,
        take: submittedSearch.pageSize,
      };
    },
    [submittedSearch],
  );

  const hasSubmittedSearch = Boolean(submittedSearch);
  const { data, error, isLoading, refetch } = useCharacterImageVectorSearch(
    vectorSearchPayload,
    hasSubmittedSearch,
  );
  const deleteImageMutation = useDeleteCharacterImage();

  const images = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.total ?? 0;
  const displayPage = submittedSearch?.page ?? page;
  const displayPageSize = submittedSearch?.pageSize ?? pageSize;
  const effectiveTake = data?.take ?? displayPageSize;
  const effectiveSkip = data?.skip ?? (displayPage - 1) * displayPageSize;
  const totalPages = total > 0 ? Math.ceil(total / effectiveTake) : 1;

  useEffect(() => {
    if (!data || total === 0) return;
    if (submittedSearch && submittedSearch.page > totalPages) {
      setSubmittedSearch((prev) =>
        prev ? { ...prev, page: totalPages } : prev,
      );
      updateSearchParams({ page: totalPages }, true);
    }
  }, [data, submittedSearch, total, totalPages, updateSearchParams]);

  const updateUserRequestField = (
    fieldKey: UserRequestFieldKey,
    value: string,
  ) => {
    setUserRequest((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleDeleteImage = async (imageId: string) => {
    await deleteImageMutation.mutateAsync(imageId);
    if (selectedImageId === imageId) {
      updateSearchParams({ imageId: '' }, true);
    }
  };

  const handleSearch = () => {
    if (!currentSearchCriteria || !currentCriteriaKey) return;
    setSubmittedSearch({
      criteria: currentSearchCriteria,
      criteriaKey: currentCriteriaKey,
      page: 1,
      pageSize,
    });
    updateSearchParams({ page: 1 }, true);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Vector Image Search</Typography>
            <Typography variant="caption" tone="muted">
              Search paginated character images with the vector-search endpoint.
            </Typography>
          </div>
          <Button
            onClick={handleSearch}
            disabled={!currentSearchCriteria}
            loading={isLoading && hasSubmittedSearch}
          >
            Search
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Character"
              labelFor="vector-images-character"
            >
              <SearchSelect
                id="vector-images-character"
                value={characterId}
                options={characterOptions}
                search={characterSearch}
                onSearchChange={setCharacterSearch}
                onSelect={(value) =>
                  updateSearchParams({
                    characterId: value,
                    scenarioId: '',
                    page: 1,
                  })
                }
                placeholder={
                  isCharactersLoading ? 'Loading characters...' : 'Select character'
                }
                loading={isCharactersLoading}
                emptyLabel="No characters found."
              />
            </Field>

            <Field
              className={s.filterField}
              label="Scenario"
              labelFor="vector-images-scenario"
            >
              <Select
                id="vector-images-scenario"
                options={scenarioSelectOptions}
                value={characterId ? scenarioId : ''}
                placeholder="Select scenario"
                disabled={!characterId || isScenariosLoading}
                onChange={(value) =>
                  updateSearchParams({ scenarioId: value, page: 1 })
                }
                fullWidth
              />
            </Field>

            <Field label="Stage" labelFor="vector-images-stage">
              <Select
                id="vector-images-stage"
                options={STAGE_OPTIONS}
                value={stage}
                placeholder="Select stage"
                onChange={(value) =>
                  updateSearchParams({ stage: value, page: 1 })
                }
              />
            </Field>
          </div>

          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="User"
              labelFor="vector-images-user"
            >
              <SearchSelect
                id="vector-images-user"
                value={userId}
                options={userOptions}
                search={userSearch}
                onSearchChange={setUserSearch}
                onSelect={(value) => updateSearchParams({ userId: value, page: 1 })}
                placeholder={isUsersLoading ? 'Loading users...' : 'Any user'}
                loading={isUsersLoading}
                emptyLabel="No users found."
              />
            </Field>

            <Field label="Pose" labelFor="vector-images-pose">
              <Select
                id="vector-images-pose"
                options={[
                  { label: 'Any pose', value: '' },
                  ...poseOptions.map((option) => ({
                    label: option.label,
                    value: option.value,
                  })),
                ]}
                value={pose}
                onChange={(value) =>
                  updateSearchParams({ pose: value, page: 1 })
                }
              />
            </Field>

            <Field label="Anal" labelFor="vector-images-anal">
              <Select
                id="vector-images-anal"
                options={ANAL_FILTER_OPTIONS}
                value={analFilter}
                onChange={(value) =>
                  updateSearchParams({ isAnal: value, page: 1 })
                }
              />
            </Field>
          </div>

          <div className={s.toggleGrid}>
            <div className={s.toggleRow}>
              <Switch
                checked={isPregenerated}
                onChange={(event) =>
                  updateSearchParams({
                    isPregenerated: event.target.checked,
                    page: 1,
                  })
                }
                label="Pregenerated"
              />
            </div>
            <div className={s.toggleRow}>
              <Switch
                checked={readyOnly}
                onChange={(event) =>
                  updateSearchParams({
                    readyOnly: event.target.checked,
                    page: 1,
                  })
                }
                label="Ready only"
              />
            </div>
          </div>

          <Stack gap="12px">
            <Typography variant="h3">User request</Typography>
            <FormRow columns={2}>
              {visibleUserRequestFieldKeys.map((fieldKey) => {
                const config = USER_REQUEST_FIELD_CONFIG[fieldKey];
                return (
                  <Field
                    key={fieldKey}
                    label={config.label}
                    labelFor={`vector-images-user-request-${fieldKey}`}
                  >
                    <Textarea
                      id={`vector-images-user-request-${fieldKey}`}
                      value={userRequest[fieldKey]}
                      placeholder={config.placeholder}
                      rows={3}
                      onChange={(event) =>
                        updateUserRequestField(fieldKey, event.target.value)
                      }
                    />
                  </Field>
                );
              })}
            </FormRow>
            <Typography variant="caption" tone="muted">
              Comma-separated values are sent as arrays. Results update after
              required fields are complete.
            </Typography>
          </Stack>
        </div>

        {hasSubmittedSearch ? (
          <CharacterImagesGallery
            images={images}
            total={total}
            effectiveSkip={effectiveSkip}
            effectiveTake={effectiveTake}
            page={displayPage}
            pageSize={displayPageSize}
            totalPages={totalPages}
            isLoading={isLoading}
            hasLoadedData={Boolean(data)}
            error={error}
            selectedImageId={selectedImageId}
            emptyDescription="No images match this vector-search request."
            onRetry={() => void refetch()}
            onImageOpen={(imageId) => updateSearchParams({ imageId })}
            onImageClose={() => updateSearchParams({ imageId: '' })}
            onPageChange={(nextPage) => {
              setSubmittedSearch((prev) =>
                prev ? { ...prev, page: nextPage } : prev,
              );
              updateSearchParams({ page: nextPage });
            }}
            onPageSizeChange={(nextPageSize) => {
              setSubmittedSearch((prev) =>
                prev
                  ? { ...prev, page: 1, pageSize: nextPageSize }
                  : prev,
              );
              updateSearchParams({ pageSize: nextPageSize, page: 1 });
            }}
            onDeleteImage={(imageId) => void handleDeleteImage(imageId)}
            deletePendingId={
              deleteImageMutation.isPending
                ? (deleteImageMutation.variables ?? null)
                : null
            }
            deleteDisabled={deleteImageMutation.isPending}
          />
        ) : (
          <EmptyState
            title="Complete search criteria"
            description="Select character, scenario, stage, and enter a user request to run vector search."
          />
        )}
      </Container>
    </AppShell>
  );
}
