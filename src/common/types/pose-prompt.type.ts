import type { RoleplayStage } from '@/common/types/character.type.ts';

import type { IFile } from './file.type';

export interface IPosePrompt {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export enum Pose {
  // Prelude
  LegsSpread = 'legs-spread',
  Masturbation = 'masturbation',
  Cumshot = 'cumshot',
  LegRaised = 'leg-raised',
  Creampie = 'creampie',
  Squirting = 'squirting',

  // Prelude & sex
  Blowjob = 'blowjob',
  Handjob = 'handjob',
  Titjob = 'titjob',
  Footjob = 'footjob',
  LegsUp = 'legs-up',

  // Sex
  Cowgirl = 'cowgirl',
  Doggy = 'doggy',
  Missionary = 'missionary',
}

export enum PhotoAngle {
  Pov = 'pov',
  Closeup = 'closeup',
  Topdown = 'topdown',
  Front = 'front',
  Back = 'back',
  Side = 'side',
}

export interface IPosePromptDetails extends IPosePrompt {
  idx: number;
  isAnal: boolean;
  stages: RoleplayStage[];
  angle: PhotoAngle;
  pose: Pose;
  prompt: string;
  referenceImg?: IFile | null;
  referenceDepthImg?: IFile | null;
}

export type CreatePosePromptDto = {
  idx: number;
  isAnal: boolean;
  stages: RoleplayStage[];
  angle: PhotoAngle;
  pose: Pose;
  prompt: string;
};

export type UpdatePosePromptDto = {
  idx: number;
  isAnal: boolean;
  stages: RoleplayStage[];
  angle: PhotoAngle;
  pose: Pose;
  prompt: string;
};
