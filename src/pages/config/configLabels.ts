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
  },
};

export function getConfigLabel(scope: ConfigScope, item: IConfigItem) {
  return CONFIG_LABELS[scope][item.key] ?? item.key;
}
