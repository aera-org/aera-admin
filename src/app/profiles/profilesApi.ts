import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { IVoice, VoiceCreateDto, VoiceUpdateDto } from '@/common/types';

type PaginatedResponse<T> = {
  total: number;
  data: T[];
  skip: number;
  take: number;
};

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

const fallbackError = 'Unable to load profiles.';

export async function getProfiles() {
  const res = await apiFetch('/profiles');
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  const payload = (await res.json()) as IVoice[] | PaginatedResponse<IVoice>;
  return isPaginatedResponse(payload) ? payload.data : payload;
}

export async function getProfile(id: string) {
  const res = await apiFetch(`/profiles/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as IVoice;
}

export async function createProfile(payload: VoiceCreateDto) {
  const res = await apiFetch('/profiles', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as IVoice;
}

export async function updateProfile(id: string, payload: VoiceUpdateDto) {
  const res = await apiFetch(`/profiles/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as IVoice;
}

export async function removeProfile(id: string) {
  const res = await apiFetch(`/profiles/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
}
