import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  IWebUser,
  IWebUserDetails,
  UpdateWebUserDto,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type WebUsersListParams = {
  search?: string;
  isAnonymous?: boolean;
  order?: string;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load web users.';
const detailsFallbackError = 'Unable to load web user.';
const updateFallbackError = 'Unable to update the web user.';

export async function getWebUsers(params: WebUsersListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (typeof params.isAnonymous === 'boolean') {
    query.set('isAnonymous', String(params.isAnonymous));
  }
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/web-users${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<IWebUser>;
}

export async function getWebUserDetails(id: string) {
  const res = await apiFetch(`/admin/web-users/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, detailsFallbackError);
  }
  return (await res.json()) as IWebUserDetails;
}

export async function updateWebUser(id: string, payload: UpdateWebUserDto) {
  const res = await apiFetch(`/admin/web-users/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as { success: boolean };
}
