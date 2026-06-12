import {
  RoleplayStage,
  type StageAction,
  StageActionType,
  type StageDirectives,
  STAGES_IN_ORDER,
} from '@/common/types';

const STAGE_LABELS: Record<RoleplayStage, string> = {
  [RoleplayStage.Acquaintance]: 'Acquaintance',
  [RoleplayStage.Flirting]: 'Flirting',
  [RoleplayStage.Seduction]: 'Seduction',
  [RoleplayStage.Resistance]: 'Resistance',
  [RoleplayStage.Undressing]: 'Undressing',
  [RoleplayStage.Prelude]: 'Prelude',
  [RoleplayStage.Sex]: 'Sex',
  [RoleplayStage.Aftercare]: 'Aftercare',
};

const STAGE_ACTION_TYPE_LABELS: Record<StageActionType, string> = {
  [StageActionType.Connect]: 'Connect',
  [StageActionType.Story]: 'Story',
  [StageActionType.Flirt]: 'Flirt',
};

const stageActionTypes = Object.values(StageActionType);

type NormalizedStageDirectives = Omit<StageDirectives, 'actions'> & {
  actions: StageAction[];
};

export const stageActionTypeOptions = stageActionTypes.map((value) => ({
  value,
  label: STAGE_ACTION_TYPE_LABELS[value],
}));

export function formatStageActionType(value: StageActionType | null | undefined) {
  if (!value) return '-';
  return STAGE_ACTION_TYPE_LABELS[value] ?? value;
}

export function createEmptyStageDirectives(): NormalizedStageDirectives {
  return {
    toneAndBehavior: '',
    restrictions: '',
    environment: '',
    characterLook: '',
    goal: '',
    escalationTrigger: '',
    actions: [],
  };
}

export function normalizeStageActions(actions: StageAction[] | null | undefined) {
  if (!Array.isArray(actions)) return [];

  return actions.reduce<StageAction[]>((acc, action) => {
    if (!action || !stageActionTypes.includes(action.type)) {
      return acc;
    }

    const text = action.text.trim();
    if (!text) {
      return acc;
    }

    acc.push({
      type: action.type,
      text,
    });
    return acc;
  }, []);
}

export function normalizeStageDirectives(
  stage: StageDirectives | null | undefined,
): NormalizedStageDirectives {
  return {
    toneAndBehavior: stage?.toneAndBehavior?.trim() ?? '',
    restrictions: stage?.restrictions?.trim() ?? '',
    environment: stage?.environment?.trim() ?? '',
    characterLook: stage?.characterLook?.trim() ?? '',
    goal: stage?.goal?.trim() ?? '',
    escalationTrigger: stage?.escalationTrigger?.trim() ?? '',
    actions: normalizeStageActions(stage?.actions),
  };
}

export function buildStageDirectivesPayload(
  stage: StageDirectives | null | undefined,
): NormalizedStageDirectives {
  return normalizeStageDirectives(stage);
}

export function isStageDirectivesEmpty(stage: StageDirectives | null | undefined) {
  const normalizedStage = normalizeStageDirectives(stage);

  return (
    !normalizedStage.toneAndBehavior &&
    !normalizedStage.restrictions &&
    !normalizedStage.environment &&
    !normalizedStage.characterLook &&
    !normalizedStage.goal &&
    !normalizedStage.escalationTrigger &&
    normalizedStage.actions.length === 0
  );
}

export function isRoleplayStage(value: unknown): value is RoleplayStage {
  return typeof value === 'string' && STAGES_IN_ORDER.includes(value as RoleplayStage);
}

export function formatRoleplayStage(value: RoleplayStage | null | undefined) {
  if (!value) return '-';
  return STAGE_LABELS[value] ?? value;
}

export function normalizeRoleplayStages(stages: RoleplayStage[]) {
  const uniqueStages = new Set(stages);
  return STAGES_IN_ORDER.filter((stage) => uniqueStages.has(stage));
}

export function formatRoleplayStages(stages: RoleplayStage[] | null | undefined) {
  const normalizedStages = normalizeRoleplayStages(stages ?? []);
  if (normalizedStages.length === 0) return '-';
  return normalizedStages.map((stage) => formatRoleplayStage(stage)).join(', ');
}
