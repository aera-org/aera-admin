import type { ICharacter, IScenarioVideo } from "./character.type";
import type { IScenario } from "./character.type";
import type { IGift } from "./gift.type";
import type { ITgUser } from "./tg-user.type";

export enum InAppPurchaseType {
    Video = 'video',
    Gift = 'gift',
    CustomCharacter = 'custom_character',
    CustomScenario = 'custom_scenario',
  }

export interface IInAppPurchaseEntity {
    id: string;

    amount: number;
    type: InAppPurchaseType;

    userId: string;
    user: ITgUser;

    gift?: IGift;
    scenario?: IScenario;
    character?: ICharacter;
    video?: IScenarioVideo;

    createdAt: string;
}

export type InAppPurchaseQuery = {
    userId?: string;
    type?: InAppPurchaseType;
    before?: Date;
    after?: Date;
    giftId?: string;
    scenarioId?: string;
    characterId?: string;
}