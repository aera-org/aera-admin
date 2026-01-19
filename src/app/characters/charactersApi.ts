import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { ICharacter, ICharacterDetails } from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type.ts';

export type CharactersListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load characters.';
const createFallbackError = 'Unable to create the character.';
const updateFallbackError = 'Unable to update the character.';
const deleteFallbackError = 'Unable to delete the character.';

export type CharacterUpdateDto = {
  name: string;
  emoji: string;
  loraId: string;
  gender: string;
  isActive: boolean;
};

export type CharacterCreateDto = {
  name: string;
  emoji: string;
  loraId: string;
  gender: string;
};

export async function getCharacters(params: CharactersListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/characters${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<ICharacter>;
}

export async function getCharacterDetails(id: string) {
  const res = await apiFetch(`/admin/characters/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as ICharacterDetails;
}

export async function createCharacter(payload: CharacterCreateDto) {
  const res = await apiFetch('/admin/characters', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as ICharacterDetails;
}

export async function updateCharacter(id: string, payload: CharacterUpdateDto) {
  const res = await apiFetch(`/admin/characters/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as ICharacterDetails;
}

export async function deleteCharacter(id: string) {
  const res = await apiFetch(`/admin/characters/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
}
