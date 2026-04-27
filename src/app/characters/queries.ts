import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import {
  CharacterType,
  type CreateCustomScenarioDto,
  type ICharacter,
  type ICharacterDetails,
  type RoleplayStage,
  type StageDirectives,
  STAGES_IN_ORDER,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type.ts';
import {
  addScenarioStageGift,
  type CharacterCreateDto,
  type CharactersListParams,
  type CharacterStoriesOrderDto,
  type CharacterStoryCreateDto,
  type CharacterStoryUpdateDto,
  type CharacterUpdateDto,
  createCharacter,
  createCharacterStory,
  createCustomCharacter,
  createCustomScenario,
  createScenario,
  deleteCharacter,
  deleteCharacterStory,
  deleteScenario,
  deleteScenarioStageGift,
  getCharacterDetails,
  getCharacters,
  reorderCharacterStories,
  type ScenarioCreateDto,
  type ScenarioUpdateDto,
  type StageGiftCreateDto,
  type StageGiftUpdateDto,
  type StageUpdateDto,
  updateCharacter,
  updateCharacterStory,
  updateScenario,
  updateScenarioStage,
  updateScenarioStageGift,
} from './charactersApi';

const characterKeys = {
  list: (params: CharactersListParams) => ['characters', params] as const,
  details: (id: string) => ['character', id] as const,
};

type CharacterCloneAsAnimeError = Error & {
  createdCharacterId?: string;
};

function isStageDirectivesEmpty(stage: StageDirectives | undefined) {
  if (!stage) return true;

  return Object.values(stage).every((value) => !value.trim());
}

function buildAnimeCharacterPayload(
  character: ICharacterDetails,
): CharacterCreateDto {
  return {
    name: character.name,
    emoji: character.emoji,
    gender: character.gender,
    age: character.age,
    hairColor: character.hairColor,
    hairStyle: character.hairStyle,
    eyeColor: character.eyeColor,
    ethnicity: character.ethnicity,
    bodyType: character.bodyType,
    breastSize: character.breastSize,
    description: character.description,
    isFeatured: character.isFeatured,
    type: CharacterType.Anime,
    isActive: false,
  };
}

function buildScenarioClonePayload(
  scenario: ICharacterDetails['scenarios'][number],
): ScenarioCreateDto {
  const normalizedSlug = scenario.slug?.trim() || '';

  return {
    name: scenario.name.trim(),
    emoji: scenario.emoji.trim(),
    slug: normalizedSlug
      ? normalizedSlug.startsWith('anime-')
        ? normalizedSlug
        : `anime-${normalizedSlug}`
      : undefined,
    description: scenario.description.trim(),
    isActive: scenario.isActive,
    shortDescription: scenario.shortDescription?.trim() || undefined,
    isNew: scenario.isNew,
    personality: scenario.personality.trim(),
    messagingStyle: scenario.messagingStyle.trim(),
    appearance: scenario.appearance.trim(),
    situation: scenario.situation.trim(),
    openingMessage: scenario.openingMessage.trim(),
  };
}

async function cloneCharacterScenarios(
  sourceCharacter: ICharacterDetails,
  targetCharacterId: string,
) {
  for (const scenario of sourceCharacter.scenarios) {
    const createdScenario = await createScenario(
      targetCharacterId,
      buildScenarioClonePayload(scenario),
    );

    for (const stage of STAGES_IN_ORDER) {
      const stagePayload = scenario.stages[stage];
      if (isStageDirectivesEmpty(stagePayload)) {
        continue;
      }

      await updateScenarioStage(targetCharacterId, createdScenario.id, stage, {
        toneAndBehavior: stagePayload.toneAndBehavior.trim(),
        restrictions: stagePayload.restrictions.trim(),
        environment: stagePayload.environment.trim(),
        characterLook: stagePayload.characterLook.trim(),
        goal: stagePayload.goal.trim(),
        escalationTrigger: stagePayload.escalationTrigger.trim(),
      });
    }

    for (const gift of scenario.gifts) {
      const sourceGiftId = gift.gift?.id || gift.giftId;
      if (!sourceGiftId) {
        throw new Error('Unable to copy scenario gift without gift id.');
      }

      await addScenarioStageGift(
        targetCharacterId,
        createdScenario.id,
        gift.stage,
        {
          giftId: sourceGiftId,
          reason: gift.reason.trim(),
          buyText: gift.buyText,
          boughtImgId: gift.boughtImg?.id,
        },
      );
    }
  }
}

type CharactersQueryOptions<T> = {
  enabled?: boolean;
  placeholderData?: (previous: T | undefined) => T | undefined;
};

export function useCharacters(
  params: CharactersListParams,
  options: CharactersQueryOptions<PaginatedResponse<ICharacter>> = {},
) {
  return useQuery({
    queryKey: characterKeys.list(params),
    queryFn: () => getCharacters(params),
    placeholderData: options.placeholderData ?? ((previousData) => previousData),
    enabled: options.enabled ?? true,
  });
}

export function useCharacterDetails(id: string | null) {
  return useQuery({
    queryKey: characterKeys.details(id ?? ''),
    queryFn: () => getCharacterDetails(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCharacter,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      queryClient.setQueryData(characterKeys.details(data.id), data);
      notifySuccess('Character created.', 'Character created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the character.');
    },
  });
}

export function useCreateCustomCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomCharacter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      notifySuccess('Custom character created.', 'Custom character created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the custom character.');
    },
  });
}

