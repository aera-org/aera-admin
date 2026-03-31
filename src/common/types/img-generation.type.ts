import type { IPosePrompt } from '@/common/types/pose-prompt.type.ts';

import type { IAdmin } from './admin.type.ts';
import {
  CharacterType,
  type ICharacter,
  type IScenario,
  RoleplayStage,
} from './character.type.ts';
import type { IFile } from './file.type.ts';
import type { ILora } from './lora.type.ts';

export enum ImgGenerationStatus {
  Generating = 'generating',
  Ready = 'ready',
  Failed = 'failed',
}

export interface UserRequest {
  clothesChanges?: string[];
  actions?: string[];
  environmentChanges?: string[];
  faceExpression?: string;
}

export interface ImgGenerationRequest {
  mainLoraId?: string;
  secondLoraId?: string;
  characterId: string;
  scenarioId: string;
  stage: RoleplayStage;
  userRequest?: UserRequest;
  posePromptId?: string;
}

export interface IImgGeneration {
  id: string;
  character: ICharacter;
  mainLora: ILora;
  secondLora?: ILora;
  scenario: IScenario;
  stage: RoleplayStage;
  type?: CharacterType;
  status: ImgGenerationStatus;
  file?: IFile;
  posePrompt?: IPosePrompt;
  createdAt: string;
  updatedAt: string;
}

export interface IImgGenerationDetails extends IImgGeneration {
  prompt?: string;
  userRequest?: UserRequest | string;
  posePromptId?: string;
  madeBy: IAdmin;
  latency?: {
    promptGeneration: number;
    imageGeneration: number;
    imageUpload: number;
  };
}
