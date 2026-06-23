import type { IFile } from './file.type.ts';
import type { ILora } from './lora.type';
import type { IScenario } from './scenario.type.ts';

export interface ICharacter {
  id: string;
  name: string;
  type: CharacterType;
  description: string;
  promoImg?: IFile | null;
  isFeatured: boolean;
  avatar: IFile;
  emoji: string;
  isActive: boolean;
  gender: string;
  isCustom: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export enum CharacterType {
  Realistic = 'realistic',
  Anime = 'anime',
}

export enum CharacterHairStyle {
  Straight = 'straight',
  Bangs = 'bangs',
  Curly = 'curly',
  Bun = 'bun',
  Short = 'short',
  Ponytail = 'ponytail',
}

export enum CharacterEyeColor {
  Brown = 'brown',
  Blue = 'blue',
  Green = 'green',
}


export enum CharacterHairColor {
  Blond = 'blond',
  Brunette = 'brunette',
  Redhead = 'redhead',
  Black = 'black',
  Pink = 'pink',
}

export enum CharacterEthnicity {
  Caucasian = 'caucasian',
  Arabian = 'arabian',
  Latina = 'latina',
  Asian = 'asian',
  Afro = 'afro',
  Indian = 'indian',
}

export enum CharacterBodyType {
  Skinny = 'skinny',
  Athletic = 'athletic',
  Average = 'average',
  Curvy = 'curvy',
  Bbw = 'bbw',
}

export enum CharacterBreastSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  ExtraLarge = 'extraLarge',
}

export enum StoryType {
  Photo = 'photo',
  Video = 'video',
}

export interface ICharacterStory {
  id: string;
  idx: number;
  file: IFile;
  type: StoryType;
  isActive: boolean;
}

export enum CharacterPersonality {
  Hot = 'hot',
  Submissive = 'submissive',
  Dominant = 'dominant',
  Shy = 'shy',
  Caring = 'caring',
  Devoted = 'devoted', // x
  Playful = 'playful',
  Sassy = 'sassy',
  Mysterious = 'mysterious',
  Romantic = 'romantic',
  Intellectual = 'intellectual',
}

export interface ICharacterDetails extends ICharacter {
  lora: ILora;
  scenarios: IScenario[];
  hairColor: CharacterHairColor;
  ethnicity: CharacterEthnicity;
  hairStyle: CharacterHairStyle;
  bodyType: CharacterBodyType;
  breastSize: CharacterBreastSize;
  stories: ICharacterStory[];
  personality: CharacterPersonality[];
  avatarPrompt?: string;
  age: number;
  eyeColor: CharacterEyeColor;
}

export interface CustomCharacterCreateDto {
  name: string;
  age: number; // 18-55
  hairColor: CharacterHairColor;
  ethnicity: CharacterEthnicity;
  bodyType: CharacterBodyType;
  hairStyle: CharacterHairStyle;
  eyeColor: CharacterEyeColor;
  breastSize: CharacterBreastSize;
  type: CharacterType;
  userId: string;
}

export enum ScenarioCharacterTrait {
  Playful = 'playful',
  Caring = 'caring',
  Shy = 'shy',
  Sassy = 'sassy',
  Mysterious = 'mysterious',
  Dominant = 'dominant',
  Submissive = 'submissive',
  Intellectual = 'intellectual',
  Hot = 'hot',
  Romantic = 'romantic',
}

export interface CreateCustomScenarioDto {
  description: string;
}
