import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { BroadcastCountResponse, BroadcastDto } from '@/common/types';

const createFallbackError = 'Unable to send broadcast.';
const countFallbackError = 'Unable to count broadcast users.';

export async function createBroadcast(payload: BroadcastDto) {
  const res = await apiFetch('/admin/broadcast', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
}

export async function countBroadcastUsers(payload: BroadcastDto) {
  const res = await apiFetch('/admin/broadcast/count', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, countFallbackError);
  }
  return (await res.json()) as BroadcastCountResponse;
}
