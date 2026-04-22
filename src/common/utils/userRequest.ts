import { RoleplayStage, type UserRequest } from '@/common/types';

export type UserRequestFieldKey =
  | 'clothesChanges'
  | 'actions'
  | 'environmentChanges'
  | 'faceExpression';

type UserRequestInput = UserRequest | string | null | undefined;

type UserRequestFieldConfig = {
  label: string;
  placeholder: string;
};

const DEFAULT_FIELD_KEYS: UserRequestFieldKey[] = [
  'clothesChanges',
  'actions',
  'environmentChanges',
  'faceExpression',
];
const POSE_PROMPT_STAGES = new Set<RoleplayStage>([
  RoleplayStage.Prelude,
  RoleplayStage.Sex,
]);

export const USER_REQUEST_FIELD_CONFIG: Record<
  UserRequestFieldKey,
  UserRequestFieldConfig
> = {
  clothesChanges: {
    label: 'Clothes changes',
    placeholder: 'dress, stockings, open jacket',
  },
  actions: {
    label: 'Actions',
    placeholder: 'sitting on the bed, looking at camera',
  },
  environmentChanges: {
    label: 'Environment changes',
    placeholder: 'warm light, bedroom, window in background',
  },
  faceExpression: {
    label: 'Face expression',
    placeholder: 'soft smile',
  },
};

export function requiresPosePrompt(
  stage: RoleplayStage | '' | null | undefined,
) {
  return stage ? POSE_PROMPT_STAGES.has(stage) : false;
}

export function getVisibleUserRequestFieldKeys(
  stage: RoleplayStage | '' | null | undefined,
) {
  return requiresPosePrompt(stage)
    ? (['clothesChanges'] satisfies UserRequestFieldKey[])
    : DEFAULT_FIELD_KEYS;
}

export function formatUserRequestForDisplay(
  value: UserRequestInput,
  stage: RoleplayStage | '' | null | undefined,
) {
  if (!value) return [];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [{ label: 'Request', value: trimmed }] : [];
  }

  return getVisibleUserRequestFieldKeys(stage)
    .map((fieldKey) => {
      if (fieldKey === 'faceExpression') {
        return {
          label: USER_REQUEST_FIELD_CONFIG[fieldKey].label,
          value: value.faceExpression?.trim() ?? '',
        };
      }

      const items = value[fieldKey];
      return {
        label: USER_REQUEST_FIELD_CONFIG[fieldKey].label,
        value: Array.isArray(items) ? items.join(', ') : '',
      };
    })
    .filter((entry) => entry.value);
}
