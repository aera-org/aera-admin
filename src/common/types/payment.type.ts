import type { CharacterType } from './character.type';
import type { IPlan } from './plan.type';
import type { ITgUser } from './tg-user.type';

export interface IPayment {
  id: string;
  amount: number;
  character: {
    id: string;
    name: string;
    type: CharacterType;
  } | null;
  scenario: {
    id: string;
    name: string;
  } | null;
  user: ITgUser;
  plan: IPlan;
  ref: string | null;
  createdAt: string;
}

export interface PaymentsQuery {
  planId?: string;
  userId?: string;
  characterId?: string;
  scenarioId?: string;
  ref?: string;
  createdAfter?: string;
  createdBefore?: string;
  order?: 'ASC' | 'DESC';
  skip?: number;
  take?: number;
}
