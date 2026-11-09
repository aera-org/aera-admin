import type { CharacterType } from './character.type';
import type { RoleplayStage } from './scenario.type';
import type { PlanTier, PlanWebPeriod } from './web-plan.type';

export enum UserWebStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export interface IWebUserSubscription {
  id: string;
  period: PlanWebPeriod;
  tier: PlanTier;
  endDate: string;
  recharge: boolean;
  /** endDate is in the future. */
  isActive: boolean;
}

export interface IWebUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
  status: UserWebStatus;
  credits: number;
  isAnonymous: boolean;
  subscription: IWebUserSubscription | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

type WebSimpleCharacter = {
  id: string;
  name: string;
  type: CharacterType;
};

export interface IWebUserActiveChat {
  id: string;
  stage: RoleplayStage;
  character: WebSimpleCharacter | null;
  scenario: {
    id: string;
    name: string;
    character: WebSimpleCharacter | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface IWebUserDetails extends IWebUser {
  activeChat: IWebUserActiveChat | null;
}

export type UpdateWebUserSubscriptionDto = {
  /** Required to create a subscription when the user has none. */
  endDate?: string;
  recharge?: boolean;
  period?: PlanWebPeriod;
  tier?: PlanTier;
};

export type UpdateWebUserDto = {
  status?: UserWebStatus;
  credits?: number;
  subscription?: UpdateWebUserSubscriptionDto;
};
