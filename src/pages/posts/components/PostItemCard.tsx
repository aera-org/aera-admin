import { TrashIcon } from '@/assets/icons';
import { Badge, Card, IconButton, Skeleton, Typography } from '@/atoms';
import { type IPost, PostType } from '@/common/types';

import s from './PostItemCard.module.scss';

type PostItemCardProps = {
  item: IPost;
  onSelect?: (item: IPost) => void;
  onDelete?: (item: IPost) => void;
  isDeleting?: boolean;
};

export function PostItemCard({
  item,
  onSelect,
  onDelete,
  isDeleting = false,
}: PostItemCardProps) {
  const scenarioName = item.scenario.name || 'Untitled';
  const imageUrl = item.img?.url ?? '';
  const videoUrl = item.video?.url ?? '';
  const textValue = item.text || '—';
  const isSelectable = Boolean(onSelect);
  const handleSelect = () => {
    if (!onSelect) return;
    onSelect(item);
  };
  const handleDelete = () => {
    if (!onDelete) return;
    onDelete(item);
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
      {onDelete ? (
        <div className={s.cardActions}>
          <IconButton
            aria-label="Delete post"
            icon={<TrashIcon />}
            tooltip="Delete post"
            variant="secondary"
            tone="danger"
            size="sm"
            loading={isDeleting}
            disabled={isDeleting}
            onClick={(event) => {
              event.stopPropagation();
              handleDelete();
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
          />
        </div>
      ) : null}
      <div className={s.previewFrame}>
        {item.type === PostType.Video && videoUrl ? (
          <video
            className={s.previewMedia}
            src={videoUrl}
            muted
            playsInline
            preload="metadata"
          />
        ) : imageUrl ? (
          <img
            className={s.previewMedia}
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
            <Badge>{item.type === PostType.Video ? 'Video' : 'Image'}</Badge>
          </div>
        </div>
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
        <Skeleton width={90} height={20} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="85%" height={14} />
        <Skeleton width="70%" height={14} />
      </div>
    </Card>
  );
}
