import type { IFile } from './file.type';
import type { IScenario } from './scenario.type';

export enum PostType {
    Img = 'img',
    Video = 'video',
}

export enum Language {
    Ru = 'ru',
    Es = 'es',
    Fr = 'fr',
    De = 'de',
    It = 'it',
    Pl = 'pl',
}

/** Telegram button colour: default has none. */
export enum PostButtonStyle {
    Default = 'default',
    Primary = 'primary',
    Success = 'success',
    Danger = 'danger',
}

/** Url button under the post: opens the post deeplink with the partner ref. */
export interface IPostButton {
    text: string;
    style: PostButtonStyle;
    /** Translated texts; missing ones are translated on save. */
    localizations: Partial<Record<Language, string>>;
}

/** What the editor needs to show the post as Telegram will. */
export interface IPostSettings {
    /** Link text under every post: counts toward the caption limit. */
    shortLink: string;
    captionLimit: number;
    buttonsLimit: number;
    buttonTextLimit: number;
}

export interface IPost {
    id: string;
    text: string;
    type: PostType;
    img?: IFile;
    video?: IFile;
    isActive: boolean;
    isCustomCharacter: boolean;
    isStart: boolean;
    /** isX: post for the rvb bot. */
    isRvb: boolean;
    scenario: IScenario | null;
    updatedAt: string;
    createdAt: string;
    localizations: Partial<Record<Language, string>>;
    buttons?: IPostButton[];
    /** Caption length by language ('en' and localizations), with the link. */
    captionLength?: Partial<Record<string, number>>;
}

export interface PostsStats {
    opened: number;
    started: number;
    bought: number;
  }


export type PostAnalytics = {
    data: Record<string, PostsStats>;
    posts: IPost[];
}

export type PostAnalyticsQuery = { 
    start: string; // min 2026-06-25; label: "Post created from"
    end: string; // max today; label: "Post created to"
    scenarioId?: string;
};
