import type { IScenario } from './character.type';
import type { IFile } from './file.type';

export enum PostType {
    Img = 'img',
    Video = 'video',
}

export interface IPost {
    id: string;
    text: string;
    type: PostType;
    img?: IFile;
    video?: IFile;
    isActive: boolean;
    scenario: IScenario;
    updatedAt: string;
    createdAt: string;
}
