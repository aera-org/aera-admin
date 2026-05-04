import {
  type IPosePromptDetails,
  PhotoAngle,
  Pose,
  RoleplayStage,
  STAGES_IN_ORDER,
} from '@/common/types';

const POSES_TRANSFER_SCHEMA = 'poses';
const POSES_TRANSFER_VERSION = 3;

export type PoseTransferItem = {
  idx: number;
  note?: string;
  isAnal: boolean;
  stages: RoleplayStage[];
  angle: PhotoAngle;
  pose: Pose;
  prompt: string;
};

export type PosesTransferPayload = {
  schema: typeof POSES_TRANSFER_SCHEMA;
  version: typeof POSES_TRANSFER_VERSION;
  exportedAt: string;
  poses: PoseTransferItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureRecord(value: unknown, path: string) {
  if (!isRecord(value)) {
    throw new Error(`Invalid import file: "${path}" must be an object.`);
  }
  return value;
}

function ensureString(value: unknown, path: string) {
  if (typeof value !== 'string') {
    throw new Error(`Invalid import file: "${path}" must be a string.`);
  }
  return value;
}

function ensureNonEmptyString(value: unknown, path: string) {
  const parsed = ensureString(value, path).trim();
  if (!parsed) {
    throw new Error(`Invalid import file: "${path}" must not be empty.`);
  }
  return parsed;
}

function ensureOptionalString(value: unknown, path: string) {
  if (value === undefined || value === null) return undefined;
  return ensureString(value, path).trim() || undefined;
}

function ensureNonNegativeInteger(value: unknown, path: string) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `Invalid import file: "${path}" must be a non-negative integer.`,
    );
  }
  return value;
}

function ensureBoolean(value: unknown, path: string) {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid import file: "${path}" must be a boolean.`);
  }
  return value;
}

function ensureEnumValue<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
) {
  const parsed = ensureString(value, path);
  if (!allowed.includes(parsed as T)) {
    throw new Error(`Invalid import file: "${path}" has unsupported value.`);
  }
  return parsed as T;
}

function normalizeStages(stages: RoleplayStage[]) {
  return STAGES_IN_ORDER.filter((stage) => stages.includes(stage));
}

function parseStages(value: unknown, path: string) {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid import file: "${path}" must be an array.`);
  }

  const stages = value.map((stage, index) =>
    ensureEnumValue(stage, `${path}[${index}]`, STAGES_IN_ORDER),
  );

  const normalized = normalizeStages(Array.from(new Set(stages)));
  if (normalized.length === 0) {
    throw new Error(`Invalid import file: "${path}" must not be empty.`);
  }

  return normalized;
}

function parseTransferPose(value: unknown, path: string): PoseTransferItem {
  const obj = ensureRecord(value, path);

  const parsed = {
    idx: ensureNonNegativeInteger(obj.idx, `${path}.idx`),
    note: ensureOptionalString(obj.note, `${path}.note`),
    isAnal: ensureBoolean(obj.isAnal, `${path}.isAnal`),
    stages: parseStages(obj.stages, `${path}.stages`),
    angle: ensureEnumValue(
      obj.angle,
      `${path}.angle`,
      Object.values(PhotoAngle),
    ),
    pose: ensureEnumValue(obj.pose, `${path}.pose`, Object.values(Pose)),
    prompt: ensureNonEmptyString(obj.prompt, `${path}.prompt`),
  } satisfies PoseTransferItem;

  if (parsed.isAnal && !parsed.stages.includes(RoleplayStage.Sex)) {
    throw new Error(
      `Invalid import file: "${path}.isAnal" requires "SEX" in "${path}.stages".`,
    );
  }

  return parsed;
}

function ensureUniquePoseIdx(poses: PoseTransferItem[], path: string) {
  const counts = new Map<number, number>();
  for (const pose of poses) {
    counts.set(pose.idx, (counts.get(pose.idx) ?? 0) + 1);
  }

  const duplicates = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([idx]) => String(idx));

  if (duplicates.length > 0) {
    throw new Error(
      `Invalid import file: duplicate pose idx values in "${path}": ${duplicates.join(', ')}.`,
    );
  }
}

function sortTransferPoses(a: PoseTransferItem, b: PoseTransferItem) {
  if (a.idx !== b.idx) return a.idx - b.idx;
  if (a.isAnal !== b.isAnal) return Number(a.isAnal) - Number(b.isAnal);
  if (a.pose !== b.pose) return a.pose.localeCompare(b.pose);
  if (a.angle !== b.angle) return a.angle.localeCompare(b.angle);
  return a.stages.join(',').localeCompare(b.stages.join(','));
}

export function buildPosesTransferPayload(poses: IPosePromptDetails[]) {
  const mapped = poses.map((pose, index) => {
    if (!Number.isInteger(pose.idx) || pose.idx < 0) {
      throw new Error(
        `Unable to export poses: pose #${index + 1} has invalid idx.`,
      );
    }
    if (!pose.prompt?.trim()) {
      throw new Error(
        `Unable to export poses: pose idx "${pose.idx}" has empty prompt.`,
      );
    }

    const stages = normalizeStages(Array.from(new Set(pose.stages ?? [])));
    if (stages.length === 0) {
      throw new Error(
        `Unable to export poses: pose idx "${pose.idx}" has no stages.`,
      );
    }
    if (pose.isAnal && !stages.includes(RoleplayStage.Sex)) {
      throw new Error(
        `Unable to export poses: pose idx "${pose.idx}" is anal but missing SEX stage.`,
      );
    }

    return {
      idx: pose.idx,
      note: pose.note?.trim() || undefined,
      isAnal: pose.isAnal,
      stages,
      angle: pose.angle,
      pose: pose.pose,
      prompt: pose.prompt.trim(),
    } satisfies PoseTransferItem;
  });

  mapped.sort(sortTransferPoses);
  ensureUniquePoseIdx(mapped, 'poses');

  return {
    schema: POSES_TRANSFER_SCHEMA,
    version: POSES_TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    poses: mapped,
  } satisfies PosesTransferPayload;
}

export function buildPosesTransferFileName() {
  return 'poses.json';
}

export function downloadPosesTransferFile(
  payload: PosesTransferPayload,
  fileName: string,
) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function parsePosesTransferFile(file: File) {
  const text = await file.text();
  let rawPayload: unknown;

  try {
    rawPayload = JSON.parse(text) as unknown;
  } catch (_error) {
    throw new Error('Invalid JSON file.');
  }

  const payloadObj = ensureRecord(rawPayload, 'root');
  const schema = ensureString(payloadObj.schema, 'schema');
  const version = payloadObj.version;

  if (schema !== POSES_TRANSFER_SCHEMA) {
    throw new Error(
      `Invalid import file: unsupported schema "${schema}". Expected "${POSES_TRANSFER_SCHEMA}".`,
    );
  }
  if (version !== POSES_TRANSFER_VERSION) {
    throw new Error(
      `Invalid import file: unsupported version "${String(version)}".`,
    );
  }

  const posesValue = payloadObj.poses;
  if (!Array.isArray(posesValue)) {
    throw new Error('Invalid import file: "poses" must be an array.');
  }

  const poses = posesValue.map((pose, index) =>
    parseTransferPose(pose, `poses[${index}]`),
  );
  poses.sort(sortTransferPoses);
  ensureUniquePoseIdx(poses, 'poses');

  return {
    schema: POSES_TRANSFER_SCHEMA,
    version: POSES_TRANSFER_VERSION,
    exportedAt: ensureString(payloadObj.exportedAt, 'exportedAt'),
    poses,
  } satisfies PosesTransferPayload;
}
