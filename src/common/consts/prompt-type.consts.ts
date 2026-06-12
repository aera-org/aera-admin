import { ModelProvider, PromptType } from '@/common/types';

export const PROMPT_TYPE_OPTIONS = [
  // Chat
  { label: 'Chat', value: PromptType.Chat },
  { label: 'Ping', value: PromptType.Ping },
  { label: 'Blurred Photo', value: PromptType.BlurredPhoto },
  { label: 'Turn Cold', value: PromptType.TurnCold },
  { label: 'Gift Bought', value: PromptType.GiftBought },

  // Image
  { label: 'Image', value: PromptType.Image },
  { label: 'Image Sex', value: PromptType.ImageSex },
  { label: 'Image Anime', value: PromptType.AnimeImage },
  { label: 'Image Anime Sex', value: PromptType.AnimeImageSex },

  // Avatars
  { label: 'Avatar Realistic', value: PromptType.AvatarRealistic },
  { label: 'Avatar Anime', value: PromptType.AvatarAnime },

  // Opening Images
  { label: 'Opening Image Realistic', value: PromptType.OpeningImageRealistic },
  { label: 'Opening Image Anime', value: PromptType.OpeningImageAnime },

  // Scenarios
  { label: 'Scenario Gen', value: PromptType.ScenarioGen },
  { label: 'Scenario Gifts', value: PromptType.ScenarioGifts },
  { label: 'Scenario Actions', value: PromptType.ScenarioActions },

  // Posts
  { label: 'Post Localization', value: PromptType.PostLocalization },
];

export const MODEL_PROVIDER_OPTIONS = [
  { label: 'Grok', value: ModelProvider.Grok },
  { label: 'Mistral', value: ModelProvider.Mistral },
  { label: 'DeepSeek', value: ModelProvider.DeepSeek },
];
