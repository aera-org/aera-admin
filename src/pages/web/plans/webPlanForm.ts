import {
  type CreateWebPlanDto,
  type IWebPlan,
  PlanTier,
  PlanWebPeriod,
  PlanWebType,
  type UpdateWebPlanDto,
} from '@/common/types';

import {
  parseMoneyToCents,
  parseNonNegativeInt,
} from '../webFormat';

export type WebPlanFormValues = {
  type: PlanWebType;
  period: PlanWebPeriod;
  tier: PlanTier;
  amount: string;
  monthlyPrice: string;
  discount: string;
  isActive: boolean;
  credits: string;
  additionalCredits: string;
};

export type WebPlanFormErrors = Partial<Record<keyof WebPlanFormValues, string>>;

export function getEmptyWebPlanFormValues(): WebPlanFormValues {
  return {
    type: PlanWebType.Subscription,
    period: PlanWebPeriod.Month,
    tier: PlanTier.Premium,
    amount: '',
    monthlyPrice: '',
    discount: '',
    isActive: true,
    credits: '',
    additionalCredits: '',
  };
}

function centsToInput(value: number | null) {
  return value == null ? '' : (value / 100).toFixed(2);
}

export function toWebPlanFormValues(plan: IWebPlan): WebPlanFormValues {
  return {
    type: plan.type,
    period: plan.period ?? PlanWebPeriod.Month,
    tier: plan.tier,
    amount: centsToInput(plan.amountCents),
    monthlyPrice: centsToInput(plan.monthlyPriceCents),
    discount: plan.discount == null ? '' : String(plan.discount),
    isActive: plan.isActive,
    credits: String(plan.credits),
    additionalCredits: plan.additionalCredits
      ? String(plan.additionalCredits)
      : '',
  };
}

export function getWebPlanFormErrors(
  values: WebPlanFormValues,
): WebPlanFormErrors {
  const errors: WebPlanFormErrors = {};

  if (parseMoneyToCents(values.amount) === null) {
    errors.amount = 'Enter a price, e.g. 29.97.';
  }
  if (values.monthlyPrice.trim() && parseMoneyToCents(values.monthlyPrice) === null) {
    errors.monthlyPrice = 'Enter a price, or leave empty.';
  }
  if (values.discount.trim()) {
    const discount = parseNonNegativeInt(values.discount);
    if (discount === null || discount > 100) {
      errors.discount = 'Enter an integer from 0 to 100, or leave empty.';
    }
  }
  if (parseNonNegativeInt(values.credits) === null) {
    errors.credits = 'Enter a non-negative integer.';
  }
  if (
    values.additionalCredits.trim() &&
    parseNonNegativeInt(values.additionalCredits) === null
  ) {
    errors.additionalCredits = 'Enter a non-negative integer, or leave empty.';
  }

  return errors;
}

export function toCreateWebPlanPayload(
  values: WebPlanFormValues,
): CreateWebPlanDto {
  return {
    type: values.type,
    period:
      values.type === PlanWebType.Subscription ? values.period : undefined,
    tier: values.tier,
    amountCents: parseMoneyToCents(values.amount) ?? 0,
    monthlyPriceCents: parseMoneyToCents(values.monthlyPrice) ?? undefined,
    discount: parseNonNegativeInt(values.discount) ?? undefined,
    isActive: values.isActive,
    credits: parseNonNegativeInt(values.credits) ?? 0,
    additionalCredits: parseNonNegativeInt(values.additionalCredits) ?? 0,
  };
}

/** Optional numeric fields are sent as null when cleared so PATCH resets them. */
export function toUpdateWebPlanPayload(
  values: WebPlanFormValues,
): UpdateWebPlanDto {
  return {
    tier: values.tier,
    amountCents: parseMoneyToCents(values.amount) ?? 0,
    monthlyPriceCents: parseMoneyToCents(values.monthlyPrice),
    discount: parseNonNegativeInt(values.discount),
    isActive: values.isActive,
    credits: parseNonNegativeInt(values.credits) ?? 0,
    additionalCredits: parseNonNegativeInt(values.additionalCredits) ?? 0,
  };
}
