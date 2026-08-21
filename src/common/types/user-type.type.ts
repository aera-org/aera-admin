import type { RoleplayStage } from './scenario.type';

export interface IUserType {
  id: string;
  name: string;
  paywallStage: RoleplayStage;
  stageLength: number;
  photoCoolDown: number;
  createdAt: string;
}

export interface IUserTypeDetails extends IUserType {
  chatPrompt: string;
  resistance: string;
}

export type UpdateUserTypeDto = {
  name: string;
  paywallStage: RoleplayStage;
  stageLength: number;
  chatPrompt: string;
  photoCoolDown: number;
  resistance: string;
};
