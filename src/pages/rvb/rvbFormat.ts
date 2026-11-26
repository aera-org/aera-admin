import { useEffect, useState } from 'react';

import {
  type IRvbUserShort,
  RvbGenerationStatus,
  RvbGenerationType,
} from '@/common/types';

export const PAGE_SIZE_OPTIONS = [20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 400;

export const ORDER_OPTIONS = [
  { label: 'Newest first', value: 'DESC' },
  { label: 'Oldest first', value: 'ASC' },
];

export const GENERATION_STATUS_LABELS: Record<RvbGenerationStatus, string> = {
  [RvbGenerationStatus.Pending]: 'Pending',
  [RvbGenerationStatus.Processing]: 'Processing',
  [RvbGenerationStatus.Ready]: 'Ready',
  [RvbGenerationStatus.Failed]: 'Failed',
};

export const GENERATION_STATUS_TONES = {
  [RvbGenerationStatus.Pending]: 'accent',
  [RvbGenerationStatus.Processing]: 'warning',
  [RvbGenerationStatus.Ready]: 'success',
  [RvbGenerationStatus.Failed]: 'danger',
} as const satisfies Record<RvbGenerationStatus, string>;

export const GENERATION_TYPE_LABELS: Record<RvbGenerationType, string> = {
  [RvbGenerationType.Video]: 'Video',
  [RvbGenerationType.VideoSound]: 'Video + sound',
  [RvbGenerationType.VideoPair]: 'Video pair',
  [RvbGenerationType.VideoPairSound]: 'Video pair + sound',
  [RvbGenerationType.PhotoEdit]: 'Photo edit',
};

function toOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
  }));
}

export const generationStatusOptions = toOptions(GENERATION_STATUS_LABELS);
export const generationTypeOptions = toOptions(GENERATION_TYPE_LABELS);

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

export function formatRvbUserName(user: IRvbUserShort) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  const username = user.username?.trim();
  if (username) return `@${username}`;
  return String(user.telegramId);
}

export function formatRvbUserMeta(user: IRvbUserShort) {
  return [user.username ? `@${user.username}` : null, user.telegramId]
    .filter(Boolean)
    .join(' / ');
}

/** Telegram Stars → USD, rounded to cents. */
export function toUsd(amount: number, starPrice: number) {
  // Strip float noise before rounding half up to cents.
  return Math.round(Number((amount * starPrice * 100).toFixed(6))) / 100;
}

export function parsePositiveNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function parsePageSize(value: string | null) {
  const parsed = parsePositiveNumber(value, DEFAULT_PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

export function resolveEnum<T extends string>(
  value: string | null,
  values: T[],
) {
  return values.includes(value as T) ? (value as T) : '';
}

export function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
