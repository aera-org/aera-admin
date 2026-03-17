import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useFindSimilarPosePrompt } from '@/app/pose-prompts';
import {
  Alert,
  Button,
  Container,
  Field,
  FormRow,
  Input,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import { AppShell } from '@/components/templates';

import s from './PoseFormPage.module.scss';

type Values = {
  pose: string;
  angle: string;
  details: string;
};

type Errors = {
  pose?: string;
};

function getInitialValues(): Values {
  return {
    pose: '',
    angle: '',
    details: '',
  };
}

function getErrors(values: Values): Errors {
  const errors: Errors = {};

  if (!values.pose.trim()) {
    errors.pose = 'Enter a pose.';
  }

  return errors;
}

export function PoseFindSimilarPage() {
  const navigate = useNavigate();
  const findSimilarMutation = useFindSimilarPosePrompt();
  const [values, setValues] = useState<Values>(getInitialValues);
  const [showErrors, setShowErrors] = useState(false);

  const errors = useMemo(
    () => (showErrors ? getErrors(values) : {}),
    [showErrors, values],
  );
  const isValid = useMemo(
    () => Object.keys(getErrors(values)).length === 0,
    [values],
  );

  const handleFind = async () => {
    const nextErrors = getErrors(values);
    if (Object.keys(nextErrors).length > 0) {
      setShowErrors(true);
      return;
    }

    await findSimilarMutation.mutateAsync({
      pose: values.pose.trim(),
      details: values.details.trim(),
      angle: values.angle.trim(),
    });
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Find similar pose</Typography>
            <Typography variant="meta" tone="muted">
              Test embedding-based pose matching.
            </Typography>
          </div>
          <Button variant="ghost" onClick={() => navigate('/poses')}>
            Back to poses
          </Button>
        </div>

        <Stack gap="16px" className={s.form}>
          <FormRow columns={2}>
            <Field label="Pose" labelFor="pose-find-pose" error={errors.pose}>
              <Input
                id="pose-find-pose"
                size="sm"
                value={values.pose}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    pose: event.target.value,
                  }))
                }
                disabled={findSimilarMutation.isPending}
                fullWidth
              />
            </Field>

            <Field label="Angle" labelFor="pose-find-angle">
              <Input
                id="pose-find-angle"
                size="sm"
                value={values.angle}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    angle: event.target.value,
                  }))
                }
                disabled={findSimilarMutation.isPending}
                fullWidth
              />
            </Field>
          </FormRow>

          <Field label="Details" labelFor="pose-find-details">
            <Textarea
              id="pose-find-details"
              size="sm"
              value={values.details}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  details: event.target.value,
                }))
              }
              rows={8}
              disabled={findSimilarMutation.isPending}
              fullWidth
            />
          </Field>

          <div className={s.actions}>
            <Button
              onClick={handleFind}
              loading={findSimilarMutation.isPending}
              disabled={!isValid || findSimilarMutation.isPending}
            >
              Find
            </Button>
          </div>

          {findSimilarMutation.isError ? (
            <Alert
              title="Unable to find a similar pose"
              description={
                findSimilarMutation.error instanceof Error
                  ? findSimilarMutation.error.message
                  : 'Please try again.'
              }
              tone="warning"
            />
          ) : null}

          {findSimilarMutation.data ? (
            <Field label="Result">
              <Typography variant="body">
                {findSimilarMutation.data.name}
              </Typography>
            </Field>
          ) : null}
        </Stack>
      </Container>
    </AppShell>
  );
}
