import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useDeletePosePrompt,
  usePosePromptDetails,
  useUpdatePosePrompt,
  useUpdatePosePromptReference,
} from '@/app/pose-prompts';
import { notifyError } from '@/app/toast';
import {
  Alert,
  Button,
  Container,
  Field,
  FormRow,
  Modal,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import {
  FileDir,
  type IFile,
  RoleplayStage,
  type UpdatePosePromptDto,
} from '@/common/types';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';
import { FileUpload } from '@/components/molecules/file-upload/FileUpload';
import { AppShell } from '@/components/templates';

import s from './PoseFormPage.module.scss';
import {
  PosePromptForm,
  type PosePromptFormErrors,
  type PosePromptFormValues,
} from './PosePromptForm';

function getInitialValues(): PosePromptFormValues {
  return {
    idx: '',
    note: '',
    isAnal: false,
    stages: [],
    pose: '',
    angle: '',
    prompt: '',
  };
}

function parseIdx(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function getErrors(values: PosePromptFormValues): PosePromptFormErrors {
  const errors: PosePromptFormErrors = {};

  if (parseIdx(values.idx) === null) {
    errors.idx = 'Enter a non-negative integer.';
  }
  if (values.stages.length === 0) {
    errors.stages = 'Select at least one stage.';
  }
  if (values.isAnal && !values.stages.includes(RoleplayStage.Sex)) {
    errors.isAnal = 'Anal poses must include the Sex stage.';
  }
  if (!values.pose) {
    errors.pose = 'Select a pose.';
  }
  if (!values.angle) {
    errors.angle = 'Select an angle.';
  }
  if (!values.prompt.trim()) {
    errors.prompt = 'Enter prompt text.';
  }

  return errors;
}

function PoseReferenceImages({
  referenceImg,
  referenceDepthImg,
}: {
  referenceImg?: IFile | null;
  referenceDepthImg?: IFile | null;
}) {
  const images = [referenceImg, referenceDepthImg].filter(
    (file): file is IFile => Boolean(file?.url),
  );

  if (images.length === 0) {
    return null;
  }

  return (
    <div className={s.referenceImages}>
      {images.map((file) => (
        <img
          key={file.id}
          className={s.referenceImage}
          src={file.url ?? undefined}
          alt={file.name}
        />
      ))}
    </div>
  );
}

export function PoseUpdatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const poseId = id ?? '';
  const {
    data,
    error,
    isLoading,
    refetch: refetchDetails,
  } = usePosePromptDetails(poseId, Boolean(poseId));
  const updateMutation = useUpdatePosePrompt();
  const updateReferenceMutation = useUpdatePosePromptReference();
  const deleteMutation = useDeletePosePrompt();

  const [draft, setDraft] = useState<{
    id: string;
    values: PosePromptFormValues;
  } | null>(null);
  const [showErrorsForId, setShowErrorsForId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [referenceFile, setReferenceFile] = useState<IFile | null>(null);

  const values = useMemo(() => {
    if (!data) return getInitialValues();
    if (draft?.id === data.id) return draft.values;
    return {
      idx: String(data.idx),
      note: data.note ?? '',
      isAnal: data.isAnal,
      stages: data.stages ?? [],
      pose: data.pose,
      angle: data.angle,
      prompt: data.prompt ?? '',
    };
  }, [data, draft]);

  const errors = useMemo(
    () => (showErrorsForId === data?.id ? getErrors(values) : {}),
    [data?.id, showErrorsForId, values],
  );
  const isValid = useMemo(
    () => Object.keys(getErrors(values)).length === 0,
    [values],
  );

  const handleChange = (
    field: keyof PosePromptFormValues | RoleplayStage,
    value: string | boolean,
  ) => {
    if (!data) return;

    const nextValues =
      Object.values(RoleplayStage).includes(field as RoleplayStage)
        ? (() => {
            const stage = field as RoleplayStage;
            const checked = Boolean(value);
            const nextStages = checked
              ? Array.from(new Set([...values.stages, stage]))
              : values.stages.filter((item) => item !== stage);

            return {
              ...values,
              stages: nextStages,
              isAnal: values.isAnal && nextStages.includes(RoleplayStage.Sex),
            };
          })()
        : field === 'isAnal'
        ? (() => {
            const checked = Boolean(value);

            return {
              ...values,
              isAnal: checked,
              stages: checked
                ? Array.from(new Set([...values.stages, RoleplayStage.Sex]))
                : values.stages,
            };
          })()
          : {
              ...values,
              [field]: value,
            };

    setDraft({
      id: data.id,
      values: nextValues,
    });
  };

  const handleUpdate = async () => {
    if (!data) return;

    const nextErrors = getErrors(values);
    if (Object.keys(nextErrors).length > 0) {
      setShowErrorsForId(data.id);
      return;
    }

    await updateMutation.mutateAsync({
      id: data.id,
      payload: {
        idx: parseIdx(values.idx) as UpdatePosePromptDto['idx'],
        note: values.note.trim() || undefined,
        isAnal: values.isAnal,
        stages: values.stages,
        pose: values.pose as UpdatePosePromptDto['pose'],
        angle: values.angle as UpdatePosePromptDto['angle'],
        prompt: values.prompt.trim(),
      },
    });
    setDraft(null);
    setShowErrorsForId(null);
  };

  const handleDelete = async () => {
    if (!data) return;
    await deleteMutation.mutateAsync(data.id);
    setIsDeleteOpen(false);
    navigate('/poses');
  };

  const handleReferenceModalClose = () => {
    setIsReferenceOpen(false);
    setReferenceFile(null);
  };

  const handleReferenceUpload = async (file: IFile | null) => {
    setReferenceFile(file);
    if (!data || !file) return;

    setIsReferenceOpen(false);
    setReferenceFile(null);

    try {
      await updateReferenceMutation.mutateAsync({
        id: data.id,
        payload: { referenceImgId: file.id },
      });
    } catch (_error) {
      return;
    }
  };

  const isBusy =
    updateMutation.isPending ||
    updateReferenceMutation.isPending ||
    deleteMutation.isPending;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Update pose</Typography>
          </div>
          <div className={s.headerActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setReferenceFile(null);
                setIsReferenceOpen(true);
              }}
              loading={updateReferenceMutation.isPending}
              disabled={!data || isBusy}
            >
              {updateReferenceMutation.isPending
                ? 'Generating Depth Img'
                : 'Update Reference'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/poses')}>
              Back to poses
            </Button>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load pose"
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
            <Skeleton width={640} height={280} />
          </Stack>
        ) : null}

        {data ? (
          <Stack gap="16px" className={s.form}>
            <Field
              label="Generated label"
              hint="This value comes from the backend and cannot be edited here."
            >
              <Typography variant="body">{data.name || '-'}</Typography>
            </Field>

            <PosePromptForm
              values={values}
              errors={errors}
              beforePrompt={
                <PoseReferenceImages
                  referenceImg={data.referenceImg}
                  referenceDepthImg={data.referenceDepthImg}
                />
              }
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
        title="Delete pose"
        description={
          data
            ? `Delete ${data.name}? This cannot be undone.`
            : 'Delete this pose? This cannot be undone.'
        }
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setIsDeleteOpen(false)}
      />

      <Modal open={isReferenceOpen} onClose={handleReferenceModalClose}>
        <FileUpload
          label="Reference image"
          folder={FileDir.Public}
          value={referenceFile}
          onChange={handleReferenceUpload}
          onError={(message) =>
            notifyError(new Error(message), 'Unable to upload reference.')
          }
          disabled={updateReferenceMutation.isPending}
        />
      </Modal>
    </AppShell>
  );
}
