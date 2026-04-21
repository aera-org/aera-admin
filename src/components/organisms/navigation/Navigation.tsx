import type { JSX } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/auth';
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
} from '@/assets/icons';
import { Button } from '@/atoms';
import { UserRole } from '@/common/types';

import s from './Navigation.module.scss';

type NavItem = {
  label: string;
  to: string;
  icon: JSX.Element;
};

const navItems: NavItem[] = [
  { label: 'Analytics', to: '/', icon: <ChartIcon /> },
  { label: 'Characters', to: '/characters', icon: <UsersRoundIcon /> },
  {
    label: 'Custom Characters',
    to: '/custom-characters',
    icon: <SparklesIcon />,
  },
  { label: 'Images', to: '/character-images', icon: <ImageIcon /> },
  { label: 'Posts', to: '/posts', icon: <BananaIcon /> },
  { label: 'Generations', to: '/generations', icon: <NewspaperIcon /> },
  { label: 'Batch Images', to: '/batch-images', icon: <ImageIcon /> },
  { label: 'Prompts', to: '/prompts', icon: <MessageSquareQuoteIcon /> },
  { label: 'Poses', to: '/poses', icon: <CircleDotIcon /> },
  { label: 'Broadcast', to: '/broadcast', icon: <RadioIcon /> },
  { label: 'Scenario Gen', to: '/scenario-gen', icon: <AudioLinesIcon /> },
  { label: 'Datasets', to: '/datasets', icon: <CircleDotIcon /> },
  { label: 'Videos', to: '/videos', icon: <ImageIcon /> },
  { label: 'Gifts', to: '/gifts', icon: <GiftIcon /> },
  { label: 'Users', to: '/users', icon: <UserIcon /> },
  { label: 'Chats', to: '/chats', icon: <SendIcon /> },
  { label: 'LoRAs', to: '/loras', icon: <LayersIcon /> },
  { label: 'Plans', to: '/plans', icon: <DollarSignIcon /> },
  { label: 'Logs', to: '/logs', icon: <LogsIcon /> },
  { label: 'Admins', to: '/admins', icon: <UserCogIcon /> },
];

export function Navigation() {
  const location = useLocation();
  const { user } = useAuth();
  const isTargetUser = user?.role === UserRole.Target;
  const visibleItems = isTargetUser
    ? navItems.filter((item) => item.to === '/')
    : navItems;

  return (
    <nav className={s.nav} aria-label="Primary">
      {visibleItems.map((item) => {
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
