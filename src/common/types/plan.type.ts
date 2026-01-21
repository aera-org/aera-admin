export enum PlanPeriod {
  Day = 'day',
  Month = 'month',
  Year = 'year',
}

export type PlanCreateDto = {
  code: string;
  period: PlanPeriod;
  periodCount: number;
  price: number;
  isActive: boolean;
};

export type PlanUpdateDto = {
  isActive: boolean;
};

export interface IPlan {
  id: string;
  code: string;
  period: PlanPeriod;
  periodCount: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
