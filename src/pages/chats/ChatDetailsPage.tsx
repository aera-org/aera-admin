import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useChatDetails, useUpdateChatStage } from '@/app/chats';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  Grid,
  Section,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import {
  type ChatLlmResponse,
  type HistoryItem,
  HistoryItemEventType,
  HistoryItemType,
  type IChatMessage,
  type ITgUser,
  type RoleplayStage,
  STAGES_IN_ORDER,
} from '@/common/types';
import { AppShell } from '@/components/templates';

import s from './ChatDetailsPage.module.scss';

type ChatLlmPhoto = NonNullable<ChatLlmResponse['photo']>;

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatStage(stage: RoleplayStage) {
  return formatEnumLabel(stage);
}

function formatUserName(user: ITgUser) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  const username = user.username?.trim();
  if (username) return `@${username}`;
  return 'Unknown user';
}

function formatUserMeta(user: ITgUser) {
  const username = user.username?.trim();
  if (username) {
    return `@${username} / ${user.id}`;
  }
  return user.id;
}

function formatRoleLabel(role: IChatMessage['role']) {
  return (role.charAt(0).toUpperCase() + role.slice(1)).replace('_', ' ');
}

function getRoleTone(role: IChatMessage['role']) {
  if (role === 'assistant') return 'success' as const;
  if (role === 'system') return 'warning' as const;
  return 'accent' as const;
}

function formatHistoryItemType(type: HistoryItem['type']) {
  if (type === HistoryItemType.Ai) return 'AI';
  return formatEnumLabel(type);
}

function getHistoryItemTone(type: HistoryItem['type']) {
  if (type === HistoryItemType.Ai) return 'success' as const;
  if (type === HistoryItemType.Event) return 'warning' as const;
  return 'accent' as const;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseChatLlmResponse(content: string) {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!isRecord(parsed) || typeof parsed.text !== 'string') return null;
    return { ...parsed, text: parsed.text } as ChatLlmResponse;
  } catch {
    return null;
  }
}

function parseChatLlmPhoto(content: string) {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!isRecord(parsed)) return null;
    return parsed as ChatLlmPhoto;
  } catch {
    return null;
  }
}

function formatList(values: string[] | undefined) {
  return values && values.length > 0 ? values.join(', ') : null;
}

function formatBoolean(value: boolean | undefined) {
  if (typeof value !== 'boolean') return null;
  return value ? 'Yes' : 'No';
}

function ResponseField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;

  return (
    <Field label={label}>
      <Typography variant="body" className={s.messageContent}>
        {value}
      </Typography>
    </Field>
  );
}

function ChatLlmPhotoDetails({ photo }: { photo: ChatLlmPhoto }) {
  return (
    <div className={s.photoDetails}>
      <Typography variant="caption" tone="muted">
        Photo details
      </Typography>
      <div className={s.responseGrid}>
        <ResponseField
          label="Pose"
          value={photo.pose ? formatEnumLabel(photo.pose) : null}
        />
        <ResponseField label="Anal" value={formatBoolean(photo.anal)} />
        <ResponseField label="Clothes" value={formatList(photo.clothes)} />
        <ResponseField
          label="Environment"
          value={formatList(photo.environment)}
        />
        <ResponseField label="Face expression" value={photo.face_expression} />
        <ResponseField label="Action" value={photo.action} />
      </div>
    </div>
  );
}

function ChatLlmResponseContent({ response }: { response: ChatLlmResponse }) {
  const photo = response.photo;

  return (
    <div className={s.aiResponse}>
      <Typography variant="body" className={s.messageContent}>
        {response.text || '—'}
      </Typography>

      {response.subscription || response.gift || response.next_stage || photo ? (
        <div className={s.responseBadges}>
          {response.subscription ? (
            <Badge tone="accent" outline>
              Subscription
            </Badge>
          ) : null}
          {response.gift ? (
            <Badge tone="accent" outline>
              Gift
            </Badge>
          ) : null}
          {response.next_stage ? (
            <Badge tone="success" outline>
              Next stage
            </Badge>
          ) : null}
          {photo ? (
            <Badge tone="warning" outline>
              Photo
            </Badge>
          ) : null}
        </div>
      ) : null}

      {photo ? <ChatLlmPhotoDetails photo={photo} /> : null}
    </div>
  );
}

