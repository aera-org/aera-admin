/** Which settings set: Telegram bot or web app. */
export type ConfigScope = 'tg' | 'web';

export interface IConfigItem {
  key: string;
  value: number;
  defaultValue: number;
  updatedAt: string | null;
}

export const CONFIG_VALUE_MAX = 1_000_000;
