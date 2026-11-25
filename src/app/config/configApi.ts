import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type { ConfigScope, IConfigItem } from '@/common/types';

const CONFIG_PATHS: Record<ConfigScope, string> = {
  tg: '/admin/config',
  web: '/admin/web-config',
};

const fallbackError = 'Unable to load config.';
const updateFallbackError = 'Unable to update the setting.';

export async function getConfig(scope: ConfigScope) {
  const res = await apiFetch(CONFIG_PATHS[scope]);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as { total: number; data: IConfigItem[] };
}

export async function updateConfig(
  scope: ConfigScope,
  key: string,
  value: number,
) {
  const res = await apiFetch(
    `${CONFIG_PATHS[scope]}/${encodeURIComponent(key)}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value }),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as { success: boolean };
}
