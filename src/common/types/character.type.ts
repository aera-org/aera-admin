import type { ILora } from './lora.type';

export interface ICharacter {
  id: string;
  name: string;
  emoji: string;
  isActive: boolean;
  gender: string;
  createdAt: string;
  updatedAt: string;
}

export enum ChatPhase {
  Hook = 'hook',
  Resistance = 'resistance',
  Retention = 'retention',
}

export type PhaseBehavior = {
  toneAndBehavior: string;
  photoSendingRules: string;
  restrictions: string;
  goal: string;
};

export type PhaseBehaviourMap = Record<ChatPhase, PhaseBehavior>;

export interface IScene {
  id: string;
  name: string;
  description: string;
  goal: string;
  openingMessage: string;
  visualChange: string;
  openingImageId: string;
  openingImageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface IScenario {
  id: string;
  name: string;
  emoji: string;
  description: string;
  personality: string;
  messagingStyle: string;
  appearance: string;
  situation: string;
  phases: PhaseBehaviourMap;
  scenesOrder: string[];
  scenes: IScene[];
  createdAt: string;
  updatedAt: string;
}

export interface ICharacterDetails extends ICharacter {
  lora: ILora;
  scenarios: IScenario[];
}
