import type { JSX } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { MessageSquareQuoteIcon } from '@/assets/icons';
import { Button } from '@/atoms';

import s from './Navigation.module.scss';

type NavItem = {
  label: string;
  to: string;
  icon: JSX.Element;
};

const navItems: NavItem[] = [
  { label: 'Characters', to: '/characters', icon: <MessageSquareQuoteIcon /> },
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
