import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useUpdateUserType, useUserTypeDetails } from '@/app/user-types';
import {
  Alert,
  Button,
  Container,
  Field,
  FormRow,
  Input,
  Select,
  Skeleton,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import { RoleplayStage, STAGES_IN_ORDER } from '@/common/types';
import { formatRoleplayStage } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './UserTypeFormPage.module.scss';

const STAGE_OPTIONS = STAGES_IN_ORDER.map((stage) => ({
  value: stage,
  label: formatRoleplayStage(stage),
}));

type FormValues = {
  name: string;
  description: string;
  paywallStage: RoleplayStage;
  stageLength: string;
  chatPrompt: string;
  photoCoolDown: string;
  resistance: string;
};

type FormErrors = {
  name?: string;
  paywallStage?: string;
  stageLength?: string;
  photoCoolDown?: string;
};

function parseNonNegativeNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function UserTypeUpdatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const userTypeId = id ?? '';
  const {
    data,
    error,
    isLoading,
    refetch: refetchDetails,
  } = useUserTypeDetails(userTypeId, Boolean(userTypeId));
  const updateMutation = useUpdateUserType();

  const [values, setValues] = useState<FormValues>({
    name: '',
    description: '',
    paywallStage: STAGES_IN_ORDER[0],
    stageLength: '',
    chatPrompt: '',
    photoCoolDown: '',
    resistance: '',
  });
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!data) return;
    setValues({
      name: data.name ?? '',
      description: data.description ?? '',
      paywallStage: data.paywallStage ?? STAGES_IN_ORDER[0],
      stageLength: String(data.stageLength ?? ''),
      chatPrompt: data.chatPrompt ?? '',
      photoCoolDown: String(data.photoCoolDown ?? ''),
      resistance: data.resistance ?? '',
    });
    setShowErrors(false);
  }, [data]);

  const errors = useMemo(() => {
    if (!showErrors) return {} as FormErrors;
    const next: FormErrors = {};
    if (!values.name.trim()) {
      next.name = 'Enter a name.';
    }
    if (!STAGES_IN_ORDER.includes(values.paywallStage)) {
      next.paywallStage = 'Select a paywall stage.';
    }
    if (parseNonNegativeNumber(values.stageLength) === null) {
      next.stageLength = 'Enter a valid stage length.';
    }
    if (parseNonNegativeNumber(values.photoCoolDown) === null) {
      next.photoCoolDown = 'Enter a valid photo cooldown.';
    }
    return next;
  }, [showErrors, values]);

  const isValid = useMemo(
    () =>
      Boolean(
        values.name.trim() &&
          STAGES_IN_ORDER.includes(values.paywallStage) &&
          parseNonNegativeNumber(values.stageLength) !== null &&
          parseNonNegativeNumber(values.photoCoolDown) !== null,
      ),
    [values],
  );

  const handleUpdate = async () => {
    if (!data) return;
    const name = values.name.trim();
    const stageLength = parseNonNegativeNumber(values.stageLength);
    const photoCoolDown = parseNonNegativeNumber(values.photoCoolDown);
    const nextErrors: FormErrors = {
      name: name ? undefined : 'Enter a name.',
      paywallStage: STAGES_IN_ORDER.includes(values.paywallStage)
        ? undefined
        : 'Select a paywall stage.',
      stageLength:
        stageLength === null ? 'Enter a valid stage length.' : undefined,
      photoCoolDown:
        photoCoolDown === null ? 'Enter a valid photo cooldown.' : undefined,
    };
    if (
      nextErrors.name ||
      nextErrors.paywallStage ||
      nextErrors.stageLength ||
      nextErrors.photoCoolDown
    ) {
      setShowErrors(true);
      return;
    }
    await updateMutation.mutateAsync({
      id: data.id,
      payload: {
        name,
        description: values.description,
        paywallStage: values.paywallStage,
        stageLength: stageLength as number,
        chatPrompt: values.chatPrompt,
        photoCoolDown: photoCoolDown as number,
        resistance: values.resistance,
      },
    });
  };

  const isReady = Boolean(data);
  const isBusy = !isReady || updateMutation.isPending;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Update user type</Typography>
            {data ? (
              <Typography variant="meta" tone="muted">
                Created {new Date(data.createdAt).toLocaleString()}
              </Typography>
            ) : null}
          </div>
          <Button variant="secondary" onClick={() => navigate('/user-types')}>
            Back to user types
          </Button>
        </div>

        {error ? (
          <Alert
            title="Unable to load user type"
            description={
              error instanceof Error ? error.message : 'Please try again.'
            }
            tone="warning"
          />
        ) : null}

        {!isReady && isLoading ? (
          <Stack gap="16px" className={s.form}>
            <FormRow columns={2}>
              <Skeleton width={220} height={36} />
              <Skeleton width={220} height={36} />
            </FormRow>
            <FormRow columns={2}>
              <Skeleton width={220} height={36} />
              <Skeleton width={220} height={36} />
            </FormRow>
            <Skeleton width={640} height={180} />
            <Skeleton width={640} height={120} />
          </Stack>
        ) : (
          <Stack gap="16px" className={s.form}>
            <FormRow columns={2}>
              <Field
                label="Name"
                labelFor="user-type-edit-name"
                error={errors.name}
              >
                <Input
                  id="user-type-edit-name"
                  size="sm"
                  value={values.name}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  disabled={isBusy}
                  fullWidth
                />
              </Field>
              <Field
                label="Paywall stage"
                labelFor="user-type-edit-paywall-stage"
                error={errors.paywallStage}
              >
                <Select
                  id="user-type-edit-paywall-stage"
                  size="sm"
                  options={STAGE_OPTIONS}
                  value={values.paywallStage}
                  onChange={(value) =>
                    setValues((prev) => ({
                      ...prev,
                      paywallStage: value as RoleplayStage,
                    }))
                  }
                  disabled={isBusy}
                  fullWidth
                />
              </Field>
            </FormRow>

            <Field label="Description" labelFor="user-type-edit-description">
              <Textarea
                id="user-type-edit-description"
                size="sm"
                value={values.description}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={4}
                disabled={isBusy}
                fullWidth
              />
            </Field>

            <FormRow columns={2}>
              <Field
                label="Stage length"
                labelFor="user-type-edit-stage-length"
                error={errors.stageLength}
              >
                <Input
                  id="user-type-edit-stage-length"
                  size="sm"
                  type="number"
                  min={0}
                  value={values.stageLength}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      stageLength: event.target.value,
                    }))
                  }
                  disabled={isBusy}
                  fullWidth
                />
              </Field>
              <Field
                label="Photo cooldown"
                labelFor="user-type-edit-photo-cooldown"
                error={errors.photoCoolDown}
              >
                <Input
                  id="user-type-edit-photo-cooldown"
                  size="sm"
                  type="number"
                  min={0}
                  value={values.photoCoolDown}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      photoCoolDown: event.target.value,
                    }))
                  }
                  disabled={isBusy}
                  fullWidth
                />
              </Field>
            </FormRow>

            <Field label="Chat prompt" labelFor="user-type-edit-chat-prompt">
              <Textarea
                id="user-type-edit-chat-prompt"
                size="sm"
                value={values.chatPrompt}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    chatPrompt: event.target.value,
                  }))
                }
                rows={12}
                disabled={isBusy}
                fullWidth
              />
            </Field>

            <Field label="Resistance" labelFor="user-type-edit-resistance">
              <Textarea
                id="user-type-edit-resistance"
                size="sm"
                value={values.resistance}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    resistance: event.target.value,
                  }))
                }
                rows={8}
                disabled={isBusy}
                fullWidth
              />
            </Field>

            <div className={s.actions}>
              <Button
                onClick={handleUpdate}
                loading={updateMutation.isPending}
                disabled={
                  !isValid ||
                  updateMutation.isPending ||
                  Boolean(
                    errors.name ||
                      errors.paywallStage ||
                      errors.stageLength ||
                      errors.photoCoolDown,
                  ) ||
                  !isReady
                }
              >
                Save changes
              </Button>
              {error ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => refetchDetails()}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          </Stack>
        )}
      </Container>
    </AppShell>
  );
}