function HistoryItemContent({ item }: { item: HistoryItem }) {
  if (!item.content) return null;

  if (item.type === HistoryItemType.Ai) {
    const response = parseChatLlmResponse(item.content);

    if (response) {
      return <ChatLlmResponseContent response={response} />;
    }
  }

  if (
    item.type === HistoryItemType.Event &&
    item.event === HistoryItemEventType.ShowedPhoto
  ) {
    const photo = parseChatLlmPhoto(item.content);

    if (photo) {
      return <ChatLlmPhotoDetails photo={photo} />;
    }
  }

  return (
    <Typography variant="body" className={s.messageContent}>
      {item.content}
    </Typography>
  );
}

export function ChatDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chatId = id ?? '';
  const { data, error, isLoading, refetch } = useChatDetails(chatId || null);
  const updateStageMutation = useUpdateChatStage();
  const [stageDraft, setStageDraft] = useState<{
    chatId: string;
    value: RoleplayStage | '';
  } | null>(null);

  const history = useMemo(
    () => data?.history?.filter((message) => message.content) ?? [],
    [data?.history],
  );
  const historyItems = useMemo(
    () => data?.historyItems ?? [],
    [data?.historyItems],
  );
  const isNewHistoryMode = historyItems.length > 1;
  const historyCount = isNewHistoryMode ? historyItems.length : history.length;
  const selectedStage =
    stageDraft && stageDraft.chatId === data?.id
      ? stageDraft.value
      : (data?.stage ?? '');

  const historyColumns = useMemo(
    () => [
      { key: 'role', label: 'Role' },
      { key: 'content', label: 'Message' },
    ],
    [],
  );

  const historyRows = useMemo(
    () =>
      history.map((message) => ({
        role: (
          <div style={{ minWidth: 110 }}>
            <Badge tone={getRoleTone(message.role)} outline>
              {formatRoleLabel(message.role)}
            </Badge>
          </div>
        ),
        content: (
          <Typography variant="body" className={s.messageContent}>
            {message.content || '—'}
          </Typography>
        ),
      })),
    [history],
  );

  const historySkeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        role: <Skeleton width={80} height={20} key={`role-${index}`} />,
        content: (
          <div className={s.messageSkeleton}>
            <Skeleton width="90%" height={12} />
            <Skeleton width="70%" height={12} />
          </div>
        ),
      })),
    [],
  );

  const historyItemRows = useMemo(
    () =>
      historyItems.map((item, index) => {
        const isEvent = item.type === HistoryItemType.Event;

        return (
          <div
            className={s.timelineItem}
            key={`${item.createdAt?.toString() ?? 'history'}-${index}`}
          >
            <div className={s.timelineMeta}>
              <Badge tone={getHistoryItemTone(item.type)} outline>
                {formatHistoryItemType(item.type)}
              </Badge>
              {isEvent ? (
                <Badge tone="warning" outline>
                  {formatEnumLabel(item.event)}
                </Badge>
              ) : null}
              <Typography variant="caption" tone="muted">
                {formatDate(item.createdAt)}
              </Typography>
            </div>

            <HistoryItemContent item={item} />

            {isEvent && item.instruction ? (
              <div className={s.timelineInstruction}>
                <Typography variant="caption" tone="muted">
                  Instruction
                </Typography>
                <Typography variant="body" className={s.messageContent}>
                  {item.instruction}
                </Typography>
              </div>
            ) : null}

            {!item.content && !(isEvent && item.instruction) ? (
              <Typography variant="caption" tone="muted">
                No content
              </Typography>
            ) : null}
          </div>
        );
      }),
    [historyItems],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;
  const stageOptions = useMemo(
    () =>
      STAGES_IN_ORDER.map((stage) => ({
        label: formatStage(stage),
        value: stage,
      })),
    [],
  );
  const isUpdatingStage = updateStageMutation.isPending;
  const canUpdateStage =
    Boolean(data?.id) && Boolean(selectedStage) && selectedStage !== data?.stage;

  const handleUpdateStage = async () => {
    if (!data || !selectedStage || selectedStage === data.stage) return;

    await updateStageMutation.mutateAsync({
      id: data.id,
      payload: { stage: selectedStage },
    });
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <div className={s.titleRow}>
              <Typography variant="h2">Chat details</Typography>
              {data ? (
                <Badge tone={isNewHistoryMode ? 'success' : 'warning'} outline>
                  {isNewHistoryMode ? 'New' : 'Old'}
                </Badge>
              ) : null}
            </div>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <div className={s.headerActions}>
            <Button variant="secondary" onClick={() => navigate('/chats')}>
              Back to chats
            </Button>
            {data?.character?.id ? (
              <Button
                variant="secondary"
                onClick={() => navigate(`/characters/${data.character.id}`)}
              >
                Open character
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load chat"
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
          <EmptyState title="Chat not found" description="Check the ID." />
        ) : null}

        <Section
          title="Overview"
          description={
            data
              ? isNewHistoryMode
                ? `${historyCount} history items`
                : `${historyCount} messages`
              : undefined
          }
        >
          {showSkeleton ? (
            <Grid columns={3} className={s.overviewGrid}>
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={`overview-${index}`} width={180} height={14} />
              ))}
            </Grid>
          ) : data ? (
            <Grid columns={3} className={s.overviewGrid}>
              <Field label="User">
                <Typography variant="body">
                  {formatUserName(data.user)}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {formatUserMeta(data.user)}
                </Typography>
              </Field>
              <Field label="Character">
                <Typography variant="body">
                  {data.character?.name ?? '-'}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {data.character?.id ?? '-'}
                </Typography>
              </Field>
              <Field label="Scenario">
                <Typography variant="body">
                  {data.scenario?.name ?? '-'}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {data.scenario?.id ?? '-'}
                </Typography>
              </Field>
              <Field label="Stage">
                <Stack gap="12px">
                  <div>
                    <Badge tone="accent" outline>
                      {formatStage(data.stage)}
                    </Badge>
                  </div>
                  <FormRow columns={2}>
                    <Select
                      size="sm"
                      value={selectedStage}
                      options={stageOptions}
                      onChange={(value) =>
                        setStageDraft({
                          chatId: data.id,
                          value: value as RoleplayStage,
                        })
                      }
                      disabled={isUpdatingStage}
                      fullWidth
                    />
                    <Button
                      size="sm"
                      onClick={handleUpdateStage}
                      loading={isUpdatingStage}
                      disabled={!canUpdateStage || isUpdatingStage}
                    >
                      Update
                    </Button>
                  </FormRow>
                </Stack>
              </Field>
              <Field label="History length">
                <Typography variant="body">
                  {Number.isFinite(data.historyLength)
                    ? data.historyLength
                    : '-'}
                </Typography>
              </Field>
              <Field label="Photos sent">
                <Typography variant="body">
                  {Number.isFinite(data.photosSent) ? data.photosSent : '-'}
                </Typography>
              </Field>
              <Field label="Updated">
                <Typography variant="body">
                  {formatDate(data.updatedAt)}
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

        <Section
          title="History"
          description={
            data && historyCount > 0
              ? isNewHistoryMode
                ? `Showing ${historyCount} history items`
                : `Showing ${historyCount} messages`
              : undefined
          }
        >
          {showSkeleton ? (
            <Table columns={historyColumns} rows={historySkeletonRows} />
          ) : isNewHistoryMode ? (
            <div className={s.timeline}>{historyItemRows}</div>
          ) : history.length === 0 ? (
            <EmptyState
              title="No messages"
              description="This chat has no history yet."
            />
          ) : (
            <Table columns={historyColumns} rows={historyRows} />
          )}
        </Section>
      </Container>
    </AppShell>
  );
}
