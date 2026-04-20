import { useMemo, useState } from 'react';

import {
  useCreateScenarioStageGift,
  useDeleteScenarioStageGift,
  useUpdateScenario,
  useUpdateScenarioStage,
  useUpdateScenarioStageGift,
} from '@/app/characters';
import { useGifts } from '@/app/gifts';
import { notifyError } from '@/app/toast';
import { PencilLineIcon, TrashIcon } from '@/assets/icons';
import {
  Badge,
  Button,
  Field,
  FormRow,
  IconButton,
  Select,
  Stack,
  Switch,
  Textarea,
  Typography,
} from '@/atoms';
import {
  FileDir,
  type ICharacterDetails,
  type IFile,
  RoleplayStage,
  type StageDirectives,
  STAGES_IN_ORDER,
} from '@/common/types';
import { ConfirmModal, Drawer, FileUpload } from '@/components/molecules';

import s from '../CharacterDetailsPage.module.scss';

type ScenarioDetailsProps = {
  characterId: string | null;
  scenario: ICharacterDetails['scenarios'][number];
  formatDate: (value: string | null | undefined) => string;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  allowEdit?: boolean;
  allowStageEdit?: boolean;
  showStatus?: boolean;
  showIsNew?: boolean;
  showPromoImages?: boolean;
};

const EMPTY_STAGE: StageDirectives = {
  toneAndBehavior: '',
  restrictions: '',
  environment: '',
  characterLook: '',
  goal: '',
  escalationTrigger: '',
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

function buildStagePayload(
  stage: StageDirectives,
) {
  return {
    toneAndBehavior: stage.toneAndBehavior?.trim() ?? '',
    restrictions: stage.restrictions?.trim() ?? '',
    environment: stage.environment?.trim() ?? '',
    characterLook: stage.characterLook?.trim() ?? '',
    goal: stage.goal?.trim() ?? '',
    escalationTrigger: stage.escalationTrigger?.trim() ?? '',
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
    description: scenario.description.trim(),
    isActive: scenario.isActive,
    shortDescription: scenario.shortDescription?.trim() || undefined,
    isNew: scenario.isNew,
    promoImgId: scenario.promoImg?.id,
    promoImgHorizontalId: scenario.promoImgHorizontal?.id,
    personality: scenario.personality.trim(),
    messagingStyle: scenario.messagingStyle.trim(),
    appearance: scenario.appearance.trim(),
    situation: scenario.situation.trim(),
    openingMessage: scenario.openingMessage.trim(),
    openingImageId: scenario.openingImage?.id,
    liveGenerations: {
      stages: nextLiveGenerationStages,
    },
  };
}

export function ScenarioDetails({
  characterId,
  scenario,
  formatDate,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  isDeleting,
  allowEdit = true,
  allowStageEdit = true,
  showStatus = true,
  showIsNew = true,
  showPromoImages = true,
}: ScenarioDetailsProps) {
  const updateScenarioMutation = useUpdateScenario();
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
  const [stageValues, setStageValues] = useState<StageDirectives>(EMPTY_STAGE);
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

  const selectedStageContent = scenario.stages?.[selectedStage] ?? EMPTY_STAGE;
  const selectedStageLiveGeneration = Boolean(
    scenario.liveGenerations?.stages?.[selectedStage],
  );
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

  const openStageModal = (stage: RoleplayStage) => {
    const content = scenario.stages?.[stage] ?? EMPTY_STAGE;
    setStageValues({
      toneAndBehavior: content.toneAndBehavior ?? '',
      restrictions: content.restrictions ?? '',
      environment: content.environment ?? '',
      characterLook: content.characterLook ?? '',
      goal: content.goal ?? '',
      escalationTrigger: content.escalationTrigger ?? '',
    });
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
      payload: buildStagePayload(stageValues),
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
      boughtImgId: stageGift.boughtImage?.id ?? '',
    });
    setGiftEditFile(stageGift.boughtImage ?? null);
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
        {showStatus || showIsNew ? (
          <FormRow columns={2}>
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
          </FormRow>
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
                {stageGift?.boughtImage?.url ? (
                  <div className={s.stageGiftImageBlock}>
                    <Typography variant="caption" tone="muted">
                      Bought image
                    </Typography>
                    <img
                      className={s.stageGiftImage}
                      src={stageGift.boughtImage.url}
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
      </Stack>

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
