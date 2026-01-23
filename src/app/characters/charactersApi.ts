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
const createScenarioFallbackError = 'Unable to create the scenario.';
const createSceneFallbackError = 'Unable to create the scene.';

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

export type ScenarioCreateDto = {
  name: string;
  emoji: string;
  description: string;
  personality: string;
  messagingStyle: string;
  appearance: string;
  situation: string;
};

export type ScenarioUpdateDto = ScenarioCreateDto & {
  scenesOrder?: string[];
};

export type PhaseUpdateDto = {
  toneAndBehavior: string;
  photoSendingRules: string;
  restrictions: string;
  goal: string;
};

export type SceneCreateDto = {
  name: string;
  description: string;
  goal: string;
  openingMessage: string;
  visualChange: string;
  openingImageId: string;
};

export type SceneUpdateDto = SceneCreateDto;

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

export async function createScenario(
  characterId: string,
  payload: ScenarioCreateDto,
) {
  const res = await apiFetch(`/admin/characters/${characterId}/scenarios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createScenarioFallbackError);
  }
  return (await res.json()) as ICharacterDetails['scenarios'][number];
}

export async function updateScenario(
  characterId: string,
  scenarioId: string,
  payload: ScenarioUpdateDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as ICharacterDetails['scenarios'][number];
}

export async function updateScenarioPhase(
  characterId: string,
  scenarioId: string,
  phase: string,
  payload: PhaseUpdateDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}/phases/${phase}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as ICharacterDetails['scenarios'][number];
}

export async function createScene(
  characterId: string,
  scenarioId: string,
  payload: SceneCreateDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}/scenes`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, createSceneFallbackError);
  }
  return (await res.json()) as ICharacterDetails['scenarios'][number];
}

export async function updateScene(
  characterId: string,
  scenarioId: string,
  sceneId: string,
  payload: SceneUpdateDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}/scenes/${sceneId}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as ICharacterDetails['scenarios'][number];
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
