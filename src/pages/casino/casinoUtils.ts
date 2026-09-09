import type { CasinoChat } from '@/common/types';

export const CASINO_PAGE_SIZE_OPTIONS = [20, 50, 100];
export const CASINO_DEFAULT_PAGE_SIZE = 20;
export const CASINO_DEFAULT_ORDER_BY = 'createdAt';
export const CASINO_DEFAULT_ORDER = 'DESC';
export const CASINO_DEFAULT_FROM_UTC_INSTANT = '2026-08-31T07:00:00.000Z';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const utcDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?Z$/;
const localDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatCasinoDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

export function formatCasinoUser(user: CasinoChat['user'] | null | undefined) {
  const username = user?.username?.trim();
  return username ? `@${username}` : 'Unknown user';
}

export function formatCasinoUserMeta(
  user: CasinoChat['user'] | null | undefined,
) {
  const username = user?.username?.trim();
  if (username && user?.id) return `${username} / ${user.id}`;
  return user?.id ?? '-';
}

export function formatCasinoLabel(value: string) {
  return value
    .toLowerCase()
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function parseCasinoLevel(value: string | null) {
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function parsePositiveNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function parseCasinoPageSize(value: string | null) {
  const parsed = parsePositiveNumber(value, CASINO_DEFAULT_PAGE_SIZE);
  return CASINO_PAGE_SIZE_OPTIONS.includes(parsed)
    ? parsed
    : CASINO_DEFAULT_PAGE_SIZE;
}

export function normalizeCasinoDate(value: string | null) {
  const trimmed = value?.trim() ?? '';
  return datePattern.test(trimmed) && isValidDateParts(trimmed)
    ? trimmed
    : '';
}

export function normalizeCasinoFromDateTime(value: string | null) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return getDefaultCasinoFromDateTime();

  if (datePattern.test(trimmed)) {
    return isValidDateParts(trimmed)
      ? `${trimmed}T00:00`
      : getDefaultCasinoFromDateTime();
  }

  const utcMatch = trimmed.match(utcDateTimePattern);
  if (utcMatch) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime())
      ? getDefaultCasinoFromDateTime()
      : formatDateTimeLocal(parsed);
  }

  const localMatch = trimmed.match(localDateTimePattern);
  if (localMatch) {
    return formatLocalDateTimeMatch(localMatch) ?? getDefaultCasinoFromDateTime();
  }

  return getDefaultCasinoFromDateTime();
}

export function formatCasinoFromDateTimeInput(value: string) {
  return normalizeCasinoFromDateTime(value);
}

export function normalizeCasinoFromDateTimeInput(value: string) {
  return normalizeCasinoFromDateTime(value || null);
}

export function formatCasinoFromDateTimeForApi(value: string) {
  const normalized = normalizeCasinoFromDateTime(value);
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime())
    ? new Date(getDefaultCasinoFromDateTime()).toISOString()
    : parsed.toISOString();
}

function isValidDateParts(value: string) {
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function formatLocalDateTimeMatch(match: RegExpMatchArray) {
  const [, year, month, day, hour, minute, second = '00'] = match;
  const date = `${year}-${month}-${day}`;
  if (!isValidDateParts(date)) return null;
  if (!isValidTimeParts(hour, minute, second, '000')) return null;

  return `${date}T${hour}:${minute}`;
}

function getDefaultCasinoFromDateTime() {
  return formatDateTimeLocal(new Date(CASINO_DEFAULT_FROM_UTC_INSTANT));
}

function formatDateTimeLocal(value: Date) {
  return [
    value.getFullYear(),
    padDatePart(value.getMonth() + 1),
    padDatePart(value.getDate()),
  ].join('-') + `T${padDatePart(value.getHours())}:${padDatePart(value.getMinutes())}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function isValidTimeParts(
  hourText: string,
  minuteText: string,
  secondText: string,
  millisecondText: string,
) {
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millisecond = Number(millisecondText);

  return (
    Number.isInteger(hour) &&
    hour >= 0 &&
    hour <= 23 &&
    Number.isInteger(minute) &&
    minute >= 0 &&
    minute <= 59 &&
    Number.isInteger(second) &&
    second >= 0 &&
    second <= 59 &&
    Number.isInteger(millisecond) &&
    millisecond >= 0 &&
    millisecond <= 999
  );
}
