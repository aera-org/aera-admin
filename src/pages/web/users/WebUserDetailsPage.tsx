import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useUpdateWebUser, useWebUserDetails } from '@/app/web-users';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  Grid,
  Input,
  Section,
  Select,
  Skeleton,
  Stack,
  Switch,
  Typography,
} from '@/atoms';
import {
  type IWebUserDetails,
  PlanTier,
  PlanWebPeriod,
  type UpdateWebUserDto,
  type UpdateWebUserSubscriptionDto,
  UserWebStatus,
} from '@/common/types';
import { formatRoleplayStage } from '@/common/utils';
import { AppShell } from '@/components/templates';

import {
  formatDate,
  formatWebUserMeta,
  formatWebUserName,
  getWebSubscriptionStatus,
  parseNonNegativeInt,
  planPeriodOptions,
  planTierOptions,
  toIsoString,
  toLocalInputValue,
  userStatusOptions,
} from '../webFormat';
import s from '../WebPage.module.scss';

type EditValues = {
  status: UserWebStatus;
  credits: string;
  endDate: string;
  recharge: boolean;
  period: PlanWebPeriod;
  tier: PlanTier;
};

type EditErrors = Partial<Record<keyof EditValues, string>>;

function toEditValues(user: IWebUserDetails): EditValues {
  return {
    status: user.status,
    credits: String(user.credits),
    endDate: toLocalInputValue(user.subscription?.endDate),
    recharge: user.subscription?.recharge ?? false,
    period: user.subscription?.period ?? PlanWebPeriod.Month,
    tier: user.subscription?.tier ?? PlanTier.Premium,
  };
}

function getEditErrors(values: EditValues, user: IWebUserDetails): EditErrors {
  const errors: EditErrors = {};
  if (parseNonNegativeInt(values.credits) === null) {
    errors.credits = 'Enter a non-negative integer.';
  }
  if (values.endDate && !toIsoString(values.endDate)) {
    errors.endDate = 'Enter a valid date.';
  }
  if (!user.subscription && !values.endDate) {
    const initial = toEditValues(user);
    const touched =
      values.recharge !== initial.recharge ||
      values.period !== initial.period ||
      values.tier !== initial.tier;
    if (touched) {
      errors.endDate = 'End date is required to create a subscription.';
    }
  }
  return errors;
}

/** Sends only changed fields; a new subscription needs endDate. */
function buildPayload(
  values: EditValues,
  user: IWebUserDetails,
): UpdateWebUserDto {
  const initial = toEditValues(user);
  const payload: UpdateWebUserDto = {};

  if (values.status !== initial.status) payload.status = values.status;
  const credits = parseNonNegativeInt(values.credits);
  if (credits !== null && credits !== user.credits) payload.credits = credits;

  const subscription: UpdateWebUserSubscriptionDto = {};
  if (values.endDate !== initial.endDate) {
    const iso = toIsoString(values.endDate);
    if (iso) subscription.endDate = iso;
  }
  if (values.recharge !== initial.recharge) {
    subscription.recharge = values.recharge;
  }
  if (values.period !== initial.period) subscription.period = values.period;
  if (values.tier !== initial.tier) subscription.tier = values.tier;

  if (!user.subscription && subscription.endDate) {
    // Creating: send the full set so the backend doesn't fall back to defaults.
    Object.assign(subscription, {
      recharge: values.recharge,
      period: values.period,
      tier: values.tier,
    });
  }

  if (Object.keys(subscription).length > 0) payload.subscription = subscription;
  return payload;
}

