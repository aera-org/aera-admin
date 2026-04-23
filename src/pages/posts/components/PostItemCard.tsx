import { Badge, Card, Skeleton, Typography } from '@/atoms';
import type { IPost } from '@/common/types';

import s from './PostItemCard.module.scss';

type PostItemCardProps = {
  item: IPost;
  onSelect?: (item: IPost) => void;
};

export function PostItemCard({ item, onSelect }: PostItemCardProps) {
  const scenarioName = item.scenario.name || 'Untitled';
  const imageUrl = item.img.url;
  const textValue = item.text || '—';
  const note = item.note?.trim() || '';
  const isSelectable = Boolean(onSelect);
  const handleSelect = () => {
    if (!onSelect) return;
    onSelect(item);
  };

  return (
    <Card
      padding="md"
      className={[s.card, isSelectable ? s.selectable : ''].filter(Boolean).join(' ')}
      role={isSelectable ? 'button' : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onClick={isSelectable ? handleSelect : undefined}
      onKeyDown={
        isSelectable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleSelect();
              }
            }
          : undefined
      }
    >
      <div className={s.previewFrame}>
        {imageUrl ? (
          <img
            className={s.previewImage}
            src={imageUrl}
            alt={scenarioName}
            loading="lazy"
          />
        ) : (
          <div className={s.previewPlaceholder}>
            <Typography variant="caption" tone="muted">
              No image
            </Typography>
          </div>
        )}
      </div>
      <div className={s.body}>
        <div className={s.meta}>
          <Typography className={s.title} variant="body">
            {scenarioName}
          </Typography>
          <div className={s.badges}>
            <Badge tone={item.isActive ? 'success' : 'warning'}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {item.isTop ? <Badge>Top</Badge> : null}
          </div>
        </div>
        <pre className={s.textValue}>{textValue}</pre>
        {note ? (
          <Typography className={s.note} variant="caption" tone="muted">
            {note}
          </Typography>
        ) : null}
      </div>
    </Card>
  );
}

export function PostItemCardSkeleton() {
  return (
    <Card padding="md" className={s.card}>
      <div className={s.previewFrame}>
        <Skeleton height="100%" />
      </div>
      <div className={s.body}>
        <Skeleton width={180} height={14} />
        <Skeleton width={90} height={20} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="85%" height={14} />
        <Skeleton width="70%" height={14} />
      </div>
    </Card>
  );
}
