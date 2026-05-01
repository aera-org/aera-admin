import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useCharacterDetails } from '@/app/characters';
import {
  useDeleteScenarioGen,
  useReplaceScenarioGen,
  useSaveScenarioGen,
  useScenarioGenDetails,
} from '@/app/scenario-gen';
import {
  Alert,
  Badge,
  Button,
  Container,
  Field,
  FormRow,
  Input,
  Modal,
  Select,
  Skeleton,
  Stack,
  Tabs,
  Typography,
} from '@/atoms';
import {
  RoleplayStage,
  type StageDirectives,
  STAGES_IN_ORDER,
} from '@/common/types';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';
import { AppShell } from '@/components/templates';

import s from './ScenarioGenDetailsPage.module.scss';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const STAGE_LABELS: Record<RoleplayStage, string> = {
  [RoleplayStage.Acquaintance]: 'Acquaintance',
  [RoleplayStage.Flirting]: 'Flirting',
  [RoleplayStage.Seduction]: 'Seduction',
  [RoleplayStage.Resistance]: 'Resistance',
  [RoleplayStage.Undressing]: 'Undressing',
  [RoleplayStage.Prelude]: 'Prelude',
  [RoleplayStage.Sex]: 'Sex',
  [RoleplayStage.Aftercare]: 'Aftercare',
};

