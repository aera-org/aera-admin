import { useMemo, useState } from 'react';

import {
  useAddScenarioActions,
  useAddScenarioGifts,
  useCreateScenarioStageGift,
  useDeleteScenarioStageGift,
  useGenerateScenarioOpeningImage,
  useUpdateScenario,
  useUpdateScenarioPromoVideo,
  useUpdateScenarioStage,
  useUpdateScenarioStageGift,
} from '@/app/characters';
import { useGifts } from '@/app/gifts';
import { notifyError } from '@/app/toast';
import {
  CopyIcon,
  GiftIcon,
  ImageIcon,
  PencilLineIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UploadIcon,
} from '@/assets/icons';
import {
  Badge,
  Button,
  ButtonGroup,
  Field,
  FormRow,
  IconButton,
  Input,
  Select,
  Stack,
  Switch,
  Textarea,
  Typography,
} from '@/atoms';
import { isX } from '@/common/is-x';
import {
  FileDir,
  type ICharacterDetails,
  type IFile,
  RoleplayStage,
  type StageAction,
  StageActionType,
  type StageDirectives,
  STAGES_IN_ORDER,
} from '@/common/types';
import {
  buildStageDirectivesPayload,
  createEmptyStageDirectives,
  formatStageActionType,
  normalizeStageDirectives,
  stageActionTypeOptions,
} from '@/common/utils';
import { ConfirmModal, Drawer, FileUpload } from '@/components/molecules';

import s from '../CharacterDetailsPage.module.scss';
import { ScenarioVideosV2Section } from './ScenarioVideosV2Section';

type ScenarioDetailsProps = {
  characterId: string | null;
  scenario: ICharacterDetails['scenarios'][number];
  scenarios: ICharacterDetails['scenarios'];
  formatDate: (value: string | null | undefined) => string;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canCopy: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  allowEdit?: boolean;
  allowStageEdit?: boolean;
  showStatus?: boolean;
  showIsNew?: boolean;
  showIsPromoted?: boolean;
  showIsTop?: boolean;
  showPromoImages?: boolean;
  showVideos?: boolean;
};

const STAGE_LABELS: Record<RoleplayStage, string> = {
  [RoleplayStage.Acquaintance]: 'Acquaintance',
  [RoleplayStage.Flirting]: 'Flirting',
  [RoleplayStage.Seduction]: 'Seduction',
  [RoleplayStage.Resistance]: 'Resistance',
  [RoleplayStage.Undressing]: 'Undressing',
  [RoleplayStage.Prelude]: 'Prelude',
  [RoleplayStage.Sex]: 'Sex',
  [RoleplayStage.Aftercare]: 'Aftercare',
};

const DEFAULT_STAGE_ACTION_TYPE =
  stageActionTypeOptions[0]?.value ?? StageActionType.Connect;

type StageGiftFormValues = {
  giftId: string;
  reason: string;
  buyText: string;
  boughtImgId: string;
};

const EMPTY_GIFT_VALUES: StageGiftFormValues = {
  giftId: '',
  reason: '',
  buyText: '',
  boughtImgId: '',
};
const VIDEO_ACCEPT =
  'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v';

function buildStageGiftCreatePayload(values: StageGiftFormValues) {
  return {
    giftId: values.giftId,
    reason: values.reason.trim(),
    buyText: values.buyText.trim(),
    boughtImgId: values.boughtImgId || undefined,
  };
}

function buildStageGiftUpdatePayload(values: StageGiftFormValues) {
  return {
    reason: values.reason.trim(),
    buyText: values.buyText.trim(),
    boughtImgId: values.boughtImgId || undefined,
  };
}

function createEmptyStageAction(): StageAction {
  return {
    type: DEFAULT_STAGE_ACTION_TYPE,
    text: '',
  };
}

function buildScenarioPayload(
  scenario: ICharacterDetails['scenarios'][number],
  stageKey: RoleplayStage,
  liveGenerationEnabled: boolean,
) {
  const nextLiveGenerationStages = Object.fromEntries(
    STAGES_IN_ORDER.map((currentStage) => [
      currentStage,
      currentStage === stageKey
        ? liveGenerationEnabled
        : Boolean(scenario.liveGenerations?.stages?.[currentStage]),
    ]),
  ) as Record<RoleplayStage, boolean>;

  return {
    name: scenario.name.trim(),
    emoji: scenario.emoji.trim(),
    slug: scenario.slug?.trim() || undefined,
    level: scenario.level,
    description: scenario.description.trim(),
    isActive: scenario.isActive,
    shortDescription: scenario.shortDescription?.trim() || undefined,
    isNew: scenario.isNew,
    isPromoted: scenario.isPromoted,
    promoText: scenario.promoText?.trim() ?? '',
    isTop: scenario.isTop,
    promoImgId: scenario.promoImg?.id,
    promoImgHorizontalId: scenario.promoImgHorizontal?.id,
    promoVideoId: scenario.promoVideo?.id,
    personality: scenario.personality.trim(),
    messagingStyle: scenario.messagingStyle.trim(),
    appearance: scenario.appearance.trim(),
    situation: scenario.situation.trim(),
    openingMessage: scenario.openingMessage.trim(),
    startMessage: scenario.startMessage?.trim() || undefined,
    transitionMessage:
      scenario.level > 1 ? scenario.transitionMessage?.trim() || null : null,
    opensAfterId: scenario.level > 1 ? scenario.opensAfterId || null : null,
    openingImageId: scenario.openingImage?.id,
    startImgId: scenario.startImg?.id,
    liveGenerations: {
      stages: nextLiveGenerationStages,
    },
  };
}

