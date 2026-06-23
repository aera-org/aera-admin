import type { ITgUser } from '@/common/types/tg-user.type.ts';

import { type ICharacter } from './character.type.ts';
import type { Pose } from './pose-prompt.type.ts';
import type { IScenario, RoleplayStage } from './scenario.type.ts';

export interface IChat {
  id: string;
  scenario: IScenario;
  character: ICharacter;
  user: ITgUser;
  stage: RoleplayStage;
  historyLength: number;
  photosSent: number;
  createdAt: string;
  updatedAt: string;
}

export interface IChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export enum HistoryItemType {
  Human = 'human',
  Ai = 'ai',
  Event = 'event',
}

interface HistoryItemBase {
  type: HistoryItemType;
  content?: string;
  createdAt: Date;
}

interface HistoryItemHuman extends HistoryItemBase {
  type: HistoryItemType.Human;
  content: string;
}

interface HistoryItemAi extends HistoryItemBase {
  type: HistoryItemType.Ai;
  content: string;
}

export interface ChatLlmResponse {
  text: string;
  subscription?: boolean;
  gift?: boolean;
  next_stage?: boolean;
  photo?: {
    pose?: Pose;
    anal?: boolean;
    clothes?: string[];
    environment?: string[];
    face_expression?: string;
    action?: string;
  };
}

export enum HistoryItemEventType {
  ResponseSchema = 'response_schema',
  GiftBought = 'gift_bought',
  SubscriptionRequested = 'subscription_requested',
  StageChanged = 'stage_changed',
  ChatCompacted = 'chat_compacted',
  ChatStarted = 'chat_started',
  TurnedCold = 'turned_cold',
  ShowedPhoto = 'showed_photo',
}

interface HistoryItemEvent extends HistoryItemBase {
  type: HistoryItemType.Event;
  event: HistoryItemEventType;
  instruction?: string;
}

export type HistoryItem = HistoryItemHuman | HistoryItemAi | HistoryItemEvent;


export interface IChatDetails extends IChat {
  history: IChatMessage[];
  historyItems: HistoryItem[]
}

export type UpdateChatStageDto = {
  stage: RoleplayStage;
};

export interface ChatSearchParams {
  characterId?: string;
  scenarioId?: string;
  stage?: RoleplayStage;
  userId?: string;
}