const EMPTY_STAGE: StageDirectives = {
  toneAndBehavior: '',
  restrictions: '',
  environment: '',
  characterLook: '',
  goal: '',
  escalationTrigger: '',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

function isStageEmpty(stage: StageDirectives) {
  return (
    !stage.toneAndBehavior.trim() &&
    !stage.restrictions.trim() &&
    !stage.environment.trim() &&
    !stage.characterLook.trim() &&
    !stage.goal.trim() &&
    !stage.escalationTrigger.trim()
  );
}

export function ScenarioGenDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const scenarioGenId = id ?? '';
  const { data, error, isLoading } = useScenarioGenDetails(
    scenarioGenId || null,
  );
  const { data: characterData } = useCharacterDetails(data?.characterId ?? null);
  const saveMutation = useSaveScenarioGen();
  const replaceMutation = useReplaceScenarioGen();
  const deleteMutation = useDeleteScenarioGen();

  const [selectedStage, setSelectedStage] = useState<RoleplayStage>(
    STAGES_IN_ORDER[0] ?? RoleplayStage.Acquaintance,
  );
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [showSlugError, setShowSlugError] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [showScenarioError, setShowScenarioError] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const scenario = data ?? null;

  const characterName =
    scenario?.characterName || characterData?.name || scenario?.characterId || '-';

  const selectedStageData = scenario?.data.stages?.[selectedStage] ?? EMPTY_STAGE;
  const stageItems = useMemo(
    () =>
      STAGES_IN_ORDER.map((stage) => ({
        value: stage,
        label: STAGE_LABELS[stage],
      })),
    [],
  );
  const scenarioOptions = useMemo(
    () =>
      (characterData?.scenarios ?? []).map((item) => ({
        value: item.id,
        label: item.slug ? `${item.name} (${item.slug})` : item.name,
      })),
    [characterData?.scenarios],
  );

  const slugError = showSlugError && !slug.trim() ? 'Enter a slug.' : undefined;
  const scenarioError =
    showScenarioError && !selectedScenarioId
      ? 'Choose a scenario to replace.'
      : undefined;

  const handleSave = async () => {
    if (!data) return;
    const nextSlug = slug.trim();
    if (!nextSlug) {
      setShowSlugError(true);
      return;
    }

    await saveMutation.mutateAsync({
      id: data.id,
      payload: { slug: nextSlug },
    });
    setIsSaveOpen(false);
  };

  const handleReplace = async () => {
    if (!data) return;
    if (!selectedScenarioId) {
      setShowScenarioError(true);
      return;
    }

    await replaceMutation.mutateAsync({
      id: data.id,
      characterId: data.characterId,
      payload: { scenarioId: selectedScenarioId },
    });
    setIsReplaceOpen(false);
  };

  const handleDelete = async () => {
    if (!data) return;
    await deleteMutation.mutateAsync(data.id);
    navigate('/scenario-gen');
  };

  const isReady = Boolean(scenario);
  const canReplace =
    isReady && Boolean(scenario?.characterId) && scenarioOptions.length > 0;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <div className={s.headingRow}>
              <Typography variant="h2">
                {scenario?.name || 'Generated scenario'}
              </Typography>
              {scenario ? (
                scenario.isSaved ? (
                  <Badge tone="success">Saved</Badge>
                ) : (
                  <Badge outline>Draft</Badge>
                )
              ) : null}
            </div>
            <Typography variant="body" tone="muted">
              Review generated output before saving it into the character
              scenario set.
            </Typography>
          </div>

          <div className={s.headerActions}>
            {scenario?.characterId ? (
              <Button
                variant="secondary"
                onClick={() => navigate(`/characters/${scenario.characterId}`)}
              >
                Open character
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => navigate('/scenario-gen')}>
              Back
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                navigate('/scenario-gen/new', {
                  state: {
                    template: {
                      characterId: scenario?.characterId ?? '',
                      name: scenario?.name ?? '',
                      context: scenario?.context ?? '',
                    },
                  },
                })
              }
              disabled={!isReady}
            >
              Reuse
            </Button>
            <Button
              variant="ghost"
              tone="danger"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!isReady || deleteMutation.isPending}
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedScenarioId('');
                setShowScenarioError(false);
                setIsReplaceOpen(true);
              }}
              disabled={!canReplace || replaceMutation.isPending}
            >
              Replace
            </Button>
            <Button
              onClick={() => {
                setSlug('');
                setShowSlugError(false);
                setIsSaveOpen(true);
              }}
              disabled={!isReady || scenario?.isSaved || saveMutation.isPending}
            >
              {scenario?.isSaved ? 'Saved' : 'Save scenario'}
            </Button>
          </div>
        </div>

        {error ? (
          <Alert
            title="Unable to load generated scenario"
            description={
              error instanceof Error ? error.message : 'Please try again.'
            }
            tone="warning"
          />
        ) : null}

        {!isReady && isLoading ? (
          <Stack gap="16px">
            <Skeleton height={32} width={280} />
            <Skeleton height={88} />
            <Skeleton height={180} />
            <Skeleton height={220} />
          </Stack>
        ) : null}

        {scenario ? (
          <>
            <section className={s.section}>
              <FormRow columns={3}>
                <Field label="Character">
                  <Typography variant="body">{characterName}</Typography>
                </Field>
                <Field label="Created">
                  <Typography variant="body" tone="muted">
                    {formatDate(scenario.createdAt)}
                  </Typography>
                </Field>
                <Field label="Updated">
                  <Typography variant="body" tone="muted">
                    {formatDate(scenario.updatedAt)}
                  </Typography>
                </Field>
              </FormRow>
            </section>

            <section className={s.section}>
              <div className={s.sectionHeader}>
                <Typography variant="h3">Context</Typography>
              </div>
              <Typography
                as="div"
                variant="body"
                className={[s.richText, !isContextExpanded && s.contextPreview]
                  .filter(Boolean)
                  .join(' ')}
                readingWidth
              >
                {scenario.context}
              </Typography>
              {scenario.context.trim() ? (
                <div>
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => setIsContextExpanded((prev) => !prev)}
                  >
                    {isContextExpanded ? 'Show less' : 'Show more'}
                  </Button>
                </div>
              ) : null}
            </section>

            <section className={s.section}>
              <div className={s.sectionHeader}>
                <Typography variant="h3">Generated data</Typography>
              </div>
              <div className={s.summaryGrid}>
                <div className={s.summaryItem}>
                  <Typography variant="meta" tone="muted">
                    Personality
                  </Typography>
                  <Typography as="div" variant="body" className={s.richText}>
                    {scenario.data.personality || '-'}
                  </Typography>
                </div>
                <div className={s.summaryItem}>
                  <Typography variant="meta" tone="muted">
                    Messaging style
                  </Typography>
                  <Typography as="div" variant="body" className={s.richText}>
                    {scenario.data.messagingStyle || '-'}
                  </Typography>
                </div>
                <div className={s.summaryItem}>
                  <Typography variant="meta" tone="muted">
                    Appearance
                  </Typography>
                  <Typography as="div" variant="body" className={s.richText}>
                    {scenario.data.appearance || '-'}
                  </Typography>
                </div>
                <div className={s.summaryItem}>
                  <Typography variant="meta" tone="muted">
                    Situation
                  </Typography>
                  <Typography as="div" variant="body" className={s.richText}>
                    {scenario.data.situation || '-'}
                  </Typography>
                </div>
              </div>
            </section>

            <section className={s.section}>
              <div className={s.sectionHeader}>
                <Typography variant="h3">Stages</Typography>
              </div>
              <Tabs
                items={stageItems}
                value={selectedStage}
                onChange={(value) => setSelectedStage(value as RoleplayStage)}
              />

              {isStageEmpty(selectedStageData) ? (
                <div className={s.emptyStage}>
                  <Typography variant="body" tone="muted">
                    No directives were generated for this stage.
                  </Typography>
                </div>
              ) : (
                <div className={s.stageGrid}>
                  <div className={s.stageItem}>
                    <Typography variant="meta" tone="muted">
                      Tone and behavior
                    </Typography>
                    <Typography as="div" variant="body" className={s.richText}>
                      {selectedStageData.toneAndBehavior || '-'}
                    </Typography>
                  </div>
                  <div className={s.stageItem}>
                    <Typography variant="meta" tone="muted">
                      Restrictions
                    </Typography>
                    <Typography as="div" variant="body" className={s.richText}>
                      {selectedStageData.restrictions || '-'}
                    </Typography>
                  </div>
                  <div className={s.stageItem}>
                    <Typography variant="meta" tone="muted">
                      Environment
                    </Typography>
                    <Typography as="div" variant="body" className={s.richText}>
                      {selectedStageData.environment || '-'}
                    </Typography>
                  </div>
                  <div className={s.stageItem}>
                    <Typography variant="meta" tone="muted">
                      Character look
                    </Typography>
                    <Typography as="div" variant="body" className={s.richText}>
                      {selectedStageData.characterLook || '-'}
                    </Typography>
                  </div>
                  <div className={s.stageItem}>
                    <Typography variant="meta" tone="muted">
                      Goal
                    </Typography>
                    <Typography as="div" variant="body" className={s.richText}>
                      {selectedStageData.goal || '-'}
                    </Typography>
                  </div>
                  <div className={s.stageItem}>
                    <Typography variant="meta" tone="muted">
                      Escalation trigger
                    </Typography>
                    <Typography as="div" variant="body" className={s.richText}>
                      {selectedStageData.escalationTrigger || '-'}
                    </Typography>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : null}

        <Modal
          open={isSaveOpen}
          title="Save scenario"
          onClose={() => {
            if (!saveMutation.isPending) {
              setIsSaveOpen(false);
            }
          }}
          actions={
            <div className={s.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setIsSaveOpen(false)}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                loading={saveMutation.isPending}
                disabled={saveMutation.isPending}
              >
                Save
              </Button>
            </div>
          }
        >
          <Stack gap="16px">
            <Typography variant="body" tone="muted">
              Saving will create or attach the scenario using the provided slug.
            </Typography>
            <Field
              label="Slug"
              labelFor="scenario-gen-save-slug"
              error={slugError}
              hint="Use a stable slug that matches the final scenario identifier."
            >
              <Input
                id="scenario-gen-save-slug"
                size="sm"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                invalid={Boolean(slugError)}
                fullWidth
              />
            </Field>
          </Stack>
        </Modal>

        <Modal
          open={isReplaceOpen}
          title="Replace scenario"
          onClose={() => {
            if (!replaceMutation.isPending) {
              setIsReplaceOpen(false);
            }
          }}
          actions={
            <div className={s.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setIsReplaceOpen(false)}
                disabled={replaceMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReplace}
                loading={replaceMutation.isPending}
                disabled={replaceMutation.isPending}
              >
                Replace
              </Button>
            </div>
          }
        >
          <Stack gap="16px">
            <Typography variant="body" tone="muted">
              Choose an existing scenario for this character. Its generated
              content will be replaced.
            </Typography>
            <Field
              label="Scenario"
              labelFor="scenario-gen-replace-scenario"
              error={scenarioError}
            >
              <Select
                id="scenario-gen-replace-scenario"
                size="sm"
                options={scenarioOptions}
                value={selectedScenarioId}
                onChange={(value) => {
                  setSelectedScenarioId(value);
                  setShowScenarioError(false);
                }}
                placeholder="Select scenario"
                invalid={Boolean(scenarioError)}
                fullWidth
              />
            </Field>
          </Stack>
        </Modal>

        <ConfirmModal
          open={isDeleteOpen}
          title="Delete generated scenario"
          description="Delete this generated scenario? This cannot be undone."
          confirmLabel="Delete"
          tone="danger"
          isConfirming={deleteMutation.isPending}
          onConfirm={handleDelete}
          onClose={() => {
            if (!deleteMutation.isPending) {
              setIsDeleteOpen(false);
            }
          }}
        />
      </Container>
    </AppShell>
  );
}
