import {
  type ICharacter,
} from './character.type.ts';
import type { IFile } from './file.type.ts';
import type { UserRequest } from './img-generation.type.ts';
import { Pose } from './pose-prompt.type.ts';
import type { IScenario, RoleplayStage } from './scenario.type.ts';

export type CreateCharacterImageDto = {
  characterId: string;
  scenarioId: string;
  description: string;
  stage: RoleplayStage;
  isPregenerated: boolean;
  isPromotional: boolean;
  fileId: string;
  blurredFileId?: string;
  posePromptId?: string;
};

export type UpdateCharacterImageDto = {
  isPromotional?: boolean;
  isAnal?: boolean;
};

export type CharacterImageVectorSearchPayload = {
  isPregenerated: boolean;
  readyOnly: boolean;
  stage: RoleplayStage;
  characterId: string;
  scenarioId: string;
  userId?: string;
  pose?: Pose;
  isAnal?: boolean;
  userRequest: UserRequest;
  skip?: number;
  take?: number;
};

export interface ICharacterImage {
  id: string;
  description: string;
  stage: RoleplayStage;
  isPregenerated: boolean;
  isPromotional: boolean;
  character: ICharacter;
  scenario: IScenario;
  createdAt: string;
  updatedAt: string;
  file: IFile;
}

export interface ICharacterImageDetails extends ICharacterImage {
  file: IFile;
  blurredFile?: IFile | null;
  userRequest?: UserRequest;
  pose?: Pose;
  isAnal?: boolean;
}
