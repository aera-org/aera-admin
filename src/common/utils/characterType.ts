import { CharacterType } from '../types';

export const CHARACTER_TYPE_LABELS: Record<CharacterType, string> = {
  [CharacterType.Realistic]: 'Realistic',
  [CharacterType.Anime]: 'Anime',
};

export const characterTypeOptions = Object.values(CharacterType).map(
  (value) => ({
    value,
    label: CHARACTER_TYPE_LABELS[value],
  }),
);

export function formatCharacterType(value: CharacterType | null | undefined) {
  return value ? CHARACTER_TYPE_LABELS[value] : '-';
}
