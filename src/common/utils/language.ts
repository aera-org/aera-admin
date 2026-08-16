import { Language } from '@/common/types';

const LANGUAGE_LABELS: Record<Language, string> = {
  [Language.Ru]: 'Russian',
  [Language.Es]: 'Spanish',
  [Language.Fr]: 'French',
  [Language.De]: 'German',
  [Language.It]: 'Italian',
  [Language.Pl]: 'Polish',
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
