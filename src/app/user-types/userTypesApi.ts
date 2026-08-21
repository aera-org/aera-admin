import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  IUserType,
  IUserTypeDetails,
  UpdateUserTypeDto,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type UserTypesListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load user types.';
const updateFallbackError = 'Unable to update the user type.';
const detailsFallbackError = 'Unable to load the user type details.';

export async function getUserTypes(params: UserTypesListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/user-types${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<IUserType>;
}

export async function getUserTypeDetails(id: string) {
  const res = await apiFetch(`/admin/user-types/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, detailsFallbackError);
  }
  return (await res.json()) as IUserTypeDetails;
}

export async function updateUserType(id: string, payload: UpdateUserTypeDto) {
  const res = await apiFetch(`/admin/user-types/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as IUserTypeDetails;
}
