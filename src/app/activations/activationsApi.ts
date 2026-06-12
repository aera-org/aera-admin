import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { ActivationsQuery, IActivations } from '@/common/types';

const fallbackError = 'Unable to load activations.';

export async function getActivations(params: ActivationsQuery) {
  const query = new URLSearchParams();
  query.set('start', params.start);
  query.set('end', params.end);

  const res = await apiFetch(`/admin/analytics/activations?${query.toString()}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }

  return (await res.json()) as IActivations;
}
