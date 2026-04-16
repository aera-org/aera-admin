import { PromptType } from "@/common/types";

export const PROMPT_TYPE_OPTIONS = [
    { label: 'Chat', value: PromptType.Chat },
    { label: 'Ping', value: PromptType.Ping },
    { label: 'Blurred Photo', value: PromptType.BlurredPhoto },
    { label: 'Turn Cold', value: PromptType.TurnCold },
    { label: 'Scenario Gen', value: PromptType.ScenarioGen },
    { label: 'Image', value: PromptType.Image },
    { label: 'Image Sex', value: PromptType.ImageSex },
    { label: 'Image Anime', value: PromptType.AnimeImage },
    { label: 'Image Anime Sex', value: PromptType.AnimeImageSex },
    { label: 'Avatar Realistic', value: PromptType.AvatarRealistic },
    { label: 'Avatar Anime', value: PromptType.AvatarAnime },
    { label: 'Opening Image Realistic', value: PromptType.OpeningImageRealistic },
    { label: 'Opening Image Anime', value: PromptType.OpeningImageAnime },
  ];