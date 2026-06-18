import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { ConversionsQuery, IConversions } from '@/common/types';

const fallbackError = 'Unable to load conversions.';

export async function getConversions(params: ConversionsQuery) {
  const query = new URLSearchParams();
  query.set('start', params.start);
  query.set('end', params.end);

  const res = await apiFetch(`/admin/analytics/chats?${query.toString()}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }

  return (await res.json()) as IConversions;
}
