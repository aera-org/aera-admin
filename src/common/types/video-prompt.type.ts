import type { Pose } from './pose-prompt.type';

export interface VideoPromptVars {
  environment?: string;
  clothes?: string;
}

export interface VideoPromptData {
  shots: string[];
  sound: string;
}

export interface IVideoPrompt {
  id: string;
  idx: number | null;
  name: string;
  isActive: boolean;
  withMan: boolean;
  isFirstFrame: boolean;
  strength: number | null;
  pose: Pose | null;
  isAnal: boolean;
  defaults: VideoPromptVars;
  createdAt: string;
  updatedAt: string;
}

export interface IVideoPromptDetails extends IVideoPrompt {
  data: VideoPromptData;
}

export interface VideoPromptCreateDto {
  name: string;
  idx?: number | null;
  pose?: Pose | null;
  isAnal?: boolean;
  isActive?: boolean;
  strength?: number | null;
  withMan: boolean;
  isFirstFrame: boolean;
  data: VideoPromptData;
  defaults: VideoPromptVars;
}

export type VideoPromptUpdateDto = Partial<VideoPromptCreateDto>;
