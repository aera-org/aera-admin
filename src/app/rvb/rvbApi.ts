import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  CreateRvbPlanDto,
  IRvbGeneration,
  IRvbPayment,
  IRvbPlan,
  IRvbUser,
  IRvbUserDetails,
  RvbGenerationStatus,
  RvbGenerationType,
  UpdateRvbPlanDto,
  UpdateRvbUserDto,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

type Order = 'ASC' | 'DESC';

export type RvbPlansListParams = {
  isActive?: boolean;
  skip?: number;
  take?: number;
};

export type RvbUsersListParams = {
  /** Username (partial) or exact telegram id. */
  search?: string;
  started?: boolean;
  order?: Order;
  skip?: number;
  take?: number;
};

export type RvbPaymentsListParams = {
  planId?: string;
  userId?: string;
  ref?: string;
  createdAfter?: string;
  createdBefore?: string;
  order?: Order;
  skip?: number;
  take?: number;
};

export type RvbGenerationsListParams = {
  userId?: string;
  status?: RvbGenerationStatus;
  type?: RvbGenerationType;
  createdAfter?: string;
  createdBefore?: string;
  order?: Order;
  skip?: number;
  take?: number;
};

export type RvbPaymentsResponse = PaginatedResponse<IRvbPayment> & {
  /** Telegram Stars. */
  totalSum: number;
  /** USD per star. */
  starPrice: number;
};

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    query.set(key, String(value));
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

async function getJson<T>(path: string, fallbackError: string) {
  const res = await apiFetch(path);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as T;
}

async function sendJson<T>(
  path: string,
  method: 'POST' | 'PATCH',
  payload: unknown,
  fallbackError: string,
) {
  const res = await apiFetch(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as T;
}

export function getRvbPlans(params: RvbPlansListParams) {
  return getJson<PaginatedResponse<IRvbPlan>>(
    `/admin/rvb-plans${buildQuery(params)}`,
    'Unable to load RVB plans.',
  );
}

export function createRvbPlan(payload: CreateRvbPlanDto) {
  return sendJson<IRvbPlan>(
    '/admin/rvb-plans',
    'POST',
    payload,
    'Unable to create the RVB plan.',
  );
}

export function updateRvbPlan(id: string, payload: UpdateRvbPlanDto) {
  return sendJson<{ success: boolean }>(
    `/admin/rvb-plans/${id}`,
    'PATCH',
    payload,
    'Unable to update the RVB plan.',
  );
}

export function getRvbUsers(params: RvbUsersListParams) {
  return getJson<PaginatedResponse<IRvbUser>>(
    `/admin/rvb-users${buildQuery(params)}`,
    'Unable to load RVB users.',
  );
}

export function getRvbUserDetails(id: string) {
  return getJson<IRvbUserDetails>(
    `/admin/rvb-users/${id}`,
    'Unable to load RVB user.',
  );
}

export function updateRvbUser(id: string, payload: UpdateRvbUserDto) {
  return sendJson<{ success: boolean }>(
    `/admin/rvb-users/${id}`,
    'PATCH',
    payload,
    'Unable to update the RVB user.',
  );
}

export function getRvbPayments(params: RvbPaymentsListParams) {
  return getJson<RvbPaymentsResponse>(
    `/admin/rvb-payments${buildQuery(params)}`,
    'Unable to load RVB payments.',
  );
}

export function getRvbGenerations(params: RvbGenerationsListParams) {
  return getJson<PaginatedResponse<IRvbGeneration>>(
    `/admin/rvb-generations${buildQuery(params)}`,
    'Unable to load RVB generations.',
  );
}

export function getRvbGeneration(id: string) {
  return getJson<IRvbGeneration>(
    `/admin/rvb-generations/${id}`,
    'Unable to load RVB generation.',
  );
}
