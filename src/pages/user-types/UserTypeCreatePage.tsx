import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCreateUserType } from '@/app/user-types';
import { PlusIcon } from '@/assets/icons';
import {
  Button,
  Container,
  Field,
  FormRow,
  Input,
  Select,
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

export function UserTypeCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateUserType();
  const [values, setValues] = useState<FormValues>({
    name: '',
    paywallStage: STAGES_IN_ORDER[0],
    stageLength: '',
    chatPrompt: '',
    photoCoolDown: '',
    resistance: '',
  });
  const [showErrors, setShowErrors] = useState(false);

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

  const handleCreate = async () => {
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
    await createMutation.mutateAsync({
      name,
      paywallStage: values.paywallStage,
      stageLength: stageLength as number,
      chatPrompt: values.chatPrompt,
      photoCoolDown: photoCoolDown as number,
      resistance: values.resistance,
    });
    navigate('/user-types');
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Create user type</Typography>
          </div>
          <Button variant="ghost" onClick={() => navigate('/user-types')}>
            Back to user types
          </Button>
        </div>

        <Stack gap="16px" className={s.form}>
          <FormRow columns={2}>
            <Field
              label="Name"
              labelFor="user-type-create-name"
              error={errors.name}
            >
              <Input
                id="user-type-create-name"
                size="sm"
                value={values.name}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                disabled={createMutation.isPending}
                fullWidth
              />
            </Field>
            <Field
              label="Paywall stage"
              labelFor="user-type-create-paywall-stage"
              error={errors.paywallStage}
            >
              <Select
                id="user-type-create-paywall-stage"
                size="sm"
                options={STAGE_OPTIONS}
                value={values.paywallStage}
                onChange={(value) =>
                  setValues((prev) => ({
                    ...prev,
                    paywallStage: value as RoleplayStage,
                  }))
                }
                disabled={createMutation.isPending}
                fullWidth
              />
            </Field>
          </FormRow>

          <FormRow columns={2}>
            <Field
              label="Stage length"
              labelFor="user-type-create-stage-length"
              error={errors.stageLength}
            >
              <Input
                id="user-type-create-stage-length"
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
                disabled={createMutation.isPending}
                fullWidth
              />
            </Field>
            <Field
              label="Photo cooldown"
              labelFor="user-type-create-photo-cooldown"
              error={errors.photoCoolDown}
            >
              <Input
                id="user-type-create-photo-cooldown"
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
                disabled={createMutation.isPending}
                fullWidth
              />
            </Field>
          </FormRow>

          <Field label="Chat prompt" labelFor="user-type-create-chat-prompt">
            <Textarea
              id="user-type-create-chat-prompt"
              size="sm"
              value={values.chatPrompt}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  chatPrompt: event.target.value,
                }))
              }
              rows={12}
              disabled={createMutation.isPending}
              fullWidth
            />
          </Field>

          <Field label="Resistance" labelFor="user-type-create-resistance">
            <Textarea
              id="user-type-create-resistance"
              size="sm"
              value={values.resistance}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  resistance: event.target.value,
                }))
              }
              rows={8}
              disabled={createMutation.isPending}
              fullWidth
            />
          </Field>

          <div className={s.actions}>
            <Button
              variant="secondary"
              onClick={() => navigate('/user-types')}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              iconLeft={<PlusIcon />}
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={
                !isValid ||
                createMutation.isPending ||
                Boolean(
                  errors.name ||
                    errors.paywallStage ||
                    errors.stageLength ||
                    errors.photoCoolDown,
                )
              }
            >
              Create user type
            </Button>
          </div>
        </Stack>
      </Container>
    </AppShell>
  );
}
