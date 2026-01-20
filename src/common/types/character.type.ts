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
  photoSendingGuidelines: string;
  photoMessageAlignmentRules: string;
};

export type PhaseBehaviourMap = Record<ChatPhase, PhaseBehavior>;

export interface IScene {
  id: string;
  name: string;
  description: string;
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
