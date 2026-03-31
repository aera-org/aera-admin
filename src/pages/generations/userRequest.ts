import { RoleplayStage, type UserRequest } from '@/common/types';

export type GenerationUserRequestDraft = {
  clothesChanges: string;
  actions: string;
  environmentChanges: string;
  faceExpression: string;
};

export type UserRequestFieldKey = keyof GenerationUserRequestDraft;

type UserRequestInput = UserRequest | string | null | undefined;

type UserRequestFieldConfig = {
  label: string;
  placeholder: string;
};

const DEFAULT_USER_REQUEST_DRAFT: GenerationUserRequestDraft = {
  clothesChanges: '',
  actions: '',
  environmentChanges: '',
  faceExpression: '',
};

const DEFAULT_FIELD_KEYS: UserRequestFieldKey[] = [
  'clothesChanges',
  'actions',
  'environmentChanges',
  'faceExpression',
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

function splitCommaSeparatedValues(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function joinValues(value: string[] | undefined) {
  return value?.join(', ') ?? '';
}

export function createEmptyUserRequestDraft(): GenerationUserRequestDraft {
  return { ...DEFAULT_USER_REQUEST_DRAFT };
}

export function getVisibleUserRequestFieldKeys(
  stage: RoleplayStage | '' | null | undefined,
) {
  return stage === RoleplayStage.Sex
    ? (['clothesChanges'] satisfies UserRequestFieldKey[])
    : DEFAULT_FIELD_KEYS;
}

export function buildUserRequestDraft(
  value: UserRequestInput,
  stage: RoleplayStage | '' | null | undefined,
): GenerationUserRequestDraft {
  if (!value) return createEmptyUserRequestDraft();

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return createEmptyUserRequestDraft();

    return {
      ...createEmptyUserRequestDraft(),
      [stage === RoleplayStage.Sex ? 'clothesChanges' : 'actions']: trimmed,
    };
  }

  return {
    clothesChanges: joinValues(value.clothesChanges),
    actions: joinValues(value.actions),
    environmentChanges: joinValues(value.environmentChanges),
    faceExpression: value.faceExpression?.trim() ?? '',
  };
}

export function buildUserRequestPayload(
  draft: GenerationUserRequestDraft,
  stage: RoleplayStage | '' | null | undefined,
): UserRequest | undefined {
  const request: UserRequest = {};
  const visibleFieldKeys = getVisibleUserRequestFieldKeys(stage);

  if (visibleFieldKeys.includes('clothesChanges')) {
    const clothesChanges = splitCommaSeparatedValues(draft.clothesChanges);
    if (clothesChanges.length > 0) {
      request.clothesChanges = clothesChanges;
    }
  }

  if (visibleFieldKeys.includes('actions')) {
    const actions = splitCommaSeparatedValues(draft.actions);
    if (actions.length > 0) {
      request.actions = actions;
    }
  }

  if (visibleFieldKeys.includes('environmentChanges')) {
    const environmentChanges = splitCommaSeparatedValues(
      draft.environmentChanges,
    );
    if (environmentChanges.length > 0) {
      request.environmentChanges = environmentChanges;
    }
  }

  if (visibleFieldKeys.includes('faceExpression')) {
    const faceExpression = draft.faceExpression.trim();
    if (faceExpression) {
      request.faceExpression = faceExpression;
    }
  }

  return Object.keys(request).length > 0 ? request : undefined;
}

export function hasUserRequestContent(
  draft: GenerationUserRequestDraft,
  stage: RoleplayStage | '' | null | undefined,
) {
  return Boolean(buildUserRequestPayload(draft, stage));
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
