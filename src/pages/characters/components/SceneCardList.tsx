import { PencilLineIcon } from '@/assets/icons';
import { IconButton, Stack, Typography } from '@/atoms';
import type { IScene } from '@/common/types';

import s from '../CharacterDetailsPage.module.scss';

type SceneCardListProps = {
  scenes: IScene[];
  onEdit: (scene: IScene) => void;
  canEdit: boolean;
};

export function SceneCardList({ scenes, onEdit, canEdit }: SceneCardListProps) {
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
          <div className={s.sceneHeaderRow}>
            <div className={s.sceneTitleBlock}>
              <Typography variant="h3">{scene.name}</Typography>
            </div>
            <span className={s.sceneEdit}>
              <IconButton
                aria-label={`Edit ${scene.name}`}
                icon={<PencilLineIcon />}
                tooltip="Edit scene"
                variant="ghost"
                size="sm"
                onClick={() => onEdit(scene)}
                disabled={!canEdit}
              />
            </span>
          </div>

          <div>
            <Typography variant="caption" tone="muted">
              Opening image
            </Typography>
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
              Goal
            </Typography>
            <Typography variant="body" className={s.multiline}>
              {scene.goal || '-'}
            </Typography>
          </div>
          <div className={s.sceneRow}>
            <Typography variant="caption" tone="muted" className={s.sceneLabel}>
              Opening message
            </Typography>
            <Typography variant="body" className={s.multiline}>
              {scene.openingMessage || '-'}
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
