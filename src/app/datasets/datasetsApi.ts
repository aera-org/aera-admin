import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  CreateDatasetDto,
  IDataset,
  IDatasetDetails,
  UpdateDatasetDto,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type DatasetsListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const listFallbackError = 'Unable to load datasets.';
const createFallbackError = 'Unable to create the dataset.';
const updateFallbackError = 'Unable to update the dataset.';
const deleteFallbackError = 'Unable to delete the dataset.';
const createItemFallbackError = 'Unable to add dataset item.';
const regenerateItemFallbackError = 'Unable to regenerate dataset item.';
const deleteItemFallbackError = 'Unable to delete dataset item.';

async function parseJsonIfPresent(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

export async function getDatasets(params: DatasetsListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/datasets${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, listFallbackError);
  }
  return (await res.json()) as PaginatedResponse<IDataset>;
}

export async function getDatasetDetails(id: string) {
  const res = await apiFetch(`/admin/datasets/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, listFallbackError);
  }
  return (await res.json()) as IDatasetDetails;
}

export async function createDataset(payload: CreateDatasetDto) {
  const res = await apiFetch('/admin/datasets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as IDatasetDetails;
}

export async function updateDataset(id: string, payload: UpdateDatasetDto) {
  const res = await apiFetch(`/admin/datasets/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function deleteDataset(id: string) {
  const res = await apiFetch(`/admin/datasets/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function createDatasetItem(id: string) {
  const res = await apiFetch(`/admin/datasets/${id}/items`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw await buildApiError(res, createItemFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function regenerateDatasetItem(id: string, itemId: string) {
  const res = await apiFetch(`/admin/datasets/${id}/items/${itemId}/regenerate`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw await buildApiError(res, regenerateItemFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function deleteDatasetItem(id: string, itemId: string) {
  const res = await apiFetch(`/admin/datasets/${id}/items/${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteItemFallbackError);
  }
  return await parseJsonIfPresent(res);
}
