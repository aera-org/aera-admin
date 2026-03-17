import type { CharacterType, RoleplayStage } from '@/common/types';

export type GenerateImagePrefillState = {
  characterId: string;
  characterName: string;
  scenarioId: string;
  scenarioName: string;
  stage: RoleplayStage;
  type?: CharacterType;
  mainLoraId?: string;
  mainLoraName?: string;
  secondLoraId?: string;
  secondLoraName?: string;
  userRequest?: string;
  sexRequest?: {
    pose: string;
    details: string;
    angle: string;
  };
};
