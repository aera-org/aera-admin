import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useCallback, useMemo, useRef, useState } from 'react';

import {
  useCharacters,
  useCopyScenarioToCharacter,
  useCreateCustomScenario,
  useCreateScenario,
  useDeleteScenario,
  useUpdateScenario,
} from '@/app/characters';
import {
  addScenarioStageGift,
  createScenario as createScenarioApi,
  updateScenarioStage as updateScenarioStageApi,
} from '@/app/characters/charactersApi';
import { copyFile } from '@/app/files/filesApi';
import { getGifts } from '@/app/gifts';
import { notifyError, notifySuccess } from '@/app/toast';
import { DownloadIcon, PlusIcon, UploadIcon } from '@/assets/icons';
import {
  Button,
  ButtonGroup,
  EmptyState,
  Field,
  FormRow,
  IconButton,
  Input,
  Modal,
  Skeleton,
  Stack,
  Switch,
  Tabs,
  Textarea,
  Typography,
} from '@/atoms';
import {
  type CreateCustomScenarioDto,
  FileDir,
  type ICharacterDetails,
  type IFile,
  ScenarioCharacterTrait,
  type StageDirectives,
  STAGES_IN_ORDER,
} from '@/common/types';
import { formatCharacterSelectLabel } from '@/common/utils';
import { ConfirmModal, Drawer, FileUpload } from '@/components/molecules';
import { SearchSelect } from '@/components/molecules/search-select/SearchSelect';

import s from '../CharacterDetailsPage.module.scss';
import { ScenarioDetails } from './ScenarioDetails';
import {
  buildScenarioTransferFileName,
  buildScenarioTransferPayload,
  downloadScenarioTransferFile,
  parseScenarioTransferFile,
  type ScenarioTransferFile,
} from './scenarioTransfer';

type ScenarioSectionProps = {
  characterId: string | null;
  characterName: string;
  scenarios: ICharacterDetails['scenarios'];
  selectedScenarioId: string | null;
  onSelectScenario: (id: string | null) => void;
  isLoading: boolean;
  formatDate: (value: string | null | undefined) => string;
  allowEdit?: boolean;
  allowStageEdit?: boolean;
  showImportExport?: boolean;
  showPromoImages?: boolean;
  showStatus?: boolean;
  showIsNew?: boolean;
  showIsPromoted?: boolean;
  showIsTop?: boolean;
  useCustomCreate?: boolean;
};

const DEFAULT_CUSTOM_SCENARIO_FORM_VALUES: CreateCustomScenarioDto = {
  characterTraits: [],
  clothes: '',
  lingerie: '',
  description: '',
};

async function copyScenarioTransferFile(file: ScenarioTransferFile) {
  await copyFile({
    id: file.id,
    name: file.name,
    dir: file.dir,
    path: file.path,
    status: file.status,
    mime: file.mime,
    url: file.url ?? undefined,
  });
}

const SCENARIO_CHARACTER_TRAIT_LABELS: Record<ScenarioCharacterTrait, string> = {
  [ScenarioCharacterTrait.Playful]: 'Playful',
  [ScenarioCharacterTrait.Caring]: 'Caring',
  [ScenarioCharacterTrait.Shy]: 'Shy',
  [ScenarioCharacterTrait.Sassy]: 'Sassy',
  [ScenarioCharacterTrait.Mysterious]: 'Mysterious',
  [ScenarioCharacterTrait.Dominant]: 'Dominant',
  [ScenarioCharacterTrait.Submissive]: 'Submissive',
  [ScenarioCharacterTrait.Intellectual]: 'Intellectual',
  [ScenarioCharacterTrait.Hot]: 'Hot',
  [ScenarioCharacterTrait.Romantic]: 'Romantic',
};

const SCENARIO_CHARACTER_TRAIT_OPTIONS = Object.values(
  ScenarioCharacterTrait,
).map((value) => ({
  value,
  label: SCENARIO_CHARACTER_TRAIT_LABELS[value],
}));
const CUSTOM_SCENARIO_TRAITS_MAX = 3;

function isStageDirectivesEmpty(stage: StageDirectives) {
  return (
    !stage.toneAndBehavior.trim() &&
    !stage.restrictions.trim() &&
    !stage.environment.trim() &&
    !stage.characterLook.trim() &&
    !stage.goal.trim() &&
    !stage.escalationTrigger.trim()
  );
}

