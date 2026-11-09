import { isX } from '@/common/is-x';
import {
  type IVideoGenerationCreateDto,
  VideoModel,
  type VideoPromptVars,
} from '@/common/types';

export type VarMode = 'pose' | 'reference' | 'custom';

export type VarValue = {
  mode: VarMode;
  custom: string;
};

export type VideoVarKey = keyof Required<VideoPromptVars>;

export type VideoModelValues = {
  model: VideoModel;
  videoPromptId: string;
} & Record<VideoVarKey, VarValue>;

export type VideoModelErrors = Partial<Record<VideoVarKey, string>>;

export type VideoPromptOption = {
  id: string;
  label: string;
  meta?: string;
};

export const REFERENCE_VAR_VALUE = 'Referenced exactly from <Picture 1>';

export const VIDEO_VAR_KEYS: VideoVarKey[] = ['environment', 'clothes'];

export const MODEL_OPTIONS = [
  { label: 'LTX 2.3', value: VideoModel.Ltx2_3 },
  { label: 'MH3', value: VideoModel.MH3 },
];

export const EMPTY_VIDEO_MODEL_VALUES: VideoModelValues = {
  model: VideoModel.Ltx2_3,
  videoPromptId: '',
  environment: { mode: 'pose', custom: '' },
  clothes: { mode: 'pose', custom: '' },
};

export function buildVideoModelValues(
  initial?: Partial<Pick<VideoModelValues, 'model' | 'videoPromptId'>>,
): VideoModelValues {
  return {
    ...EMPTY_VIDEO_MODEL_VALUES,
    model: initial?.model ?? EMPTY_VIDEO_MODEL_VALUES.model,
    videoPromptId: initial?.videoPromptId ?? '',
  };
}

export function isMh3(values: VideoModelValues) {
  return isX && values.model === VideoModel.MH3;
}

/** Vars only apply when an MH3 video prompt is selected. */
export function showsVars(values: VideoModelValues) {
  return isMh3(values) && Boolean(values.videoPromptId);
}

export function hasPromptSource(values: VideoModelValues, posePromptId: string) {
  return isMh3(values) ? Boolean(values.videoPromptId) : Boolean(posePromptId);
}

export function getVideoModelErrors(values: VideoModelValues): VideoModelErrors {
  if (!showsVars(values)) return {};

  const errors: VideoModelErrors = {};
  for (const key of VIDEO_VAR_KEYS) {
    const value = values[key];
    if (value.mode === 'custom' && !value.custom.trim()) {
      errors[key] = `Enter ${key}.`;
    }
  }
  return errors;
}

function resolveVar(value: VarValue) {
  if (value.mode === 'reference') return REFERENCE_VAR_VALUE;
  if (value.mode === 'custom') return value.custom.trim() || undefined;
  return undefined;
}

export function buildVideoModelPayload(
  values: VideoModelValues,
  posePromptId: string,
): Pick<
  IVideoGenerationCreateDto,
  'model' | 'posePromptId' | 'videoPromptId' | 'vars'
> {
  if (!isX) {
    return { posePromptId: posePromptId || undefined };
  }

  if (!isMh3(values)) {
    return { model: values.model, posePromptId: posePromptId || undefined };
  }

  if (!values.videoPromptId) {
    return { model: values.model };
  }

  // Backend reads vars.* without a null check, so vars must always be an object here.
  const vars: VideoPromptVars = {};
  for (const key of VIDEO_VAR_KEYS) {
    const resolved = resolveVar(values[key]);
    if (resolved) vars[key] = resolved;
  }

  return {
    model: values.model,
    videoPromptId: values.videoPromptId,
    vars,
  };
}
