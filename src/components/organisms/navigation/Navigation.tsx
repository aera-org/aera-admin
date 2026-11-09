import { Fragment, type JSX, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { isNavItemVisible, useAuth } from '@/app/auth';
import {
  AudioLinesIcon,
  BananaIcon,
  ChartIcon,
  CircleDotIcon,
  DollarSignIcon,
  GiftIcon,
  ImageIcon,
  LayersIcon,
  LogsIcon,
  MessageSquareQuoteIcon,
  NewspaperIcon,
  RadioIcon,
  SendIcon,
  SparklesIcon,
  UserCogIcon,
  UserIcon,
  UsersRoundIcon,
  VideoIcon,
} from '@/assets/icons';
import { Button, ButtonGroup, Divider } from '@/atoms';
import { isX } from '@/common/is-x';

import s from './Navigation.module.scss';

type NavSection = 'system' | 'tg' | 'web';

type NavItem = {
  label: string;
  to: string;
  icon: JSX.Element;
  /** Extra path prefixes that mark this item as active. */
  match?: string[];
};

const SECTION_LABELS: Record<NavSection, string> = {
  system: 'System',
  tg: 'TG',
  web: 'Web',
};

const SECTION_ORDER: NavSection[] = ['system', 'tg', 'web'];
const DEFAULT_SECTION: NavSection = 'tg';
const STORAGE_KEY = 'nav.section';

/** Each section is a list of groups; groups are separated by a divider. */
const NAV: Record<NavSection, NavItem[][]> = {
  system: [
    [
      { label: 'Characters', to: '/characters', icon: <UsersRoundIcon /> },
      { label: 'Generations', to: '/generations', icon: <NewspaperIcon /> },
      { label: 'Images', to: '/character-images', icon: <ImageIcon /> },
      { label: 'Promo Images', to: '/batch-images', icon: <ImageIcon /> },
      { label: 'Datasets', to: '/datasets', icon: <CircleDotIcon /> },
      { label: 'Videos', to: '/videos', icon: <ImageIcon /> },
      { label: 'Voices', to: '/voices', icon: <AudioLinesIcon /> },
      { label: 'Prompts', to: '/prompts', icon: <MessageSquareQuoteIcon /> },
      { label: 'Poses', to: '/poses', icon: <CircleDotIcon /> },
      ...(isX
        ? [
            {
              label: 'Video Prompts',
              to: '/video-prompts',
              icon: <VideoIcon />,
            },
          ]
        : []),
      { label: 'Scenario Gen', to: '/scenario-gen', icon: <AudioLinesIcon /> },
      { label: 'User Types', to: '/user-types', icon: <UserIcon /> },
      { label: 'LoRAs', to: '/loras', icon: <LayersIcon /> },
      { label: 'Logs', to: '/logs', icon: <LogsIcon /> },
      { label: 'Admins', to: '/admins', icon: <UserCogIcon /> },
    ],
  ],
  tg: [
    [
      {
        label: 'Analytics',
        to: '/',
        icon: <ChartIcon />,
        match: ['/analytics'],
      },
      { label: 'Product', to: '/product', icon: <ChartIcon /> },
      { label: 'Users', to: '/users', icon: <UserIcon /> },
      { label: 'Chats', to: '/chats', icon: <SendIcon /> },
      { label: 'Payments', to: '/payments', icon: <DollarSignIcon /> },
      {
        label: 'Air Purchases',
        to: '/air-purchases',
        icon: <DollarSignIcon />,
      },
      ...(isX
        ? [{ label: 'Customers', to: '/customers', icon: <UsersRoundIcon /> }]
        : []),
    ],
    [
      { label: 'Posts', to: '/posts', icon: <BananaIcon /> },
      { label: 'Broadcast', to: '/broadcast', icon: <RadioIcon /> },
    ],
    [
      { label: 'Plans', to: '/plans', icon: <DollarSignIcon /> },
      { label: 'Gifts', to: '/gifts', icon: <GiftIcon /> },
      {
        label: 'Custom Characters',
        to: '/custom-characters',
        icon: <SparklesIcon />,
      },
    ],
  ],
  web: [
    [
      { label: 'Users', to: '/web/users', icon: <UserIcon /> },
      { label: 'Chats', to: '/web/chats', icon: <SendIcon /> },
      { label: 'Plans', to: '/web/plans', icon: <DollarSignIcon /> },
    ],
  ],
};

function matchesPrefix(pathname: string, prefix: string) {
  if (prefix === '/') return pathname === '/';
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Length of the longest prefix of the item that matches, or -1. */
function matchLength(item: NavItem, pathname: string) {
  return [item.to, ...(item.match ?? [])].reduce(
    (best, prefix) =>
      matchesPrefix(pathname, prefix) ? Math.max(best, prefix.length) : best,
    -1,
  );
}

function findActive(
  sections: [NavSection, NavItem[][]][],
  pathname: string,
): { section: NavSection; item: NavItem } | null {
  let best: { section: NavSection; item: NavItem; length: number } | null =
    null;
  for (const [section, groups] of sections) {
    for (const item of groups.flat()) {
      const length = matchLength(item, pathname);
      if (length >= 0 && (!best || length > best.length)) {
        best = { section, item, length };
      }
    }
  }
  return best;
}

function readStoredSection(): NavSection | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return SECTION_ORDER.includes(value as NavSection)
      ? (value as NavSection)
      : null;
  } catch {
    return null;
  }
}

