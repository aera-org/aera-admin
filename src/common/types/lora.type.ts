import type { CharacterType } from './character.type.ts';

export interface ILora {
  id: string;
  fileName: string;
  type: CharacterType;
  seed: number;
  strength: number;
  triggerWord: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoraUploadDto {
  fileName: string;
  type: CharacterType;
  strength: number;
  triggerWord: string;
}

export interface LoraUpdateDto {
  type?: CharacterType;
  seed?: number;
  strength?: number;
  triggerWord?: string;
}
