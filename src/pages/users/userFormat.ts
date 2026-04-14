import type { ITgUser } from '@/common/types';

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

export function formatUserName(user: ITgUser) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  const username = user.username?.trim();
  if (username) return `@${username}`;
  return 'Unknown user';
}

export function formatUserMeta(user: ITgUser) {
  const username = user.username?.trim();
  if (username) {
    return `@${username} / ${user.id}`;
  }
  return user.id;
}

export function getSubscriptionStatus(user: ITgUser) {
  if (!user.subscribedUntil) {
    return {
      label: 'None',
      tone: 'accent' as const,
      outline: true,
      dateLabel: null,
    };
  }
  const parsed = new Date(user.subscribedUntil);
  if (Number.isNaN(parsed.getTime())) {
    return {
      label: 'Unknown',
      tone: 'warning' as const,
      outline: true,
      dateLabel: '-',
    };
  }
  const isActive = parsed.getTime() > Date.now();
  return {
    label: isActive ? 'Active' : 'Expired',
    tone: isActive ? ('success' as const) : ('warning' as const),
    outline: !isActive,
    dateLabel: `${isActive ? 'Until' : 'Ended'} ${formatDate(
      user.subscribedUntil,
    )}`,
  };
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
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function parseFuelValue(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > 100) return null;
  return parsed;
}

export function parseAirValue(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0) return null;
  return parsed;
}
