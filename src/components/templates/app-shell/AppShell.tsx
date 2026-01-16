import Logo from '@/assets/logo/logo.png';
import { useAuth } from '@/app/auth';
import { cn } from '@/common/utils';
import { Navigation, UserCard } from '@/organisms';

import s from './AppShell.module.scss';
import {Typography} from "@/atoms";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AppShell({ children, className }: AppShellProps) {
  const { user } = useAuth();
  const name =
    user?.firstName || user?.lastName
      ? [user?.firstName, user?.lastName].filter(Boolean).join(' ')
      : user?.email ?? 'Echo member';

  return (
    <div className={cn(s.page, [className])}>
      <aside className={s.sidebar}>
        <div className={s.brandLogo}>
          <img src={Logo} alt="Aera" />

          <Typography variant="h2" className={s.logoText}>Admin</Typography>
        </div>

        <Navigation />
        <div className={s.sidebarFooter}>
          <UserCard name={name} plan="Echo Pro" />
        </div>
      </aside>
      <main className={s.main}>{children}</main>
    </div>
  );
}
