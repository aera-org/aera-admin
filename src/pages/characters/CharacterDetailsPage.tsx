import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useCharacterDetails, useDeleteCharacter } from '@/app/characters';
import { Alert, Button, Container, EmptyState, Stack } from '@/atoms';
import { ConfirmModal } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import s from './CharacterDetailsPage.module.scss';
import { CharacterHeader } from './components/CharacterHeader';
import { CharacterOverview } from './components/CharacterOverview';
import { CharacterEditDrawer } from './components/CharacterEditDrawer';
import { ScenarioSection } from './components/ScenarioSection';

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

function formatValue(value: string | null | undefined) {
  if (!value) return '-';
  const trimmed = value.trim();
  if (!trimmed) return '-';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function CharacterDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, isLoading, refetch } = useCharacterDetails(id ?? null);
  const deleteMutation = useDeleteCharacter();

  const scenarios = useMemo(() => data?.scenarios ?? [], [data?.scenarios]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
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

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDelete = async () => {
    if (!data) return;
    await deleteMutation.mutateAsync(data.id);
    setIsDeleteOpen(false);
    navigate('/characters');
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <CharacterHeader
          data={data}
          isLoading={isLoading}
          onDelete={() => setIsDeleteOpen(true)}
          canDelete={Boolean(data)}
          isDeleting={deleteMutation.isPending}
        />

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load character"
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

        <CharacterOverview
          data={data}
          formatDate={formatDate}
          formatValue={formatValue}
          loraLabel={data?.lora?.fileName || '-'}
          onEdit={() => setIsEditOpen(true)}
          canEdit={Boolean(data)}
        />
        <ScenarioSection
          characterId={id ?? null}
          characterName={data?.name ?? ''}
          scenarios={scenarios}
          selectedScenarioId={effectiveSelectedScenarioId}
          onSelectScenario={setSelectedScenarioId}
          isLoading={Boolean(isLoading && !data)}
          formatDate={formatDate}
        />

        <CharacterEditDrawer
          character={data ?? null}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />

        <ConfirmModal
          open={isDeleteOpen}
          title="Delete character"
          description={
            data
              ? `Delete ${data.name}? This cannot be undone.`
              : 'Delete this character? This cannot be undone.'
          }
          confirmLabel="Delete"
          tone="danger"
          isConfirming={deleteMutation.isPending}
          onConfirm={handleDelete}
          onClose={() => setIsDeleteOpen(false)}
        />

        {!data && !isLoading && !error ? (
          <EmptyState
            title="Character not found"
            description="We could not find this character."
          />
        ) : null}
      </Container>
    </AppShell>
  );
}
