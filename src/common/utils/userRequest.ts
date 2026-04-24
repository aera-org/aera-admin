import { RoleplayStage, type UserRequest } from '@/common/types';

export type UserRequestFieldKey =
  | 'clothesChanges'
  | 'actions'
  | 'environmentChanges'
  | 'faceExpression';
export type GenerationRequestMode = 'manual' | 'pose_prompt';

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
const DEFAULT_REQUEST_MODE: GenerationRequestMode = 'manual';
const PRELUDE_REQUEST_MODE_OPTIONS: GenerationRequestMode[] = [
  'manual',
  'pose_prompt',
];

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

export function getAllowedGenerationRequestModes(
  stage: RoleplayStage | '' | null | undefined,
) {
  if (stage === RoleplayStage.Sex) {
    return ['pose_prompt'] as const;
  }

  if (stage === RoleplayStage.Prelude) {
    return PRELUDE_REQUEST_MODE_OPTIONS;
  }

  return [DEFAULT_REQUEST_MODE] as const;
}

export function resolveGenerationRequestMode(
  stage: RoleplayStage | '' | null | undefined,
  requestMode?: GenerationRequestMode | null,
  hasPosePrompt = false,
): GenerationRequestMode {
  if (stage === RoleplayStage.Sex) {
    return 'pose_prompt';
  }

  if (stage === RoleplayStage.Prelude) {
    if (requestMode === 'pose_prompt' || requestMode === 'manual') {
      return requestMode;
    }

    return hasPosePrompt ? 'pose_prompt' : 'manual';
  }

  return DEFAULT_REQUEST_MODE;
}

export function requiresPosePrompt(
  stage: RoleplayStage | '' | null | undefined,
  requestMode?: GenerationRequestMode | null,
  hasPosePrompt = false,
) {
  return (
    resolveGenerationRequestMode(stage, requestMode, hasPosePrompt) ===
    'pose_prompt'
  );
}

export function getVisibleUserRequestFieldKeys(
  stage: RoleplayStage | '' | null | undefined,
  requestMode?: GenerationRequestMode | null,
  hasPosePrompt = false,
) {
  return requiresPosePrompt(stage, requestMode, hasPosePrompt)
    ? (['clothesChanges'] satisfies UserRequestFieldKey[])
    : DEFAULT_FIELD_KEYS;
}

export function formatUserRequestForDisplay(
  value: UserRequestInput,
  stage: RoleplayStage | '' | null | undefined,
  requestMode?: GenerationRequestMode | null,
  hasPosePrompt = false,
) {
  if (!value) return [];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [{ label: 'Request', value: trimmed }] : [];
  }

  return getVisibleUserRequestFieldKeys(stage, requestMode, hasPosePrompt)
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
