import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCreatePosePrompt } from '@/app/pose-prompts';
import { PlusIcon } from '@/assets/icons';
import { Button, Container, Stack, Typography } from '@/atoms';
import { AppShell } from '@/components/templates';

import s from './PoseFormPage.module.scss';
import {
  PosePromptForm,
  type PosePromptFormErrors,
  type PosePromptFormValues,
} from './PosePromptForm';

function getInitialValues(): PosePromptFormValues {
  return {
    name: '',
    pose: '',
    angle: '',
    details: '',
    prompt: '',
  };
}

function getErrors(values: PosePromptFormValues): PosePromptFormErrors {
  const errors: PosePromptFormErrors = {};

  if (!values.name.trim()) {
    errors.name = 'Enter a name.';
  }
  if (!values.pose.trim()) {
    errors.pose = 'Enter a pose.';
  }
  if (!values.prompt.trim()) {
    errors.prompt = 'Enter prompt text.';
  }

  return errors;
}

export function PoseCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreatePosePrompt();
  const [values, setValues] = useState<PosePromptFormValues>(getInitialValues);
  const [showErrors, setShowErrors] = useState(false);

  const errors = useMemo(
    () => (showErrors ? getErrors(values) : {}),
    [showErrors, values],
  );
  const isValid = useMemo(
    () => Object.keys(getErrors(values)).length === 0,
    [values],
  );

  const handleChange = (field: keyof PosePromptFormValues, value: string) => {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleCreate = async () => {
    const nextErrors = getErrors(values);
    if (Object.keys(nextErrors).length > 0) {
      setShowErrors(true);
      return;
    }

    await createMutation.mutateAsync({
      name: values.name.trim(),
      meta: {
        pose: values.pose.trim(),
        details: values.details.trim(),
        angle: values.angle.trim(),
      },
      prompt: values.prompt.trim(),
    });
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
