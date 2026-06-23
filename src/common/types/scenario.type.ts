import type { IFile } from "./file.type";
import type { IGift } from "./gift.type";
import type { Pose } from "./pose-prompt.type";

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
  
  export enum StageActionType {
    // Acquaintance
    Connect = 'connect',
    Story = 'story',
    Flirt = 'flirt',
  }

export interface StageAction {
    text: string;
    type: StageActionType;
  }
  
  export interface StageDirectives {
    toneAndBehavior: string;
    restrictions: string;
    environment: string;
    characterLook: string;
    goal: string;
    escalationTrigger: string;
    actions?: StageAction[];
  }
  
  export type StageDirectivesMap = Record<RoleplayStage, StageDirectives>;
  



export interface ScenarioLiveGenerations {
    stages: Record<RoleplayStage, boolean>;
  }
  
  export interface IScenarioVideo {
    id: string;
    video: IFile;
    pose?: Pose;
    startFrame?: IFile;
    stage?: RoleplayStage;
    isPaid?: boolean;
    forFeed: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }

  interface ICharacterGift {
    id: string;
    scenarioId: string;
    giftId?: string;
    gift: IGift;
    stage: RoleplayStage;
    reason: string;
    buyText: string;
    boughtImg?: IFile | null;
    createdAt: string;
    updatedAt: string;
  }

export interface IScenario {
    id: string;
    name: string;
    emoji: string;
    slug: string;
    description: string;
    shortDescription?: string | null;
    promoImg?: IFile | null;
    promoVideo?: IFile | null;
    startImg?: IFile;
    startMessage?: string;
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
    isPromoted: boolean;
    promoText: string;
    isTop: boolean;
    createdAt: string;
    updatedAt: string;
    level: number;
    videos: IScenarioVideo[];
    transitionMessage: string | null;
    opensAfterId: string | null;
  }