import { TrashIcon } from '@/assets/icons';
import { Badge, Button, IconButton, Skeleton, Typography } from '@/atoms';
import { CharacterType, type ICharacterDetails } from '@/common/types';
import { capitalize } from '@/common/utils';

import s from '../CharacterDetailsPage.module.scss';

type CharacterHeaderProps = {
  data: ICharacterDetails | undefined;
  isLoading: boolean;
  onAddAnime: () => void;
  canAddAnime: boolean;
  isAddingAnime: boolean;
  onDelete: () => void;
  canDelete: boolean;
  isDeleting: boolean;
};

export function CharacterHeader({
  data,
  isLoading,
  onAddAnime,
  canAddAnime,
  isAddingAnime,
  onDelete,
  canDelete,
  isDeleting,
}: CharacterHeaderProps) {
  return (
    <div className={s.header}>
      <div className={s.titleBlock}>
        {isLoading && !data ? (
          <Skeleton width={260} height={24} />
        ) : (
          <div className={s.titleRow}>
            <Typography variant="h2">
              {data?.emoji ? (
                <span className={s.emoji}>{data.emoji}</span>
              ) : null}
              {data?.name ?? 'Character'}
            </Typography>
            {data ? (
              <>
                <Badge tone={data.isActive ? 'success' : 'warning'}>
                  {data.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Badge tone={'success'}>{capitalize(data.type)}</Badge>
              </>
            ) : null}
          </div>
        )}
        {isLoading && !data ? (
          <Skeleton width={320} height={12} />
        ) : (
          <Typography variant="meta" tone="muted">
            {data?.id ?? '-'}
          </Typography>
        )}
      </div>
      <div className={s.actions}>
        {data?.type === CharacterType.Realistic ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onAddAnime}
            loading={isAddingAnime}
            disabled={!canAddAnime || isDeleting}
          >
            Add Anime
          </Button>
        ) : null}
        <IconButton
          aria-label="Delete character"
          icon={<TrashIcon />}
          tooltip="Delete character"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={!canDelete || isDeleting || isAddingAnime}
        />
      </div>
    </div>
  );
}
