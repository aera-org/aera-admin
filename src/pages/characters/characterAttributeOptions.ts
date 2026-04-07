import {
  CharacterBodyType,
  CharacterBreastSize,
  CharacterEthnicity,
  CharacterHairColor,
  CharacterPersonality,
} from '@/common/types';

const hairColorLabels: Record<CharacterHairColor, string> = {
  [CharacterHairColor.Blond]: 'Blond',
  [CharacterHairColor.Brunette]: 'Brunette',
  [CharacterHairColor.Redhead]: 'Redhead',
  [CharacterHairColor.Black]: 'Black',
  [CharacterHairColor.Pink]: 'Pink',
};

const ethnicityLabels: Record<CharacterEthnicity, string> = {
  [CharacterEthnicity.Caucasian]: 'Caucasian',
  [CharacterEthnicity.Arabian]: 'Arabian',
  [CharacterEthnicity.Latina]: 'Latina',
  [CharacterEthnicity.Asian]: 'Asian',
  [CharacterEthnicity.Afro]: 'Afro',
};

const bodyTypeLabels: Record<CharacterBodyType, string> = {
  [CharacterBodyType.Skinny]: 'Skinny',
  [CharacterBodyType.Athletic]: 'Athletic',
  [CharacterBodyType.Average]: 'Average',
  [CharacterBodyType.Curvy]: 'Curvy',
  [CharacterBodyType.Bbw]: 'BBW',
};

const breastSizeLabels: Record<CharacterBreastSize, string> = {
  [CharacterBreastSize.Small]: 'Small',
  [CharacterBreastSize.Medium]: 'Medium',
  [CharacterBreastSize.Large]: 'Large',
  [CharacterBreastSize.ExtraLarge]: 'Extra large',
};

const personalityLabels: Record<CharacterPersonality, string> = {
  [CharacterPersonality.Hot]: 'Hot',
  [CharacterPersonality.Playful]: 'Playful',
  [CharacterPersonality.Devoted]: 'Devoted',
};

export const HAIR_COLOR_OPTIONS = Object.values(CharacterHairColor).map(
  (value) => ({
    value,
    label: hairColorLabels[value],
  }),
);

export const ETHNICITY_OPTIONS = Object.values(CharacterEthnicity).map(
  (value) => ({
    value,
    label: ethnicityLabels[value],
  }),
);

export const BODY_TYPE_OPTIONS = Object.values(CharacterBodyType).map(
  (value) => ({
    value,
    label: bodyTypeLabels[value],
  }),
);

export const BREAST_SIZE_OPTIONS = Object.values(CharacterBreastSize).map(
  (value) => ({
    value,
    label: breastSizeLabels[value],
  }),
);

export const PERSONALITY_OPTIONS = Object.values(CharacterPersonality).map(
  (value) => ({
    value,
    label: personalityLabels[value],
  }),
);

export function getHairColorLabel(value: CharacterHairColor | null | undefined) {
  return value ? hairColorLabels[value] : '-';
}

export function getEthnicityLabel(
  value: CharacterEthnicity | null | undefined,
) {
  return value ? ethnicityLabels[value] : '-';
}

export function getBodyTypeLabel(value: CharacterBodyType | null | undefined) {
  return value ? bodyTypeLabels[value] : '-';
}

export function getBreastSizeLabel(
  value: CharacterBreastSize | null | undefined,
) {
  return value ? breastSizeLabels[value] : '-';
}

export function getCharacterPersonalityLabel(
  value: CharacterPersonality | null | undefined,
) {
  return value ? personalityLabels[value] : '-';
}

export function formatCharacterPersonalities(
  values: CharacterPersonality[] | null | undefined,
) {
  if (!values?.length) return '-';

  return values.map((value) => getCharacterPersonalityLabel(value)).join(', ');
}
