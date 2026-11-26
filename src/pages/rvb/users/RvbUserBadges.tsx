import { Badge } from '@/atoms';
import type { IRvbUser } from '@/common/types';

import s from '../RvbPage.module.scss';

export function RvbUserBadges({ user }: { user: IRvbUser }) {
  return (
    <div className={s.badges}>
      {user.isBlocked ? (
        <Badge tone="danger" outline>
          Blocked
        </Badge>
      ) : (
        <Badge tone="success">Active</Badge>
      )}
      {user.started ? <Badge outline>Started</Badge> : null}
    </div>
  );
}
