import type {
  IVideoPromptDetails,
  Pose,
  VideoPromptCreateDto,
  VideoPromptVars,
} from '@/common/types';

export type VideoPromptFormValues = {
  name: string;
  idx: string;
  pose: Pose | '';
  strength: string;
  isActive: boolean;
  withMan: boolean;
  isFirstFrame: boolean;
  isAnal: boolean;
  shots: string[];
  sound: string;
  environment: string;
  clothes: string;
};

export type VideoPromptFormField = keyof VideoPromptFormValues;

export type VideoPromptFormErrors = Partial<
  Record<VideoPromptFormField, string>
>;

export type VideoPromptFormChange = <F extends VideoPromptFormField>(
  field: F,
  value: VideoPromptFormValues[F],
) => void;

export function getEmptyVideoPromptFormValues(): VideoPromptFormValues {
  return {
    name: '',
    idx: '',
    pose: '',
    strength: '',
    isActive: true,
    withMan: false,
    isFirstFrame: false,
    isAnal: false,
    shots: [''],
    sound: '',
    environment: '',
    clothes: '',
  };
}

export function toVideoPromptFormValues(
  data: IVideoPromptDetails,
): VideoPromptFormValues {
  const shots = data.data?.shots ?? [];
  return {
    name: data.name ?? '',
    idx: data.idx == null ? '' : String(data.idx),
    pose: data.pose ?? '',
    strength: data.strength == null ? '' : String(data.strength),
    isActive: data.isActive,
    withMan: data.withMan,
    isFirstFrame: data.isFirstFrame,
    isAnal: data.isAnal,
    shots: shots.length > 0 ? shots : [''],
    sound: data.data?.sound ?? '',
    environment: data.defaults?.environment ?? '',
    clothes: data.defaults?.clothes ?? '',
  };
}

function parseIdx(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

function parseStrength(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return undefined;
  return parsed;
}

function getShots(values: VideoPromptFormValues) {
  return values.shots.map((shot) => shot.trim()).filter(Boolean);
}

export function getVideoPromptFormErrors(
  values: VideoPromptFormValues,
): VideoPromptFormErrors {
  const errors: VideoPromptFormErrors = {};

  if (!values.name.trim()) {
    errors.name = 'Enter a name.';
  }
  if (parseIdx(values.idx) === undefined) {
    errors.idx = 'Enter a non-negative integer, or leave empty.';
  }
  if (parseStrength(values.strength) === undefined) {
    errors.strength = 'Enter a value from 0 to 1, or leave empty.';
  }
  if (getShots(values).length === 0) {
    errors.shots = 'Add at least one shot.';
  }
  if (!values.sound.trim()) {
    errors.sound = 'Enter sound description.';
  }

  return errors;
}

/**
 * Cleared optional fields are sent as `null` so PATCH resets them
 * (the backend skips `undefined` keys on update).
 */
export function toVideoPromptPayload(
  values: VideoPromptFormValues,
): VideoPromptCreateDto {
  const defaults: VideoPromptVars = {};
  const environment = values.environment.trim();
  const clothes = values.clothes.trim();
  if (environment) defaults.environment = environment;
  if (clothes) defaults.clothes = clothes;

  return {
    name: values.name.trim(),
    idx: parseIdx(values.idx) ?? null,
    pose: values.pose || null,
    strength: parseStrength(values.strength) ?? null,
    isActive: values.isActive,
    withMan: values.withMan,
    isFirstFrame: values.isFirstFrame,
    isAnal: values.isAnal,
    data: {
      shots: getShots(values),
      sound: values.sound.trim(),
    },
    defaults,
  };
}