export function WebUserDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const userId = id ?? null;
  const { data, error, isLoading, refetch } = useWebUserDetails(userId);
  const updateMutation = useUpdateWebUser();

  const [draft, setDraft] = useState<{ id: string; values: EditValues } | null>(
    null,
  );
  const [showErrorsForId, setShowErrorsForId] = useState<string | null>(null);

  const values = useMemo(() => {
    if (!data) return null;
    if (draft?.id === data.id) return draft.values;
    return toEditValues(data);
  }, [data, draft]);

  const allErrors = useMemo(
    () => (data && values ? getEditErrors(values, data) : {}),
    [data, values],
  );
  const errors = showErrorsForId === data?.id ? allErrors : {};
  const payload = useMemo(
    () => (data && values ? buildPayload(values, data) : {}),
    [data, values],
  );
  const hasChanges = Object.keys(payload).length > 0;
  const isValid = Object.keys(allErrors).length === 0;

  const handleChange = <K extends keyof EditValues>(
    field: K,
    value: EditValues[K],
  ) => {
    if (!data || !values) return;
    setDraft({ id: data.id, values: { ...values, [field]: value } });
  };

  const handleSave = async () => {
    if (!data) return;
    if (!isValid) {
      setShowErrorsForId(data.id);
      return;
    }
    await updateMutation.mutateAsync({ id: data.id, payload });
    setDraft(null);
    setShowErrorsForId(null);
  };

  const subscription = data ? getWebSubscriptionStatus(data.subscription) : null;
  const chat = data?.activeChat ?? null;
  const chatCharacter = chat?.character ?? chat?.scenario?.character ?? null;
  const isBusy = updateMutation.isPending;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Web user</Typography>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <Button variant="secondary" onClick={() => navigate('/web/users')}>
            Back to web users
          </Button>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load web user"
              description={
                error instanceof Error ? error.message : 'Please try again.'
              }
              tone="warning"
            />
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : null}

        {!isLoading && !error && !data ? (
          <EmptyState title="User not found" description="Check the ID." />
        ) : null}

        <Section title="Overview">
          {isLoading && !data ? (
            <Grid columns={3}>
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={`overview-${index}`} width={180} height={14} />
              ))}
            </Grid>
          ) : data && subscription ? (
            <Grid columns={3}>
              <Field label="User">
                <div className={s.cell}>
                  <Typography variant="body">
                    {formatWebUserName(data)}
                  </Typography>
                  <Typography variant="caption" tone="muted">
                    {formatWebUserMeta(data)}
                  </Typography>
                </div>
              </Field>
              <Field label="Status">
                <div className={s.badges}>
                  {data.status === UserWebStatus.Active ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Badge tone="danger" outline>
                      Inactive
                    </Badge>
                  )}
                  {data.isAnonymous ? <Badge outline>Anonymous</Badge> : null}
                </div>
              </Field>
              <Field label="Subscription">
                <div className={s.cell}>
                  <Badge tone={subscription.tone} outline={subscription.outline}>
                    {subscription.label}
                  </Badge>
                  {subscription.meta ? (
                    <Typography variant="caption" tone="muted">
                      {subscription.meta}
                      {data.subscription?.recharge ? ' · auto-renew' : ''}
                    </Typography>
                  ) : null}
                </div>
              </Field>
              <Field label="Credits">
                <Typography variant="body">{data.credits}</Typography>
              </Field>
              <Field label="Last activity">
                <Typography variant="body">
                  {formatDate(data.lastActivityAt)}
                </Typography>
              </Field>
              <Field label="Created">
                <Typography variant="body">
                  {formatDate(data.createdAt)}
                </Typography>
              </Field>
            </Grid>
          ) : null}
        </Section>

        {data ? (
          <Section title="Active chat">
            {chat ? (
              <Grid columns={3}>
                <Field label="Character">
                  {chatCharacter ? (
                    <Button
                      as={Link}
                      to={`/characters/${chatCharacter.id}`}
                      variant="text"
                      size="sm"
                    >
                      {chatCharacter.name}
                    </Button>
                  ) : (
                    <Typography variant="body">-</Typography>
                  )}
                </Field>
                <Field label="Scenario">
                  <Typography variant="body">
                    {chat.scenario?.name ?? '-'}
                  </Typography>
                </Field>
                <Field label="Stage">
                  <Typography variant="body">
                    {formatRoleplayStage(chat.stage)}
                  </Typography>
                </Field>
                <Field label="Updated">
                  <Typography variant="body">
                    {formatDate(chat.updatedAt)}
                  </Typography>
                </Field>
              </Grid>
            ) : (
              <Typography variant="body" tone="muted">
                No active chat.
              </Typography>
            )}
          </Section>
        ) : null}

        {data && values ? (
          <Section title="Edit">
            <div className={s.form}>
              <FormRow columns={2}>
                <Field label="Status" labelFor="web-user-status">
                  <Select
                    id="web-user-status"
                    size="sm"
                    options={userStatusOptions}
                    value={values.status}
                    onChange={(value) =>
                      handleChange('status', value as UserWebStatus)
                    }
                    disabled={isBusy}
                    fullWidth
                  />
                </Field>
                <Field
                  label="Credits"
                  labelFor="web-user-credits"
                  error={errors.credits}
                >
                  <Input
                    id="web-user-credits"
                    size="sm"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={values.credits}
                    onChange={(event) =>
                      handleChange('credits', event.target.value)
                    }
                    disabled={isBusy}
                    fullWidth
                  />
                </Field>
              </FormRow>

              <FormRow columns={2}>
                <Field
                  label="Subscription end"
                  labelFor="web-user-end-date"
                  hint={
                    data.subscription
                      ? undefined
                      : 'Set to create a subscription.'
                  }
                  error={errors.endDate}
                >
                  <Input
                    id="web-user-end-date"
                    size="sm"
                    type="datetime-local"
                    value={values.endDate}
                    onChange={(event) =>
                      handleChange('endDate', event.target.value)
                    }
                    disabled={isBusy}
                    fullWidth
                  />
                </Field>
                <Field label="Auto-renew" labelFor="web-user-recharge">
                  <Switch
                    id="web-user-recharge"
                    checked={values.recharge}
                    onChange={(event) =>
                      handleChange('recharge', event.target.checked)
                    }
                    label={values.recharge ? 'On' : 'Off'}
                    disabled={isBusy}
                  />
                </Field>
              </FormRow>

              <FormRow columns={2}>
                <Field label="Period" labelFor="web-user-period">
                  <Select
                    id="web-user-period"
                    size="sm"
                    options={planPeriodOptions}
                    value={values.period}
                    onChange={(value) =>
                      handleChange('period', value as PlanWebPeriod)
                    }
                    disabled={isBusy}
                    fullWidth
                  />
                </Field>
                <Field label="Tier" labelFor="web-user-tier">
                  <Select
                    id="web-user-tier"
                    size="sm"
                    options={planTierOptions}
                    value={values.tier}
                    onChange={(value) => handleChange('tier', value as PlanTier)}
                    disabled={isBusy}
                    fullWidth
                  />
                </Field>
              </FormRow>

              <div className={s.actions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDraft(null);
                    setShowErrorsForId(null);
                  }}
                  disabled={!hasChanges || isBusy}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleSave}
                  loading={isBusy}
                  disabled={!hasChanges || isBusy}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </Section>
        ) : null}
      </Container>
    </AppShell>
  );
}
