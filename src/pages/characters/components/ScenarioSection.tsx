import { EmptyState, Skeleton, Stack, Tabs, Typography } from '@/atoms';
import type { ICharacterDetails } from '@/common/types';

import s from '../CharacterDetailsPage.module.scss';
import { ScenarioDetails } from './ScenarioDetails';

type ScenarioSectionProps = {
  scenarios: ICharacterDetails['scenarios'];
  selectedScenarioId: string | null;
  onSelectScenario: (id: string) => void;
  isLoading: boolean;
  formatDate: (value: string | null | undefined) => string;
};

export function ScenarioSection({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  isLoading,
  formatDate,
}: ScenarioSectionProps) {
  const scenarioTabs = scenarios.map((scenario) => ({
    value: scenario.id,
    label: scenario.name || 'Untitled',
  }));
  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;

  return (
    <div className={s.section}>
      <Typography variant="h3">Scenarios</Typography>
      {isLoading ? (
        <Stack gap="16px">
          <Skeleton width="100%" height={160} />
        </Stack>
      ) : scenarios.length === 0 ? (
        <EmptyState
          title="No scenarios"
          description="This character has no scenarios yet."
        />
      ) : (
        <Stack gap="24px">
          <div className={s.scenarioTabs}>
            <Tabs
              items={scenarioTabs}
              value={selectedScenarioId ?? scenarioTabs[0]?.value ?? ''}
              onChange={onSelectScenario}
            />
          </div>

          {selectedScenario ? (
            <ScenarioDetails
              scenario={selectedScenario}
              formatDate={formatDate}
            />
          ) : null}
        </Stack>
      )}
    </div>
  );
}
