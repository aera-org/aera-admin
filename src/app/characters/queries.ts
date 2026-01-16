import { useQuery } from '@tanstack/react-query';

import { type CharactersListParams, getCharacters } from './charactersApi';

const characterKeys = {
  list: (params: CharactersListParams) => ['characters', params] as const,
};

export function useCharacters(params: CharactersListParams) {
  return useQuery({
    queryKey: characterKeys.list(params),
    queryFn: () => getCharacters(params),
    placeholderData: (previousData) => previousData,
  });
}
