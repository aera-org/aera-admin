import { useMemo, useState } from 'react';

import { useCreateScenario, useUpdateScenario } from '@/app/characters';
import { PlusIcon } from '@/assets/icons';
import {
  Button,
  EmptyState,
  Field,
  FormRow,
  Input,
  Modal,
  Skeleton,
  Stack,
  Tabs,
  Textarea,
  Typography,
} from '@/atoms';
import type { ICharacterDetails } from '@/common/types';

import s from '../CharacterDetailsPage.module.scss';
import { ScenarioDetails } from './ScenarioDetails';

type ScenarioSectionProps = {
  characterId: string | null;
  scenarios: ICharacterDetails['scenarios'];
  selectedScenarioId: string | null;
  onSelectScenario: (id: string) => void;
  isLoading: boolean;
  formatDate: (value: string | null | undefined) => string;
};

export function ScenarioSection({
  characterId,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  isLoading,
  formatDate,
}: ScenarioSectionProps) {
  const createMutation = useCreateScenario();
  const updateMutation = useUpdateScenario();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [editShowErrors, setEditShowErrors] = useState(false);
  const [formValues, setFormValues] = useState({
    name: '',
    emoji: '',
    description: '',
    personality: '',
    messagingStyle: '',
    appearance: '',
    situation: '',
  });
  const [editValues, setEditValues] = useState(formValues);

  const scenarioTabs = scenarios.map((scenario) => ({
    value: scenario.id,
    label: scenario.name || 'Untitled',
  }));
  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;

  const getErrors = (values: typeof formValues) => {
    const errors: Record<string, string> = {};
    if (!values.name.trim()) errors.name = 'Enter a name.';
    if (!values.emoji.trim()) errors.emoji = 'Enter an emoji.';
    if (!values.description.trim())
      errors.description = 'Enter a description.';
    if (!values.personality.trim())
      errors.personality = 'Enter a personality.';
    if (!values.messagingStyle.trim())
      errors.messagingStyle = 'Enter a messaging style.';
    if (!values.appearance.trim())
      errors.appearance = 'Enter an appearance.';
    if (!values.situation.trim()) errors.situation = 'Enter a situation.';
    return errors;
  };

  const validationErrors = useMemo(
    () => (showErrors ? getErrors(formValues) : {}),
    [formValues, showErrors],
  );
  const editValidationErrors = useMemo(
    () => (editShowErrors ? getErrors(editValues) : {}),
    [editShowErrors, editValues],
  );

  const isValid = useMemo(() => Object.keys(getErrors(formValues)).length === 0, [
    formValues,
  ]);
  const isEditValid = useMemo(
    () => Object.keys(getErrors(editValues)).length === 0,
    [editValues],
  );

  const openCreateModal = () => {
    setFormValues({
      name: '',
      emoji: '',
      description: '',
      personality: '',
      messagingStyle: '',
      appearance: '',
      situation: '',
    });
    setShowErrors(false);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const openEditModal = () => {
    if (!selectedScenario) return;
    setEditValues({
      name: selectedScenario.name ?? '',
      emoji: selectedScenario.emoji ?? '',
      description: selectedScenario.description ?? '',
      personality: selectedScenario.personality ?? '',
      messagingStyle: selectedScenario.messagingStyle ?? '',
      appearance: selectedScenario.appearance ?? '',
      situation: selectedScenario.situation ?? '',
    });
    setEditShowErrors(false);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (updateMutation.isPending) return;
    setIsEditOpen(false);
  };

  const handleCreate = async () => {
    if (!characterId) return;
    const errors = {
      name: formValues.name.trim() ? undefined : 'Enter a name.',
      emoji: formValues.emoji.trim() ? undefined : 'Enter an emoji.',
      description: formValues.description.trim()
        ? undefined
        : 'Enter a description.',
      personality: formValues.personality.trim()
        ? undefined
        : 'Enter a personality.',
      messagingStyle: formValues.messagingStyle.trim()
        ? undefined
        : 'Enter a messaging style.',
      appearance: formValues.appearance.trim()
        ? undefined
        : 'Enter an appearance.',
      situation: formValues.situation.trim() ? undefined : 'Enter a situation.',
    };
    if (Object.values(errors).some(Boolean)) {
      setShowErrors(true);
      return;
    }
    const result = await createMutation.mutateAsync({
      characterId,
      payload: {
        name: formValues.name.trim(),
        emoji: formValues.emoji.trim(),
        description: formValues.description.trim(),
        personality: formValues.personality.trim(),
        messagingStyle: formValues.messagingStyle.trim(),
        appearance: formValues.appearance.trim(),
        situation: formValues.situation.trim(),
      },
    });
    setIsCreateOpen(false);
    if (result?.id) {
      onSelectScenario(result.id);
    }
  };

  const handleEdit = async () => {
    if (!characterId || !selectedScenario) return;
    const errors = getErrors(editValues);
    if (Object.values(errors).some(Boolean)) {
      setEditShowErrors(true);
      return;
    }
    await updateMutation.mutateAsync({
      characterId,
      scenarioId: selectedScenario.id,
      payload: {
        name: editValues.name.trim(),
        emoji: editValues.emoji.trim(),
        description: editValues.description.trim(),
        personality: editValues.personality.trim(),
        messagingStyle: editValues.messagingStyle.trim(),
        appearance: editValues.appearance.trim(),
        situation: editValues.situation.trim(),
      },
    });
    setIsEditOpen(false);
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <Typography variant="h3">Scenarios</Typography>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<PlusIcon />}
          onClick={openCreateModal}
          disabled={!characterId}
        >
          New scenario
        </Button>
      </div>
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
              characterId={characterId}
              scenario={selectedScenario}
              formatDate={formatDate}
              onEdit={openEditModal}
              canEdit={Boolean(characterId)}
            />
          ) : null}
        </Stack>
      )}

      <Modal
        open={isCreateOpen}
        title="New scenario"
        className={s.modal}
        onClose={closeCreateModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeCreateModal}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!isValid || createMutation.isPending}
            >
              Create
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Name"
              labelFor="scenario-create-name"
              error={validationErrors.name}
            >
              <Input
                id="scenario-create-name"
                size="sm"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
            <Field
              label="Emoji"
              labelFor="scenario-create-emoji"
              error={validationErrors.emoji}
            >
              <Input
                id="scenario-create-emoji"
                size="sm"
                value={formValues.emoji}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    emoji: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>

          <Field
            label="Description"
            labelFor="scenario-create-description"
            error={validationErrors.description}
          >
            <Textarea
              id="scenario-create-description"
              value={formValues.description}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Personality"
            labelFor="scenario-create-personality"
            error={validationErrors.personality}
          >
            <Textarea
              id="scenario-create-personality"
              value={formValues.personality}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  personality: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Messaging style"
            labelFor="scenario-create-messaging-style"
            error={validationErrors.messagingStyle}
          >
            <Textarea
              id="scenario-create-messaging-style"
              value={formValues.messagingStyle}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  messagingStyle: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Appearance"
            labelFor="scenario-create-appearance"
            error={validationErrors.appearance}
          >
            <Textarea
              id="scenario-create-appearance"
              value={formValues.appearance}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  appearance: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Situation"
            labelFor="scenario-create-situation"
            error={validationErrors.situation}
          >
            <Textarea
              id="scenario-create-situation"
              value={formValues.situation}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  situation: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>
        </Stack>
      </Modal>

      <Modal
        open={isEditOpen}
        title="Edit scenario"
        className={s.modal}
        onClose={closeEditModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeEditModal}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              loading={updateMutation.isPending}
              disabled={!isEditValid || updateMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Name"
              labelFor="scenario-edit-name"
              error={editValidationErrors.name}
            >
              <Input
                id="scenario-edit-name"
                size="sm"
                value={editValues.name}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
            <Field
              label="Emoji"
              labelFor="scenario-edit-emoji"
              error={editValidationErrors.emoji}
            >
              <Input
                id="scenario-edit-emoji"
                size="sm"
                value={editValues.emoji}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    emoji: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>

          <Field
            label="Description"
            labelFor="scenario-edit-description"
            error={editValidationErrors.description}
          >
            <Textarea
              id="scenario-edit-description"
              value={editValues.description}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Personality"
            labelFor="scenario-edit-personality"
            error={editValidationErrors.personality}
          >
            <Textarea
              id="scenario-edit-personality"
              value={editValues.personality}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  personality: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Messaging style"
            labelFor="scenario-edit-messaging-style"
            error={editValidationErrors.messagingStyle}
          >
            <Textarea
              id="scenario-edit-messaging-style"
              value={editValues.messagingStyle}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  messagingStyle: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Appearance"
            labelFor="scenario-edit-appearance"
            error={editValidationErrors.appearance}
          >
            <Textarea
              id="scenario-edit-appearance"
              value={editValues.appearance}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  appearance: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Situation"
            labelFor="scenario-edit-situation"
            error={editValidationErrors.situation}
          >
            <Textarea
              id="scenario-edit-situation"
              value={editValues.situation}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  situation: event.target.value,
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
