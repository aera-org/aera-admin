import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  IVideoGenerationCreateDto,
  IVideoGenerationSet,
  IVideoGenerationSetDetails,
  IVideoGenerationUpdateDto,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type VideoGenerationsListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const listFallbackError = 'Unable to load videos.';
const createFallbackError = 'Unable to create the video.';
const updateFallbackError = 'Unable to update the video.';
const deleteFallbackError = 'Unable to delete the video.';
const createItemFallbackError = 'Unable to add video item.';
const regenerateItemFallbackError = 'Unable to regenerate video item.';
const deleteItemFallbackError = 'Unable to delete video item.';

async function parseJsonIfPresent(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

export async function getVideoGenerations(params: VideoGenerationsListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(
    `/admin/video-generations${suffix ? `?${suffix}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, listFallbackError);
  }
  return (await res.json()) as PaginatedResponse<IVideoGenerationSet>;
}

export async function getVideoGenerationDetails(id: string) {
  const res = await apiFetch(`/admin/video-generations/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, listFallbackError);
  }

  const details = (await res.json()) as IVideoGenerationSetDetails;
  details.items.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return details;
}

export async function createVideoGeneration(
  payload: IVideoGenerationCreateDto,
) {
  const res = await apiFetch('/admin/video-generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as IVideoGenerationSetDetails;
}

export async function updateVideoGeneration(
  id: string,
  payload: IVideoGenerationUpdateDto,
) {
  const res = await apiFetch(`/admin/video-generations/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function deleteVideoGeneration(id: string) {
  const res = await apiFetch(`/admin/video-generations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function createVideoGenerationItem(id: string) {
  const res = await apiFetch(`/admin/video-generations/${id}/items`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw await buildApiError(res, createItemFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function regenerateVideoGenerationItem(id: string, itemId: string) {
  const res = await apiFetch(
    `/admin/video-generations/${id}/items/${itemId}/regenerate`,
    {
      method: 'POST',
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, regenerateItemFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function deleteVideoGenerationItem(id: string, itemId: string) {
  const res = await apiFetch(`/admin/video-generations/${id}/items/${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteItemFallbackError);
  }
  return await parseJsonIfPresent(res);
}
