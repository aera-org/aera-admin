import { Button, Stack, Typography } from '@/atoms';
import type { IScene } from '@/common/types';

import s from '../CharacterDetailsPage.module.scss';

type SceneCardListProps = {
  scenes: IScene[];
};

export function SceneCardList({ scenes }: SceneCardListProps) {
  if (!scenes.length) {
    return (
      <Typography variant="body" tone="muted">
        No scenes available.
      </Typography>
    );
  }

  return (
    <Stack gap="16px">
      {scenes.map((scene) => (
        <div key={scene.id} className={s.sceneCard}>
          <div className={s.sceneHeader}>
            {scene.openingImageUrl ? (
              <img
                className={s.sceneImage}
                src={scene.openingImageUrl}
                alt={scene.name}
                loading="lazy"
              />
            ) : (
              <div className={s.sceneImagePlaceholder}>
                <Typography variant="caption" tone="muted">
                  No image
                </Typography>
              </div>
            )}
            <div className={s.sceneTitleBlock}>
              <Typography variant="body">{scene.name}</Typography>
              {scene.openingImageUrl ? (
                <Button
                  as="a"
                  href={scene.openingImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  variant="ghost"
                  size="sm"
                >
                  Open image
                </Button>
              ) : null}
            </div>
          </div>
          <div className={s.sceneRow}>
            <Typography variant="caption" tone="muted" className={s.sceneLabel}>
              Description
            </Typography>
            <Typography variant="body" className={s.multiline}>
              {scene.description || '-'}
            </Typography>
          </div>
          <div className={s.sceneRow}>
            <Typography variant="caption" tone="muted" className={s.sceneLabel}>
              Visual change
            </Typography>
            <Typography variant="body" className={s.multiline}>
              {scene.visualChange || '-'}
            </Typography>
          </div>
        </div>
      ))}
    </Stack>
  );
}
