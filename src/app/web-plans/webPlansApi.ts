import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  CreateWebPlanDto,
  IWebPlan,
  PlanTier,
  PlanWebType,
  UpdateWebPlanDto,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type WebPlansListParams = {
  type?: PlanWebType;
  tier?: PlanTier;
  isActive?: boolean;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load web plans.';
const createFallbackError = 'Unable to create the web plan.';
const updateFallbackError = 'Unable to update the web plan.';
const deleteFallbackError = 'Unable to delete the web plan.';

export async function getWebPlans(params: WebPlansListParams) {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.tier) query.set('tier', params.tier);
  if (typeof params.isActive === 'boolean') {
    query.set('isActive', String(params.isActive));
  }
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/web-plans${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<IWebPlan>;
}

export async function createWebPlan(payload: CreateWebPlanDto) {
  const res = await apiFetch('/admin/web-plans', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as IWebPlan;
}

export async function updateWebPlan(id: string, payload: UpdateWebPlanDto) {
  const res = await apiFetch(`/admin/web-plans/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as { success: boolean };
}

export async function deleteWebPlan(id: string) {
  const res = await apiFetch(`/admin/web-plans/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
}
