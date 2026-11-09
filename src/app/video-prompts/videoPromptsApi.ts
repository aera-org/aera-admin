import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  IVideoPrompt,
  IVideoPromptDetails,
  Pose,
  VideoPromptCreateDto,
  VideoPromptUpdateDto,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type VideoPromptsListParams = {
  search?: string;
  pose?: Pose;
  isActive?: boolean;
  skip?: number;
  take?: number;
};

type MutationResponse = { success: boolean };

const fallbackError = 'Unable to load video prompts.';
const detailsFallbackError = 'Unable to load the video prompt.';
const createFallbackError = 'Unable to create the video prompt.';
const updateFallbackError = 'Unable to update the video prompt.';
const deleteFallbackError = 'Unable to delete the video prompt.';

export async function getVideoPrompts(params: VideoPromptsListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.pose) query.set('pose', params.pose);
  if (typeof params.isActive === 'boolean') {
    query.set('isActive', String(params.isActive));
  }
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(
    `/admin/video-prompts${suffix ? `?${suffix}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<IVideoPrompt>;
}

export async function getVideoPromptDetails(id: string) {
  const res = await apiFetch(`/admin/video-prompts/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, detailsFallbackError);
  }
  return (await res.json()) as IVideoPromptDetails;
}

export async function createVideoPrompt(payload: VideoPromptCreateDto) {
  const res = await apiFetch('/admin/video-prompts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as MutationResponse;
}

export async function updateVideoPrompt(
  id: string,
  payload: VideoPromptUpdateDto,
) {
  const res = await apiFetch(`/admin/video-prompts/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as MutationResponse;
}

export async function deleteVideoPrompt(id: string) {
  const res = await apiFetch(`/admin/video-prompts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
}
