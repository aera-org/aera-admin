import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  CharacterBodyType,
  CharacterBreastSize,
  CharacterEthnicity,
  CharacterEyeColor,
  CharacterHairColor,
  CharacterHairStyle,
  CharacterPersonality,
  CharacterType,
  CreateCustomScenarioDto,
  CustomCharacterCreateDto,
  ICharacter,
  ICharacterDetails,
  RoleplayStage,
  ScenarioLiveGenerations,
  StageDirectives,
  StoryType,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type.ts';

export type CharactersListParams = {
  search?: string;
  userId?: string;
  isCustom?: boolean;
  order?: string;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load characters.';
const createFallbackError = 'Unable to create the character.';
const createCustomFallbackError = 'Unable to create the custom character.';
const updateFallbackError = 'Unable to update the character.';
const deleteFallbackError = 'Unable to delete the character.';
const createScenarioFallbackError = 'Unable to create the scenario.';
const createCustomScenarioFallbackError =
  'Unable to create the custom scenario.';
const deleteScenarioFallbackError = 'Unable to delete the scenario.';
const createScenarioGiftFallbackError = 'Unable to add the gift.';
const updateScenarioGiftFallbackError = 'Unable to update the gift.';
const deleteScenarioGiftFallbackError = 'Unable to delete the gift.';
const createStoryFallbackError = 'Unable to create the story.';
const updateStoryFallbackError = 'Unable to update the story.';
const deleteStoryFallbackError = 'Unable to delete the story.';
const reorderStoriesFallbackError = 'Unable to reorder the stories.';

export type CharacterUpdateDto = {
  name: string;
  emoji: string;
  loraId: string;
  gender: string;
  age?: number
  hairColor: CharacterHairColor;
  hairStyle: CharacterHairStyle;
  eyeColor: CharacterEyeColor;
  ethnicity: CharacterEthnicity;
  bodyType: CharacterBodyType;
  breastSize: CharacterBreastSize;
  isActive: boolean;
  isFeatured?: boolean;
  description: string;
  personality: CharacterPersonality[];
  avatarId: string;
  promoImgId?: string;
};

export type CharacterCreateDto = {
  name: string;
  emoji: string;
  loraId?: string;
  gender: string;
  age?: number;
  hairColor: CharacterHairColor;
  hairStyle: CharacterHairStyle;
  eyeColor: CharacterEyeColor;
  ethnicity: CharacterEthnicity;
  bodyType: CharacterBodyType;
  breastSize: CharacterBreastSize;
  description: string;
  avatarId?: string;
  type?: CharacterType;
  isActive?: boolean;
  isFeatured?: boolean;
  promoImgId?: string;
};

export type ScenarioCreateDto = {
  name: string;
  emoji: string;
  slug?: string;
  description: string;
  isActive?: boolean;
  shortDescription?: string;
  isNew?: boolean;
  isPromoted?: boolean;
  promoText?: string;
  isTop?: boolean;
  promoImgId?: string;
  promoImgHorizontalId?: string;
  personality: string;
  messagingStyle: string;
  appearance: string;
  situation: string;
  openingMessage: string;
  openingImageId?: string;
};

export type ScenarioUpdateDto = ScenarioCreateDto & {
  liveGenerations?: ScenarioLiveGenerations;
};
export type StageUpdateDto = StageDirectives;
export type StageGiftCreateDto = {
  giftId: string;
  reason: string;
  buyText: string;
  boughtImgId?: string;
};
export type StageGiftUpdateDto = {
  reason: string;
  buyText: string;
  boughtImgId?: string;
};
export type CharacterStoryCreateDto = {
  fileId: string;
  type: StoryType;
};
export type CharacterStoryUpdateDto = {
  idx: number;
  isActive: boolean;
};
export type CharacterStoriesOrderDto = {
  order: string[];
};

async function parseJsonIfPresent(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

export async function getCharacters(params: CharactersListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.userId) query.set('userId', params.userId);
  if (typeof params.isCustom === 'boolean') {
    query.set('isCustom', String(params.isCustom));
  }
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

export async function createCustomCharacter(payload: CustomCharacterCreateDto) {
  const res = await apiFetch('/admin/characters/custom', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createCustomFallbackError);
  }
  return (await res.json()) as ICharacter;
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

export async function createCustomScenario(
  characterId: string,
  payload: CreateCustomScenarioDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/custom`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, createCustomScenarioFallbackError);
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

export async function deleteScenario(characterId: string, scenarioId: string) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, deleteScenarioFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function updateScenarioStage(
  characterId: string,
  scenarioId: string,
  stage: RoleplayStage,
  payload: StageUpdateDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}/stages/${stage}`,
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

export async function addScenarioStageGift(
  characterId: string,
  scenarioId: string,
  stage: RoleplayStage,
  payload: StageGiftCreateDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}/stages/${stage}/gifts`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, createScenarioGiftFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function createCharacterStory(
  characterId: string,
  payload: CharacterStoryCreateDto,
) {
  const res = await apiFetch(`/admin/characters/${characterId}/stories`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createStoryFallbackError);
  }
  return (await res.json()) as ICharacterDetails['stories'][number];
}

export async function updateCharacterStory(
  characterId: string,
  storyId: string,
  payload: CharacterStoryUpdateDto,
) {
  const res = await apiFetch(`/admin/characters/${characterId}/stories/${storyId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateStoryFallbackError);
  }
  return (await res.json()) as ICharacterDetails['stories'][number];
}

export async function deleteCharacterStory(characterId: string, storyId: string) {
  const res = await apiFetch(`/admin/characters/${characterId}/stories/${storyId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteStoryFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function reorderCharacterStories(
  characterId: string,
  payload: CharacterStoriesOrderDto,
) {
  const res = await apiFetch(`/admin/characters/${characterId}/stories/order`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, reorderStoriesFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function updateScenarioStageGift(
  characterId: string,
  scenarioId: string,
  stage: RoleplayStage,
  characterGiftId: string,
  payload: StageGiftUpdateDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}/stages/${stage}/gifts/${characterGiftId}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, updateScenarioGiftFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function deleteScenarioStageGift(
  characterId: string,
  scenarioId: string,
  stage: RoleplayStage,
  characterGiftId: string,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}/stages/${stage}/gifts/${characterGiftId}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, deleteScenarioGiftFallbackError);
  }
  return await parseJsonIfPresent(res);
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
