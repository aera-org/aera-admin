import type { JSX } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import {
  AudioLinesIcon,
  LayersIcon,
  NewspaperIcon,
  PencilLineIcon,
  RadioIcon,
} from '@/assets/icons';
import { Button } from '@/atoms';

import s from './Navigation.module.scss';

type NavItem = {
  label: string;
  to: string;
  icon: JSX.Element;
};

const navItems: NavItem[] = [
  { label: 'Write', to: '/', icon: <PencilLineIcon /> },
  { label: 'Posts', to: '/posts', icon: <NewspaperIcon /> },
  { label: 'Themes', to: '/themes', icon: <LayersIcon /> },
  { label: 'Sources', to: '/sources', icon: <RadioIcon /> },
  { label: 'Voices', to: '/voices', icon: <AudioLinesIcon /> },
];

export function Navigation() {
  const location = useLocation();

  return (
    <nav className={s.nav} aria-label="Primary">
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.to ||
          (item.to !== '/' && location.pathname.startsWith(item.to));
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
    </nav>
  );
}
