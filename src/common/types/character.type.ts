import type { IFile } from './file.type.ts';
import type { IGift } from './gift.type.ts';
import type { ILora } from './lora.type';

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

export enum RoleplayStage {
  // hook
  Acquaintance = 'ACQUAINTANCE',
  Flirting = 'FLIRTING',
  Seduction = 'SEDUCTION',

  // resistance
  Resistance = 'RESISTANCE',

  // retention
  Undressing = 'UNDRESSING',
  Prelude = 'PRELUDE',
  Sex = 'SEX',
  Aftercare = 'AFTERCARE',
}

export const STAGES_IN_ORDER = [
  RoleplayStage.Acquaintance,
  RoleplayStage.Flirting,
  RoleplayStage.Seduction,
  RoleplayStage.Resistance,
  RoleplayStage.Undressing,
  RoleplayStage.Prelude,
  RoleplayStage.Sex,
  RoleplayStage.Aftercare,
];

export interface StageDirectives {
  toneAndBehavior: string;
  restrictions: string;
  environment: string;
  characterLook: string;
  goal: string;
  escalationTrigger: string;
}

export type StageDirectivesMap = Record<RoleplayStage, StageDirectives>;

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

interface ICharacterGift {
  id: string;
  scenarioId: string;
  giftId?: string;
  gift: IGift;
  stage: RoleplayStage;
  reason: string;
  buyText: string;
  boughtImage?: IFile | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioLiveGenerations {
  stages: Record<RoleplayStage, boolean>;
}

export interface IScenario {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  promoImg?: IFile | null;
  promoImgHorizontal?: IFile | null;
  isActive: boolean;
  isNew: boolean;
  personality: string;
  messagingStyle: string;
  appearance: string;
  situation: string;
  openingMessage: string;
  openingImage: IFile;
  stages: StageDirectivesMap;
  gifts: ICharacterGift[];
  liveGenerations: ScenarioLiveGenerations;
  createdAt: string;
  updatedAt: string;
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
  Playful = 'playful',
  Devoted = 'devoted',
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
  characterTraits: ScenarioCharacterTrait[];
  clothes: string;
  lingerie: string;
  description: string;
}
