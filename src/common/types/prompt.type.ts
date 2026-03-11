export enum PromptType {
  Chat = 'chat',
  Ping = 'ping',
  Image = 'image',
  ImageSex = 'image-sex',
  AnimeImage = 'anime-image',
  AnimeImageSex = 'anime-image-sex',
}

export type CreatePromptDto = {
  name: string;
  text: string;
  type: PromptType;
  isActive: boolean;
};

export type UpdatePromptDto = {
  name: string;
  text: string;
  isActive: boolean;
};

export interface IPrompt {
  id: string;
  name: string;
  version: number;
  type: PromptType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IPromptDetails extends IPrompt {
  text: string;
}
