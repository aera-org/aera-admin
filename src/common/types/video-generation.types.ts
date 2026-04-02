import type { IFile } from './file.type.ts';
import type { ILora } from './lora.type.ts';

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
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  duration: number;
  count: number;
  createdAt: string;
  updatedAt: string;
}

export interface IVideoGenerationSetDetails extends IVideoGenerationSet {
  prompt: string;
  startFrame: IFile;
  highLora?: ILora;
  lowLora?: ILora;
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
  quality: VideoQuality;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  duration: number;
  prompt: string;
  startFrameId: string;
  highLoraId?: string;
  lowLoraId?: string;
  count: number;
};

export type IVideoGenerationUpdateDto = {
  name: string;
};
