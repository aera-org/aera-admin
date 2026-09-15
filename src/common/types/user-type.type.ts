import type { RoleplayStage } from './scenario.type';

export interface IUserType {
  id: string;
  name: string;
  paywallStage: RoleplayStage;
  stageLength: number;
  photoCoolDown: number;
  full: boolean;
  createdAt: string;
}

export interface IUserTypeDetails extends IUserType {
  description: string;
  chatPrompt: string;
  resistance: string;
}

export type CreateUserTypeDto = {
  name: string;
  description: string;
  paywallStage: RoleplayStage;
  stageLength: number;
  chatPrompt: string;
  photoCoolDown: number;
  resistance: string;
  full: boolean;
};

export type UpdateUserTypeDto = CreateUserTypeDto;
