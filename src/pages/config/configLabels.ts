import { isX } from '@/common/is-x';
import type { ConfigScope, IConfigItem } from '@/common/types';

/** Display names for config keys. A key missing here is shown as is. */
const tokenName = isX ? 'credit' : 'air'
const tokenNameC = isX ? 'Credit' : 'Air'


export const CONFIG_LABELS: Record<ConfigScope, Record<string, string>> = {
  tg: {
    credits_price_video: `Video price, ${tokenName}`,
    energy_price_message: 'Message price, fuel',
  },
  web: {
    credits_new_user: `${tokenNameC}s for new user`,
    credits_register: `${tokenNameC}s for registration`,
    feed_new_user: 'Feed size for new user',
    feed_registered_user: 'Feed size for registered user',
    credits_price_message: `Message price, ${tokenName}`,
    credits_price_video: `Video price, ${tokenName}`,
    credits_price_image: `Image price, ${tokenName}`,
    credits_price_generation_video_low_per_sec: `Generation video 720p, ${tokenName}s / sec`,
    credits_price_generation_video_medium_per_sec: `Generation video 1024p, ${tokenName}s / sec`,
    credits_price_generation_sound_per_sec: `Generation sound extra, ${tokenName}s / sec`,
    generation_wide_price_multiplier: 'Generation 9:16 and 16:9 price multiplier',
  },
};

/** Keys shown only for isX; hidden in the admin otherwise. */
const X_ONLY_KEYS: Record<ConfigScope, Set<string>> = {
  tg: new Set(),
  web: new Set([
    'credits_price_generation_video_low_per_sec',
    'credits_price_generation_video_medium_per_sec',
    'credits_price_generation_sound_per_sec',
    'generation_wide_price_multiplier',
  ]),
};

export function isConfigKeyVisible(scope: ConfigScope, key: string) {
  return isX || !X_ONLY_KEYS[scope].has(key);
}

export function getConfigLabel(scope: ConfigScope, item: IConfigItem) {
  return CONFIG_LABELS[scope][item.key] ?? item.key;
}
