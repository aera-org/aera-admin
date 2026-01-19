import { Grid, Stack, Typography } from '@/atoms';
import type { ICharacterDetails } from '@/common/types';

import s from '../CharacterDetailsPage.module.scss';
import { SceneCardList } from './SceneCardList';

type ScenarioDetailsProps = {
  scenario: ICharacterDetails['scenarios'][number];
  formatDate: (value: string | null | undefined) => string;
};

export function ScenarioDetails({ scenario, formatDate }: ScenarioDetailsProps) {
  const phases = scenario.phases;

  return (
    <div className={s.detailsCard}>
      <div className={s.detailsHeader}>
        <Typography variant="h3">
          <span className={s.emoji}>{scenario.emoji || ''}</span>
          {scenario.name}
        </Typography>
        <Typography variant="meta" tone="muted">
          {scenario.updatedAt ? `Updated ${formatDate(scenario.updatedAt)}` : ''}
        </Typography>
      </div>

      <Stack gap="16px">
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Description
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.description || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Appearance
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.appearance || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Situation
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.situation || '-'}
          </Typography>
        </div>

        <div>
          <Typography variant="h3">Phases</Typography>
          <Grid columns={3} gap="16px" className={s.phaseGrid}>
            {(
              [
                { key: 'hook', label: 'Hook' },
                { key: 'resistance', label: 'Resistance' },
                { key: 'retention', label: 'Retention' },
              ] as const
            ).map((phase) => {
              const content = phases ? phases[phase.key] : null;
              return (
                <div key={phase.key} className={s.phaseCard}>
                  <Typography variant="body" className={s.phaseTitle}>
                    {phase.label}
                  </Typography>
                  <div className={s.phaseSection}>
                    <Typography variant="caption" tone="muted">
                      Tone and behavior
                    </Typography>
                    <Typography variant="body" className={s.multiline}>
                      {content?.toneAndBehavior || '-'}
                    </Typography>
                  </div>
                  <div className={s.phaseSection}>
                    <Typography variant="caption" tone="muted">
                      Photo sending guidelines
                    </Typography>
                    <Typography variant="body" className={s.multiline}>
                      {content?.photoSendingGuidelines || '-'}
                    </Typography>
                  </div>
                  <div className={s.phaseSection}>
                    <Typography variant="caption" tone="muted">
                      Photo message alignment rules
                    </Typography>
                    <Typography variant="body" className={s.multiline}>
                      {content?.photoMessageAlignmentRules || '-'}
                    </Typography>
                  </div>
                </div>
              );
            })}
          </Grid>
        </div>

        <div>
          <Typography variant="h3" className={s.scenesTitle}>
            Scenes
          </Typography>
          <SceneCardList scenes={scenario.scenes} />
        </div>
      </Stack>
    </div>
  );
}
