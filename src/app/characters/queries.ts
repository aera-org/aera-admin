import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import {
  type CharacterUpdateDto,
  type CharactersListParams,
  createCharacter,
  deleteCharacter,
  getCharacterDetails,
  getCharacters,
  updateCharacter,
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
