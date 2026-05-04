import { buildApiError } from '@/app/api/apiErrors';
import { getApiUrl } from '@/app/env';
import type { DeeplinkAnalyticsItem } from '@/app/analytics/analyticsApi';
import type { PaginatedResponse } from '@/app/paginated-response.type';

export type OpenCampaignScenario = {
  id: string;
  name: string;
  slug?: string | null;
};

export type CampaignsParams = {
  startDate: string;
  endDate: string;
  ref?: string;
  scenarioId?: string;
};

function normalizePaginated<T>(
  payload: PaginatedResponse<T> | T[],
  fallbackTake: number,
): PaginatedResponse<T> {
  if (Array.isArray(payload)) {
    return {
      data: payload,
      total: payload.length,
      skip: 0,
      take: fallbackTake,
    };
  }

  return payload;
}

export async function getCampaigns(params: CampaignsParams) {
  const query = new URLSearchParams();
  query.set('startDate', params.startDate);
  query.set('endDate', params.endDate);
  if (params.ref) query.set('ref', params.ref);
  if (params.scenarioId) query.set('scenarioId', params.scenarioId);

  const res = await fetch(
    `${getApiUrl()}/admin/analytics/deeplinks?${query.toString()}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load campaigns.');
  }

  return (await res.json()) as DeeplinkAnalyticsItem[];
}

export async function getOpenCampaignScenarios(params: {
  search?: string;
  skip?: number;
  take?: number;
}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await fetch(
    `${getApiUrl()}/admin/characters/scenarios/open${suffix ? `?${suffix}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, 'Unable to load scenarios.');
  }

  const payload = (await res.json()) as
    | PaginatedResponse<OpenCampaignScenario>
    | OpenCampaignScenario[];
  return normalizePaginated(payload, params.take ?? 50);
}