export function ScenarioSection({
  characterId,
  characterName,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  isLoading,
  formatDate,
  allowEdit = true,
  allowStageEdit = true,
  showImportExport = true,
  showPromoImages = true,
  showStatus = true,
  showIsNew = true,
  showIsPromoted = true,
  showIsTop = true,
  useCustomCreate = false,
}: ScenarioSectionProps) {
  const queryClient = useQueryClient();
  const createMutation = useCreateScenario();
  const copyMutation = useCopyScenarioToCharacter();
  const customCreateMutation = useCreateCustomScenario();
  const updateMutation = useUpdateScenario();
  const deleteMutation = useDeleteScenario();
  const isCreatePending = useCustomCreate
    ? customCreateMutation.isPending
    : createMutation.isPending;
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    ICharacterDetails['scenarios'][number] | null
  >(null);
  const [copyTarget, setCopyTarget] = useState<
    ICharacterDetails['scenarios'][number] | null
  >(null);
  const [copyValues, setCopyValues] = useState({
    targetCharacterId: '',
    slug: '',
  });
  const [copyCharacterSearch, setCopyCharacterSearch] = useState('');
  const [copyShowErrors, setCopyShowErrors] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [customShowErrors, setCustomShowErrors] = useState(false);
  const [editShowErrors, setEditShowErrors] = useState(false);
  const [formValues, setFormValues] = useState({
    name: '',
    emoji: '',
    slug: '',
    description: '',
    isActive: true,
    shortDescription: '',
    isNew: false,
    isPromoted: false,
    promoText: '',
    isTop: false,
    promoImgId: '',
    promoImgHorizontalId: '',
    personality: '',
    messagingStyle: '',
    appearance: '',
    situation: '',
    openingMessage: '',
    openingImageId: '',
  });
  const [customFormValues, setCustomFormValues] =
    useState<CreateCustomScenarioDto>(DEFAULT_CUSTOM_SCENARIO_FORM_VALUES);
  const [editValues, setEditValues] = useState(formValues);
  const [openingFile, setOpeningFile] = useState<IFile | null>(null);
  const [editOpeningFile, setEditOpeningFile] = useState<IFile | null>(null);
  const [promoFile, setPromoFile] = useState<IFile | null>(null);
  const [editPromoFile, setEditPromoFile] = useState<IFile | null>(null);
  const [promoHorizontalFile, setPromoHorizontalFile] = useState<IFile | null>(
    null,
  );
  const [editPromoHorizontalFile, setEditPromoHorizontalFile] =
    useState<IFile | null>(null);

  const scenarioTabs = scenarios.map((scenario) => ({
    value: scenario.id,
    label: scenario.name || 'Untitled',
  }));
  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;
  const { data: copyCharacterData, isLoading: isCopyCharactersLoading } =
    useCharacters(
      {
        search: copyCharacterSearch.trim() || undefined,
        order: 'ASC',
        skip: 0,
        take: 20,
      },
      { enabled: Boolean(copyTarget) },
    );
  const copyCharacterOptions = useMemo(
    () =>
      (copyCharacterData?.data ?? [])
        .filter((character) => character.id !== characterId)
        .map((character) => ({
          id: character.id,
          label: formatCharacterSelectLabel(character.name, character.type),
          meta: character.id,
        })),
    [characterId, copyCharacterData?.data],
  );

  const getBaseErrors = useCallback((values: typeof formValues) => {
    const errors: Record<string, string> = {};
    if (!values.name.trim()) errors.name = 'Enter a name.';
    if (!values.emoji.trim()) errors.emoji = 'Enter an emoji.';
    if (!values.description.trim()) errors.description = 'Enter a description.';
    if (!values.personality.trim()) errors.personality = 'Enter a personality.';
    if (!values.messagingStyle.trim())
      errors.messagingStyle = 'Enter a messaging style.';
    if (!values.appearance.trim()) errors.appearance = 'Enter an appearance.';
    if (!values.situation.trim()) errors.situation = 'Enter a situation.';
    if (!values.openingMessage.trim())
      errors.openingMessage = 'Enter an opening message.';
    return errors;
  }, []);

  const getCreateErrors = useCallback(
    (values: typeof formValues) => {
      const errors = getBaseErrors(values);
      if (!values.openingImageId) errors.openingImageId = 'Upload an image.';
      return errors;
    },
    [getBaseErrors],
  );

  const getCustomErrors = useCallback((values: CreateCustomScenarioDto) => {
    const errors: Record<string, string> = {};
    if (values.characterTraits.length === 0) {
      errors.characterTraits = 'Select at least one trait.';
    }
    if (values.characterTraits.length > CUSTOM_SCENARIO_TRAITS_MAX) {
      errors.characterTraits = `Select up to ${CUSTOM_SCENARIO_TRAITS_MAX} traits.`;
    }
    if (!values.clothes.trim()) errors.clothes = 'Enter clothes.';
    if (!values.lingerie.trim()) errors.lingerie = 'Enter lingerie.';
    if (!values.description.trim()) {
      errors.description = 'Enter a description.';
    }
    return errors;
  }, []);

  const validationErrors = useMemo(
    () => (showErrors ? getCreateErrors(formValues) : {}),
    [formValues, getCreateErrors, showErrors],
  );
  const customValidationErrors = useMemo(
    () => (customShowErrors ? getCustomErrors(customFormValues) : {}),
    [customFormValues, customShowErrors, getCustomErrors],
  );
  const editValidationErrors = useMemo(
    () => (editShowErrors ? getBaseErrors(editValues) : {}),
    [editShowErrors, editValues, getBaseErrors],
  );
  const copyValidationErrors = useMemo(() => {
    if (!copyShowErrors) return {};
    const errors: { targetCharacterId?: string; slug?: string } = {};
    if (!copyValues.targetCharacterId) {
      errors.targetCharacterId = 'Select a character.';
    } else if (copyValues.targetCharacterId === characterId) {
      errors.targetCharacterId = 'Select another character.';
    }
    if (!copyValues.slug.trim()) {
      errors.slug = 'Enter a slug.';
    }
    return errors;
  }, [
    characterId,
    copyShowErrors,
    copyValues.slug,
    copyValues.targetCharacterId,
  ]);

  const isValid = useMemo(
    () => Object.keys(getCreateErrors(formValues)).length === 0,
    [formValues, getCreateErrors],
  );
  const isCustomValid = useMemo(
    () => Object.keys(getCustomErrors(customFormValues)).length === 0,
    [customFormValues, getCustomErrors],
  );
  const isEditValid = useMemo(
    () => Object.keys(getBaseErrors(editValues)).length === 0,
    [editValues, getBaseErrors],
  );
  const isCopyValid = useMemo(
    () =>
      Boolean(
        copyValues.targetCharacterId &&
          copyValues.targetCharacterId !== characterId &&
          copyValues.slug.trim(),
      ),
    [characterId, copyValues.slug, copyValues.targetCharacterId],
  );

  const openCreateModal = () => {
    setFormValues({
      name: '',
      emoji: '',
      slug: '',
      description: '',
      isActive: true,
      shortDescription: '',
      isNew: false,
      isPromoted: false,
      promoText: '',
      isTop: false,
      promoImgId: '',
      promoImgHorizontalId: '',
      personality: '',
      messagingStyle: '',
      appearance: '',
      situation: '',
      openingMessage: '',
      openingImageId: '',
    });
    setOpeningFile(null);
    setPromoFile(null);
    setPromoHorizontalFile(null);
    setShowErrors(false);
    setCustomFormValues(DEFAULT_CUSTOM_SCENARIO_FORM_VALUES);
    setCustomShowErrors(false);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreatePending) return;
    setIsCreateOpen(false);
  };

  const openEditModal = () => {
    if (!selectedScenario) return;
    setEditValues({
      name: selectedScenario.name ?? '',
      emoji: selectedScenario.emoji ?? '',
      slug: selectedScenario.slug ?? '',
      description: selectedScenario.description ?? '',
      isActive: Boolean(selectedScenario.isActive),
      shortDescription: selectedScenario.shortDescription ?? '',
      isNew: showIsNew ? Boolean(selectedScenario.isNew) : false,
      isPromoted: showIsPromoted ? Boolean(selectedScenario.isPromoted) : false,
      promoText: showIsPromoted ? (selectedScenario.promoText ?? '') : '',
      isTop: showIsTop ? Boolean(selectedScenario.isTop) : false,
      promoImgId: showPromoImages ? (selectedScenario.promoImg?.id ?? '') : '',
      promoImgHorizontalId: showPromoImages
        ? (selectedScenario.promoImgHorizontal?.id ?? '')
        : '',
      personality: selectedScenario.personality ?? '',
      messagingStyle: selectedScenario.messagingStyle ?? '',
      appearance: selectedScenario.appearance ?? '',
      situation: selectedScenario.situation ?? '',
      openingMessage: selectedScenario.openingMessage ?? '',
      openingImageId: selectedScenario.openingImage?.id ?? '',
    });
    setEditOpeningFile(selectedScenario.openingImage ?? null);
    setEditPromoFile(showPromoImages ? (selectedScenario.promoImg ?? null) : null);
    setEditPromoHorizontalFile(
      showPromoImages ? (selectedScenario.promoImgHorizontal ?? null) : null,
    );
    setEditShowErrors(false);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (updateMutation.isPending) return;
    setIsEditOpen(false);
  };

  const openCopyModal = (
    scenario: ICharacterDetails['scenarios'][number],
  ) => {
    setCopyTarget(scenario);
    setCopyValues({
      targetCharacterId: '',
      slug: '',
    });
    setCopyCharacterSearch('');
    setCopyShowErrors(false);
  };

  const closeCopyModal = () => {
    if (copyMutation.isPending) return;
    setCopyTarget(null);
  };

  const handleCreate = async () => {
    if (!characterId) return;
    const errors = {
      name: formValues.name.trim() ? undefined : 'Enter a name.',
      emoji: formValues.emoji.trim() ? undefined : 'Enter an emoji.',
      description: formValues.description.trim()
        ? undefined
        : 'Enter a description.',
      personality: formValues.personality.trim()
        ? undefined
        : 'Enter a personality.',
      messagingStyle: formValues.messagingStyle.trim()
        ? undefined
        : 'Enter a messaging style.',
      appearance: formValues.appearance.trim()
        ? undefined
        : 'Enter an appearance.',
      situation: formValues.situation.trim() ? undefined : 'Enter a situation.',
      openingMessage: formValues.openingMessage.trim()
        ? undefined
        : 'Enter an opening message.',
      openingImageId: formValues.openingImageId
        ? undefined
        : 'Upload an image.',
    };
    if (Object.values(errors).some(Boolean)) {
      setShowErrors(true);
      return;
    }
    const result = await createMutation.mutateAsync({
      characterId,
      payload: {
        name: formValues.name.trim(),
        emoji: formValues.emoji.trim(),
        slug: formValues.slug.trim() || undefined,
        description: formValues.description.trim(),
        shortDescription: formValues.shortDescription.trim() || undefined,
        isNew: showIsNew ? formValues.isNew : undefined,
        promoImgId: showPromoImages
          ? formValues.promoImgId || undefined
          : undefined,
        promoImgHorizontalId: showPromoImages
          ? formValues.promoImgHorizontalId || undefined
          : undefined,
        personality: formValues.personality.trim(),
        messagingStyle: formValues.messagingStyle.trim(),
        appearance: formValues.appearance.trim(),
        situation: formValues.situation.trim(),
        openingMessage: formValues.openingMessage.trim(),
        openingImageId: formValues.openingImageId,
      },
    });
    setIsCreateOpen(false);
    if (result?.id) {
      onSelectScenario(result.id);
    }
  };

  const handleCustomCreate = async () => {
    if (!characterId) return;

    const errors = getCustomErrors(customFormValues);
    if (Object.values(errors).some(Boolean)) {
      setCustomShowErrors(true);
      return;
    }

    const result = await customCreateMutation.mutateAsync({
      characterId,
      payload: {
        characterTraits: customFormValues.characterTraits,
        clothes: customFormValues.clothes.trim(),
        lingerie: customFormValues.lingerie.trim(),
        description: customFormValues.description.trim(),
      },
    });
    setIsCreateOpen(false);
    if (result?.id) {
      onSelectScenario(result.id);
    }
  };

  const handleEdit = async () => {
    if (!characterId || !selectedScenario) return;
    const errors = getBaseErrors(editValues);
    if (Object.values(errors).some(Boolean)) {
      setEditShowErrors(true);
      return;
    }
    await updateMutation.mutateAsync({
      characterId,
      scenarioId: selectedScenario.id,
      payload: {
        name: editValues.name.trim(),
        emoji: editValues.emoji.trim(),
        slug: editValues.slug.trim() || undefined,
        description: editValues.description.trim(),
        isActive: showStatus ? editValues.isActive : selectedScenario.isActive,
        shortDescription: editValues.shortDescription.trim() || undefined,
        isNew: showIsNew ? editValues.isNew : selectedScenario.isNew,
        isPromoted: showIsPromoted
          ? editValues.isPromoted
          : selectedScenario.isPromoted,
        promoText: showIsPromoted
          ? editValues.promoText.trim()
          : selectedScenario.promoText,
        isTop: showIsTop ? editValues.isTop : selectedScenario.isTop,
        promoImgId: showPromoImages
          ? editValues.promoImgId || undefined
          : selectedScenario.promoImg?.id,
        promoImgHorizontalId: showPromoImages
          ? editValues.promoImgHorizontalId || undefined
          : selectedScenario.promoImgHorizontal?.id,
        personality: editValues.personality.trim(),
        messagingStyle: editValues.messagingStyle.trim(),
        appearance: editValues.appearance.trim(),
        situation: editValues.situation.trim(),
        openingMessage: editValues.openingMessage.trim(),
        openingImageId: editValues.openingImageId || undefined,
      },
    });
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    if (!characterId || !deleteTarget) return;

    const nextScenario =
      scenarios.find((scenario) => scenario.id !== deleteTarget.id) ?? null;

    await deleteMutation.mutateAsync({
      characterId,
      scenarioId: deleteTarget.id,
    });

    setDeleteTarget(null);
    onSelectScenario(nextScenario?.id ?? null);
  };

  const handleCopyScenario = async () => {
    if (!characterId || !copyTarget) return;
    if (!isCopyValid) {
      setCopyShowErrors(true);
      return;
    }

    await copyMutation.mutateAsync({
      sourceCharacterId: characterId,
      targetCharacterId: copyValues.targetCharacterId,
      scenario: copyTarget,
      slug: copyValues.slug.trim(),
    });
    setCopyTarget(null);
  };

  const resolveGiftIdsByName = async (giftNames: string[]) => {
    const requiredNames = Array.from(
      new Set(giftNames.map((name) => name.trim()).filter(Boolean)),
    );
    if (requiredNames.length === 0) {
      return new Map<string, string>();
    }

    const giftsByName = new Map<string, string[]>();
    for (const name of requiredNames) {
      giftsByName.set(name, []);
    }

    let skip = 0;
    const take = 200;
    while (true) {
      const page = await getGifts({
        order: 'ASC',
        skip,
        take,
      });

      for (const gift of page.data) {
        const trimmedName = gift.name.trim();
        if (!trimmedName || !giftsByName.has(trimmedName)) {
          continue;
        }
        giftsByName.get(trimmedName)?.push(gift.id);
      }

      skip += page.data.length;
      if (skip >= page.total || page.data.length === 0) {
        break;
      }
    }

    const missing: string[] = [];
    const ambiguous: string[] = [];
    const resolved = new Map<string, string>();

    for (const name of requiredNames) {
      const ids = giftsByName.get(name) ?? [];
      if (ids.length === 0) {
        missing.push(name);
        continue;
      }
      if (ids.length > 1) {
        ambiguous.push(name);
        continue;
      }
      resolved.set(name, ids[0]);
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing gifts in target environment: ${missing.join(', ')}.`,
      );
    }
    if (ambiguous.length > 0) {
      throw new Error(
        `Gift names are not unique in target environment: ${ambiguous.join(', ')}.`,
      );
    }

    return resolved;
  };

  const handleExportScenario = async () => {
    if (!characterId || !selectedScenario) return;

    try {
      setIsExporting(true);
      const payload = buildScenarioTransferPayload({
        characterId,
        characterName,
        scenario: selectedScenario,
      });
      const fileName = buildScenarioTransferFileName(
        characterName,
        selectedScenario.name,
      );
      downloadScenarioTransferFile(payload, fileName);
      notifySuccess('Scenario exported.', 'Scenario exported.');
    } catch (error) {
      notifyError(error, 'Unable to export scenario.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportButtonClick = () => {
    if (!characterId || isImporting) return;
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file || !characterId) return;

    setIsImporting(true);
    try {
      const imported = await parseScenarioTransferFile(file);
      const scenarioPayload = imported.scenario;
      const requiredFields: Array<[string, string]> = [
        ['name', scenarioPayload.name],
        ['emoji', scenarioPayload.emoji],
        ['description', scenarioPayload.description],
        ['personality', scenarioPayload.personality],
        ['messagingStyle', scenarioPayload.messagingStyle],
        ['appearance', scenarioPayload.appearance],
        ['situation', scenarioPayload.situation],
        ['openingMessage', scenarioPayload.openingMessage],
      ];
      for (const [field, value] of requiredFields) {
        if (!value.trim()) {
          throw new Error(
            `Invalid import file: "scenario.${field}" must not be empty.`,
          );
        }
      }

      const giftIdsByName = await resolveGiftIdsByName(
        scenarioPayload.gifts.map((gift) => gift.giftName),
      );

      await copyScenarioTransferFile(scenarioPayload.openingImage);
      if (scenarioPayload.promoImg) {
        await copyScenarioTransferFile(scenarioPayload.promoImg);
      }
      if (scenarioPayload.promoImgHorizontal) {
        await copyScenarioTransferFile(scenarioPayload.promoImgHorizontal);
      }
      for (const gift of scenarioPayload.gifts) {
        if (gift.boughtImg) {
          await copyScenarioTransferFile(gift.boughtImg);
        }
      }

      const createdScenario = await createScenarioApi(characterId, {
        name: scenarioPayload.name.trim(),
        emoji: scenarioPayload.emoji.trim(),
        slug: scenarioPayload.slug?.trim() || undefined,
        description: scenarioPayload.description.trim(),
        isActive: scenarioPayload.isActive,
        shortDescription: scenarioPayload.shortDescription.trim() || undefined,
        isNew: scenarioPayload.isNew,
        promoImgId: scenarioPayload.promoImg?.id,
        promoImgHorizontalId: scenarioPayload.promoImgHorizontal?.id,
        personality: scenarioPayload.personality.trim(),
        messagingStyle: scenarioPayload.messagingStyle.trim(),
        appearance: scenarioPayload.appearance.trim(),
        situation: scenarioPayload.situation.trim(),
        openingMessage: scenarioPayload.openingMessage.trim(),
        openingImageId: scenarioPayload.openingImage.id,
      });

      for (const stage of STAGES_IN_ORDER) {
        const stagePayload = scenarioPayload.stages[stage];
        if (isStageDirectivesEmpty(stagePayload)) {
          continue;
        }
        await updateScenarioStageApi(
          characterId,
          createdScenario.id,
          stage,
          stagePayload,
        );
      }

      for (const gift of scenarioPayload.gifts) {
        const resolvedGiftId = giftIdsByName.get(gift.giftName.trim());
        if (!resolvedGiftId) {
          throw new Error(`Gift "${gift.giftName}" was not resolved.`);
        }
        await addScenarioStageGift(
          characterId,
          createdScenario.id,
          gift.stage,
          {
            giftId: resolvedGiftId,
            reason: gift.reason.trim(),
            buyText: gift.buyText,
            boughtImgId: gift.boughtImg?.id,
          },
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ['character', characterId],
      });
      onSelectScenario(createdScenario.id);
      notifySuccess('Scenario imported.', 'Scenario imported.');
    } catch (error) {
      notifyError(error, 'Unable to import scenario.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <Typography variant="h3">Scenarios</Typography>
        <ButtonGroup>
          {showImportExport ? (
            <>
              <IconButton
                aria-label="Export scenario"
                tooltip="Export scenario"
                icon={<DownloadIcon />}
                variant="ghost"
                size="sm"
                onClick={handleExportScenario}
                loading={isExporting}
                disabled={!characterId || !selectedScenario || isImporting}
              />
              <IconButton
                aria-label="Import scenario"
                tooltip="Import scenario"
                icon={<UploadIcon />}
                variant="ghost"
                size="sm"
                onClick={handleImportButtonClick}
                loading={isImporting}
                disabled={
                  !characterId ||
                  isExporting ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              />
            </>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<PlusIcon />}
            onClick={openCreateModal}
            disabled={!characterId || isImporting || isCreatePending}
          >
            New scenario
          </Button>
        </ButtonGroup>
        {showImportExport ? (
          <input
            ref={importInputRef}
            className={s.hiddenInput}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFileChange}
          />
        ) : null}
      </div>
      {isLoading ? (
        <Stack gap="16px">
          <Skeleton width="100%" height={160} />
        </Stack>
      ) : scenarios.length === 0 ? (
        <EmptyState
          title="No scenarios"
          description="This character has no scenarios yet."
        />
      ) : (
        <Stack gap="24px">
          <div className={s.scenarioTabs}>
            <Tabs
              items={scenarioTabs}
              value={selectedScenarioId ?? scenarioTabs[0]?.value ?? ''}
              onChange={onSelectScenario}
            />
          </div>

          {selectedScenario ? (
            <ScenarioDetails
              characterId={characterId}
              scenario={selectedScenario}
              formatDate={formatDate}
              onEdit={openEditModal}
              onCopy={() => openCopyModal(selectedScenario)}
              onDelete={() => setDeleteTarget(selectedScenario)}
              canEdit={Boolean(characterId && allowEdit)}
              canCopy={Boolean(
                characterId && selectedScenario && !copyMutation.isPending,
              )}
              canDelete={Boolean(characterId)}
              isDeleting={
                deleteMutation.isPending &&
                deleteTarget?.id === selectedScenario.id
              }
              allowEdit={allowEdit}
              allowStageEdit={allowStageEdit}
              showStatus={showStatus}
              showIsNew={showIsNew}
              showIsPromoted={showIsPromoted}
              showIsTop={showIsTop}
              showPromoImages={showPromoImages}
            />
          ) : null}
        </Stack>
      )}

      <Modal
        open={Boolean(copyTarget)}
        title="Copy scenario"
        onClose={closeCopyModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeCopyModal}
              disabled={copyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCopyScenario}
              loading={copyMutation.isPending}
              disabled={copyMutation.isPending}
            >
              Copy
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <Typography variant="body" tone="muted">
            Create this scenario for another character without images. Content,
            stages, and gifts will be copied.
          </Typography>
          <Field
            label="Character"
            labelFor="scenario-copy-character"
            error={copyValidationErrors.targetCharacterId}
          >
            <SearchSelect
              id="scenario-copy-character"
              value={copyValues.targetCharacterId}
              options={copyCharacterOptions}
              search={copyCharacterSearch}
              onSearchChange={setCopyCharacterSearch}
              onSelect={(value) => {
                setCopyValues((prev) => ({
                  ...prev,
                  targetCharacterId: value,
                }));
                setCopyShowErrors(false);
              }}
              placeholder="Select character"
              loading={isCopyCharactersLoading}
              invalid={Boolean(copyValidationErrors.targetCharacterId)}
              clearLabel="Clear"
            />
          </Field>
          <Field
            label="Slug"
            labelFor="scenario-copy-slug"
            error={copyValidationErrors.slug}
          >
            <Input
              id="scenario-copy-slug"
              size="sm"
              value={copyValues.slug}
              onChange={(event) => {
                setCopyValues((prev) => ({
                  ...prev,
                  slug: event.target.value,
                }));
                setCopyShowErrors(false);
              }}
              invalid={Boolean(copyValidationErrors.slug)}
              fullWidth
            />
          </Field>
        </Stack>
      </Modal>

      {!useCustomCreate ? (
        <Drawer
          open={isCreateOpen}
          title="New scenario"
          className={s.scenarioDrawer}
          onOpenChange={(open) => {
            if (!open) {
              closeCreateModal();
            } else {
              setIsCreateOpen(true);
            }
          }}
        >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Name"
              labelFor="scenario-create-name"
              error={validationErrors.name}
            >
              <Input
                id="scenario-create-name"
                size="sm"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
            <Field
              label="Emoji"
              labelFor="scenario-create-emoji"
              error={validationErrors.emoji}
            >
              <Input
                id="scenario-create-emoji"
                size="sm"
                value={formValues.emoji}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    emoji: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>

          {showIsNew ? (
            <FormRow columns={2}>
              <Field label="Slug" labelFor="scenario-create-slug">
                <Input
                  id="scenario-create-slug"
                  size="sm"
                  value={formValues.slug}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      slug: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                  fullWidth
                />
              </Field>
              <Field label="New" labelFor="scenario-create-is-new">
                <Switch
                  id="scenario-create-is-new"
                  checked={formValues.isNew}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      isNew: event.target.checked,
                    }))
                  }
                  label={formValues.isNew ? 'New' : 'Not new'}
                />
              </Field>
            </FormRow>
          ) : (
            <Field label="Slug" labelFor="scenario-create-slug">
              <Input
                id="scenario-create-slug"
                size="sm"
                value={formValues.slug}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    slug: event.target.value,
                  }))
                }
                placeholder="Optional"
                fullWidth
              />
            </Field>
          )}

          <Field
            label="Description"
            labelFor="scenario-create-description"
            error={validationErrors.description}
          >
            <Textarea
              id="scenario-create-description"
              value={formValues.description}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>
          <Field
            label="Short description"
            labelFor="scenario-create-short-description"
          >
            <Textarea
              id="scenario-create-short-description"
              value={formValues.shortDescription}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  shortDescription: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>

          <Field
            label="Personality"
            labelFor="scenario-create-personality"
            error={validationErrors.personality}
          >
            <Textarea
              id="scenario-create-personality"
              value={formValues.personality}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  personality: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Messaging style"
            labelFor="scenario-create-messaging-style"
            error={validationErrors.messagingStyle}
          >
            <Textarea
              id="scenario-create-messaging-style"
              value={formValues.messagingStyle}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  messagingStyle: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Appearance"
            labelFor="scenario-create-appearance"
            error={validationErrors.appearance}
          >
            <Textarea
              id="scenario-create-appearance"
              value={formValues.appearance}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  appearance: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Situation"
            labelFor="scenario-create-situation"
            error={validationErrors.situation}
          >
            <Textarea
              id="scenario-create-situation"
              value={formValues.situation}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  situation: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Opening message"
            labelFor="scenario-create-opening-message"
            error={validationErrors.openingMessage}
          >
            <Textarea
              id="scenario-create-opening-message"
              value={formValues.openingMessage}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  openingMessage: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <div>
            <FileUpload
              label="Opening image"
              folder={FileDir.Public}
              value={openingFile}
              onChange={(file) => {
                setOpeningFile(file);
                setFormValues((prev) => ({
                  ...prev,
                  openingImageId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
            {validationErrors.openingImageId ? (
              <Typography variant="caption" tone="warning">
                {validationErrors.openingImageId}
              </Typography>
            ) : null}
          </div>
          {showPromoImages ? (
            <FormRow columns={2}>
              <FileUpload
                label="Promo image"
                folder={FileDir.Public}
                value={promoFile}
                onChange={(file) => {
                  setPromoFile(file);
                  setFormValues((prev) => ({
                    ...prev,
                    promoImgId: file?.id ?? '',
                  }));
                }}
                onError={(message) =>
                  notifyError(new Error(message), 'Unable to upload image.')
                }
              />
              <FileUpload
                label="Promo image horizontal"
                folder={FileDir.Public}
                value={promoHorizontalFile}
                onChange={(file) => {
                  setPromoHorizontalFile(file);
                  setFormValues((prev) => ({
                    ...prev,
                    promoImgHorizontalId: file?.id ?? '',
                  }));
                }}
                onError={(message) =>
                  notifyError(new Error(message), 'Unable to upload image.')
                }
              />
            </FormRow>
          ) : null}

          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeCreateModal}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!isValid || createMutation.isPending}
            >
              Create
            </Button>
          </div>
        </Stack>
        </Drawer>
      ) : null}

      {useCustomCreate ? (
        <Drawer
          open={isCreateOpen}
          title="New scenario"
          className={s.scenarioDrawer}
          onOpenChange={(open) => {
            if (!open) {
              closeCreateModal();
            } else {
              setIsCreateOpen(true);
            }
          }}
        >
          <Stack gap="16px">
            <Field
              label="Character traits"
              error={customValidationErrors.characterTraits}
            >
              <ButtonGroup className={s.traitButtonGroup}>
                {SCENARIO_CHARACTER_TRAIT_OPTIONS.map((option) => {
                  const isChecked = customFormValues.characterTraits.includes(
                    option.value,
                  );
                  const isMaxSelected =
                    customFormValues.characterTraits.length >=
                    CUSTOM_SCENARIO_TRAITS_MAX;

                  return (
                    <Button
                      key={option.value}
                      variant={isChecked ? 'primary' : 'secondary'}
                      size="sm"
                      aria-pressed={isChecked}
                      disabled={!isChecked && isMaxSelected}
                      onClick={() =>
                        setCustomFormValues((prev) => ({
                          ...prev,
                          characterTraits: isChecked
                            ? prev.characterTraits.filter(
                                (value) => value !== option.value,
                              )
                            : Array.from(
                                new Set([
                                  ...prev.characterTraits,
                                  option.value,
                                ]),
                              ).slice(0, CUSTOM_SCENARIO_TRAITS_MAX),
                        }))
                      }
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </ButtonGroup>
            </Field>

            <FormRow columns={2}>
              <Field
                label="Clothes"
                labelFor="custom-scenario-create-clothes"
                error={customValidationErrors.clothes}
              >
                <Textarea
                  id="custom-scenario-create-clothes"
                  value={customFormValues.clothes}
                  onChange={(event) =>
                    setCustomFormValues((prev) => ({
                      ...prev,
                      clothes: event.target.value,
                    }))
                  }
                  rows={3}
                  fullWidth
                />
              </Field>
              <Field
                label="Lingerie"
                labelFor="custom-scenario-create-lingerie"
                error={customValidationErrors.lingerie}
              >
                <Textarea
                  id="custom-scenario-create-lingerie"
                  value={customFormValues.lingerie}
                  onChange={(event) =>
                    setCustomFormValues((prev) => ({
                      ...prev,
                      lingerie: event.target.value,
                    }))
                  }
                  rows={3}
                  fullWidth
                />
              </Field>
            </FormRow>

            <Field
              label="Description"
              labelFor="custom-scenario-create-description"
              error={customValidationErrors.description}
            >
              <Textarea
                id="custom-scenario-create-description"
                value={customFormValues.description}
                onChange={(event) =>
                  setCustomFormValues((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={4}
                fullWidth
              />
            </Field>

            <div className={s.modalActions}>
              <Button
                variant="secondary"
                onClick={closeCreateModal}
                disabled={customCreateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCustomCreate}
                loading={customCreateMutation.isPending}
                disabled={!isCustomValid || customCreateMutation.isPending}
              >
                Create
              </Button>
            </div>
          </Stack>
        </Drawer>
      ) : null}

      {allowEdit ? (
        <Drawer
          open={isEditOpen}
          title="Edit scenario"
          className={s.scenarioDrawer}
          onOpenChange={(open) => {
            if (!open) {
              closeEditModal();
            } else {
              setIsEditOpen(true);
            }
          }}
        >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Name"
              labelFor="scenario-edit-name"
              error={editValidationErrors.name}
            >
              <Input
                id="scenario-edit-name"
                size="sm"
                value={editValues.name}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
            <Field
              label="Emoji"
              labelFor="scenario-edit-emoji"
              error={editValidationErrors.emoji}
            >
              <Input
                id="scenario-edit-emoji"
                size="sm"
                value={editValues.emoji}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    emoji: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>

          <FormRow columns={3}>
            <Field label="Slug" labelFor="scenario-edit-slug">
              <Input
                id="scenario-edit-slug"
                size="sm"
                value={editValues.slug}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    slug: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
            <Field label="Status" labelFor="scenario-edit-is-active">
              <Switch
                id="scenario-edit-is-active"
                checked={editValues.isActive}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    isActive: event.target.checked,
                  }))
                }
                label={editValues.isActive ? 'Active' : 'Inactive'}
              />
            </Field>
            <Field label="New" labelFor="scenario-edit-is-new">
              <Switch
                id="scenario-edit-is-new"
                checked={editValues.isNew}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    isNew: event.target.checked,
                  }))
                }
                label={editValues.isNew ? 'New' : 'Not new'}
              />
            </Field>
          </FormRow>

          {showIsPromoted ? (
            <>
              <Field label="Promoted" labelFor="scenario-edit-is-promoted">
                <Switch
                  id="scenario-edit-is-promoted"
                  checked={editValues.isPromoted}
                  onChange={(event) =>
                    setEditValues((prev) => ({
                      ...prev,
                      isPromoted: event.target.checked,
                    }))
                  }
                  label={editValues.isPromoted ? 'Promoted' : 'Not promoted'}
                />
              </Field>
              <Field label="Promo text" labelFor="scenario-edit-promo-text">
                <Textarea
                  id="scenario-edit-promo-text"
                  value={editValues.promoText}
                  onChange={(event) =>
                    setEditValues((prev) => ({
                      ...prev,
                      promoText: event.target.value,
                    }))
                  }
                  rows={2}
                  fullWidth
                />
              </Field>
            </>
          ) : null}

          {showIsTop ? (
            <Field label="Top" labelFor="scenario-edit-is-top">
              <Switch
                id="scenario-edit-is-top"
                checked={editValues.isTop}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    isTop: event.target.checked,
                  }))
                }
                label={editValues.isTop ? 'Top' : 'Not top'}
              />
            </Field>
          ) : null}

          <Field
            label="Description"
            labelFor="scenario-edit-description"
            error={editValidationErrors.description}
          >
            <Textarea
              id="scenario-edit-description"
              value={editValues.description}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>
          <Field
            label="Short description"
            labelFor="scenario-edit-short-description"
          >
            <Textarea
              id="scenario-edit-short-description"
              value={editValues.shortDescription}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  shortDescription: event.target.value,
                }))
              }
              rows={2}
              fullWidth
            />
          </Field>

          <Field
            label="Personality"
            labelFor="scenario-edit-personality"
            error={editValidationErrors.personality}
          >
            <Textarea
              id="scenario-edit-personality"
              value={editValues.personality}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  personality: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Messaging style"
            labelFor="scenario-edit-messaging-style"
            error={editValidationErrors.messagingStyle}
          >
            <Textarea
              id="scenario-edit-messaging-style"
              value={editValues.messagingStyle}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  messagingStyle: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Appearance"
            labelFor="scenario-edit-appearance"
            error={editValidationErrors.appearance}
          >
            <Textarea
              id="scenario-edit-appearance"
              value={editValues.appearance}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  appearance: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Situation"
            labelFor="scenario-edit-situation"
            error={editValidationErrors.situation}
          >
            <Textarea
              id="scenario-edit-situation"
              value={editValues.situation}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  situation: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <Field
            label="Opening message"
            labelFor="scenario-edit-opening-message"
            error={editValidationErrors.openingMessage}
          >
            <Textarea
              id="scenario-edit-opening-message"
              value={editValues.openingMessage}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  openingMessage: event.target.value,
                }))
              }
              rows={3}
              fullWidth
            />
          </Field>

          <div>
            <FileUpload
              label="Opening image"
              folder={FileDir.Public}
              value={editOpeningFile}
              onChange={(file) => {
                setEditOpeningFile(file);
                setEditValues((prev) => ({
                  ...prev,
                  openingImageId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
            {editValidationErrors.openingImageId ? (
              <Typography variant="caption" tone="warning">
                {editValidationErrors.openingImageId}
              </Typography>
            ) : null}
          </div>
          <FormRow columns={2}>
            <FileUpload
              label="Promo image"
              folder={FileDir.Public}
              value={editPromoFile}
              onChange={(file) => {
                setEditPromoFile(file);
                setEditValues((prev) => ({
                  ...prev,
                  promoImgId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
            <FileUpload
              label="Promo image horizontal"
              folder={FileDir.Public}
              value={editPromoHorizontalFile}
              onChange={(file) => {
                setEditPromoHorizontalFile(file);
                setEditValues((prev) => ({
                  ...prev,
                  promoImgHorizontalId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
          </FormRow>

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
              disabled={!isEditValid || updateMutation.isPending}
            >
              Save
            </Button>
          </div>
        </Stack>
        </Drawer>
      ) : null}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete scenario?"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.name || 'Untitled'}? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
