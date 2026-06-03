import { RoleplayStage, STAGES_IN_ORDER } from '@/common/types';

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
