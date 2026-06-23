import type { IFile } from './file.type';
import type { IScenario } from './scenario.type';

export enum PostType {
    Img = 'img',
    Video = 'video',
}

export enum Language {
    Russian = 'ru',
    French = 'fr',
}

export interface IPost {
    id: string;
    text: string;
    type: PostType;
    img?: IFile;
    video?: IFile;
    isActive: boolean;
    isCustomCharacter: boolean;
    scenario: IScenario | null;
    updatedAt: string;
    createdAt: string;
    localizations: Partial<Record<Language, string>>;
}
