export enum PromptType {
  // Chat
  Chat = 'chat',
  Ping = 'ping',
  BlurredPhoto = 'blurred-photo',
  TurnCold = 'turn-cold',
  GiftBought = 'gift-bought',

  // Image
  Image = 'image',
  ImageSex = 'image-sex',
  AnimeImage = 'anime-image',
  AnimeImageSex = 'anime-image-sex',

  // Avatar
  AvatarRealistic = 'avatar-realistic',
  AvatarAnime = 'avatar-anime',

  // Opening Image Legacy
  OpeningImageRealisticLegacy = 'opening-image-realistic',
  OpeningImageAnimeLegacy = 'opening-image-anime',

  // OpenningImage
  OpeningImageRealistic = 'opening-image-realistic_v2',
  OpeningImageAnime = 'opening-image-anime_v2',

  // Promo Image
  PromoImageRealistic = 'promo-image-realistic',
  PromoImageAnime = 'promo-image-anime',

  // Post
  PostLocalization = 'post-localization',

  // Scenario
  ScenarioGen = 'scenario-gen',
  ScenarioGifts = 'scenario-gifts',
  ScenarioActions = 'scenario-actions',
}

export enum ModelProvider {
  Grok = 'grok',
  Mistral = 'mistral',
  DeepSeek = 'deepseek',
}

export type CreatePromptDto = {
  name: string;
  text: string;
  type: PromptType;
  isActive: boolean;
  modelProvider: ModelProvider;
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
  modelProvider: ModelProvider;
}

export interface IPromptDetails extends IPrompt {
  text: string;
}
