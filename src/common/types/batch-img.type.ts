import type { ILora } from '@/common/types/lora.type.ts';

import type { IFile } from './file.type.ts';
import type { IScenario } from './scenario.type.ts';

export interface IBatchImgSet {
  id: string;
  name: string;
  count: number;
  createdAt: string;
  updatedAt: string;
}

export enum BatchImgItemStatus {
  Pending = 'pending',
  Generating = 'generating',
  Ready = 'ready',
  Failed = 'failed',
}

export interface IBatchImgItem {
  id: string;
  prompt: string;
  status: BatchImgItemStatus;
  file: IFile | null;
  createdAt: string;
  updatedAt: string;
}

export interface IBatchImgSetDetails extends IBatchImgSet {
  items: IBatchImgItem[];
  prompt: string;
  lora: ILora;
  scenarioId?: string | null;
  scenario?: Pick<IScenario, 'id' | 'name'> | null;
}

export interface BatchImgSetCreate {
  name: string;
  count: number;
  prompt: string;
  loraId: string;
}

export interface BatchImgSetUpdate {
  name: string;
}
