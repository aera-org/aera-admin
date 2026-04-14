import type { ICharacter, IScenario } from './character.type';
import type { IChat } from './chat.type.ts';
import type { IGift } from './gift.type.ts';

export type UpdateTgUser = {
  isBlocked?: boolean;
  subscribedUntil?: string;
  fuel?: number;
  air?: number;
};

export interface ITgUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  air: number;
  fuel: number;
  isBlocked: boolean;
  subscribedUntil?: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPayment {
  id: string;
  amount: number;
  scenario?: IScenario | null;
  character?: ICharacter | null;
  createdAt: string;
  updatedAt: string;
}

export interface ITgUserDetails extends ITgUser {
  activeChat?: IChat | null;
  chats: IChat[];
  payments: IPayment[];
  gifts: IGift[];
}
