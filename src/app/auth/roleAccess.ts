import { UserRole } from '@/common/types';

const AI_HOME_PATH = '/characters';
const DEFAULT_HOME_PATH = '/';

const AI_ALLOWED_PREFIXES = [
  '/broadcast',
  '/characters',
  '/batch-images',
  '/generations',
  '/character-images',
  '/posts',
  '/profile',
] as const;

const AI_NAV_PATHS = new Set([
  '/characters',
  '/character-images',
  '/posts',
  '/generations',
  '/batch-images',
  '/broadcast',
]);

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canAccessPath(role: UserRole | undefined, pathname: string) {
  if (role !== UserRole.AI) {
    return true;
  }

  return AI_ALLOWED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function getHomePath(role: UserRole | undefined) {
  return role === UserRole.AI ? AI_HOME_PATH : DEFAULT_HOME_PATH;
}

export function isNavItemVisible(role: UserRole | undefined, to: string) {
  if (role === UserRole.Target) {
    return to === '/';
  }

  if (role === UserRole.AI) {
    return AI_NAV_PATHS.has(to);
  }

  return true;
}