function storeSection(section: NavSection) {
  try {
    window.localStorage.setItem(STORAGE_KEY, section);
  } catch {
    // Storage may be unavailable; the switcher still works for this session.
  }
}

export function Navigation() {
  const location = useLocation();
  const { user } = useAuth();

  const visibleSections = useMemo(
    () =>
      SECTION_ORDER.map(
        (section) =>
          [
            section,
            NAV[section]
              .map((group) =>
                group.filter((item) => isNavItemVisible(user?.role, item.to)),
              )
              .filter((group) => group.length > 0),
          ] as [NavSection, NavItem[][]],
      ).filter(([, groups]) => groups.length > 0),
    [user?.role],
  );

  const active = findActive(visibleSections, location.pathname);
  const activeSection = active?.section ?? null;

  const [selected, setSelected] = useState<NavSection>(
    () => activeSection ?? readStoredSection() ?? DEFAULT_SECTION,
  );

  // Follow navigation so the active item is always in the shown list.
  const [prevActiveSection, setPrevActiveSection] = useState(activeSection);
  if (activeSection !== prevActiveSection) {
    setPrevActiveSection(activeSection);
    if (activeSection) setSelected(activeSection);
  }

  useEffect(() => {
    storeSection(selected);
  }, [selected]);

  const shownSection = visibleSections.some(([key]) => key === selected)
    ? selected
    : visibleSections[0]?.[0];
  const groups =
    visibleSections.find(([key]) => key === shownSection)?.[1] ?? [];

  const handleSelect = (section: NavSection) => {
    setSelected(section);
  };

  return (
    <nav className={s.nav} aria-label="Primary">
      {visibleSections.length > 1 ? (
        <ButtonGroup fullWidth className={s.switcher} aria-label="Section">
          {visibleSections.map(([section]) => (
            <Button
              key={section}
              size="sm"
              variant={section === shownSection ? 'secondary' : 'ghost'}
              aria-pressed={section === shownSection}
              onClick={() => handleSelect(section)}
            >
              {SECTION_LABELS[section]}
            </Button>
          ))}
        </ButtonGroup>
      ) : null}

      {groups.map((group, index) => (
        <Fragment key={index}>
          {index > 0 ? <Divider className={s.divider} /> : null}
          {group.map((item) => {
            const isActive = active?.item === item;
            return (
              <Button
                key={item.to}
                as={NavLink}
                to={item.to}
                variant={isActive ? 'secondary' : 'ghost'}
                fullWidth
                iconLeft={item.icon}
                className={s.button}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Button>
            );
          })}
        </Fragment>
      ))}
    </nav>
  );
}
