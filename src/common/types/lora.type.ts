export interface ILora {
  id: string;
  fileName: string;
  seed: number;
  strength: number;
  triggerWord: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoraUploadDto {
  fileName: string;
  strength: number;
  triggerWord: string;
}

export interface LoraUpdateDto {
  seed?: number;
  strength?: number;
  triggerWord?: string;
}
