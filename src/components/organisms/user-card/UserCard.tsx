import { Link, useLocation } from 'react-router-dom';

import { Avatar, Typography } from '@/atoms';
import { cn } from '@/common/utils';

import s from './UserCard.module.scss';

type UserCardProps = {
  name: string;
  plan: string;
  to?: string;
};

export function UserCard({ name, plan, to = '/profile' }: UserCardProps) {
  const location = useLocation();

  const isActive = location.pathname === to;

  return (
    <Link className={cn(s.card, [], { [s.active]: isActive })} to={to}>
      <Avatar fallback={name} />
      <div>
        <Typography className={s.name} variant="body">
          {name}
        </Typography>
        <Typography className={s.plan} variant="meta" tone="muted">
          {plan}
        </Typography>
      </div>
    </Link>
  );
}