export function ScenarioDetails({
  characterId,
  scenario,
  scenarios,
  formatDate,
  onEdit,
  onCopy,
  onDelete,
  canEdit,
  canCopy,
  canDelete,
  isDeleting,
  allowEdit = true,
  allowStageEdit = true,
  showStatus = true,
  showIsNew = true,
  showIsPromoted = true,
  showIsTop = true,
  showPromoImages = true,
  showVideos = false,
}: ScenarioDetailsProps) {
  const updateScenarioMutation = useUpdateScenario();
  const updatePromoVideoMutation = useUpdateScenarioPromoVideo();
  const addScenarioActionsMutation = useAddScenarioActions();
  const addScenarioGiftsMutation = useAddScenarioGifts();
  const generateOpeningImageMutation = useGenerateScenarioOpeningImage();
  const updateStageMutation = useUpdateScenarioStage();
  const createGiftMutation = useCreateScenarioStageGift();
  const updateGiftMutation = useUpdateScenarioStageGift();
  const deleteGiftMutation = useDeleteScenarioStageGift();
  const { data: giftsData, error: giftsError, isLoading: isGiftsLoading } =
    useGifts({
      order: 'ASC',
      skip: 0,
      take: 500,
    });
  const [selectedStage, setSelectedStage] = useState<RoleplayStage>(
    STAGES_IN_ORDER[0] ?? RoleplayStage.Acquaintance,
  );
  const [activeStage, setActiveStage] = useState<RoleplayStage | null>(null);
  const [isStageDrawerOpen, setIsStageDrawerOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [stageValues, setStageValues] = useState<StageDirectives>(() =>
    createEmptyStageDirectives(),
  );
  const [isGiftAddDrawerOpen, setIsGiftAddDrawerOpen] = useState(false);
  const [isGiftEditDrawerOpen, setIsGiftEditDrawerOpen] = useState(false);
  const [giftShowErrors, setGiftShowErrors] = useState(false);
  const [giftEditShowErrors, setGiftEditShowErrors] = useState(false);
  const [giftValues, setGiftValues] =
    useState<StageGiftFormValues>(EMPTY_GIFT_VALUES);
  const [giftFile, setGiftFile] = useState<IFile | null>(null);
  const [giftEditValues, setGiftEditValues] =
    useState<StageGiftFormValues>(EMPTY_GIFT_VALUES);
  const [giftEditFile, setGiftEditFile] = useState<IFile | null>(null);
  const [giftToEditId, setGiftToEditId] = useState<string | null>(null);
  const [giftToDeleteId, setGiftToDeleteId] = useState<string | null>(null);
  const [liveGenerationStage, setLiveGenerationStage] =
    useState<RoleplayStage | null>(null);
  const [isPromoVideoDrawerOpen, setIsPromoVideoDrawerOpen] = useState(false);
  const [promoVideoFile, setPromoVideoFile] = useState<IFile | null>(null);
  const [promoVideoShowErrors, setPromoVideoShowErrors] = useState(false);
  const [isPromoVideoDeleteOpen, setIsPromoVideoDeleteOpen] = useState(false);

  const selectedStageContent = useMemo(
    () => normalizeStageDirectives(scenario.stages?.[selectedStage]),
    [scenario.stages, selectedStage],
  );
  const selectedStageLiveGeneration = Boolean(
    scenario.liveGenerations?.stages?.[selectedStage],
  );
  const opensAfterScenarioName = useMemo(() => {
    if (!scenario.opensAfterId) return null;
    const match = scenarios.find((item) => item.id === scenario.opensAfterId);
    return match?.name || match?.slug || null;
  }, [scenario.opensAfterId, scenarios]);
  const stageGift = useMemo(
    () => scenario.gifts.find((gift) => gift.stage === selectedStage) ?? null,
    [scenario.gifts, selectedStage],
  );
  const giftOptions = useMemo(
    () =>
      (giftsData?.data ?? [])
        .filter((gift) => gift.isActive)
        .map((gift) => ({
          label: gift.name,
          value: gift.id,
        })),
    [giftsData?.data],
  );
  const giftValidationErrors = useMemo(() => {
    if (!giftShowErrors) return {};
    const errors: { giftId?: string; reason?: string } = {};
    if (!giftValues.giftId) errors.giftId = 'Select a gift.';
    if (!giftValues.reason.trim()) errors.reason = 'Enter a reason.';
    return errors;
  }, [giftShowErrors, giftValues.giftId, giftValues.reason]);
  const giftEditValidationErrors = useMemo(() => {
    if (!giftEditShowErrors) return {};
    const errors: { reason?: string } = {};
    if (!giftEditValues.reason.trim()) errors.reason = 'Enter a reason.';
    return errors;
  }, [giftEditShowErrors, giftEditValues.reason]);
  const isGiftValid = useMemo(
    () => Boolean(giftValues.giftId && giftValues.reason.trim()),
    [giftValues.giftId, giftValues.reason],
  );
  const isGiftEditValid = useMemo(
    () => Boolean(giftEditValues.reason.trim()),
    [giftEditValues.reason],
  );

  const validationErrors = useMemo(() => {
    if (!showErrors) return {};
    const errors: Partial<Record<keyof StageDirectives, string>> = {};
    if (!stageValues.toneAndBehavior.trim()) {
      errors.toneAndBehavior = 'Enter tone and behavior.';
    }
    if (!stageValues.restrictions.trim()) {
      errors.restrictions = 'Enter restrictions.';
    }
    if (!stageValues.environment.trim()) {
      errors.environment = 'Enter an environment.';
    }
    if (!stageValues.characterLook.trim()) {
      errors.characterLook = 'Enter a character look.';
    }
    if (!stageValues.goal.trim()) {
      errors.goal = 'Enter a goal.';
    }
    if (!stageValues.escalationTrigger.trim()) {
      errors.escalationTrigger = 'Enter an escalation trigger.';
    }
    return errors;
  }, [showErrors, stageValues]);

  const isStageValid = useMemo(
    () =>
      Boolean(
        stageValues.toneAndBehavior.trim() &&
        stageValues.restrictions.trim() &&
        stageValues.environment.trim() &&
        stageValues.characterLook.trim() &&
        stageValues.goal.trim() &&
        stageValues.escalationTrigger.trim(),
      ),
    [stageValues],
  );
  const promoVideoPreviewUrl = promoVideoFile?.url ?? null;
  const promoVideoError =
    promoVideoShowErrors && !promoVideoFile?.id ? 'Upload a video.' : null;

  const openPromoVideoDrawer = () => {
    setPromoVideoFile(scenario.promoVideo ?? null);
    setPromoVideoShowErrors(false);
    setIsPromoVideoDrawerOpen(true);
  };

  const closePromoVideoDrawer = () => {
    if (updatePromoVideoMutation.isPending) return;
    setIsPromoVideoDrawerOpen(false);
  };

  const openStageModal = (stage: RoleplayStage) => {
    const content = normalizeStageDirectives(scenario.stages?.[stage]);
    setStageValues(content);
    setActiveStage(stage);
    setShowErrors(false);
    setIsStageDrawerOpen(true);
  };

  const closeStageDrawer = () => {
    if (updateStageMutation.isPending) return;
    setIsStageDrawerOpen(false);
  };

  const handleStageSave = async () => {
    if (!characterId || !activeStage) return;
    if (!isStageValid) {
      setShowErrors(true);
      return;
    }

    await updateStageMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      stage: activeStage,
      payload: buildStageDirectivesPayload(stageValues),
    });

    setIsStageDrawerOpen(false);
  };

  const handleLiveGenerationChange = async (checked: boolean) => {
    if (!characterId) return;

    setLiveGenerationStage(selectedStage);
    try {
      await updateScenarioMutation.mutateAsync({
        characterId,
        scenarioId: scenario.id,
        payload: buildScenarioPayload(scenario, selectedStage, checked),
      });
    } finally {
      setLiveGenerationStage(null);
    }
  };

  const openGiftAddDrawer = () => {
    setGiftValues(EMPTY_GIFT_VALUES);
    setGiftFile(null);
    setGiftShowErrors(false);
    setIsGiftAddDrawerOpen(true);
  };

  const closeGiftAddDrawer = () => {
    if (createGiftMutation.isPending) return;
    setIsGiftAddDrawerOpen(false);
  };

  const openGiftEditDrawer = () => {
    if (!stageGift) return;
    setGiftToEditId(stageGift.id);
    setGiftEditValues({
      giftId: stageGift.gift?.id ?? stageGift.giftId ?? '',
      reason: stageGift.reason ?? '',
      buyText: stageGift.buyText ?? '',
      boughtImgId: stageGift.boughtImg?.id ?? '',
    });
    setGiftEditFile(stageGift.boughtImg ?? null);
    setGiftEditShowErrors(false);
    setIsGiftEditDrawerOpen(true);
  };

  const closeGiftEditDrawer = () => {
    if (updateGiftMutation.isPending) return;
    setIsGiftEditDrawerOpen(false);
  };

  const openGiftDeleteModal = () => {
    if (!stageGift) return;
    setGiftToDeleteId(stageGift.id);
  };

  const closeGiftDeleteModal = () => {
    if (deleteGiftMutation.isPending) return;
    setGiftToDeleteId(null);
  };

  const handleGiftAdd = async () => {
    if (!characterId || !isGiftValid) {
      setGiftShowErrors(true);
      return;
    }

    await createGiftMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      stage: selectedStage,
      payload: buildStageGiftCreatePayload(giftValues),
    });

    setIsGiftAddDrawerOpen(false);
  };

  const handleGiftEdit = async () => {
    if (!characterId || !giftToEditId || !isGiftEditValid) {
      setGiftEditShowErrors(true);
      return;
    }

    await updateGiftMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      stage: selectedStage,
      characterGiftId: giftToEditId,
      payload: buildStageGiftUpdatePayload(giftEditValues),
    });

    setIsGiftEditDrawerOpen(false);
  };

  const handleGiftDelete = async () => {
    if (!characterId || !giftToDeleteId) return;

    await deleteGiftMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      stage: selectedStage,
      characterGiftId: giftToDeleteId,
    });

    setGiftToDeleteId(null);
  };

  const handleGenerateOpeningImage = async () => {
    if (!characterId) return;

    await generateOpeningImageMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
    });
  };

  const handleAddScenarioGifts = async () => {
    if (!characterId) return;

    await addScenarioGiftsMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
    });
  };

  const handleAddScenarioActions = async () => {
    if (!characterId) return;

    await addScenarioActionsMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
    });
  };

  const handleStageActionAdd = () => {
    setStageValues((prev) => ({
      ...prev,
      actions: [...(prev.actions ?? []), createEmptyStageAction()],
    }));
  };

  const handleStageActionChange = <K extends keyof StageAction>(
    index: number,
    key: K,
    value: StageAction[K],
  ) => {
    setStageValues((prev) => ({
      ...prev,
      actions: (prev.actions ?? []).map((action, actionIndex) =>
        actionIndex === index
          ? {
              ...action,
              [key]: value,
            }
          : action,
      ),
    }));
  };

  const handleStageActionRemove = (index: number) => {
    setStageValues((prev) => ({
      ...prev,
      actions: (prev.actions ?? []).filter((_, actionIndex) => actionIndex !== index),
    }));
  };

  const handlePromoVideoSave = async () => {
    if (!characterId || !promoVideoFile?.id) {
      setPromoVideoShowErrors(true);
      return;
    }

    await updatePromoVideoMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      payload: { promoVideoId: promoVideoFile.id },
    });

    setIsPromoVideoDrawerOpen(false);
  };

  const handlePromoVideoDelete = async () => {
    if (!characterId) return;

    await updatePromoVideoMutation.mutateAsync({
      characterId,
      scenarioId: scenario.id,
      payload: { promoVideoId: null },
    });

    setPromoVideoFile(null);
    setIsPromoVideoDeleteOpen(false);
    setIsPromoVideoDrawerOpen(false);
  };

  return (
    <div className={s.detailsCard}>
      <div className={s.detailsHeader}>
        <Typography variant="h3">
          <span className={s.emoji}>{scenario.emoji || ''}</span>
          {scenario.name}
        </Typography>
        <div className={s.detailsActions}>
          <Typography variant="meta" tone="muted">
            {scenario.updatedAt
              ? `Updated ${formatDate(scenario.updatedAt)}`
              : ''}
          </Typography>
          <IconButton
            aria-label="Copy scenario"
            icon={<CopyIcon />}
            tooltip="Copy scenario"
            variant="ghost"
            size="sm"
            onClick={onCopy}
            disabled={!canCopy}
          />
          <IconButton
            aria-label="Generate opening image"
            icon={<ImageIcon />}
            tooltip="Generate opening image"
            variant="ghost"
            size="sm"
            onClick={() => void handleGenerateOpeningImage()}
            loading={generateOpeningImageMutation.isPending}
            disabled={!characterId || generateOpeningImageMutation.isPending}
          />
          <IconButton
            aria-label="Add Gifts"
            icon={<GiftIcon />}
            tooltip="Add Gifts"
            variant="ghost"
            size="sm"
            onClick={() => void handleAddScenarioGifts()}
            loading={addScenarioGiftsMutation.isPending}
            disabled={!characterId || addScenarioGiftsMutation.isPending}
          />
          <IconButton
            aria-label="Add Actions"
            icon={<SparklesIcon />}
            tooltip="Add Actions"
            variant="ghost"
            size="sm"
            onClick={() => void handleAddScenarioActions()}
            loading={addScenarioActionsMutation.isPending}
            disabled={!characterId || addScenarioActionsMutation.isPending}
          />
          {isX ? (
            <IconButton
              aria-label="Promo video"
              icon={<UploadIcon />}
              tooltip="Promo video"
              variant="ghost"
              size="sm"
              onClick={openPromoVideoDrawer}
              loading={updatePromoVideoMutation.isPending}
              disabled={!characterId || updatePromoVideoMutation.isPending}
            />
          ) : null}
          {allowEdit ? (
            <IconButton
              aria-label="Edit scenario"
              icon={<PencilLineIcon />}
              tooltip="Edit scenario"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              disabled={!canEdit}
            />
          ) : null}
          <IconButton
            aria-label="Delete scenario"
            icon={<TrashIcon />}
            tooltip="Delete scenario"
            variant="ghost"
            tone="danger"
            size="sm"
            onClick={onDelete}
            loading={isDeleting}
            disabled={!canDelete || isDeleting}
          />
        </div>
      </div>

      <Stack gap="16px">
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Slug
          </Typography>
          <Typography variant="body">{scenario.slug || '-'}</Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Level
          </Typography>
          <Typography variant="body">{scenario.level}</Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Opening image
          </Typography>
          {scenario.openingImage?.url ? (
            <img
              className={s.stageOpeningImage}
              src={scenario.openingImage.url}
              alt={`${scenario.name} opening`}
              loading="lazy"
            />
          ) : (
            <div className={s.stageOpeningImagePlaceholder}>
              <Typography variant="caption" tone="muted">
                No image
              </Typography>
            </div>
          )}
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Start image
          </Typography>
          {scenario.startImg?.url ? (
            <img
              className={s.stageOpeningImage}
              src={scenario.startImg.url}
              alt={`${scenario.name} start`}
              loading="lazy"
            />
          ) : (
            <div className={s.stageOpeningImagePlaceholder}>
              <Typography variant="caption" tone="muted">
                No image
              </Typography>
            </div>
          )}
        </div>

        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Description
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.description || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Short description
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.shortDescription || '-'}
          </Typography>
        </div>
        {scenario.level > 1 ? (
          <>
            <div className={s.detailBlock}>
              <Typography variant="caption" tone="muted">
                Opens after
              </Typography>
              <Typography variant="body">
                {opensAfterScenarioName || '-'}
              </Typography>
            </div>
            <div className={s.detailBlock}>
              <Typography variant="caption" tone="muted">
                Transition text
              </Typography>
              <Typography variant="body" className={s.multiline}>
                {scenario.transitionMessage || '-'}
              </Typography>
            </div>
          </>
        ) : null}
        {showStatus || showIsNew || showIsPromoted || showIsTop ? (
          <FormRow columns={3}>
            {showStatus ? (
              <div className={s.detailBlock}>
                <Typography variant="caption" tone="muted">
                  Status
                </Typography>
                <div>
                  <Badge tone={scenario.isActive ? 'success' : 'warning'}>
                    {scenario.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ) : null}
            {showIsNew ? (
              <div className={s.detailBlock}>
                <Typography variant="caption" tone="muted">
                  New
                </Typography>
                <div>
                  <Badge tone={scenario.isNew ? 'accent' : 'warning'}>
                    {scenario.isNew ? 'New' : 'Not new'}
                  </Badge>
                </div>
              </div>
            ) : null}
            {showIsPromoted ? (
              <div className={s.detailBlock}>
                <Typography variant="caption" tone="muted">
                  Promoted
                </Typography>
                <div>
                  <Badge tone={scenario.isPromoted ? 'accent' : 'warning'}>
                    {scenario.isPromoted ? 'Promoted' : 'Not promoted'}
                  </Badge>
                </div>
              </div>
            ) : null}
            {showIsTop ? (
              <div className={s.detailBlock}>
                <Typography variant="caption" tone="muted">
                  Top
                </Typography>
                <div>
                  <Badge tone={scenario.isTop ? 'accent' : 'warning'}>
                    {scenario.isTop ? 'Top' : 'Not top'}
                  </Badge>
                </div>
              </div>
            ) : null}
          </FormRow>
        ) : null}
        {showIsPromoted ? (
          <div className={s.detailBlock}>
            <Typography variant="caption" tone="muted">
              Promo text
            </Typography>
            <Typography variant="body" className={s.multiline}>
              {scenario.promoText || '-'}
            </Typography>
          </div>
        ) : null}
        {showPromoImages ? (
          <FormRow columns={2}>
            <div className={s.detailBlock}>
              <Typography variant="caption" tone="muted">
                Promo image
              </Typography>
              {scenario.promoImg?.url ? (
                <img
                  className={s.promoImage}
                  src={scenario.promoImg.url}
                  alt={`${scenario.name} promo`}
                  loading="lazy"
                />
              ) : (
                <div className={s.promoImagePlaceholder}>
                  <Typography variant="caption" tone="muted">
                    No image
                  </Typography>
                </div>
              )}
            </div>
            <div className={s.detailBlock}>
              <Typography variant="caption" tone="muted">
                Promo image horizontal
              </Typography>
              {scenario.promoImgHorizontal?.url ? (
                <img
                  className={s.promoImage}
                  src={scenario.promoImgHorizontal.url}
                  alt={`${scenario.name} promo horizontal`}
                  loading="lazy"
                />
              ) : (
                <div className={s.promoImagePlaceholder}>
                  <Typography variant="caption" tone="muted">
                    No image
                  </Typography>
                </div>
              )}
            </div>
          </FormRow>
        ) : null}
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Personality
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.personality || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Messaging style
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.messagingStyle || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Appearance
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.appearance || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Situation
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.situation || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Opening message
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.openingMessage || '-'}
          </Typography>
        </div>
        <div className={s.detailBlock}>
          <Typography variant="caption" tone="muted">
            Start message
          </Typography>
          <Typography variant="body" className={s.multiline}>
            {scenario.startMessage || '-'}
          </Typography>
        </div>

        <div>
          <Typography variant="h3">Stages</Typography>
          <div className={s.stageLayout}>
            <div className={s.stageNav}>
              {STAGES_IN_ORDER.map((stage) => {
                const isActive = selectedStage === stage;
                return (
                  <Button
                    key={stage}
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className={s.stageNavButton}
                    onClick={() => setSelectedStage(stage)}
                  >
                    {STAGE_LABELS[stage]}
                  </Button>
                );
              })}
            </div>

            <div className={s.stageCard}>
              <div className={s.stageHeader}>
                <Typography variant="h3">
                  {STAGE_LABELS[selectedStage]}
                </Typography>
                {allowStageEdit ? (
                  <span className={s.stageEdit}>
                    <IconButton
                      aria-label={`Edit ${STAGE_LABELS[selectedStage]} stage`}
                      icon={<PencilLineIcon />}
                      tooltip={`Edit ${STAGE_LABELS[selectedStage]} stage`}
                      variant="ghost"
                      size="sm"
                      onClick={() => openStageModal(selectedStage)}
                      disabled={!characterId}
                    />
                  </span>
                ) : null}
              </div>

              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Tone and behavior
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.toneAndBehavior || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Restrictions
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.restrictions || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Environment
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.environment || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Character look
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.characterLook || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Goal
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.goal || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Escalation trigger
                </Typography>
                <Typography variant="body" className={s.multiline}>
                  {selectedStageContent.escalationTrigger || '-'}
                </Typography>
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Actions
                </Typography>
                {selectedStageContent.actions?.length ? (
                  <div className={s.stageActionList}>
                    {selectedStageContent.actions.map((action, index) => (
                      <div
                        key={`${selectedStage}-${action.type}-${action.text}-${index}`}
                        className={s.stageActionItem}
                      >
                        <Badge outline>{formatStageActionType(action.type)}</Badge>
                        <Typography variant="body" className={s.multiline}>
                          {action.text}
                        </Typography>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Typography variant="body">-</Typography>
                )}
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Gift
                </Typography>
                <div className={s.stageGiftRow}>
                  <Typography variant="body" className={s.multiline}>
                    {stageGift
                      ? `${stageGift.gift?.name || '-'} - ${stageGift.reason || '-'}`
                      : '-'}
                  </Typography>
                  <Stack direction="horizontal" gap="8px">
                    {stageGift ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={openGiftEditDrawer}
                          disabled={!characterId}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          tone="danger"
                          onClick={openGiftDeleteModal}
                          disabled={!characterId}
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={openGiftAddDrawer}
                        disabled={!characterId}
                      >
                        Add
                      </Button>
                    )}
                  </Stack>
                </div>
                {stageGift?.boughtImg?.url ? (
                  <div className={s.stageGiftImageBlock}>
                    <Typography variant="caption" tone="muted">
                      Bought image
                    </Typography>
                    <img
                      className={s.stageGiftImage}
                      src={stageGift.boughtImg.url}
                      alt={`${stageGift.gift?.name || 'Gift'} bought`}
                      loading="lazy"
                    />
                  </div>
                ) : null}
              </div>
              <div className={s.stageSection}>
                <Typography variant="caption" tone="muted">
                  Live generations
                </Typography>
                <Switch
                  checked={selectedStageLiveGeneration}
                  onChange={(event) =>
                    void handleLiveGenerationChange(event.target.checked)
                  }
                  label={
                    selectedStageLiveGeneration ? 'Enabled' : 'Disabled'
                  }
                  disabled={
                    !characterId ||
                    updateScenarioMutation.isPending ||
                    liveGenerationStage === selectedStage
                  }
                />
              </div>
            </div>
          </div>
        </div>
        {showVideos ? (
          <>
            {/* {isX ? ( */}
              <ScenarioVideosV2Section
                characterId={characterId}
                scenarioId={scenario.id}
                videos={scenario.videos ?? []}
                formatDate={formatDate}
              />
            {/* // ) : (
            //   <ScenarioVideosSection
            //     characterId={characterId}
            //     scenarioId={scenario.id}
            //     videos={scenario.videos ?? []}
            //     formatDate={formatDate}
            //   />
            )} */}
          </>
        ) : null}
      </Stack>

      <Drawer
        open={isPromoVideoDrawerOpen}
        title="Promo video"
        className={s.scenarioVideoDetailsDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closePromoVideoDrawer();
          } else {
            setIsPromoVideoDrawerOpen(true);
          }
        }}
      >
        <Stack gap="16px">
          {promoVideoPreviewUrl ? (
            <video
              className={s.scenarioVideoDetails}
              src={promoVideoPreviewUrl}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <div className={s.scenarioVideoDetailsPlaceholder}>
              <Typography variant="caption" tone="muted">
                No video
              </Typography>
            </div>
          )}

          <FileUpload
            label="Promo video"
            folder={FileDir.Public}
            accept={VIDEO_ACCEPT}
            value={promoVideoFile}
            onChange={(file) => {
              setPromoVideoFile(file);
              if (file?.id) {
                setPromoVideoShowErrors(false);
              }
            }}
            onError={(message) =>
              notifyError(new Error(message), 'Unable to upload video.')
            }
          />
          {promoVideoError ? (
            <Typography variant="caption" tone="danger">
              {promoVideoError}
            </Typography>
          ) : null}

          <div className={s.modalActions}>
            {scenario.promoVideo ? (
              <Button
                variant="ghost"
                tone="danger"
                onClick={() => setIsPromoVideoDeleteOpen(true)}
                disabled={updatePromoVideoMutation.isPending}
              >
                Delete
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={closePromoVideoDrawer}
              disabled={updatePromoVideoMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handlePromoVideoSave()}
              loading={updatePromoVideoMutation.isPending}
              disabled={updatePromoVideoMutation.isPending}
            >
              Save
            </Button>
          </div>
        </Stack>
      </Drawer>

      <Drawer
        open={isStageDrawerOpen}
        title={
          activeStage ? `Edit ${STAGE_LABELS[activeStage]} stage` : 'Edit stage'
        }
        className={s.stageDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeStageDrawer();
          } else {
            setIsStageDrawerOpen(true);
          }
        }}
      >
        <Stack gap="16px">
          <Field
            label="Tone and behavior"
            labelFor="stage-edit-tone"
            error={validationErrors.toneAndBehavior}
          >
            <Textarea
              id="stage-edit-tone"
              value={stageValues.toneAndBehavior}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  toneAndBehavior: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Goal"
            labelFor="stage-edit-goal"
            error={validationErrors.goal}
          >
            <Textarea
              id="stage-edit-goal"
              value={stageValues.goal}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  goal: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>

          <Field
            label="Restrictions"
            labelFor="stage-edit-restrictions"
            error={validationErrors.restrictions}
          >
            <Textarea
              id="stage-edit-restrictions"
              value={stageValues.restrictions}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  restrictions: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Environment"
            labelFor="stage-edit-environment"
            error={validationErrors.environment}
          >
            <Textarea
              id="stage-edit-environment"
              value={stageValues.environment}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  environment: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>

          <Field
            label="Character look"
            labelFor="stage-edit-look"
            error={validationErrors.characterLook}
          >
            <Textarea
              id="stage-edit-look"
              value={stageValues.characterLook}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  characterLook: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>

          <Field
            label="Escalation trigger"
            labelFor="stage-edit-trigger"
            error={validationErrors.escalationTrigger}
          >
            <Textarea
              id="stage-edit-trigger"
              value={stageValues.escalationTrigger}
              onChange={(event) =>
                setStageValues((prev) => ({
                  ...prev,
                  escalationTrigger: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>

          <Field
            label="Actions"
            hint="Optional stage-specific actions."
          >
            <Stack gap="12px">
              {stageValues.actions?.length ? (
                stageValues.actions.map((action, index) => (
                  <div
                    key={`stage-action-${index}`}
                    className={s.stageActionEditorItem}
                  >
                    <FormRow columns={2}>
                      <Field
                        label={`Type ${index + 1}`}
                        labelFor={`stage-edit-action-type-${index}`}
                      >
                        <Select
                          id={`stage-edit-action-type-${index}`}
                          size="sm"
                          options={stageActionTypeOptions}
                          value={action.type}
                          onChange={(value) =>
                            handleStageActionChange(
                              index,
                              'type',
                              value as StageActionType,
                            )
                          }
                          fullWidth
                          disabled={updateStageMutation.isPending}
                        />
                      </Field>
                      <Field
                        label={`Text ${index + 1}`}
                        labelFor={`stage-edit-action-text-${index}`}
                      >
                        <Input
                          id={`stage-edit-action-text-${index}`}
                          value={action.text}
                          onChange={(event) =>
                            handleStageActionChange(
                              index,
                              'text',
                              event.target.value,
                            )
                          }
                          fullWidth
                          disabled={updateStageMutation.isPending}
                        />
                      </Field>
                    </FormRow>
                    <div className={s.stageActionEditorActions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        tone="danger"
                        onClick={() => handleStageActionRemove(index)}
                        disabled={updateStageMutation.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <Typography variant="caption" tone="muted">
                  No actions added.
                </Typography>
              )}

              <ButtonGroup>
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<PlusIcon />}
                  onClick={handleStageActionAdd}
                  disabled={updateStageMutation.isPending}
                >
                  Add action
                </Button>
              </ButtonGroup>
            </Stack>
          </Field>

          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeStageDrawer}
              disabled={updateStageMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStageSave}
              loading={updateStageMutation.isPending}
              disabled={!isStageValid || updateStageMutation.isPending}
            >
              Save
            </Button>
          </div>
        </Stack>
      </Drawer>

      <Drawer
        open={isGiftAddDrawerOpen}
        title={`Add gift for ${STAGE_LABELS[selectedStage]}`}
        className={s.giftDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeGiftAddDrawer();
          } else {
            setIsGiftAddDrawerOpen(true);
          }
        }}
      >
        <Stack gap="16px">
          <Field
            label="Gift"
            labelFor="stage-gift-create"
            error={giftValidationErrors.giftId}
          >
            <Select
              id="stage-gift-create"
              size="sm"
              options={giftOptions}
              value={giftValues.giftId}
              placeholder={isGiftsLoading ? 'Loading gifts...' : 'Select gift'}
              onChange={(value) =>
                setGiftValues((prev) => ({
                  ...prev,
                  giftId: value,
                }))
              }
              fullWidth
              disabled={isGiftsLoading || createGiftMutation.isPending}
              invalid={Boolean(giftValidationErrors.giftId)}
            />
          </Field>
          {giftsError ? (
            <Typography variant="caption" tone="warning">
              {giftsError instanceof Error
                ? giftsError.message
                : 'Unable to load gifts.'}
            </Typography>
          ) : null}
          <Field
            label="Reason"
            labelFor="stage-gift-create-reason"
            error={giftValidationErrors.reason}
          >
            <Textarea
              id="stage-gift-create-reason"
              value={giftValues.reason}
              onChange={(event) =>
                setGiftValues((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
              rows={2}
              fullWidth
              invalid={Boolean(giftValidationErrors.reason)}
            />
          </Field>
          <Field label="Buy text" labelFor="stage-gift-create-buy-text">
            <Textarea
              id="stage-gift-create-buy-text"
              value={giftValues.buyText}
              onChange={(event) =>
                setGiftValues((prev) => ({
                  ...prev,
                  buyText: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>
          <FileUpload
            label="Bought image"
            folder={FileDir.Public}
            value={giftFile}
            onChange={(file) => {
              setGiftFile(file);
              setGiftValues((prev) => ({
                ...prev,
                boughtImgId: file?.id ?? '',
              }));
            }}
            onError={(message) =>
              notifyError(new Error(message), 'Unable to upload image.')
            }
          />
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeGiftAddDrawer}
              disabled={createGiftMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGiftAdd}
              loading={createGiftMutation.isPending}
              disabled={!isGiftValid || createGiftMutation.isPending}
            >
              Save
            </Button>
          </div>
        </Stack>
      </Drawer>

      <Drawer
        open={isGiftEditDrawerOpen}
        title={`Edit gift for ${STAGE_LABELS[selectedStage]}`}
        className={s.giftDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeGiftEditDrawer();
          } else {
            setIsGiftEditDrawerOpen(true);
          }
        }}
      >
        <Stack gap="16px">
          <Field
            label="Reason"
            labelFor="stage-gift-edit-reason"
            error={giftEditValidationErrors.reason}
          >
            <Textarea
              id="stage-gift-edit-reason"
              value={giftEditValues.reason}
              onChange={(event) =>
                setGiftEditValues((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
              rows={2}
              fullWidth
              invalid={Boolean(giftEditValidationErrors.reason)}
            />
          </Field>
          <Field label="Buy text" labelFor="stage-gift-edit-buy-text">
            <Textarea
              id="stage-gift-edit-buy-text"
              value={giftEditValues.buyText}
              onChange={(event) =>
                setGiftEditValues((prev) => ({
                  ...prev,
                  buyText: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>
          <FileUpload
            label="Bought image"
            folder={FileDir.Public}
            value={giftEditFile}
            onChange={(file) => {
              setGiftEditFile(file);
              setGiftEditValues((prev) => ({
                ...prev,
                boughtImgId: file?.id ?? '',
              }));
            }}
            onError={(message) =>
              notifyError(new Error(message), 'Unable to upload image.')
            }
          />
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeGiftEditDrawer}
              disabled={updateGiftMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGiftEdit}
              loading={updateGiftMutation.isPending}
              disabled={!isGiftEditValid || updateGiftMutation.isPending}
            >
              Save
            </Button>
          </div>
        </Stack>
      </Drawer>

      <ConfirmModal
        open={isPromoVideoDeleteOpen}
        title="Delete promo video?"
        description="This will remove the promo video from this scenario."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={updatePromoVideoMutation.isPending}
        onConfirm={handlePromoVideoDelete}
        onClose={() => {
          if (updatePromoVideoMutation.isPending) return;
          setIsPromoVideoDeleteOpen(false);
        }}
      />

      <ConfirmModal
        open={Boolean(giftToDeleteId)}
        title="Delete gift?"
        description="This will remove the gift from this stage."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteGiftMutation.isPending}
        onConfirm={handleGiftDelete}
        onClose={closeGiftDeleteModal}
      />
    </div>
  );
}
