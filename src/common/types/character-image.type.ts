import {
  type ICharacter,
  type IScenario,
  RoleplayStage,
} from './character.type.ts';
import type { IFile } from './file.type.ts';
import type { UserRequest } from './img-generation.type.ts';
import { Pose } from './pose-prompt.type.ts';

export type CreateCharacterImageDto = {
  characterId: string;
  scenarioId: string;
  description: string;
  stage: RoleplayStage;
  isPregenerated: boolean;
  isPromotional: boolean;
  fileId: string;
  blurredFileId?: string;
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
