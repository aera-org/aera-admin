import { useMemo, useState } from 'react';

import {
  useCreateScene,
  useUpdateScenarioPhase,
  useUpdateScene,
} from '@/app/characters';
import { notifyError } from '@/app/toast';
import { PencilLineIcon, PlusIcon } from '@/assets/icons';
import {
  Button,
  Field,
  Grid,
  IconButton,
  Input,
  Modal,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import type { ICharacterDetails, IFile } from '@/common/types';
import { FileDir } from '@/common/types';
import { FileUpload } from '@/components/molecules';

import s from '../CharacterDetailsPage.module.scss';
import { SceneCardList } from './SceneCardList';

type ScenarioDetailsProps = {
  characterId: string | null;
  scenario: ICharacterDetails['scenarios'][number];
  formatDate: (value: string | null | undefined) => string;
  onEdit: () => void;
  canEdit: boolean;
};

export function ScenarioDetails({
  characterId,
  scenario,
  formatDate,
  onEdit,
  canEdit,
}: ScenarioDetailsProps) {
  const updatePhaseMutation = useUpdateScenarioPhase();
  const createSceneMutation = useCreateScene();
  const updateSceneMutation = useUpdateScene();
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [activePhase, setActivePhase] = useState<
    'hook' | 'resistance' | 'retention' | null
  >(null);
  const [phaseValues, setPhaseValues] = useState({
    toneAndBehavior: '',
    photoSendingGuidelines: '',
    photoMessageAlignmentRules: '',
  });
  const [showErrors, setShowErrors] = useState(false);
  const [isSceneCreateOpen, setIsSceneCreateOpen] = useState(false);
  const [isSceneEditOpen, setIsSceneEditOpen] = useState(false);
  const [sceneShowErrors, setSceneShowErrors] = useState(false);
  const [sceneEditShowErrors, setSceneEditShowErrors] = useState(false);
  const [activeScene, setActiveScene] = useState<
    ICharacterDetails['scenarios'][number]['scenes'][number] | null
  >(null);
  const [sceneValues, setSceneValues] = useState({
    name: '',
    openingMessage: '',
    openingImageId: '',
    description: '',
    visualChange: '',
  });
  const [sceneEditValues, setSceneEditValues] = useState(sceneValues);
  const [sceneFile, setSceneFile] = useState<IFile | null>(null);
  const [sceneEditFile, setSceneEditFile] = useState<IFile | null>(null);
  const phases = scenario.phases;
  const phaseLabels = useMemo(
    () => ({
      hook: 'Hook',
      resistance: 'Resistance',
      retention: 'Retention',
    }),
    [],
  );

  const validationErrors = useMemo(() => {
    if (!showErrors) return {};
    const errors: Record<string, string> = {};
    if (!phaseValues.toneAndBehavior.trim())
      errors.toneAndBehavior = 'Enter tone and behavior.';
    if (!phaseValues.photoSendingGuidelines.trim())
      errors.photoSendingGuidelines = 'Enter photo sending guidelines.';
    if (!phaseValues.photoMessageAlignmentRules.trim())
      errors.photoMessageAlignmentRules =
        'Enter photo message alignment rules.';
    return errors;
  }, [phaseValues, showErrors]);

  const isValid = useMemo(
    () =>
      Boolean(
        phaseValues.toneAndBehavior.trim() &&
        phaseValues.photoSendingGuidelines.trim() &&
        phaseValues.photoMessageAlignmentRules.trim(),
      ),
    [phaseValues],
  );

  const getSceneErrors = (values: typeof sceneValues) => {
    const errors: Record<string, string> = {};
    if (!values.name.trim()) errors.name = 'Enter a name.';
    if (!values.description.trim()) errors.description = 'Enter a description.';
    if (!values.openingMessage.trim())
      errors.openingMessage = 'Enter opening messages.';
    if (!values.visualChange.trim())
      errors.visualChange = 'Enter a visual change.';
    if (!values.openingImageId) errors.openingImageId = 'Upload an image.';
    return errors;
  };

  const sceneValidationErrors = useMemo(
    () => (sceneShowErrors ? getSceneErrors(sceneValues) : {}),
    [sceneShowErrors, sceneValues],
  );
  const sceneEditValidationErrors = useMemo(
    () => (sceneEditShowErrors ? getSceneErrors(sceneEditValues) : {}),
    [sceneEditShowErrors, sceneEditValues],
  );

  const isSceneValid = useMemo(
    () => Object.keys(getSceneErrors(sceneValues)).length === 0,
    [sceneValues],
  );
  const isSceneEditValid = useMemo(
    () => Object.keys(getSceneErrors(sceneEditValues)).length === 0,
    [sceneEditValues],
  );

  const openPhaseModal = (phase: 'hook' | 'resistance' | 'retention') => {
    const content = phases ? phases[phase] : null;
    setPhaseValues({
      toneAndBehavior: content?.toneAndBehavior ?? '',
      photoSendingGuidelines: content?.photoSendingGuidelines ?? '',
      photoMessageAlignmentRules: content?.photoMessageAlignmentRules ?? '',
    });
    setShowErrors(false);
    setActivePhase(phase);
    setIsPhaseModalOpen(true);
  };

  const closePhaseModal = () => {
    if (updatePhaseMutation.isPending) return;
    setIsPhaseModalOpen(false);
  };

  const openSceneCreateModal = () => {
    setSceneValues({
      name: '',
      openingMessage: '',
      openingImageId: '',
      description: '',
      visualChange: '',
    });
    setSceneFile(null);
    setSceneShowErrors(false);
    setIsSceneCreateOpen(true);
  };

  const closeSceneCreateModal = () => {
    if (createSceneMutation.isPending) return;
    setIsSceneCreateOpen(false);
  };

  const openSceneEditModal = (
    scene: ICharacterDetails['scenarios'][number]['scenes'][number],
  ) => {
    setActiveScene(scene);
    setSceneEditValues({
      name: scene.name ?? '',
      openingMessage: scene.openingMessage ?? '',
      openingImageId: scene.openingImageId ?? '',
      description: scene.description ?? '',
      visualChange: scene.visualChange ?? '',
    });
    setSceneEditFile(null);
    setSceneEditShowErrors(false);
    setIsSceneEditOpen(true);
  };

  const closeSceneEditModal = () => {
    if (updateSceneMutation.isPending) return;
    setIsSceneEditOpen(false);
  };

  const handlePhaseSave = async () => {
    if (!characterId || !activePhase) return;
    const errors = {
      toneAndBehavior: phaseValues.toneAndBehavior.trim()
        ? undefined
        : 'Enter tone and behavior.',
      photoSendingGuidelines: phaseValues.photoSendingGuidelines.trim()
        ? undefined
        : 'Enter photo sending guidelines.',
      photoMessageAlignmentRules: phaseValues.photoMessageAlignmentRules.trim()
        ? undefined
        : 'Enter photo message alignment rules.',
    };
    if (Object.values(errors).some(Boolean)) {
      setShowErrors(true);
      return;
    }
    await updatePhaseMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      phase: activePhase,
      payload: {
        toneAndBehavior: phaseValues.toneAndBehavior.trim(),
        photoSendingGuidelines: phaseValues.photoSendingGuidelines.trim(),
        photoMessageAlignmentRules:
          phaseValues.photoMessageAlignmentRules.trim(),
      },
    });
    setIsPhaseModalOpen(false);
  };

  const handleSceneCreate = async () => {
    if (!characterId) return;
    const errors = getSceneErrors(sceneValues);
    if (Object.values(errors).some(Boolean)) {
      setSceneShowErrors(true);
      return;
    }
    await createSceneMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      payload: {
        name: sceneValues.name.trim(),
        description: sceneValues.description.trim(),
        openingMessage: sceneValues.openingMessage.trim(),
        visualChange: sceneValues.visualChange.trim(),
        openingImageId: sceneValues.openingImageId,
      },
    });
    setIsSceneCreateOpen(false);
  };

  const handleSceneEdit = async () => {
    if (!characterId || !activeScene) return;
    const errors = getSceneErrors(sceneEditValues);
    if (Object.values(errors).some(Boolean)) {
      setSceneEditShowErrors(true);
      return;
    }
    await updateSceneMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      sceneId: activeScene.id,
      payload: {
        name: sceneEditValues.name.trim(),
        description: sceneEditValues.description.trim(),
        openingMessage: sceneEditValues.openingMessage.trim(),
        visualChange: sceneEditValues.visualChange.trim(),
        openingImageId: sceneEditValues.openingImageId,
      },
    });
    setIsSceneEditOpen(false);
  };

  return (
    <div className={s.detailsCard}>
      <div className={s.detailsHeader}>
        <Typography variant="h3">
          <span className={s.emoji}>{scenario.emoji || ''}</span>
          {scenario.name}
        </Typography>
        <div className={s.detailsActions}>
          <Typography variant="meta" tone="muted">
            {scenario.updatedAt
              ? `Updated ${formatDate(scenario.updatedAt)}`
              : ''}
          </Typography>
          <IconButton
            aria-label="Edit scenario"
            icon={<PencilLineIcon />}
            tooltip="Edit scenario"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            disabled={!canEdit}
          />
        </div>
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
            Personality
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.personality || '-'}
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
                  <div className={s.phaseHeader}>
                    <Typography variant="body" className={s.phaseTitle}>
                      {phase.label}
                    </Typography>
                    <span className={s.phaseEdit}>
                      <IconButton
                        aria-label={`Edit ${phase.label} phase`}
                        icon={<PencilLineIcon />}
                        tooltip={`Edit ${phase.label} phase`}
                        variant="ghost"
                        size="sm"
                        onClick={() => openPhaseModal(phase.key)}
                        disabled={!characterId}
                      />
                    </span>
                  </div>
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
          <div className={s.scenesHeader}>
            <Typography variant="h3" className={s.scenesTitle}>
              Scenes
            </Typography>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<PlusIcon />}
              onClick={openSceneCreateModal}
              disabled={!characterId}
            >
              New scene
            </Button>
          </div>
          <SceneCardList
            scenes={scenario.scenes}
            onEdit={openSceneEditModal}
            canEdit={Boolean(characterId)}
          />
        </div>
      </Stack>

      <Modal
        open={isPhaseModalOpen}
        title={
          activePhase ? `Edit ${phaseLabels[activePhase]} phase` : 'Edit phase'
        }
        className={s.modal}
        onClose={closePhaseModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closePhaseModal}
              disabled={updatePhaseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePhaseSave}
              loading={updatePhaseMutation.isPending}
              disabled={!isValid || updatePhaseMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <Field
            label="Tone and behavior"
            labelFor="phase-edit-tone"
            error={validationErrors.toneAndBehavior}
          >
            <Textarea
              id="phase-edit-tone"
              value={phaseValues.toneAndBehavior}
              onChange={(event) =>
                setPhaseValues((prev) => ({
                  ...prev,
                  toneAndBehavior: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>
          <Field
            label="Photo sending guidelines"
            labelFor="phase-edit-guidelines"
            error={validationErrors.photoSendingGuidelines}
          >
            <Textarea
              id="phase-edit-guidelines"
              value={phaseValues.photoSendingGuidelines}
              onChange={(event) =>
                setPhaseValues((prev) => ({
                  ...prev,
                  photoSendingGuidelines: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>
          <Field
            label="Photo message alignment rules"
            labelFor="phase-edit-alignment"
            error={validationErrors.photoMessageAlignmentRules}
          >
            <Textarea
              id="phase-edit-alignment"
              value={phaseValues.photoMessageAlignmentRules}
              onChange={(event) =>
                setPhaseValues((prev) => ({
                  ...prev,
                  photoMessageAlignmentRules: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>
        </Stack>
      </Modal>

      <Modal
        open={isSceneCreateOpen}
        title="New scene"
        className={s.modal}
        onClose={closeSceneCreateModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeSceneCreateModal}
              disabled={createSceneMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSceneCreate}
              loading={createSceneMutation.isPending}
              disabled={!isSceneValid || createSceneMutation.isPending}
            >
              Create
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <Field
            label="Name"
            labelFor="scene-create-name"
            error={sceneValidationErrors.name}
          >
            <Input
              id="scene-create-name"
              size="sm"
              value={sceneValues.name}
              onChange={(event) =>
                setSceneValues((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              fullWidth
            />
          </Field>

          <div>
            <FileUpload
              label="Opening image"
              folder={FileDir.Public}
              value={sceneFile}
              onChange={(file) => {
                setSceneFile(file);
                setSceneValues((prev) => ({
                  ...prev,
                  openingImageId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
            {sceneValidationErrors.openingImageId ? (
              <Typography variant="caption" tone="warning">
                {sceneValidationErrors.openingImageId}
              </Typography>
            ) : null}
          </div>

          <Field
            label="Description"
            labelFor="scene-create-description"
            error={sceneValidationErrors.description}
          >
            <Textarea
              id="scene-create-description"
              value={sceneValues.description}
              onChange={(event) =>
                setSceneValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Opening message"
            labelFor="scene-create-opening-messages"
            error={sceneValidationErrors.openingMessage}
          >
            <Textarea
              id="scene-create-opening-messages"
              value={sceneValues.openingMessage}
              onChange={(event) =>
                setSceneValues((prev) => ({
                  ...prev,
                  openingMessage: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Visual change"
            labelFor="scene-create-visual"
            error={sceneValidationErrors.visualChange}
          >
            <Textarea
              id="scene-create-visual"
              value={sceneValues.visualChange}
              onChange={(event) =>
                setSceneValues((prev) => ({
                  ...prev,
                  visualChange: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>
        </Stack>
      </Modal>

      <Modal
        open={isSceneEditOpen}
        title="Edit scene"
        className={s.modal}
        onClose={closeSceneEditModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeSceneEditModal}
              disabled={updateSceneMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSceneEdit}
              loading={updateSceneMutation.isPending}
              disabled={!isSceneEditValid || updateSceneMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <Field
            label="Name"
            labelFor="scene-edit-name"
            error={sceneEditValidationErrors.name}
          >
            <Input
              id="scene-edit-name"
              size="sm"
              value={sceneEditValues.name}
              onChange={(event) =>
                setSceneEditValues((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              fullWidth
            />
          </Field>

          <div className={s.sceneImageField}>
            <FileUpload
              label="Opening image"
              folder={FileDir.Public}
              value={sceneEditFile}
              onChange={(file) => {
                setSceneEditFile(file);
                setSceneEditValues((prev) => ({
                  ...prev,
                  openingImageId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
            {sceneEditValidationErrors.openingImageId ? (
              <Typography variant="caption" tone="warning">
                {sceneEditValidationErrors.openingImageId}
              </Typography>
            ) : null}
          </div>

          <Field
            label="Description"
            labelFor="scene-edit-description"
            error={sceneEditValidationErrors.description}
          >
            <Textarea
              id="scene-edit-description"
              value={sceneEditValues.description}
              onChange={(event) =>
                setSceneEditValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Opening message"
            labelFor="scene-edit-opening-messages"
            error={sceneEditValidationErrors.openingMessage}
          >
            <Textarea
              id="scene-edit-opening-messages"
              value={sceneEditValues.openingMessage}
              onChange={(event) =>
                setSceneEditValues((prev) => ({
                  ...prev,
                  openingMessage: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Visual change"
            labelFor="scene-edit-visual"
            error={sceneEditValidationErrors.visualChange}
          >
            <Textarea
              id="scene-edit-visual"
              value={sceneEditValues.visualChange}
              onChange={(event) =>
                setSceneEditValues((prev) => ({
                  ...prev,
                  visualChange: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>
        </Stack>
      </Modal>
    </div>
  );
}
