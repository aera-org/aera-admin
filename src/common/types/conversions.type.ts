import type { CharacterType } from './character.type';
import type { RoleplayStage } from './scenario.type';

export interface PaywallData {
  seen: number;
  bought: number;
  seenTimesBeforeBought: number;
  seenTimesBeforeLeft: number;
  leftAfterSeen: number;
  leftOnceSeen: number;
}

export interface ChatStageStats {
  total: number;
  left: number;
  messages: number;
  subscription: PaywallData;
  air: PaywallData;
}

export interface ChatStats {
  byStage: Record<RoleplayStage, ChatStageStats>;
  totals: ChatStageStats;
}

export interface ChatStatsData {
  all: ChatStats;
  byScenario: Record<string, ChatStats>;
}

export interface ConversionScenarioMetadata {
  id: string;
  name: string;
  character: {
    id: string;
    name: string;
    type: CharacterType;
  };
}

export interface ConversionsDayData {
  day: string;
  data: ChatStatsData;
}

export interface IConversions {
  daysData: ConversionsDayData[];
  scenarios: ConversionScenarioMetadata[];
}

export interface ConversionsQuery {
  start: string;
  end: string;
}
