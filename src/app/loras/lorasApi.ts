import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { ILora, LoraUploadDto } from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type LorasListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load LoRAs.';
const uploadFallbackError = 'Unable to upload the LoRA.';
const updateFallbackError = 'Unable to update the seed.';
const deleteFallbackError = 'Unable to delete the LoRA.';

export async function getLoras(params: LorasListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/loras${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<ILora>;
}

export async function uploadLora(payload: LoraUploadDto, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('seed', String(payload.seed));

  const res = await apiFetch('/admin/loras', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw await buildApiError(res, uploadFallbackError);
  }
  return (await res.json()) as { success: boolean };
}

export async function updateLoraSeed(id: string, seed: number) {
  const res = await apiFetch(`/admin/loras/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ seed }),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as ILora;
}

export async function deleteLora(id: string) {
  const res = await apiFetch(`/admin/loras/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
}
