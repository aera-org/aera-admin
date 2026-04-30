import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useCharacterDetails, useDeleteCharacter } from '@/app/characters';
import { TrashIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import type { ICharacterDetails } from '@/common/types';
import { formatCharacterType } from '@/common/utils';
import { ConfirmModal, Drawer } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import {
  getBodyTypeLabel,
  getBreastSizeLabel,
  getEthnicityLabel,
  getEyeColorLabel,
  getHairColorLabel,
  getHairStyleLabel,
} from '../characters/characterAttributeOptions';
import s from '../characters/CharacterDetailsPage.module.scss';
import { ScenarioSection } from '../characters/components/ScenarioSection';

type CustomCharacterDetails = ICharacterDetails & {
  age?: number | null;
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

function formatAge(value: number | null | undefined) {
  if (!Number.isFinite(value)) return '-';
  return String(value);
}

export function CustomCharacterDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, isLoading, refetch } = useCharacterDetails(id ?? null);
  const deleteMutation = useDeleteCharacter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );

  const character = data as CustomCharacterDetails | undefined;
  const scenarios = useMemo(
    () => character?.scenarios ?? [],
    [character?.scenarios],
  );
  const effectiveSelectedScenarioId = useMemo(() => {
    if (!scenarios.length) return null;
    if (
      selectedScenarioId &&
      scenarios.some((scenario) => scenario.id === selectedScenarioId)
    ) {
      return selectedScenarioId;
    }
    return scenarios[0]?.id ?? null;
  }, [scenarios, selectedScenarioId]);

  const handleDelete = async () => {
    if (!character) return;
    await deleteMutation.mutateAsync(character.id);
    setIsDeleteOpen(false);
    navigate('/custom-characters');
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            {isLoading && !character ? (
              <Skeleton width={260} height={24} />
            ) : (
              <div className={s.titleRow}>
                <Typography variant="h2">
                  {character?.emoji ? (
                    <span className={s.emoji}>{character.emoji}</span>
                  ) : null}
                  {character?.name ?? 'Custom character'}
                </Typography>
                {character ? (
                  <Badge tone="success">
                    {formatCharacterType(character.type)}
                  </Badge>
                ) : null}
              </div>
            )}
            {isLoading && !character ? (
              <Skeleton width={320} height={12} />
            ) : (
              <Typography variant="meta" tone="muted">
                {character?.id ?? '-'}
              </Typography>
            )}
          </div>
          <div className={s.actions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/custom-characters')}
            >
              Back
            </Button>
            <Button
                  id="custom-character-user"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/users/${character?.userId}`)}
                >
                  User
                </Button>
            <IconButton
              aria-label="Delete custom character"
              icon={<TrashIcon />}
              tooltip="Delete custom character"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!character || deleteMutation.isPending}
            />
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load custom character"
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

        <div className={s.section}>
          {character?.avatar?.url ? (
            <Button
              type="button"
              variant="ghost"
              className={s.avatarPreviewButton}
              onClick={() => setIsAvatarOpen(true)}
            >
              <img
                className={s.avatarPreviewImage}
                src={character.avatar.url}
                alt={`${character.name} avatar`}
                loading="lazy"
              />
            </Button>
          ) : (
            <div className={s.avatarPreviewPlaceholder}>
              <Typography variant="caption" tone="muted">
                No avatar
              </Typography>
            </div>
          )}
        </div>

        <div className={s.section}>
          <div className={s.sectionHeader}>
            <Typography variant="h3">Overview</Typography>
          </div>

          <FormRow columns={3}>
            <Field label="Name" labelFor="custom-character-name">
              <Typography id="custom-character-name" variant="body">
                {character?.name ?? '-'}
              </Typography>
            </Field>
            <Field label="Age" labelFor="custom-character-age">
              <Typography id="custom-character-age" variant="body">
                {formatAge(character?.age)}
              </Typography>
            </Field>
            <Field label="Type" labelFor="custom-character-type">
              <Typography id="custom-character-type" variant="body">
                {character ? formatCharacterType(character.type) : '-'}
              </Typography>
            </Field>
          </FormRow>

          <FormRow columns={3}>
            <Field label="Hair color" labelFor="custom-character-hair-color">
              <Typography id="custom-character-hair-color" variant="body">
                {getHairColorLabel(character?.hairColor)}
              </Typography>
            </Field>
            <Field label="Hair style" labelFor="custom-character-hair-style">
              <Typography id="custom-character-hair-style" variant="body">
                {getHairStyleLabel(character?.hairStyle)}
              </Typography>
            </Field>
            <Field label="Eye color" labelFor="custom-character-eye-color">
              <Typography id="custom-character-eye-color" variant="body">
                {getEyeColorLabel(character?.eyeColor)}
              </Typography>
            </Field>
          </FormRow>

          <FormRow columns={3}>
            <Field label="Ethnicity" labelFor="custom-character-ethnicity">
              <Typography id="custom-character-ethnicity" variant="body">
                {getEthnicityLabel(character?.ethnicity)}
              </Typography>
            </Field>
            <Field label="Body type" labelFor="custom-character-body-type">
              <Typography id="custom-character-body-type" variant="body">
                {getBodyTypeLabel(character?.bodyType)}
              </Typography>
            </Field>
            <Field label="Breast size" labelFor="custom-character-breast-size">
              <Typography id="custom-character-breast-size" variant="body">
                {getBreastSizeLabel(character?.breastSize)}
              </Typography>
            </Field>
          </FormRow>

          <FormRow columns={1}>
            <Field label="Created" labelFor="custom-character-created">
              <Typography id="custom-character-created" variant="body">
                {formatDate(character?.createdAt)}
              </Typography>
            </Field>
          </FormRow>
        </div>

        <ScenarioSection
          characterId={id ?? null}
          characterName={character?.name ?? ''}
          scenarios={scenarios}
          selectedScenarioId={effectiveSelectedScenarioId}
          onSelectScenario={setSelectedScenarioId}
          isLoading={Boolean(isLoading && !character)}
          formatDate={formatDate}
          allowEdit={false}
          allowStageEdit={false}
          showImportExport={false}
          showPromoImages={false}
          showStatus={false}
          showIsNew={false}
          showIsPromoted={false}
          showIsTop={false}
          useCustomCreate
        />

        <ConfirmModal
          open={isDeleteOpen}
          title="Delete custom character"
          description={
            character
              ? `Delete ${character.name}? This cannot be undone.`
              : 'Delete this custom character? This cannot be undone.'
          }
          confirmLabel="Delete"
          tone="danger"
          isConfirming={deleteMutation.isPending}
          onConfirm={handleDelete}
          onClose={() => setIsDeleteOpen(false)}
        />

        <Drawer
          open={isAvatarOpen}
          title="Avatar"
          className={s.avatarDrawer}
          onOpenChange={setIsAvatarOpen}
        >
          <Stack gap="16px">
            {character?.avatar?.url ? (
              <img
                className={s.avatarDrawerImage}
                src={character.avatar.url}
                alt={`${character.name} avatar`}
              />
            ) : (
              <div className={s.avatarPreviewPlaceholder}>
                <Typography variant="caption" tone="muted">
                  No avatar
                </Typography>
              </div>
            )}

            <Field label="Avatar prompt" labelFor="custom-character-avatar-prompt">
              <Typography
                id="custom-character-avatar-prompt"
                variant="body"
                className={s.multiline}
              >
                {character?.avatarPrompt?.trim() || '-'}
              </Typography>
            </Field>
          </Stack>
        </Drawer>

        {!character && !isLoading && !error ? (
          <EmptyState
            title="Custom character not found"
            description="We could not find this custom character."
          />
        ) : null}
      </Container>
    </AppShell>
  );
}
