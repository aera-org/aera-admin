import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useUserDetails } from '@/app/users';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Container,
  EmptyState,
  Field,
  Grid,
  Section,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import type { RoleplayStage } from '@/common/types';
import { AppShell } from '@/components/templates';

import s from './UserDetailsPage.module.scss';
import {
  formatDate,
  formatUserMeta,
  formatUserName,
  getSubscriptionStatus,
} from './userFormat';
import { useUserActionModals } from './useUserActionModals';

function formatStage(stage: RoleplayStage | null | undefined) {
  if (!stage) return '-';
  return stage
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString()
    : '-';
}

export function UserDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const userId = id ?? '';
  const { data, error, isLoading, refetch } = useUserDetails(userId || null);
  const userActions = useUserActionModals();

  const subscription = data ? getSubscriptionStatus(data) : null;
  const chats = useMemo(() => data?.chats ?? [], [data?.chats]);
  const payments = useMemo(() => data?.payments ?? [], [data?.payments]);
  const gifts = useMemo(() => data?.gifts ?? [], [data?.gifts]);
  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;

  const chatColumns = useMemo(
    () => [
      { key: 'chat', label: 'Chat' },
      { key: 'context', label: 'Character / Scenario' },
      { key: 'stage', label: 'Stage' },
      { key: 'history', label: 'History' },
      { key: 'photos', label: 'Photos' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );
  

  const chatRows = useMemo(
    () =>
      chats.sort((a, b) => (new Date(b.createdAt)).getTime() - (new Date(a.createdAt)).getTime()).map((chat) => ({
        chat: (
          <div className={s.chatCell}>
            <Typography variant="body">{chat.id}</Typography>
            <Typography variant="caption" tone="muted">
              {formatDate(chat.createdAt)}
            </Typography>
          </div>
        ),
        context: (
          <div className={s.contextCell}>
            <Typography variant="body">{chat.character?.name ?? '-'}</Typography>
            <Typography variant="caption" tone="muted">
              {chat.scenario?.name ?? chat.scenario?.id ?? '-'}
            </Typography>
          </div>
        ),
        stage: (
          <Badge tone="accent" outline>
            {formatStage(chat.stage)}
          </Badge>
        ),
        history: (
          <Typography variant="body" tone="muted">
            {formatNumber(chat.historyLength)}
          </Typography>
        ),
        photos: (
          <Typography variant="body" tone="muted">
            {formatNumber(chat.photosSent)}
          </Typography>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(chat.updatedAt)}
          </Typography>
        ),
      })),
    [chats],
  );

  const paymentColumns = useMemo(
    () => [
      { key: 'amount', label: 'Amount' },
      { key: 'character', label: 'Character' },
      { key: 'scenario', label: 'Scenario' },
      { key: 'created', label: <span className={s.alignRight}>Created</span> },
    ],
    [],
  );

  const paymentRows = useMemo(
    () =>
      payments.map((payment) => ({
        amount: (
          <Typography variant="body" tone="muted">
            {formatNumber(payment.amount)}
          </Typography>
        ),
        character: (
          <div className={s.contextCell}>
            <Typography variant="body">{payment.character?.name ?? '-'}</Typography>
            <Typography variant="caption" tone="muted">
              {payment.character?.id ?? '-'}
            </Typography>
          </div>
        ),
        scenario: (
          <div className={s.contextCell}>
            <Typography variant="body">{payment.scenario?.name ?? '-'}</Typography>
            <Typography variant="caption" tone="muted">
              {payment.scenario?.id ?? '-'}
            </Typography>
          </div>
        ),
        created: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(payment.createdAt)}
          </Typography>
        ),
      })),
    [payments],
  );

  const giftColumns = useMemo(
    () => [
      { key: 'gift', label: 'Gift' },
      { key: 'price', label: 'Price' },
      { key: 'status', label: 'Status' },
      { key: 'created', label: <span className={s.alignRight}>Created</span> },
    ],
    [],
  );

  const giftRows = useMemo(
    () =>
      gifts.map((gift) => ({
        gift: (
          <div className={s.giftCell}>
            <Typography variant="body">{gift.name}</Typography>
            <Typography variant="caption" tone="muted">
              {gift.id}
            </Typography>
          </div>
        ),
        price: (
          <Typography variant="body" tone="muted">
            {formatNumber(gift.price)}
          </Typography>
        ),
        status: gift.isActive ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="warning" outline>
            Inactive
          </Badge>
        ),
        created: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(gift.createdAt)}
          </Typography>
        ),
      })),
    [gifts],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => ({
        chat: (
          <div className={s.chatCell} key={`chat-skel-${index}`}>
            <Skeleton width={180} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        context: (
          <div className={s.contextCell}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        stage: <Skeleton width={90} height={20} />,
        history: <Skeleton width={40} height={12} />,
        photos: <Skeleton width={40} height={12} />,
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const paymentSkeletonRows = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => ({
        amount: <Skeleton width={80} height={12} key={`payment-${index}`} />,
        character: (
          <div className={s.contextCell}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        scenario: (
          <div className={s.contextCell}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        created: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const giftSkeletonRows = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => ({
        gift: (
          <div className={s.giftCell} key={`gift-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        price: <Skeleton width={80} height={12} />,
        status: <Skeleton width={80} height={20} />,
        created: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">User details</Typography>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <div className={s.headerActions}>
            {data ? (
              <ButtonGroup>
                <Button
                  variant="outline"
                  tone={data.isBlocked ? 'success' : 'warning'}
                  onClick={() =>
                    userActions.openBlockModal(data, !data.isBlocked)
                  }
                  loading={
                    userActions.isUpdatingUser &&
                    userActions.actionTarget === data.id
                  }
                  disabled={userActions.isUpdatingUser}
                >
                  {data.isBlocked ? 'Unblock' : 'Block'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => userActions.openFuelModal(data)}
                  disabled={userActions.isUpdatingUser}
                >
                  Fuel
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => userActions.openAirModal(data)}
                  disabled={userActions.isUpdatingUser}
                >
                  Air
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => userActions.openSubscriptionModal(data)}
                  disabled={userActions.isUpdatingUser}
                >
                  Subscription
                </Button>
              </ButtonGroup>
            ) : null}
            <Button variant="secondary" onClick={() => navigate('/users')}>
              Back to users
            </Button>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load user"
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

        {showEmpty ? (
          <EmptyState title="User not found" description="Check the ID." />
        ) : null}

        <Section title="Overview">
          {showSkeleton ? (
            <Grid columns={3} className={s.overviewGrid}>
              {Array.from({ length: 9 }, (_, index) => (
                <Skeleton key={`overview-${index}`} width={180} height={14} />
              ))}
            </Grid>
          ) : data && subscription ? (
            <Grid columns={3} className={s.overviewGrid}>
              <Field label="User">
                <Typography variant="body">{formatUserName(data)}</Typography>
                <Typography variant="caption" tone="muted">
                  {formatUserMeta(data)}
                </Typography>
              </Field>
              <Field label="Status">
                {data.isBlocked ? (
                  <Badge tone="danger" outline>
                    Blocked
                  </Badge>
                ) : (
                  <Badge tone="success">Active</Badge>
                )}
              </Field>
              <Field label="Subscription">
                <div className={s.subscriptionCell}>
                  <Badge tone={subscription.tone} outline={subscription.outline}>
                    {subscription.label}
                  </Badge>
                  {subscription.dateLabel ? (
                    <Typography variant="caption" tone="muted">
                      {subscription.dateLabel}
                    </Typography>
                  ) : null}
                </div>
              </Field>
              <Field label="Fuel">
                <Typography variant="body">
                  {Number.isFinite(data.fuel) ? data.fuel : '-'}
                </Typography>
              </Field>
              <Field label="Air">
                <Typography variant="body">
                  {Number.isFinite(data.air) ? data.air : '-'}
                </Typography>
              </Field>
              <Field label="Last activity">
                <Typography variant="body">
                  {formatDate(data.lastActivityAt)}
                </Typography>
              </Field>
              <Field label="Created">
                <Typography variant="body">{formatDate(data.createdAt)}</Typography>
              </Field>
              <Field label="Updated">
                <Typography variant="body">{formatDate(data.updatedAt)}</Typography>
              </Field>
            </Grid>
          ) : null}
        </Section>

        <Section
          title="Active chat"
          actions={
            data?.activeChat ? (
              <Button
                variant="secondary"
                onClick={() => navigate(`/chats/${data.activeChat?.id}`)}
              >
                Open chat
              </Button>
            ) : null
          }
        >
          {showSkeleton ? (
            <Grid columns={3} className={s.overviewGrid}>
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={`active-chat-${index}`} width={180} height={14} />
              ))}
            </Grid>
          ) : data?.activeChat ? (
            <Grid columns={3} className={s.overviewGrid}>
              <Field label="Chat">
                <Typography variant="body">{data.activeChat.id}</Typography>
                <Typography variant="caption" tone="muted">
                  {formatDate(data.activeChat.createdAt)}
                </Typography>
              </Field>
              <Field label="Character">
                <Typography variant="body">
                  {data.activeChat.character?.name ?? '-'}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {data.activeChat.character?.id ?? '-'}
                </Typography>
              </Field>
              <Field label="Scenario">
                <Typography variant="body">
                  {data.activeChat.scenario?.name ?? '-'}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {data.activeChat.scenario?.id ?? '-'}
                </Typography>
              </Field>
              <Field label="Stage">
                <Badge tone="accent" outline>
                  {formatStage(data.activeChat.stage)}
                </Badge>
              </Field>
              <Field label="History length">
                <Typography variant="body">
                  {formatNumber(data.activeChat.historyLength)}
                </Typography>
              </Field>
              <Field label="Photos sent">
                <Typography variant="body">
                  {formatNumber(data.activeChat.photosSent)}
                </Typography>
              </Field>
            </Grid>
          ) : (
            <EmptyState
              title="No active chat"
              description="This user has no active chat."
            />
          )}
        </Section>

        <Section
          title="Chats"
          description={data ? `${chats.length} chats` : undefined}
        >
          {showSkeleton ? (
            <Table columns={chatColumns} rows={skeletonRows} />
          ) : chats.length === 0 ? (
            <EmptyState title="No chats" description="This user has no chats." />
          ) : (
            <Table
              columns={chatColumns}
              rows={chatRows}
              getRowProps={(_, index) => {
                const chat = chats[index];
                if (!chat) return {};
                return {
                  className: s.clickableRow,
                  role: 'link',
                  tabIndex: 0,
                  onClick: () => navigate(`/chats/${chat.id}`),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/chats/${chat.id}`);
                    }
                  },
                };
              }}
            />
          )}
        </Section>

        <Section
          title="Payments"
          description={data ? `${payments.length} payments` : undefined}
        >
          {showSkeleton ? (
            <Table columns={paymentColumns} rows={paymentSkeletonRows} />
          ) : payments.length === 0 ? (
            <EmptyState
              title="No payments"
              description="This user has no payments."
            />
          ) : (
            <Table columns={paymentColumns} rows={paymentRows} />
          )}
        </Section>

        <Section title="Gifts" description={data ? `${gifts.length} gifts` : undefined}>
          {showSkeleton ? (
            <Table columns={giftColumns} rows={giftSkeletonRows} />
          ) : gifts.length === 0 ? (
            <EmptyState title="No gifts" description="This user has no gifts." />
          ) : (
            <Table
              columns={giftColumns}
              rows={giftRows}
              getRowProps={(_, index) => {
                const gift = gifts[index];
                if (!gift) return {};
                return {
                  className: s.clickableRow,
                  role: 'link',
                  tabIndex: 0,
                  onClick: () => navigate(`/gifts/${gift.id}`),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/gifts/${gift.id}`);
                    }
                  },
                };
              }}
            />
          )}
        </Section>
      </Container>

      {userActions.modals}
    </AppShell>
  );
}
