import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  ScenarioProgressStatsBreakdown,
  UserProgressQuery,
} from '@/common/types';

const fallbackError = 'Unable to load user progress.';

export async function getUserProgressStats(params: UserProgressQuery) {
  const query = new URLSearchParams();
  query.set('after', params.after);
  query.set('before', params.before);

  const res = await apiFetch(`/admin/scenario-progress?${query.toString()}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }

  return (await res.json()) as ScenarioProgressStatsBreakdown;
}
