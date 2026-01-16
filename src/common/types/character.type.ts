interface ILora {
  id: string;
  fileName: string;
  seed: number;
  isUploaded: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  visualChange: string;
  openingImageUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface IScenario {
  id: string;
  name: string;
  emoji: string;
  description: string;
  appearance: string;
  situation: string;
  phases: PhaseBehaviourMap;
  scenesOrder: string[];
  scenes: IScene[];
  createdAt: string;
  updatedAt: string;
}

export interface ICharacterDetails extends ICharacter {
  lora: ILora[];
  scenarios: IScenario[];
}
