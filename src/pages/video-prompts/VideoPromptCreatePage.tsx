import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCreateVideoPrompt } from '@/app/video-prompts';
import { PlusIcon } from '@/assets/icons';
import { Button, Container, Stack, Typography } from '@/atoms';
import { AppShell } from '@/components/templates';

import { VideoPromptForm } from './VideoPromptForm';
import s from './VideoPromptFormPage.module.scss';
import {
  getEmptyVideoPromptFormValues,
  getVideoPromptFormErrors,
  toVideoPromptPayload,
  type VideoPromptFormChange,
  type VideoPromptFormValues,
} from './videoPromptFormValues';

export function VideoPromptCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateVideoPrompt();
  const [values, setValues] = useState<VideoPromptFormValues>(
    getEmptyVideoPromptFormValues,
  );
  const [showErrors, setShowErrors] = useState(false);

  const allErrors = useMemo(() => getVideoPromptFormErrors(values), [values]);
  const errors = showErrors ? allErrors : {};
  const isValid = Object.keys(allErrors).length === 0;

  const handleChange: VideoPromptFormChange = (field, value) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleCreate = async () => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }

    await createMutation.mutateAsync(toVideoPromptPayload(values));
    navigate('/video-prompts');
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Create video prompt</Typography>
          </div>
          <Button variant="ghost" onClick={() => navigate('/video-prompts')}>
            Back to video prompts
          </Button>
        </div>

        <Stack gap="16px" className={s.form}>
          <VideoPromptForm
            values={values}
            errors={errors}
            onChange={handleChange}
            disabled={createMutation.isPending}
          />

          <div className={s.actions}>
            <Button
              variant="secondary"
              onClick={() => navigate('/video-prompts')}
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
              Create video prompt
            </Button>
          </div>
        </Stack>
      </Container>
    </AppShell>
  );
}
