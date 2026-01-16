import { useQuery } from '@tanstack/react-query';

import {
  type CharactersListParams,
  getCharacterDetails,
  getCharacters,
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
