import type { RoleplayStage, UserRequest } from '@/common/types';
import type { GenerationRequestMode } from '@/common/utils';

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
  userRequest?: UserRequest | string;
  posePromptId?: string;
  posePromptName?: string;
  requestMode?: GenerationRequestMode;
};
