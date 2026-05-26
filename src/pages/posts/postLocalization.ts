import { Language } from '@/common/types';

const LANGUAGE_LABELS: Record<Language, string> = {
  [Language.Russian]: 'Russian',
  [Language.French]: 'French',
};

export function getLanguageLabel(language: Language) {
  return LANGUAGE_LABELS[language];
}

export function getLanguageOptions() {
  return Object.values(Language).map((language) => ({
    label: getLanguageLabel(language),
    value: language,
  }));
}
