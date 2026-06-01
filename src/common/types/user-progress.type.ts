import type { CharacterType } from './character.type';

export interface ScenarioProgressStats {
  total: number;
  pending: number;
  notified: number;
  accepted: number;
  declined: number;
  started: number;
  startedNextDay: number;
}

export interface ScenarioProgressStatsBreakdown {
  totals: ScenarioProgressStats;
  totalsUnique: ScenarioProgressStats;
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
