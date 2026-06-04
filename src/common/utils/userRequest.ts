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
const POSE_PROMPT_FIELD_KEYS: UserRequestFieldKey[] = ['clothesChanges'];
const DEFAULT_REQUEST_MODE: GenerationRequestMode = 'manual';

type StageRequestConfig = {
  modes: readonly GenerationRequestMode[];
  defaultMode: GenerationRequestMode;
  fieldKeysByMode: Record<GenerationRequestMode, UserRequestFieldKey[]>;
};

const DEFAULT_STAGE_REQUEST_CONFIG: StageRequestConfig = {
  modes: [DEFAULT_REQUEST_MODE],
  defaultMode: DEFAULT_REQUEST_MODE,
  fieldKeysByMode: {
    manual: DEFAULT_FIELD_KEYS,
    pose_prompt: POSE_PROMPT_FIELD_KEYS,
  },
};

const POSE_PROMPT_ENABLED_STAGE_REQUEST_CONFIG: StageRequestConfig = {
  modes: ['manual', 'pose_prompt'],
  defaultMode: DEFAULT_REQUEST_MODE,
  fieldKeysByMode: {
    manual: DEFAULT_FIELD_KEYS,
    pose_prompt: POSE_PROMPT_FIELD_KEYS,
  },
};

const SEX_STAGE_REQUEST_CONFIG: StageRequestConfig = {
  modes: ['pose_prompt'],
  defaultMode: 'pose_prompt',
  fieldKeysByMode: {
    manual: DEFAULT_FIELD_KEYS,
    pose_prompt: POSE_PROMPT_FIELD_KEYS,
  },
};

const STAGE_REQUEST_CONFIGS: Partial<Record<RoleplayStage, StageRequestConfig>> =
  {
    [RoleplayStage.Prelude]: POSE_PROMPT_ENABLED_STAGE_REQUEST_CONFIG,
    [RoleplayStage.Aftercare]: POSE_PROMPT_ENABLED_STAGE_REQUEST_CONFIG,
    [RoleplayStage.Sex]: SEX_STAGE_REQUEST_CONFIG,
  };

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

function getStageRequestConfig(
  stage: RoleplayStage | '' | null | undefined,
): StageRequestConfig {
  if (!stage) {
    return DEFAULT_STAGE_REQUEST_CONFIG;
  }

  return STAGE_REQUEST_CONFIGS[stage] ?? DEFAULT_STAGE_REQUEST_CONFIG;
}

export function formatGenerationRequestMode(mode: GenerationRequestMode) {
  return mode === 'pose_prompt' ? 'Pose prompt' : 'Manual request';
}

export function getAllowedGenerationRequestModes(
  stage: RoleplayStage | '' | null | undefined,
) {
  return getStageRequestConfig(stage).modes;
}

export function resolveGenerationRequestMode(
  stage: RoleplayStage | '' | null | undefined,
  requestMode?: GenerationRequestMode | null,
  hasPosePrompt = false,
): GenerationRequestMode {
  const config = getStageRequestConfig(stage);

  if (requestMode && config.modes.includes(requestMode)) {
    return requestMode;
  }

  if (hasPosePrompt && config.modes.includes('pose_prompt')) {
    return 'pose_prompt';
  }

  return config.defaultMode;
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
  const config = getStageRequestConfig(stage);
  const resolvedMode = resolveGenerationRequestMode(
    stage,
    requestMode,
    hasPosePrompt,
  );

  return config.fieldKeysByMode[resolvedMode];
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
