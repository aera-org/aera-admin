import type { RoleplayStage } from './character.type.ts';
import type { IFile } from './file.type.ts';

export interface IGift {
  id: string;
  name: string;
  price: number;
  stages: RoleplayStage[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IGiftDetails extends IGift {
  description: string;
  img: IFile;
}

export interface CreateGiftDto {
  name: string;
  description: string;
  price: number;
  imgId: string;
  isActive: boolean;
  stages: RoleplayStage[];
}

export interface UpdateGiftDto {
  name?: string;
  description?: string;
  price?: number;
  imgId?: string;
  isActive?: boolean;
  stages?: RoleplayStage[];
}
