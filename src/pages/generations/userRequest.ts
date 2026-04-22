import { RoleplayStage, type UserRequest } from '@/common/types';
import {
  getVisibleUserRequestFieldKeys,
  requiresPosePrompt,
} from '@/common/utils';

export type GenerationUserRequestDraft = {
  clothesChanges: string;
  actions: string;
  environmentChanges: string;
  faceExpression: string;
};

export type UserRequestFieldKey = keyof GenerationUserRequestDraft;

const DEFAULT_USER_REQUEST_DRAFT: GenerationUserRequestDraft = {
  clothesChanges: '',
  actions: '',
  environmentChanges: '',
  faceExpression: '',
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

export function buildUserRequestDraft(
  value: UserRequest | string | null | undefined,
  stage: RoleplayStage | '' | null | undefined,
): GenerationUserRequestDraft {
  if (!value) return createEmptyUserRequestDraft();

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return createEmptyUserRequestDraft();

    return {
      ...createEmptyUserRequestDraft(),
      [requiresPosePrompt(stage) ? 'clothesChanges' : 'actions']: trimmed,
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
