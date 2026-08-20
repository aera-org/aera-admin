import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCreatePosePrompt } from '@/app/pose-prompts';
import { PlusIcon } from '@/assets/icons';
import { Button, Container, Stack, Typography } from '@/atoms';
import { RoleplayStage } from '@/common/types';
import { AppShell } from '@/components/templates';

import s from './PoseFormPage.module.scss';
import {
  getEmptyPosePromptFormValues,
  getPosePromptFormErrors,
  PosePromptForm,
  type PosePromptFormValues,
  toPosePromptPayload,
} from './PosePromptForm';

export function PoseCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreatePosePrompt();
  const [values, setValues] = useState<PosePromptFormValues>(
    getEmptyPosePromptFormValues,
  );
  const [showErrors, setShowErrors] = useState(false);

  const errors = useMemo(
    () => (showErrors ? getPosePromptFormErrors(values) : {}),
    [showErrors, values],
  );
  const isValid = useMemo(
    () => Object.keys(getPosePromptFormErrors(values)).length === 0,
    [values],
  );

  const handleChange = (
    field: keyof PosePromptFormValues | RoleplayStage,
    value: string | boolean,
  ) => {
    setValues((previous) => {
      if (Object.values(RoleplayStage).includes(field as RoleplayStage)) {
        const stage = field as RoleplayStage;
        const checked = Boolean(value);
        const nextStages = checked
          ? Array.from(new Set([...previous.stages, stage]))
          : previous.stages.filter((item) => item !== stage);

        return {
          ...previous,
          stages: nextStages,
          isAnal:
            previous.isAnal && nextStages.includes(RoleplayStage.Sex),
        };
      }

      if (field === 'isAnal') {
        const nextIsAnal = Boolean(value);
        return {
          ...previous,
          isAnal: nextIsAnal,
          stages: nextIsAnal
            ? Array.from(new Set([...previous.stages, RoleplayStage.Sex]))
            : previous.stages,
        };
      }

      return {
        ...previous,
        [field]: value,
      };
    });
  };

  const handleCreate = async () => {
    const nextErrors = getPosePromptFormErrors(values);
    if (Object.keys(nextErrors).length > 0) {
      setShowErrors(true);
      return;
    }

    await createMutation.mutateAsync(toPosePromptPayload(values));
    navigate('/poses');
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Create pose</Typography>
          </div>
          <Button variant="ghost" onClick={() => navigate('/poses')}>
            Back to poses
          </Button>
        </div>

        <Stack gap="16px" className={s.form}>
          <PosePromptForm
            values={values}
            errors={errors}
            onChange={handleChange}
            disabled={createMutation.isPending}
          />

          <div className={s.actions}>
            <Button
              variant="secondary"
              onClick={() => navigate('/poses')}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              iconLeft={<PlusIcon />}
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!isValid || createMutation.isPending}
            >
              Create pose
            </Button>
          </div>
        </Stack>
      </Container>
    </AppShell>
  );
}
