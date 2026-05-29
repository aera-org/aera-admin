import type { CharacterType } from './character.type';

export interface ScenarioProgressStats {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
}

export interface ScenarioProgressStatsBreakdown {
  totals: ScenarioProgressStats;
  byScenario: Record<string, ScenarioProgressStats>;
  scenariosData: Record<
    string,
    {
      name: string;
      characterName: string;
      characterType: CharacterType;
    }
  >;
}

export interface UserProgressQuery {
  after: string;
  before: string;
}
