import type { CharacterType } from './character.type.ts';
import type { IFile } from './file.type.ts';
import type { IPosePrompt } from './pose-prompt.type.ts';

export enum VideoQuality {
  Low = '24',
  Medium = '30',
  High = '60',
}

export enum VideoResolution {
  Low = 720,
  Medium = 1024,
  // High = 1440,
}

export enum VideoAspectRatio {
  Square = '1:1',
  Standard = '3:4',
  Horizontal = '16:9',
  Vertical = '9:16',
}

export interface IVideoGenerationSet {
  id: string;
  name: string;
  quality: VideoQuality;
  scenario?: {
    id: string;
    name: string;
    character: {
      id: string;
      name: string;
      type: CharacterType;
    }
  } | null;
  posePrompt?: IPosePrompt | null;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface IVideoGenerationSetDetails extends IVideoGenerationSet {
  prompt: string;
  startFrame: IFile;
  items: IVideoGenerationItem[];
}

export enum VideoGenerationItemStatus {
  Pending = 'pending',
  Generating = 'generating',
  Ready = 'ready',
  Failed = 'failed',
}

export interface IVideoGenerationItem {
  id: string;
  status: VideoGenerationItemStatus;
  file: IFile | null;
  createdAt: string;
  updatedAt: string;
}

export type IVideoGenerationCreateDto = {
  name: string;
  scenarioId?: string;
  posePromptId?: string;
  quality: VideoQuality;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  duration: number;
  prompt?: string;
  startFrameId: string;
};

export type IVideoGenerationUpdateDto = {
  name: string;
  prompt: string;
  scenarioId?: string;
  posePromptId?: string;
};
