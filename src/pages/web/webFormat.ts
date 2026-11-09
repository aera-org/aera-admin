import {
  type IWebUser,
  type IWebUserSubscription,
  PlanTier,
  PlanWebPeriod,
  PlanWebType,
  UserWebStatus,
} from '@/common/types';

export const PLAN_TYPE_LABELS: Record<PlanWebType, string> = {
  [PlanWebType.Subscription]: 'Subscription',
  [PlanWebType.Credits]: 'Credits',
};

export const PLAN_PERIOD_LABELS: Record<PlanWebPeriod, string> = {
  [PlanWebPeriod.Month]: 'Month',
  [PlanWebPeriod.Quarter]: 'Quarter',
  [PlanWebPeriod.Year]: 'Year',
};

export const PLAN_TIER_LABELS: Record<PlanTier, string> = {
  [PlanTier.Premium]: 'Premium',
  [PlanTier.Deluxe]: 'Deluxe',
};

export const USER_STATUS_LABELS: Record<UserWebStatus, string> = {
  [UserWebStatus.Active]: 'Active',
  [UserWebStatus.Inactive]: 'Inactive',
};

function toOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
  }));
}

export const planTypeOptions = toOptions(PLAN_TYPE_LABELS);
export const planPeriodOptions = toOptions(PLAN_PERIOD_LABELS);
export const planTierOptions = toOptions(PLAN_TIER_LABELS);
export const userStatusOptions = toOptions(USER_STATUS_LABELS);

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

export function formatCents(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '-';
  return (value / 100).toFixed(2);
}

export function formatWebUserName(user: IWebUser) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  const username = user.username?.trim();
  if (username) return `@${username}`;
  if (user.email) return user.email;
  return user.isAnonymous ? 'Anonymous' : 'Unknown user';
}

export function formatWebUserMeta(user: IWebUser) {
  return [user.username ? `@${user.username}` : null, user.email, user.id]
    .filter(Boolean)
    .join(' / ');
}

export function getWebSubscriptionStatus(
  subscription: IWebUserSubscription | null,
) {
  if (!subscription) {
    return {
      label: 'None',
      tone: 'accent' as const,
      outline: true,
      meta: null,
    };
  }
  const plan = `${PLAN_TIER_LABELS[subscription.tier]} · ${
    PLAN_PERIOD_LABELS[subscription.period]
  }`;
  return {
    label: subscription.isActive ? 'Active' : 'Expired',
    tone: subscription.isActive ? ('success' as const) : ('warning' as const),
    outline: !subscription.isActive,
    meta: `${plan} · ${subscription.isActive ? 'until' : 'ended'} ${formatDate(
      subscription.endDate,
    )}`,
  };
}

/** Major currency units ("29.97") → cents; null if invalid. */
export function parseMoneyToCents(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export function parseNonNegativeInt(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

export function toLocalInputValue(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (segment: number) => String(segment).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toIsoString(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}
