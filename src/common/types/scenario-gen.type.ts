import type { StageDirectivesMap } from './character.type.ts';

export interface ScenarioData {
  personality: string;
  appearance: string;
  situation: string;
  messagingStyle: string;
  stages: StageDirectivesMap;
}


export interface IScenarioGen {
  id: string;
  characterId: string;
  characterName?: string;
  isSaved: boolean;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface IScenarioGenDetails extends IScenarioGen {
  context: string;
  data: ScenarioData;
}

export interface ScenarioGenCreateDto {
  characterId: string;
  name: string;
  context: string;
}

export interface ScenarioGenSaveDto {
  slug: string;
}
