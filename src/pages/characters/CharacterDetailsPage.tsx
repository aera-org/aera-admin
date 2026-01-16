import { useEffect, useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';

import { useCharacterDetails } from '@/app/characters';
import { ExternalLinkIcon, PencilLineIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  Grid,
  List,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Typography,
} from '@/atoms';
import type { ICharacterDetails, IScene } from '@/common/types';
import { AppShell } from '@/components/templates';

import s from './CharacterDetailsPage.module.scss';

type TabValue = 'overview' | 'scenarios';

type Scenario = ICharacterDetails['scenarios'][number];

type SceneLookup = Record<string, IScene>;

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'scenarios', label: 'Scenarios' },
];

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

function formatValue(value: string | null | undefined) {
  if (!value) return '-';
  const trimmed = value.trim();
  if (!trimmed) return '-';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function buildSceneLookup(scenes: IScene[]) {
  return scenes.reduce<SceneLookup>((acc, scene) => {
    acc[scene.id] = scene;
    return acc;
  }, {});
}

function getOrderedScenes(scenario: Scenario) {
  if (!scenario.scenesOrder?.length) return scenario.scenes;
  const lookup = buildSceneLookup(scenario.scenes);
  return scenario.scenesOrder
    .map((id) => lookup[id])
    .filter((scene): scene is IScene => Boolean(scene));
}

export function CharacterDetailsPage() {
  const { id } = useParams();
  const [tab, setTab] = useState<TabValue>('overview');
  const { data, error, isLoading, refetch } = useCharacterDetails(id ?? null);

  const scenarios = data?.scenarios ?? [];
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!scenarios.length) {
      setSelectedScenarioId(null);
      return;
    }
    if (!selectedScenarioId) {
      setSelectedScenarioId(scenarios[0]?.id ?? null);
      return;
    }
    const stillExists = scenarios.some(
      (scenario) => scenario.id === selectedScenarioId,
    );
    if (!stillExists) {
      setSelectedScenarioId(scenarios[0]?.id ?? null);
    }
  }, [scenarios, selectedScenarioId]);

  const selectedScenario = useMemo(
    () =>
      scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null,
    [scenarios, selectedScenarioId],
  );

  const scenarioColumns = useMemo(
    () => [
      { key: 'scenario', label: 'Name' },
      { key: 'scenes', label: 'Scenes' },
      { key: 'actions', label: '' },
    ],
    [],
  );

  const scenarioRows = useMemo(
    () =>
      scenarios.map((scenario) => {
        const isSelected = scenario.id === selectedScenarioId;
        return {
          scenario: (
            <div className={s.scenarioCell}>
              <Typography variant="body" className={s.scenarioName}>
                <span className={s.emoji}>{scenario.emoji || '-'}</span>
                {scenario.name}
              </Typography>
            </div>
          ),
          scenes: (
            <Typography variant="body" tone="muted">
              {scenario.scenes?.length ?? 0}
            </Typography>
          ),
          actions: (
            <div className={s.rowActions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedScenarioId(scenario.id)}
                disabled={isSelected}
              >
                {isSelected ? 'Selected' : 'View details'}
              </Button>
            </div>
          ),
        };
      }),
    [scenarios, selectedScenarioId],
  );

  const sceneColumns = useMemo(
    () => [
      { key: 'scene', label: 'Scene' },
      { key: 'visual', label: 'Visual change' },
      { key: 'image', label: 'Opening image' },
    ],
    [],
  );

  const sceneRows = useMemo(() => {
    if (!selectedScenario) return [];
    const orderedScenes = getOrderedScenes(selectedScenario);
    return orderedScenes.map((scene) => ({
      scene: (
        <div className={s.sceneCell}>
          <Typography variant="body">{scene.name}</Typography>
          <Typography variant="caption" tone="muted" className={s.truncate}>
            {scene.description || 'No description'}
          </Typography>
        </div>
      ),
      visual: (
        <Typography variant="body" tone="muted" className={s.truncate}>
          {scene.visualChange || '-'}
        </Typography>
      ),
      image: scene.openingImageUrl ? (
        <div className={s.sceneImageCell}>
          <img
            className={s.sceneImage}
            src={scene.openingImageUrl}
            alt={scene.name}
            loading="lazy"
          />
          <Button
            as="a"
            href={scene.openingImageUrl}
            target="_blank"
            rel="noreferrer"
            variant="ghost"
            size="sm"
          >
            Open
          </Button>
        </div>
      ) : (
        <Typography variant="body" tone="muted">
          -
        </Typography>
      ),
    }));
  }, [selectedScenario]);

  const orderedSceneNames = useMemo(() => {
    if (!selectedScenario) return [];
    const lookup = buildSceneLookup(selectedScenario.scenes);
    if (!selectedScenario.scenesOrder?.length) {
      return selectedScenario.scenes.map((scene) => scene.name);
    }
    return selectedScenario.scenesOrder.map(
      (sceneId) => lookup[sceneId]?.name ?? sceneId,
    );
  }, [selectedScenario]);

  const phases = selectedScenario?.phases ?? null;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <Button as={NavLink} to="/characters" variant="ghost" size="sm">
          Characters
        </Button>

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
                  <Badge tone={data.isActive ? 'success' : 'warning'}>
                    {data.isActive ? 'Active' : 'Inactive'}
                  </Badge>
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
            <Button variant="secondary" iconLeft={<PencilLineIcon />} disabled>
              Edit
            </Button>
          </div>
        </div>

        <Tabs
          items={TABS}
          value={tab}
          onChange={(value) => setTab(value as TabValue)}
        />

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load character"
              description={
                error instanceof Error ? error.message : 'Please try again.'
              }
              tone="warning"
            />
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : null}

        {tab === 'overview' ? (
          <div className={s.section}>
            <Typography variant="h3">Overview</Typography>
            <FormRow columns={3}>
              <Field label="Name" labelFor="character-name">
                <Typography id="character-name" variant="body">
                  {data?.name ?? '-'}
                </Typography>
              </Field>
              <Field label="Emoji" labelFor="character-emoji">
                <Typography id="character-emoji" variant="body">
                  {data?.emoji || '-'}
                </Typography>
              </Field>
              <Field label="Gender" labelFor="character-gender">
                <Typography id="character-gender" variant="body">
                  {formatValue(data?.gender)}
                </Typography>
              </Field>
            </FormRow>

            <FormRow columns={3}>
              <Field
                className={s.statusField}
                label="Status"
                labelFor="character-status"
              >
                {data ? (
                  <Badge tone={data.isActive ? 'success' : 'warning'}>
                    {data.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                ) : (
                  <Typography id="character-status" variant="body">
                    -
                  </Typography>
                )}
              </Field>
              <Field label="Created" labelFor="character-created">
                <Typography id="character-created" variant="body">
                  {formatDate(data?.createdAt)}
                </Typography>
              </Field>
              <Field label="Updated" labelFor="character-updated">
                <Typography id="character-updated" variant="body">
                  {formatDate(data?.updatedAt)}
                </Typography>
              </Field>
            </FormRow>
          </div>
        ) : null}

        {tab === 'scenarios' ? (
          <div className={s.section}>
            <Typography variant="h3">Scenarios</Typography>
            {isLoading && !data ? (
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
                <Table columns={scenarioColumns} rows={scenarioRows} />

                {selectedScenario ? (
                  <div className={s.detailsCard}>
                    <div className={s.detailsHeader}>
                      <Typography variant="h3">
                        <span className={s.emoji}>
                          {selectedScenario.emoji || ''}
                        </span>
                        {selectedScenario.name}
                      </Typography>
                      <Typography variant="meta" tone="muted">
                        {selectedScenario.updatedAt
                          ? `Updated ${formatDate(selectedScenario.updatedAt)}`
                          : ''}
                      </Typography>
                    </div>

                    <Stack gap="16px">
                      <div className={s.detailBlock}>
                        <Typography variant="caption" tone="muted">
                          Description
                        </Typography>
                        <Typography variant="body" className={s.multiline}>
                          {selectedScenario.description || '-'}
                        </Typography>
                      </div>
                      <div className={s.detailBlock}>
                        <Typography variant="caption" tone="muted">
                          Appearance
                        </Typography>
                        <Typography variant="body" className={s.multiline}>
                          {selectedScenario.appearance || '-'}
                        </Typography>
                      </div>
                      <div className={s.detailBlock}>
                        <Typography variant="caption" tone="muted">
                          Situation
                        </Typography>
                        <Typography variant="body" className={s.multiline}>
                          {selectedScenario.situation || '-'}
                        </Typography>
                      </div>

                      <div>
                        <Typography variant="caption" tone="muted">
                          Scenes order
                        </Typography>
                        {orderedSceneNames.length ? (
                          <List items={orderedSceneNames} />
                        ) : (
                          <Typography variant="body" tone="muted">
                            -
                          </Typography>
                        )}
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
                                <Typography
                                  variant="body"
                                  className={s.phaseTitle}
                                >
                                  {phase.label}
                                </Typography>
                                <div className={s.phaseSection}>
                                  <Typography variant="caption" tone="muted">
                                    Tone and behavior
                                  </Typography>
                                  <Typography
                                    variant="body"
                                    className={s.multiline}
                                  >
                                    {content?.toneAndBehavior || '-'}
                                  </Typography>
                                </div>
                                <div className={s.phaseSection}>
                                  <Typography variant="caption" tone="muted">
                                    Photo sending guidelines
                                  </Typography>
                                  <Typography
                                    variant="body"
                                    className={s.multiline}
                                  >
                                    {content?.photoSendingGuidelines || '-'}
                                  </Typography>
                                </div>
                                <div className={s.phaseSection}>
                                  <Typography variant="caption" tone="muted">
                                    Photo message alignment rules
                                  </Typography>
                                  <Typography
                                    variant="body"
                                    className={s.multiline}
                                  >
                                    {content?.photoMessageAlignmentRules || '-'}
                                  </Typography>
                                </div>
                              </div>
                            );
                          })}
                        </Grid>
                      </div>

                      <div>
                        <Typography variant="h3">Scenes</Typography>
                        {sceneRows.length ? (
                          <Table columns={sceneColumns} rows={sceneRows} />
                        ) : (
                          <Typography variant="body" tone="muted">
                            No scenes available.
                          </Typography>
                        )}
                      </div>
                    </Stack>
                  </div>
                ) : null}
              </Stack>
            )}
          </div>
        ) : null}

        {!data && !isLoading && !error ? (
          <EmptyState
            title="Character not found"
            description="We could not find this character."
          />
        ) : null}
      </Container>
    </AppShell>
  );
}
