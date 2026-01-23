import type { ICharacter } from '@/common/types/character.type.ts';
import type { IFile } from '@/common/types/file.type.ts';

export type CreateCharacterImageDto = {
  characterId: string;
  description: string;
  isFree: boolean;
  isPregenerated: boolean;
  fileId: string;
  blurredFileId?: string;
};

export interface ICharacterImage {
  id: string;
  description: string;
  isFree: boolean;
  isPregenerated: boolean;
  character: ICharacter;
  createdAt: string;
  updatedAt: string;
}

export interface ICharacterImageDetails extends ICharacterImage {
  file: IFile;
  blurredFile: IFile;
}
