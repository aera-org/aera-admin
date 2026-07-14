import { ReloadIcon } from '@radix-ui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useCharacterDetails, useCharacters } from '@/app/characters';
import { usePosePrompts } from '@/app/pose-prompts';
import {
  useCreateVideoGenerationItem,
  useDeleteVideoGeneration,
  useDeleteVideoGenerationItem,
  useRegenerateVideoGenerationItem,
  useSaveVideoGenerationItem,
  useUpdateVideoGeneration,
  useVideoGenerationDetails,
} from '@/app/video-generations';
import { PencilLineIcon, SaveIcon, TrashIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  IconButton,
  Input,
  Modal,
  Select,
  Skeleton,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import {
  type IVideoGenerationItem,
  VideoAspectRatio,
  VideoGenerationItemStatus,
  VideoQuality,
} from '@/common/types';
import { formatCharacterSelectLabel, formatCharacterType } from '@/common/utils';
import { ConfirmModal } from '@/components/molecules';
import { AppShell } from '@/components/templates';
import { SearchSelect } from '@/pages/generations/components/SearchSelect';

import {
  VideoCreateDrawer,
  type VideoCreateInitialValues,
} from './components/VideoCreateDrawer';
import s from './VideoDetailsPage.module.scss';

type EditVideoValues = {
  name: string;
  prompt: string;
  characterId: string;
  scenarioId: string;
  posePromptId: string;
};

type SelectOption = {
  id: string;
  label: string;
  meta?: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

function formatQuality(value: VideoQuality) {
  if (value === VideoQuality.Low) return 'Low';
  if (value === VideoQuality.Medium) return 'Medium';
  return 'High';
}

function formatAspectRatio(value: VideoAspectRatio) {
  if (value === VideoAspectRatio.Square) return 'Square';
  if (value === VideoAspectRatio.Standard) return 'Standard';
  if (value === VideoAspectRatio.Horizontal) return 'Horizontal';
  return 'Vertical';
}

function formatScenarioLabel(
  scenario:
    | {
        id: string;
        name: string;
        character: {
          id: string;
          name: string;
          type: Parameters<typeof formatCharacterType>[0];
        };
      }
    | null
    | undefined,
) {
  if (!scenario) return '-';
  return `${scenario.character.name} - ${scenario.name} (${formatCharacterType(scenario.character.type)})`;
}

function getStatusTone(status: VideoGenerationItemStatus) {
  if (status === VideoGenerationItemStatus.Ready) return 'success';
  if (status === VideoGenerationItemStatus.Failed) return 'danger';
  if (status === VideoGenerationItemStatus.Generating) return 'warning';
  return 'accent';
}

function getStatusLabel(status: VideoGenerationItemStatus) {
  if (status === VideoGenerationItemStatus.Generating) return 'Generating';
  if (status === VideoGenerationItemStatus.Ready) return 'Ready';
  if (status === VideoGenerationItemStatus.Failed) return 'Failed';
  return 'Pending';
}

function mergeSelectedOption<T extends SelectOption>(
  options: T[],
  selected?: T,
) {
  if (!selected) return options;
  if (options.some((option) => option.id === selected.id)) return options;
  return [selected, ...options];
}

export function VideoDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const videoId = id ?? '';

  const { data, error, isLoading, refetch } = useVideoGenerationDetails(
    videoId || null,
    null,
    {
      refetchInterval: (current) => {
        if (!current?.items?.length) return false;
        const hasActive = current.items.some(
          (item) =>
            item.status === VideoGenerationItemStatus.Pending ||
            item.status === VideoGenerationItemStatus.Generating,
        );
        return hasActive ? 5000 : false;
      },
    },
  );
  const updateMutation = useUpdateVideoGeneration();
  const createItemMutation = useCreateVideoGenerationItem();
  const deleteMutation = useDeleteVideoGeneration();
  const saveItemMutation = useSaveVideoGenerationItem();
  const regenerateItemMutation = useRegenerateVideoGenerationItem();
  const deleteItemMutation = useDeleteVideoGenerationItem();

  const [itemToDelete, setItemToDelete] = useState<IVideoGenerationItem | null>(
    null,
  );
  const [isReuseOpen, setIsReuseOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editShowErrors, setEditShowErrors] = useState(false);
  const [editValues, setEditValues] = useState<EditVideoValues>({
    name: '',
    prompt: '',
    characterId: '',
    scenarioId: '',
    posePromptId: '',
  });
  const [editCharacterSearch, setEditCharacterSearch] = useState('');
  const [editPosePromptSearch, setEditPosePromptSearch] = useState('');
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [regeneratingItemId, setRegeneratingItemId] = useState<string | null>(
    null,
  );

  const { data: editCharacterData, isLoading: isEditCharactersLoading } =
    useCharacters(
      {
        search: editCharacterSearch.trim() || undefined,
        order: 'ASC',
        skip: 0,
        take: 20,
      },
      { enabled: isEditOpen },
    );
  const { data: editCharacterDetails, isLoading: isEditScenariosLoading } =
    useCharacterDetails(editValues.characterId || null);
  const { data: editPosePromptData, isLoading: isEditPosePromptsLoading } =
    usePosePrompts({
      search: editPosePromptSearch.trim() || undefined,
      skip: 0,
      take: 100,
    });

  useEffect(() => {
    if (!editValues.scenarioId || !editCharacterDetails) return;
    const exists = editCharacterDetails.scenarios.some(
      (scenario) => scenario.id === editValues.scenarioId,
    );
    if (!exists) {
      setEditValues((prev) => ({
        ...prev,
        scenarioId: '',
        posePromptId: '',
      }));
    }
  }, [editCharacterDetails, editValues.scenarioId]);

  const editValidationErrors = useMemo(() => {
    if (!editShowErrors) return {};

    return {
      name: editValues.name.trim() ? undefined : 'Enter a name.',
      prompt: editValues.prompt.trim() ? undefined : 'Enter a prompt.',
    };
  }, [editShowErrors, editValues.name, editValues.prompt]);

  const items =
    data?.items.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) ?? [];
  const itemsLabel = data
    ? `Generated items (${items.length})`
    : 'Generated items';

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;

  const reuseInitialValues = useMemo<VideoCreateInitialValues | undefined>(() => {
    if (!data) return undefined;

    const scenario = data.scenario ?? null;
    return {
      name: data.name ?? '',
      prompt: data.prompt ?? '',
      characterId: scenario?.character.id ?? '',
      scenarioId: scenario?.id ?? '',
      posePromptId: scenario && data.posePrompt?.id ? data.posePrompt.id : '',
      quality: data.quality,
      resolution: data.resolution,
      aspectRatio: data.aspectRatio,
      duration: String(data.duration),
      startFrame: data.startFrame ?? null,
      characterOption: scenario
        ? {
            id: scenario.character.id,
            label: formatCharacterSelectLabel(
              scenario.character.name,
              scenario.character.type,
            ),
            meta: scenario.character.id,
          }
        : undefined,
      scenarioOption: scenario
        ? {
            label: scenario.name,
            value: scenario.id,
          }
        : undefined,
      posePromptOption: data.posePrompt
        ? {
            id: data.posePrompt.id,
            label: data.posePrompt.name,
            meta: data.posePrompt.id,
          }
        : undefined,
    };
  }, [data]);

  const editCharacterOptions = useMemo(
    () =>
      mergeSelectedOption(
        (editCharacterData?.data ?? []).map((character) => ({
          id: character.id,
          label: formatCharacterSelectLabel(character.name, character.type),
          meta: character.id,
        })),
        data?.scenario?.character
          ? {
              id: data.scenario.character.id,
              label: formatCharacterSelectLabel(
                data.scenario.character.name,
                data.scenario.character.type,
              ),
              meta: data.scenario.character.id,
            }
          : undefined,
      ),
    [data?.scenario?.character, editCharacterData?.data],
  );

  const editScenarioOptions = useMemo(() => {
    const options = [
      { label: 'No scenario', value: '' },
      ...(editCharacterDetails?.scenarios ?? []).map((scenario) => ({
        label: scenario.name,
        value: scenario.id,
      })),
    ];

    if (
      data?.scenario &&
      data.scenario.character.id === editValues.characterId &&
      !options.some((option) => option.value === data.scenario?.id)
    ) {
      options.unshift({
        label: data.scenario.name,
        value: data.scenario.id,
      });
    }

    return options;
  }, [data?.scenario, editCharacterDetails?.scenarios, editValues.characterId]);

  const editPosePromptOptions = useMemo(() => {
    const options = [
      { id: '', label: 'No pose prompt' },
      ...(editPosePromptData?.data ?? []).map((posePrompt) => ({
        id: posePrompt.id,
        label: posePrompt.name,
        meta: posePrompt.id,
      })),
    ];

    if (
      data?.posePrompt &&
      !options.some((option) => option.id === data.posePrompt?.id)
    ) {
      options.push({
        id: data.posePrompt.id,
        label: data.posePrompt.name,
        meta: data.posePrompt.id,
      });
    }

    return options;
  }, [data?.posePrompt, editPosePromptData?.data]);

  const openEditModal = () => {
    if (!data) return;
    setEditValues({
      name: data.name ?? '',
      prompt: data.prompt ?? '',
      characterId: data.scenario?.character.id ?? '',
      scenarioId: data.scenario?.id ?? '',
      posePromptId: data.posePrompt?.id ?? '',
    });
    setEditCharacterSearch('');
    setEditPosePromptSearch('');
    setEditShowErrors(false);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (updateMutation.isPending) return;
    setIsEditOpen(false);
  };

  const handleReuse = () => {
    if (!reuseInitialValues) return;
    setIsReuseOpen(true);
  };

  const handleEdit = async () => {
    if (!videoId) return;
    if (!editValues.name.trim() || !editValues.prompt.trim()) {
      setEditShowErrors(true);
      return;
    }

    await updateMutation.mutateAsync({
      id: videoId,
      payload: {
        name: editValues.name.trim(),
        prompt: editValues.prompt.trim(),
        scenarioId: editValues.scenarioId || undefined,
        posePromptId:
          editValues.scenarioId && editValues.posePromptId
            ? editValues.posePromptId
            : undefined,
      },
    });
    setIsEditOpen(false);
  };

  const handleAddItem = async () => {
    if (!videoId) return;
    await createItemMutation.mutateAsync({ id: videoId });
  };

  const handleDelete = async () => {
    if (!videoId) return;
    await deleteMutation.mutateAsync(videoId);
    navigate('/videos');
  };

  const handleDeleteItem = async () => {
    if (!videoId || !itemToDelete) return;
    await deleteItemMutation.mutateAsync({
      id: videoId,
      itemId: itemToDelete.id,
    });
    setItemToDelete(null);
  };

  const handleSaveItem = async (item: IVideoGenerationItem) => {
    if (!videoId) return;
    setSavingItemId(item.id);
    try {
      await saveItemMutation.mutateAsync({
        id: videoId,
        itemId: item.id,
      });
    } finally {
      setSavingItemId((prev) => (prev === item.id ? null : prev));
    }
  };

  const handleRegenerateItem = async (item: IVideoGenerationItem) => {
    if (!videoId) return;
    setRegeneratingItemId(item.id);
    try {
      await regenerateItemMutation.mutateAsync({
        id: videoId,
        itemId: item.id,
      });
    } finally {
      setRegeneratingItemId((prev) => (prev === item.id ? null : prev));
    }
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Video details</Typography>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <div className={s.headerActions}>
            <Button
              variant="secondary"
              onClick={handleReuse}
              disabled={!reuseInitialValues}
            >
              Reuse
            </Button>
            <Button
              variant="outline"
              onClick={handleAddItem}
              loading={createItemMutation.isPending}
              disabled={!data || createItemMutation.isPending}
            >
              Add item
            </Button>
            <IconButton
              aria-label="Edit video"
              icon={<PencilLineIcon />}
              tooltip="Edit video"
              variant="text"
              onClick={openEditModal}
              disabled={!data || updateMutation.isPending}
            />
            <IconButton
              aria-label="Delete video"
              icon={<TrashIcon />}
              tooltip="Delete video"
              variant="ghost"
              tone="danger"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!data || deleteMutation.isPending}
            />
            <Button variant="ghost" onClick={() => navigate('/videos')}>
              Back
            </Button>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load video"
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
          <EmptyState title="Video not found" description="Check the ID." />
        ) : null}

        {showSkeleton ? (
          <Stack className={s.content} gap="24px">
            <div className={s.summaryLayout}>
              <div className={s.summaryColumn}>
                <div className={s.detailsGrid}>
                  <Skeleton width={160} height={12} />
                  <Skeleton width={220} height={16} />
                  <Skeleton width={140} height={12} />
                  <Skeleton width={180} height={16} />
                  <Skeleton width={120} height={12} />
                  <Skeleton width={120} height={16} />
                  <Skeleton width={140} height={12} />
                  <Skeleton width={180} height={16} />
                  <Skeleton width={120} height={12} />
                  <Skeleton width={200} height={16} />
                  <Skeleton width={140} height={12} />
                  <Skeleton width={200} height={16} />
                </div>
                <Skeleton height={120} />
              </div>
              <div className={s.mediaColumn}>
                <Skeleton height={320} />
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`video-item-skel-${index}`} height={220} />
            ))}
          </Stack>
        ) : null}

        {data ? (
          <div className={s.content}>
            <div className={s.summaryLayout}>
              <div className={s.summaryColumn}>
                <div className={s.detailsGrid}>
                  <Field label="Name">
                    <Typography variant="body">{data.name}</Typography>
                  </Field>
                  <Field label="Scenario">
                    <Typography variant="body" tone="muted">
                      {formatScenarioLabel(data.scenario)}
                    </Typography>
                  </Field>
                  <Field label="Pose prompt">
                    <Typography variant="body" tone="muted">
                      {data.posePrompt?.name || data.posePrompt?.id || '-'}
                    </Typography>
                  </Field>
                  <Field label="Quality">
                    <Typography variant="body" tone="muted">
                      {formatQuality(data.quality)}
                    </Typography>
                  </Field>
                  <Field label="Resolution">
                    <Typography variant="body" tone="muted">
                      {data.resolution}p
                    </Typography>
                  </Field>
                  <Field label="Aspect ratio">
                    <Typography variant="body" tone="muted">
                      {formatAspectRatio(data.aspectRatio)}
                    </Typography>
                  </Field>
                  <Field label="Duration">
                    <Typography variant="body">{data.duration}s</Typography>
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
                </div>
                <Field label="Prompt">
                  <Typography variant="body">{data.prompt || '-'}</Typography>
                </Field>
              </div>

              <div className={s.mediaColumn}>
                <Field label="Start frame">
                  <div className={s.mediaFrame}>
                    {data.startFrame?.url ? (
                      <img
                        className={s.startFrame}
                        src={data.startFrame.url}
                        alt={data.startFrame.name}
                        loading="lazy"
                      />
                    ) : (
                      <Typography variant="caption" tone="muted">
                        No frame available.
                      </Typography>
                    )}
                  </div>
                </Field>
              </div>
            </div>

            <div className={s.itemsHeader}>
              <Typography variant="h3">{itemsLabel}</Typography>
            </div>

            {items.length === 0 ? (
              <EmptyState
                title="No generated items"
                description="Use Add item to generate the first video."
              />
            ) : (
              <div className={s.itemList}>
                {items.map((item) => (
                  <div key={item.id} className={s.itemRow}>
                    <div className={s.itemPreview}>
                      {item.file?.url ? (
                        <video
                          className={s.video}
                          src={item.file.url}
                          controls
                          preload="metadata"
                        />
                      ) : (
                        <Typography variant="caption" tone="muted">
                          {[
                            VideoGenerationItemStatus.Pending,
                            VideoGenerationItemStatus.Generating,
                          ].includes(item.status)
                            ? 'Generating...'
                            : 'No video'}
                        </Typography>
                      )}
                      <div className={s.itemPreviewActions}>
                        {item.status === VideoGenerationItemStatus.Ready ? (
                          <IconButton
                            aria-label="Save item"
                            tooltip="Save item"
                            size="sm"
                            variant="ghost"
                            icon={<SaveIcon />}
                            loading={
                              saveItemMutation.isPending && savingItemId === item.id
                            }
                            disabled={
                              saveItemMutation.isPending ||
                              regenerateItemMutation.isPending ||
                              deleteItemMutation.isPending
                            }
                            onClick={() => handleSaveItem(item)}
                          />
                        ) : null}
                        <IconButton
                          aria-label="Regenerate item"
                          tooltip="Regenerate item"
                          size="sm"
                          variant="ghost"
                          icon={<ReloadIcon />}
                          loading={
                            regenerateItemMutation.isPending &&
                            regeneratingItemId === item.id
                          }
                          disabled={
                            saveItemMutation.isPending ||
                            regenerateItemMutation.isPending ||
                            deleteItemMutation.isPending
                          }
                          onClick={() => handleRegenerateItem(item)}
                        />
                        <IconButton
                          aria-label="Delete item"
                          tooltip="Delete item"
                          size="sm"
                          variant="ghost"
                          tone="danger"
                          icon={<TrashIcon />}
                          onClick={() => setItemToDelete(item)}
                          disabled={
                            saveItemMutation.isPending ||
                            deleteItemMutation.isPending ||
                            regenerateItemMutation.isPending
                          }
                        />
                      </div>
                    </div>

                    <div className={s.itemBody}>
                      <div className={s.itemMeta}>
                        <div className={s.itemMetaRow}>
                          <Badge tone={getStatusTone(item.status)}>
                            {getStatusLabel(item.status)}
                          </Badge>
                          <Typography variant="caption" tone="muted">
                            {item.id}
                          </Typography>
                        </div>
                      </div>

                      {/*<div className={s.itemActions}>*/}
                      {/*  {item.file?.url ? (*/}
                      {/*    <Button*/}
                      {/*      as="a"*/}
                      {/*      href={item.file.url}*/}
                      {/*      download={item.file.name}*/}
                      {/*      rel="noopener"*/}
                      {/*      variant="secondary"*/}
                      {/*      iconLeft={<DownloadIcon />}*/}
                      {/*    >*/}
                      {/*      Download*/}
                      {/*    </Button>*/}
                      {/*  ) : null}*/}
                      {/*</div>*/}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Container>

      <Modal
        open={isEditOpen}
        title="Edit video"
        onClose={closeEditModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeEditModal}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              loading={updateMutation.isPending}
              disabled={
                !editValues.name.trim() ||
                !editValues.prompt.trim() ||
                updateMutation.isPending
              }
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <Field
            label="Name"
            labelFor="video-edit-name"
            error={editValidationErrors.name}
          >
            <Input
              id="video-edit-name"
              size="sm"
              value={editValues.name}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Video name"
              fullWidth
            />
          </Field>

          <Field
            label="Prompt"
            labelFor="video-edit-prompt"
            error={editValidationErrors.prompt}
          >
            <Textarea
              id="video-edit-prompt"
              size="sm"
              value={editValues.prompt}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  prompt: event.target.value,
                }))
              }
              rows={6}
              placeholder="Describe the video to generate"
              fullWidth
              disabled={updateMutation.isPending}
            />
          </Field>

          <FormRow columns={2}>
            <Field label="Character" labelFor="video-edit-character">
              <SearchSelect
                id="video-edit-character"
                value={editValues.characterId}
                options={editCharacterOptions}
                search={editCharacterSearch}
                onSearchChange={setEditCharacterSearch}
                onSelect={(value) =>
                  setEditValues((prev) => ({
                    ...prev,
                    characterId: value,
                    scenarioId: '',
                    posePromptId: '',
                  }))
                }
                placeholder={
                  isEditCharactersLoading
                    ? 'Loading characters...'
                    : 'Select character'
                }
                loading={isEditCharactersLoading}
                disabled={updateMutation.isPending}
              />
            </Field>

            <Field
              label="Scenario"
              labelFor="video-edit-scenario"
            >
              <Select
                id="video-edit-scenario"
                size="sm"
                options={editScenarioOptions}
                value={editValues.scenarioId}
                onChange={(value) =>
                  setEditValues((prev) => ({
                    ...prev,
                    scenarioId: value,
                    posePromptId: value ? prev.posePromptId : '',
                  }))
                }
                placeholder={
                  editValues.characterId
                    ? isEditScenariosLoading
                      ? 'Loading scenarios...'
                      : 'Select scenario'
                    : 'Select character first'
                }
                fullWidth
                disabled={
                  !editValues.characterId ||
                  isEditScenariosLoading ||
                  updateMutation.isPending
                }
              />
            </Field>
          </FormRow>

          <Field label="Pose prompt" labelFor="video-edit-pose-prompt">
            <SearchSelect
              id="video-edit-pose-prompt"
              value={editValues.scenarioId ? editValues.posePromptId : ''}
              valueLabel={data?.posePrompt?.name}
              options={editPosePromptOptions}
              search={editPosePromptSearch}
              onSearchChange={setEditPosePromptSearch}
              onSelect={(value) =>
                setEditValues((prev) => ({ ...prev, posePromptId: value }))
              }
              placeholder={
                editValues.scenarioId
                  ? isEditPosePromptsLoading
                    ? 'Loading pose prompts...'
                    : 'Select pose prompt'
                  : 'Select scenario first'
              }
              loading={isEditPosePromptsLoading}
              loadingLabel="Loading pose prompts..."
              emptyLabel="No pose prompts found."
              disabled={!editValues.scenarioId || updateMutation.isPending}
            />
          </Field>
        </Stack>
      </Modal>

      <ConfirmModal
        open={isDeleteOpen}
        title="Delete video?"
        description="This will permanently remove the video and all generated items."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setIsDeleteOpen(false);
        }}
      />

      {isReuseOpen && reuseInitialValues ? (
        <VideoCreateDrawer
          initialValues={reuseInitialValues}
          onClose={() => setIsReuseOpen(false)}
          onSuccess={(createdId) => {
            setIsReuseOpen(false);
            navigate(`/videos/${createdId}`);
          }}
        />
      ) : null}

      <ConfirmModal
        open={Boolean(itemToDelete)}
        title="Delete item?"
        description="This will permanently remove this generated video item."
        confirmLabel="Delete item"
        tone="danger"
        isConfirming={deleteItemMutation.isPending}
        onConfirm={handleDeleteItem}
        onClose={() => {
          if (deleteItemMutation.isPending) return;
          setItemToDelete(null);
        }}
      />
    </AppShell>
  );
}
