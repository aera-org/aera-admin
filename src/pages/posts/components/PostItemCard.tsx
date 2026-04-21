import { Card, Skeleton, Typography } from '@/atoms';
import type { IPost } from '@/common/types';

import s from './PostItemCard.module.scss';

type PostItemCardProps = {
  item: IPost;
  isSelected?: boolean;
  onSelect?: (item: IPost) => void;
};

export function PostItemCard({
  item,
  isSelected = false,
  onSelect,
}: PostItemCardProps) {
  const scenarioName = item.scenario.name || 'Untitled';
  const imageUrl = item.img.file.url;
  const textValue = item.text.value || '—';
  const isSelectable = Boolean(onSelect);
  const handleSelect = () => {
    if (!onSelect) return;
    onSelect(item);
  };

  return (
    <Card
      padding="md"
      className={[
        s.card,
        isSelectable ? s.selectable : '',
        isSelected ? s.selected : '',
      ]
        .filter(Boolean)
        .join(' ')}
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
        <Typography className={s.title} variant="body">
          {scenarioName}
        </Typography>
        <pre className={s.textValue}>{textValue}</pre>
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
        <Skeleton width="100%" height={14} />
        <Skeleton width="85%" height={14} />
        <Skeleton width="70%" height={14} />
      </div>
    </Card>
  );
}
