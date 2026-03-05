import type { IAdmin } from './admin.type.ts';
import {
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

export interface ImgGenerationRequest {
  mainLoraId?: string;
  secondaryLoraId?: string;
  characterId: string;
  scenarioId: string;
  userRequest: string;
}

export interface IImgGeneration {
  id: string;
  character: ICharacter;
  mainLora: ILora;
  secondaryLora?: ILora;
  scenario: IScenario;
  stage: RoleplayStage;
  status: ImgGenerationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IImgGenerationDetails extends IImgGeneration {
  prompt?: string;
  userRequest: string;
  file?: IFile;
  madeBy: IAdmin;
  latency?: {
    promptGeneration: number;
    imageGeneration: number;
    imageUpload: number;
  };
}
