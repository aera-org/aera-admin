import type { IScenario } from './character.type';
import type { IFile } from './file.type';

export interface IPost {
    id: string;
    note?: string;
    text: string;
    img: IFile;
    isActive: boolean;
    isTop: boolean;
    scenario: IScenario;
    updatedAt: string;
    createdAt: string;
}
