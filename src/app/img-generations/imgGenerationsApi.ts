import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  IImgGeneration,
  IImgGenerationDetails,
  ImgGenerationRequest,
  RoleplayStage,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type ImgGenerationsListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
  characterId?: string;
  scenarioId?: string;
  stage?: RoleplayStage;
};

const fallbackError = 'Unable to load generations.';
const detailsFallbackError = 'Unable to load the generation.';
const createFallbackError = 'Unable to generate the image.';
const deleteFallbackError = 'Unable to delete the generation.';
const regenerateFallbackError = 'Unable to regenerate the generation.';

async function parseJsonIfPresent(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

export async function getImgGenerations(params: ImgGenerationsListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));
  if (params.characterId) query.set('characterId', params.characterId);
  if (params.scenarioId) query.set('scenarioId', params.scenarioId);
  if (params.stage) query.set('stage', params.stage);

  const suffix = query.toString();
  const res = await apiFetch(
    `/admin/test-img-generations${suffix ? `?${suffix}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<IImgGeneration>;
}

export async function getImgGenerationDetails(id: string) {
  const res = await apiFetch(`/admin/test-img-generations/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, detailsFallbackError);
  }
  return (await res.json()) as IImgGenerationDetails;
}

export async function createImgGeneration(payload: ImgGenerationRequest) {
  const res = await apiFetch('/admin/test-img-generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as { id: string };
}

export async function deleteImgGeneration(id: string) {
  const res = await apiFetch(`/admin/test-img-generations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
  return (await res.json()) as { success: boolean };
}

export async function regenerateImgGeneration(id: string) {
  const res = await apiFetch(`/admin/test-img-generations/${id}/regenerate`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw await buildApiError(res, regenerateFallbackError);
  }
  return await parseJsonIfPresent(res);
}
