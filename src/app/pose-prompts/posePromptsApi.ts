import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  CreatePosePromptDto,
  IPosePrompt,
  IPosePromptDetails,
  UpdatePosePromptDto,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type PosePromptsListParams = {
  search?: string;
  skip?: number;
  take?: number;
};

export type FindSimilarPosePromptDto = {
  pose: string;
  details: string;
  angle: string;
};

const fallbackError = 'Unable to load poses.';
const createFallbackError = 'Unable to create the pose.';
const updateFallbackError = 'Unable to update the pose.';
const detailsFallbackError = 'Unable to load the pose.';
const deleteFallbackError = 'Unable to delete the pose.';
const findSimilarFallbackError = 'Unable to find a similar pose.';

export async function getPosePrompts(params: PosePromptsListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/pose-prompts${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<IPosePrompt>;
}

export async function getPosePromptDetails(id: string) {
  const res = await apiFetch(`/admin/pose-prompts/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, detailsFallbackError);
  }
  return (await res.json()) as IPosePromptDetails;
}

export async function createPosePrompt(payload: CreatePosePromptDto) {
  const res = await apiFetch('/admin/pose-prompts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as IPosePromptDetails;
}

export async function updatePosePrompt(id: string, payload: UpdatePosePromptDto) {
  const res = await apiFetch(`/admin/pose-prompts/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as IPosePromptDetails;
}

export async function deletePosePrompt(id: string) {
  const res = await apiFetch(`/admin/pose-prompts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
}

export async function findSimilarPosePrompt(payload: FindSimilarPosePromptDto) {
  const res = await apiFetch('/admin/pose-prompts/similar', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, findSimilarFallbackError);
  }
  return (await res.json()) as IPosePrompt;
}
