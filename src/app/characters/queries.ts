import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import {
  type CharacterUpdateDto,
  type CharactersListParams,
  type ScenarioCreateDto,
  type ScenarioUpdateDto,
  type PhaseUpdateDto,
  type SceneCreateDto,
  type SceneUpdateDto,
  createCharacter,
  createScenario,
  createScene,
  deleteCharacter,
  getCharacterDetails,
  getCharacters,
  updateCharacter,
  updateScenario,
  updateScene,
  updateScenarioPhase,
} from './charactersApi';

const characterKeys = {
  list: (params: CharactersListParams) => ['characters', params] as const,
  details: (id: string) => ['character', id] as const,
};

export function useCharacters(params: CharactersListParams) {
  return useQuery({
    queryKey: characterKeys.list(params),
    queryFn: () => getCharacters(params),
    placeholderData: (previousData) => previousData,
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

export function useUpdateScenarioPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      phase,
      payload,
    }: {
      characterId: string;
      scenarioId: string;
      phase: string;
      payload: PhaseUpdateDto;
    }) => updateScenarioPhase(characterId, scenarioId, phase, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Phase updated.', 'Phase updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the phase.');
    },
  });
}

export function useCreateScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      payload,
    }: {
      characterId: string;
      scenarioId: string;
      payload: SceneCreateDto;
    }) => createScene(characterId, scenarioId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Scene created.', 'Scene created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the scene.');
    },
  });
}

export function useUpdateScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      sceneId,
      payload,
    }: {
      characterId: string;
      scenarioId: string;
      sceneId: string;
      payload: SceneUpdateDto;
    }) => updateScene(characterId, scenarioId, sceneId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Scene updated.', 'Scene updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the scene.');
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
