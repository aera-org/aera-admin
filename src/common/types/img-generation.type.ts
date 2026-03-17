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

export interface ImgGenerationRequest {
  mainLoraId?: string;
  secondLoraId?: string;
  characterId: string;
  scenarioId: string;
  stage: RoleplayStage;
  userRequest?: string;
  sexRequest?: {
    pose: string;
    details: string;
    angle: string;
  };
  type: CharacterType;
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
  createdAt: string;
  updatedAt: string;
}

export interface IImgGenerationDetails extends IImgGeneration {
  prompt?: string;
  userRequest?: string;
  sexRequest?: {
    pose: string;
    details: string;
    angle: string;
  };
  file?: IFile;
  madeBy: IAdmin;
  latency?: {
    promptGeneration: number;
    imageGeneration: number;
    imageUpload: number;
  };
}
