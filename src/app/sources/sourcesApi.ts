import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { CreateSourceDto, ISource } from '@/common/types';

type UpdateSourcePayload = {
  isActive: boolean;
};

type PaginatedResponse<T> = {
  total: number;
  data: T[];
  skip: number;
  take: number;
};

const fallbackError = 'Unable to load sources.';

function isPaginatedResponse<T>(
  value: T[] | PaginatedResponse<T>,
): value is PaginatedResponse<T> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'data' in value &&
      Array.isArray((value as PaginatedResponse<T>).data),
  );
}

export async function getSources() {
  const res = await apiFetch('/sources');
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  const payload = (await res.json()) as ISource[] | PaginatedResponse<ISource>;
  return isPaginatedResponse(payload) ? payload.data : payload;
}

export async function getSource(id: string) {
  const res = await apiFetch(`/sources/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as ISource;
}

export async function createSource(payload: CreateSourceDto) {
  const res = await apiFetch('/sources', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as ISource;
}

export async function updateSourceStatus(
  id: string,
  payload: UpdateSourcePayload,
) {
  const res = await apiFetch(`/sources/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as ISource;
}

export async function refreshSource(id: string) {
  const res = await apiFetch(`/sources/${id}/refresh`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as { success: boolean };
}

export async function removeSource(id: string) {
  const res = await apiFetch(`/sources/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
}
