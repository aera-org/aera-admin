import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type {
  IScenarioGenDetails,
  ScenarioGenCreateDto,
  ScenarioGenReplaceDto,
  ScenarioGenSaveDto,
} from '@/common/types';

import {
  createScenarioGen,
  deleteScenarioGen,
  getScenarioGenDetails,
  getScenarioGens,
  replaceScenarioGen,
  saveScenarioGen,
  type ScenarioGenListParams,
} from './scenarioGenApi';

const scenarioGenKeys = {
  list: (params: ScenarioGenListParams) => ['scenario-gen', params] as const,
  detail: (id: string) => ['scenario-gen', 'detail', id] as const,
};

export function useScenarioGens(params: ScenarioGenListParams) {
  return useQuery({
    queryKey: scenarioGenKeys.list(params),
    queryFn: () => getScenarioGens(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useScenarioGenDetails(
  id: string | null,
  initialData?: IScenarioGenDetails | null,
) {
  return useQuery({
    queryKey: scenarioGenKeys.detail(id ?? ''),
    queryFn: () => getScenarioGenDetails(id ?? ''),
    enabled: Boolean(id),
    initialData: initialData ?? undefined,
  });
}

export function useCreateScenarioGen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ScenarioGenCreateDto) => createScenarioGen(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenario-gen'] });
      queryClient.setQueryData(scenarioGenKeys.detail(data.id), data);
      notifySuccess('Scenario generated.', 'Scenario generated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to generate the scenario.');
    },
  });
}

export function useSaveScenarioGen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ScenarioGenSaveDto }) =>
      saveScenarioGen(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scenario-gen'] });
      queryClient.invalidateQueries({
        queryKey: scenarioGenKeys.detail(variables.id),
      });
      notifySuccess('Scenario saved.', 'Scenario saved.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to save the scenario.');
    },
  });
}

export function useReplaceScenarioGen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      characterId: string;
      payload: ScenarioGenReplaceDto;
    }) => replaceScenarioGen(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scenario-gen'] });
      queryClient.invalidateQueries({
        queryKey: scenarioGenKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: ['character', variables.characterId],
      });
      notifySuccess('Scenario replaced.', 'Scenario replaced.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to replace the scenario.');
    },
  });
}

export function useDeleteScenarioGen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteScenarioGen(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['scenario-gen'] });
      queryClient.removeQueries({ queryKey: scenarioGenKeys.detail(id) });
      notifySuccess(
        'Generated scenario deleted.',
        'Generated scenario deleted.',
      );
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the generated scenario.');
    },
  });
}
