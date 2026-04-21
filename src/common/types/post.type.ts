import type { IScenario } from './character.type';
import type { IFile } from './file.type';

export interface IPostText {
    id: string;
    value: string;
    note?: string;
    scenario: IScenario;
    createdAt: string;
}

export interface IPostImg {
    id: string;
    file: IFile;
    note?: string;
    scenario: IScenario;
    createdAt: string;
}

export interface IPost {
    id: string;
    note?: string;
    text: IPostText;
    img: IPostImg;
    scenario: IScenario;
    createdAt: string;
}

export interface IPostSet {
    id: string;
    note?: string;
    postsCount: number;
    refs: string[];
    createdAt: string;
}

export interface IPostSetDetails extends IPostSet {
    posts: IPost[];
}
