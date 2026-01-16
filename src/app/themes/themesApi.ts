import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  AngleCreateDto,
  IAngle,
  ITheme,
  IThemeDetails,
  ThemeCreateDto,
  ThemeUpdateDto,
} from '@/common/types';

type PaginatedResponse<T> = {
  total: number;
  data: T[];
  skip: number;
  take: number;
};

const fallbackError = 'Unable to load themes.';

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

export async function getThemes() {
  const res = await apiFetch('/themes');
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  const payload = (await res.json()) as ITheme[] | PaginatedResponse<ITheme>;
  return isPaginatedResponse(payload) ? payload.data : payload;
}

export async function getTheme(id: string) {
  const res = await apiFetch(`/themes/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as IThemeDetails;
}

export async function createTheme(payload: ThemeCreateDto) {
  const res = await apiFetch('/themes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as ITheme | IThemeDetails;
}

export async function updateTheme(id: string, payload: ThemeUpdateDto) {
  const res = await apiFetch(`/themes/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as IThemeDetails;
}

export async function removeTheme(id: string) {
  const res = await apiFetch(`/themes/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
}

export async function createAngle(id: string, payload: AngleCreateDto) {
  const res = await apiFetch(`/themes/${id}/angles`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as IAngle;
}

export async function removeAngle(id: string, angleId: string) {
  const res = await apiFetch(`/themes/${id}/angles/${angleId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
}
