import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  IScenarioGen,
  IScenarioGenDetails,
  ScenarioGenCreateDto,
  ScenarioGenReplaceDto,
  ScenarioGenSaveDto,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type ScenarioGenListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
  characterId?: string;
  isSaved?: boolean;
};

const listFallbackError = 'Unable to load generated scenarios.';
const detailFallbackError = 'Unable to load generated scenario details.';
const createFallbackError = 'Unable to generate the scenario.';
const saveFallbackError = 'Unable to save the scenario.';
const replaceFallbackError = 'Unable to replace the scenario.';
const deleteFallbackError = 'Unable to delete the generated scenario.';

function normalizeListResponse(
  payload: PaginatedResponse<IScenarioGen> | IScenarioGen[],
  params: ScenarioGenListParams,
): PaginatedResponse<IScenarioGen> {
  if (Array.isArray(payload)) {
    return {
      data: payload,
      total: payload.length,
      skip: params.skip ?? 0,
      take: params.take ?? payload.length,
    };
  }

  return payload;
}

async function parseJsonIfPresent(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

export async function getScenarioGens(params: ScenarioGenListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));
  if (params.characterId) query.set('characterId', params.characterId);
  if (typeof params.isSaved === 'boolean') {
    query.set('isSaved', String(params.isSaved));
  }

  const suffix = query.toString();
  const res = await apiFetch(`/admin/scenario-gen${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, listFallbackError);
  }

  const payload = (await res.json()) as PaginatedResponse<IScenarioGen> | IScenarioGen[];
  return normalizeListResponse(payload, params);
}

export async function getScenarioGenDetails(id: string) {
  const res = await apiFetch(`/admin/scenario-gen/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, detailFallbackError);
  }

  return (await res.json()) as IScenarioGenDetails;
}

export async function createScenarioGen(payload: ScenarioGenCreateDto) {
  const res = await apiFetch('/admin/scenario-gen', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }

  return (await res.json()) as IScenarioGenDetails;
}

export async function saveScenarioGen(id: string, payload: ScenarioGenSaveDto) {
  const res = await apiFetch(`/admin/scenario-gen/${id}/save`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, saveFallbackError);
  }

  return await parseJsonIfPresent(res);
}

export async function replaceScenarioGen(
  id: string,
  payload: ScenarioGenReplaceDto,
) {
  const res = await apiFetch(`/admin/scenario-gen/${id}/replace`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, replaceFallbackError);
  }

  return await parseJsonIfPresent(res);
}

export async function deleteScenarioGen(id: string) {
  const res = await apiFetch(`/admin/scenario-gen/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
}
