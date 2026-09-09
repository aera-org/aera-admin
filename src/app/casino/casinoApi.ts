import { buildApiError } from '@/app/api/apiErrors';
import { getApiUrl } from '@/app/env';
import type { PaginatedResponse } from '@/app/paginated-response.type';
import type {
  CasinoAnalytics,
  CasinoChat,
  CasinoChatDetails,
  CasinoChatsAnalyticsQuery,
  CasinoChatsListParams,
} from '@/common/types';

const fallbackError = 'Unable to load casino chats.';
const detailsFallbackError = 'Unable to load casino chat.';
const analyticsFallbackError = 'Unable to load casino analytics.';

function appendCasinoFilters(
  query: URLSearchParams,
  params: CasinoChatsAnalyticsQuery,
) {
  if (typeof params.level === 'number') query.set('level', String(params.level));
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
}

function casinoFetch(path: string, init: RequestInit = {}) {
  return fetch(`${getApiUrl()}${path}`, init);
}

function normalizeCasinoChatsResponse(
  payload: unknown,
  params: CasinoChatsListParams,
): PaginatedResponse<CasinoChat> {
  if (Array.isArray(payload)) {
    return {
      data: payload as CasinoChat[],
      total: payload.length,
      skip: params.skip ?? 0,
      take: params.take ?? payload.length,
    };
  }

  const response = payload as Partial<PaginatedResponse<CasinoChat>>;
  const data = Array.isArray(response.data) ? response.data : [];

  return {
    data,
    total: typeof response.total === 'number' ? response.total : data.length,
    skip: typeof response.skip === 'number' ? response.skip : params.skip ?? 0,
    take:
      typeof response.take === 'number'
        ? response.take
        : params.take ?? data.length,
  };
}

export async function getCasinoChats(params: CasinoChatsListParams) {
  const query = new URLSearchParams();
  appendCasinoFilters(query, params);
  if (params.username) query.set('username', params.username);
  if (params.orderBy) query.set('orderBy', params.orderBy);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await casinoFetch(
    `/admin/casino/chats${suffix ? `?${suffix}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }

  return normalizeCasinoChatsResponse(await res.json(), params);
}

export async function getCasinoChatDetails(id: string) {
  const res = await casinoFetch(`/admin/casino/chats/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, detailsFallbackError);
  }

  return (await res.json()) as CasinoChatDetails;
}

export async function getCasinoAnalytics(params: CasinoChatsAnalyticsQuery) {
  const query = new URLSearchParams();
  appendCasinoFilters(query, params);

  const suffix = query.toString();
  const res = await casinoFetch(
    `/admin/casino/analytics${suffix ? `?${suffix}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, analyticsFallbackError);
  }

  return (await res.json()) as CasinoAnalytics;
}
