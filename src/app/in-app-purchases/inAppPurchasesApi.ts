import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { IInAppPurchaseEntity, InAppPurchaseType } from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type InAppPurchasesListParams = {
  userId?: string;
  type?: InAppPurchaseType;
  before?: string;
  after?: string;
  giftId?: string;
  scenarioId?: string;
  characterId?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load air purchases.';

export async function getInAppPurchases(params: InAppPurchasesListParams) {
  const query = new URLSearchParams();
  if (params.userId) query.set('userId', params.userId);
  if (params.type) query.set('type', params.type);
  if (params.before) query.set('before', params.before);
  if (params.after) query.set('after', params.after);
  if (params.giftId) query.set('giftId', params.giftId);
  if (params.scenarioId) query.set('scenarioId', params.scenarioId);
  if (params.characterId) query.set('characterId', params.characterId);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(
    `/admin/in-app-purchases${suffix ? `?${suffix}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<IInAppPurchaseEntity> & { extra: { totalAmount: string } };
}
