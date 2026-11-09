export enum PlanWebType {
  Subscription = 'subscription',
  Credits = 'credits',
}

export enum PlanWebPeriod {
  Month = 'month',
  Quarter = 'quarter',
  Year = 'year',
}

export enum PlanTier {
  Premium = 'premium',
  Deluxe = 'deluxe',
}

export interface IWebPlan {
  id: string;
  type: PlanWebType;
  period: PlanWebPeriod | null;
  tier: PlanTier;
  amountCents: number;
  monthlyPriceCents: number | null;
  discount: number | null;
  isActive: boolean;
  credits: number;
  additionalCredits: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateWebPlanDto = {
  type: PlanWebType;
  /** Required for subscription plans, forbidden for credits plans. */
  period?: PlanWebPeriod;
  tier?: PlanTier;
  amountCents: number;
  monthlyPriceCents?: number;
  discount?: number;
  isActive: boolean;
  credits: number;
  additionalCredits?: number;
};

/** type and period cannot be changed after creation; null clears a field. */
export type UpdateWebPlanDto = Partial<
  Omit<CreateWebPlanDto, 'type' | 'period' | 'monthlyPriceCents' | 'discount'>
> & {
  monthlyPriceCents?: number | null;
  discount?: number | null;
};
