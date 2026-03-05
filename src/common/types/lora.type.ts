export interface ILora {
  id: string;
  fileName: string;
  seed: number;
  strength: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoraUploadDto {
  fileName: string;
  strength: number;
}

export interface LoraUpdateDto {
  seed?: number;
  strength?: number;
}
