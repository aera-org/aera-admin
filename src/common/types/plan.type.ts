export enum PlanPeriod {
  Day = 'day',
  Month = 'month',
  Year = 'year',
}

export interface PlanItem {
  emoji: string;
  value: string;
}

export interface PlanBundle {
  gifts: string[];
}

export type PlanCreateDto = {
  code: string;
  period?: PlanPeriod;
  periodCount?: number;
  price: number;
  isActive: boolean;
  air: number;
  isRecommended: boolean;
  type: PlanType;
  items?: PlanItem[];
  bundle?: PlanBundle;
};

export type PlanUpdateDto = {
  isActive: boolean;
  isRecommended: boolean;
  price: number;
  items?: PlanItem[];
  bundle?: PlanBundle;
};

export enum PlanType {
  Subscription = 'subscription',
  Air = 'air',
  Bundle = 'bundle',
}

export interface IPlan {
  id: string;
  code: string;
  period?: PlanPeriod;
  periodCount?: number;
  price: number;
  isActive: boolean;
  air: number;
  isRecommended: boolean;
  createdAt: string;
  updatedAt: string;
  type: PlanType;
  items?: PlanItem[];
  bundle?: PlanBundle | null;
}
