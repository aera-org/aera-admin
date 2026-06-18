import type { CharacterType, StageActionType } from './character.type';

export interface ActivationsStats {
  total: number;
  left: number;
  clicked: number;
  clickedByAction: Record<StageActionType, number>;
  written: number;
}

export interface ActivationsData {
  totals: ActivationsStats;
  byScenario: Record<string, ActivationsStats>;
}

export interface ActivationsDayData {
  day: string;
  data: ActivationsData;
}

export interface ActivationScenarioMetadata {
  id: string;
  name: string;
  character: {
    id: string;
    name: string;
    type: CharacterType;
  };
}

export interface IActivations {
  daysData: ActivationsDayData[];
  scenarios: ActivationScenarioMetadata[];
}

export interface ActivationsQuery {
  start: string;
  end: string;
}
