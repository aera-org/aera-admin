import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useDeleteVideoPrompt,
  useUpdateVideoPrompt,
  useVideoPromptDetails,
} from '@/app/video-prompts';
import {
  Alert,
  Button,
  Container,
  FormRow,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';
import { AppShell } from '@/components/templates';

import { VideoPromptForm } from './VideoPromptForm';
import s from './VideoPromptFormPage.module.scss';
import {
  getEmptyVideoPromptFormValues,
  getVideoPromptFormErrors,
  toVideoPromptFormValues,
  toVideoPromptPayload,
  type VideoPromptFormChange,
  type VideoPromptFormValues,
} from './videoPromptFormValues';

export function VideoPromptUpdatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const videoPromptId = id ?? '';
  const {
    data,
    error,
    isLoading,
    refetch: refetchDetails,
  } = useVideoPromptDetails(videoPromptId, Boolean(videoPromptId));
  const updateMutation = useUpdateVideoPrompt();
  const deleteMutation = useDeleteVideoPrompt();

  const [draft, setDraft] = useState<{
    id: string;
    values: VideoPromptFormValues;
  } | null>(null);
  const [showErrorsForId, setShowErrorsForId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const values = useMemo(() => {
    if (!data) return getEmptyVideoPromptFormValues();
    if (draft?.id === data.id) return draft.values;
    return toVideoPromptFormValues(data);
  }, [data, draft]);

  const allErrors = useMemo(() => getVideoPromptFormErrors(values), [values]);
  const errors = showErrorsForId === data?.id ? allErrors : {};
  const isValid = Object.keys(allErrors).length === 0;

  const handleChange: VideoPromptFormChange = (field, value) => {
    if (!data) return;
    setDraft({ id: data.id, values: { ...values, [field]: value } });
  };

  const handleUpdate = async () => {
    if (!data) return;

    if (!isValid) {
      setShowErrorsForId(data.id);
      return;
    }

    await updateMutation.mutateAsync({
      id: data.id,
      payload: toVideoPromptPayload(values),
    });
    setDraft(null);
    setShowErrorsForId(null);
  };

  const handleDelete = async () => {
    if (!data) return;
    await deleteMutation.mutateAsync(data.id);
    setIsDeleteOpen(false);
    navigate('/video-prompts');
  };

  const isBusy = updateMutation.isPending || deleteMutation.isPending;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Update video prompt</Typography>
          </div>
          <Button variant="secondary" onClick={() => navigate('/video-prompts')}>
            Back to video prompts
          </Button>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load video prompt"
              description={
                error instanceof Error ? error.message : 'Please try again.'
              }
              tone="warning"
            />
            {!data ? (
              <Button variant="secondary" onClick={() => refetchDetails()}>
                Retry
              </Button>
            ) : null}
          </Stack>
        ) : null}

        {!data && isLoading ? (
          <Stack gap="16px" className={s.form}>
            <FormRow columns={2}>
              <Skeleton width={220} height={36} />
              <Skeleton width={220} height={36} />
            </FormRow>
            <Skeleton width={640} height={140} />
            <Skeleton width={640} height={200} />
          </Stack>
        ) : null}

        {data ? (
          <Stack gap="16px" className={s.form}>
            <VideoPromptForm
              values={values}
              errors={errors}
              onChange={handleChange}
              disabled={isBusy}
            />

            <div className={s.actions}>
              <Button
                variant="ghost"
                tone="danger"
                onClick={() => setIsDeleteOpen(true)}
                disabled={isBusy}
              >
                Delete
              </Button>
              <Button
                onClick={handleUpdate}
                loading={updateMutation.isPending}
                disabled={!isValid || isBusy}
              >
                Save changes
              </Button>
            </div>
          </Stack>
        ) : null}
      </Container>

      <ConfirmModal
        open={isDeleteOpen}
        title="Delete video prompt"
        description={
          data
            ? `Delete ${data.name}? This cannot be undone.`
            : 'Delete this video prompt? This cannot be undone.'
        }
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setIsDeleteOpen(false)}
      />
    </AppShell>
  );
}