export function useCloneCharacterAsAnime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (character: ICharacterDetails) => {
      const createdCharacter = await createCharacter(
        buildAnimeCharacterPayload(character),
      );

      try {
        await cloneCharacterScenarios(character, createdCharacter.id);
      } catch {
        const error = new Error(
          'Anime character created, but scenario copy stopped.',
        ) as CharacterCloneAsAnimeError;
        error.createdCharacterId = createdCharacter.id;
        throw error;
      }

      return createdCharacter;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(data.id),
      });
      notifySuccess('Anime character created.', 'Anime character created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the anime character.');
    },
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      payload,
    }: {
      characterId: string;
      payload: ScenarioCreateDto;
    }) => createScenario(characterId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Scenario created.', 'Scenario created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the scenario.');
    },
  });
}

export function useCreateCustomScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      payload,
    }: {
      characterId: string;
      payload: CreateCustomScenarioDto;
    }) => createCustomScenario(characterId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Custom scenario created.', 'Custom scenario created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the custom scenario.');
    },
  });
}

export function useUpdateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      payload,
    }: {
      characterId: string;
      scenarioId: string;
      payload: ScenarioUpdateDto;
    }) => updateScenario(characterId, scenarioId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Scenario updated.', 'Scenario updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the scenario.');
    },
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
    }: {
      characterId: string;
      scenarioId: string;
    }) => deleteScenario(characterId, scenarioId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Scenario deleted.', 'Scenario deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the scenario.');
    },
  });
}

export function useUpdateScenarioStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      stage,
      payload,
    }: {
      characterId: string;
      scenarioId: string;
      stage: RoleplayStage;
      payload: StageUpdateDto;
    }) => updateScenarioStage(characterId, scenarioId, stage, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Stage updated.', 'Stage updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the stage.');
    },
  });
}

export function useCreateScenarioStageGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      stage,
      payload,
    }: {
      characterId: string;
      scenarioId: string;
      stage: RoleplayStage;
      payload: StageGiftCreateDto;
    }) => addScenarioStageGift(characterId, scenarioId, stage, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Gift added.', 'Gift added.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to add the gift.');
    },
  });
}

export function useUpdateScenarioStageGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      stage,
      characterGiftId,
      payload,
    }: {
      characterId: string;
      scenarioId: string;
      stage: RoleplayStage;
      characterGiftId: string;
      payload: StageGiftUpdateDto;
    }) =>
      updateScenarioStageGift(
        characterId,
        scenarioId,
        stage,
        characterGiftId,
        payload,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Gift updated.', 'Gift updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the gift.');
    },
  });
}

export function useDeleteScenarioStageGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      stage,
      characterGiftId,
    }: {
      characterId: string;
      scenarioId: string;
      stage: RoleplayStage;
      characterGiftId: string;
    }) =>
      deleteScenarioStageGift(characterId, scenarioId, stage, characterGiftId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Gift deleted.', 'Gift deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the gift.');
    },
  });
}

export function useUpdateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CharacterUpdateDto }) =>
      updateCharacter(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(characterKeys.details(data.id), data);
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      notifySuccess('Character updated.', 'Character updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the character.');
    },
  });
}

export function useCreateCharacterStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      payload,
    }: {
      characterId: string;
      payload: CharacterStoryCreateDto;
    }) => createCharacterStory(characterId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Story created.', 'Story created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the story.');
    },
  });
}

export function useUpdateCharacterStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      storyId,
      payload,
    }: {
      characterId: string;
      storyId: string;
      payload: CharacterStoryUpdateDto;
    }) => updateCharacterStory(characterId, storyId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Story updated.', 'Story updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the story.');
    },
  });
}

export function useReorderCharacterStories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      payload,
    }: {
      characterId: string;
      payload: CharacterStoriesOrderDto;
    }) => reorderCharacterStories(characterId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
    },
    onError: (error) => {
      notifyError(error, 'Unable to reorder the stories.');
    },
  });
}

export function useDeleteCharacterStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      storyId,
    }: {
      characterId: string;
      storyId: string;
    }) => deleteCharacterStory(characterId, storyId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Story deleted.', 'Story deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the story.');
    },
  });
}

export function useDeleteCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: characterKeys.details(id) });
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      notifySuccess('Character deleted.', 'Character deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the character.');
    },
  });
}
