import type { RoleplayStage } from '@/common/types';

export type GenerateImagePrefillState = {
  characterId: string;
  characterName: string;
  scenarioId: string;
  scenarioName: string;
  stage: RoleplayStage;
  mainLoraId?: string;
  mainLoraName?: string;
  secondLoraId?: string;
  secondLoraName?: string;
  userRequest?: string;
  posePromptId?: string;
  posePromptName?: string;
};
