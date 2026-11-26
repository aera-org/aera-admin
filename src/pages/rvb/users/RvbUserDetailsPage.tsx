import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useRvbUserDetails, useUpdateRvbUser } from '@/app/rvb';
import {
  Alert,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  Grid,
  Input,
  Section,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import { AppShell } from '@/components/templates';

import { formatDate, formatRvbUserMeta, formatRvbUserName } from '../rvbFormat';
import s from '../RvbPage.module.scss';
import { RvbUserBadges } from './RvbUserBadges';

function parseCredits(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

const paymentColumns = [
  { key: 'amount', label: 'Amount, stars' },
  { key: 'plan', label: 'Plan' },
  { key: 'ref', label: 'Ref' },
  { key: 'created', label: <span className={s.alignRight}>Created</span> },
];

export function RvbUserDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const userId = id ?? null;
  const { data, error, isLoading, refetch } = useRvbUserDetails(userId);
  const updateMutation = useUpdateRvbUser();

  const [draft, setDraft] = useState<{ id: string; credits: string } | null>(
    null,
  );

  const credits =
    data && draft?.id === data.id ? draft.credits : String(data?.credits ?? '');
  const parsedCredits = parseCredits(credits);
  const creditsError =
    data && parsedCredits === null
      ? 'Enter a non-negative integer.'
      : undefined;
  const hasChanges =
    Boolean(data) && parsedCredits !== null && parsedCredits !== data?.credits;
  const isBusy = updateMutation.isPending;

  const handleSave = async () => {
    if (!data || parsedCredits === null) return;
    await updateMutation.mutateAsync({
      id: data.id,
      payload: { credits: parsedCredits },
    });
    setDraft(null);
  };

  const paymentRows = useMemo(
    () =>
      (data?.payments ?? []).map((payment) => ({
        amount: <Typography variant="body">{payment.amount}</Typography>,
        plan: (
          <Typography variant="body" tone={payment.plan ? undefined : 'muted'}>
            {payment.plan?.code ?? '-'}
          </Typography>
        ),
        ref: (
          <Typography variant="body" tone={payment.ref ? undefined : 'muted'}>
            {payment.ref || '-'}
          </Typography>
        ),
        created: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(payment.createdAt)}
          </Typography>
        ),
      })),
    [data?.payments],
  );

  const deeplink = data?.deeplink ?? null;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">RVB user</Typography>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <Button variant="secondary" onClick={() => navigate('/rvb/users')}>
            Back to RVB users
          </Button>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load RVB user"
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
          ) : data ? (
            <Grid columns={3}>
              <Field label="User">
                <div className={s.cell}>
                  <Typography variant="body">
                    {formatRvbUserName(data)}
                  </Typography>
                  <Typography variant="caption" tone="muted">
                    {formatRvbUserMeta(data)}
                  </Typography>
                </div>
              </Field>
              <Field label="Status">
                <RvbUserBadges user={data} />
              </Field>
              <Field label="Credits">
                <Typography variant="body">{data.credits}</Typography>
              </Field>
              <Field label="Language">
                <Typography variant="body">
                  {[data.languageUI, data.languageCode]
                    .filter(Boolean)
                    .join(' / ') || '-'}
                </Typography>
              </Field>
              <Field label="Country">
                <Typography variant="body">{data.country || '-'}</Typography>
              </Field>
              <Field label="Ref">
                <Typography variant="body">{data.ref || '-'}</Typography>
              </Field>
              <Field label="Paid in total">
                <Typography variant="body">{data.totalPaid} stars</Typography>
              </Field>
              <Field label="Generations">
                {data.generationsCount > 0 ? (
                  <Button
                    as={Link}
                    to={`/rvb/generations?userId=${data.id}`}
                    variant="text"
                    size="sm"
                  >
                    {data.generationsCount}
                  </Button>
                ) : (
                  <Typography variant="body">0</Typography>
                )}
              </Field>
              <Field label="Active generation">
                {data.activeGenerationId ? (
                  <Button
                    as={Link}
                    to={`/rvb/generations/${data.activeGenerationId}`}
                    variant="text"
                    size="sm"
                  >
                    Open
                  </Button>
                ) : (
                  <Typography variant="body">-</Typography>
                )}
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
          <Section title="Deeplink">
            {deeplink ? (
              <Grid columns={3}>
                <Field label="Acquisition deeplink">
                  <Typography variant="body">
                    {deeplink.acquisitionDeeplink || '-'}
                  </Typography>
                </Field>
                <Field label="Acquisition ref">
                  <Typography variant="body">
                    {deeplink.acquisitionRef || '-'}
                  </Typography>
                </Field>
                <Field label="Acquisition post">
                  <Typography variant="body">
                    {deeplink.acquisitionPostId || '-'}
                  </Typography>
                </Field>
                <Field label="Last deeplink">
                  <Typography variant="body">
                    {deeplink.lastDeeplink || '-'}
                  </Typography>
                </Field>
                <Field label="Last ref">
                  <Typography variant="body">
                    {deeplink.lastRef || '-'}
                  </Typography>
                </Field>
                <Field label="Last post">
                  <Typography variant="body">
                    {deeplink.lastPostId || '-'}
                  </Typography>
                </Field>
                <Field label="Acquired">
                  <Typography variant="body">
                    {formatDate(deeplink.acquisitionAt)}
                  </Typography>
                </Field>
                <Field label="Last opened">
                  <Typography variant="body">
                    {formatDate(deeplink.lastDeeplinkAt)}
                  </Typography>
                </Field>
              </Grid>
            ) : (
              <Typography variant="body" tone="muted">
                No deeplink.
              </Typography>
            )}
          </Section>
        ) : null}

        {data ? (
          <Section title="Payments">
            {data.payments.length > 0 ? (
              <div className={s.tableWrap}>
                <Table columns={paymentColumns} rows={paymentRows} />
                <div>
                  <Button
                    as={Link}
                    to={`/rvb/payments?userId=${data.id}`}
                    variant="text"
                    size="sm"
                  >
                    Open in payments
                  </Button>
                </div>
              </div>
            ) : (
              <Typography variant="body" tone="muted">
                No payments.
              </Typography>
            )}
          </Section>
        ) : null}

        {data ? (
          <Section title="Edit">
            <div className={s.form}>
              <FormRow columns={2}>
                <Field
                  label="Credits"
                  labelFor="rvb-user-credits"
                  hint="Sets the balance."
                  error={creditsError}
                >
                  <Input
                    id="rvb-user-credits"
                    size="sm"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={credits}
                    onChange={(event) =>
                      setDraft({ id: data.id, credits: event.target.value })
                    }
                    disabled={isBusy}
                    fullWidth
                  />
                </Field>
              </FormRow>

              <div className={s.actions}>
                <Button
                  variant="secondary"
                  onClick={() => setDraft(null)}
                  disabled={!draft || isBusy}
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
