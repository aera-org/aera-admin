import { useCallback, useEffect, useMemo, useState } from 'react';

import { useCharacterDetails, useCharacters } from '@/app/characters';
import { useCreatePostText } from '@/app/posts';
import { Button, Field, FormRow, Select, Textarea } from '@/atoms';
import { formatCharacterSelectLabel } from '@/common/utils';
import {
  Drawer,
  SearchSelect,
  type SearchSelectOption,
} from '@/components/molecules';

import s from './PostsTextCreateDrawer.module.scss';

type PostsTextCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCharacterId?: string;
  initialScenarioId?: string;
};

type CreateValues = {
  characterId: string;
  scenarioId: string;
  value: string;
  note: string;
};

const CHARACTER_LIST_LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function buildCharacterValueLabel(
  options: SearchSelectOption[],
  value: string,
) {
  return options.find((option) => option.id === value)?.label;
}

export function PostsTextCreateDrawer({
  open,
  onOpenChange,
  initialCharacterId = '',
  initialScenarioId = '',
}: PostsTextCreateDrawerProps) {
  const [characterSearch, setCharacterSearch] = useState('');
  const [createValues, setCreateValues] = useState<CreateValues>({
    characterId: '',
    scenarioId: '',
    value: '',
    note: '',
  });
  const [showErrors, setShowErrors] = useState(false);

  const debouncedCharacterSearch = useDebouncedValue(
    characterSearch,
    SEARCH_DEBOUNCE_MS,
  );
  const normalizedCharacterSearch = debouncedCharacterSearch.trim();

  const characterQueryParams = useMemo(
    () => ({
      search: normalizedCharacterSearch || undefined,
      order: 'ASC',
      skip: 0,
      take: CHARACTER_LIST_LIMIT,
    }),
    [normalizedCharacterSearch],
  );

  const { data: characterData, isLoading: isCharactersLoading } =
    useCharacters(characterQueryParams);
  const { data: selectedCharacterDetails, isLoading: isScenariosLoading } =
    useCharacterDetails(createValues.characterId || null);
  const createMutation = useCreatePostText();
  const isBusy = createMutation.isPending;

  const characterOptions = useMemo(
    () =>
      (characterData?.data ?? []).map((character) => ({
        id: character.id,
        label: formatCharacterSelectLabel(character.name, character.type),
      })),
    [characterData?.data],
  );

  const scenarioOptions = useMemo(
    () =>
      (selectedCharacterDetails?.scenarios ?? []).map((scenario) => ({
        label: scenario.name || 'Untitled',
        value: scenario.id,
      })),
    [selectedCharacterDetails?.scenarios],
  );

  const resetState = useCallback(() => {
    setCharacterSearch('');
    setCreateValues({
      characterId: initialCharacterId,
      scenarioId: initialScenarioId,
      value: '',
      note: '',
    });
    setShowErrors(false);
  }, [initialCharacterId, initialScenarioId]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      resetState();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, resetState]);

  useEffect(() => {
    if (!createValues.scenarioId) return;
    if (createValues.characterId && (isScenariosLoading || !selectedCharacterDetails)) {
      return;
    }
    const exists = scenarioOptions.some(
      (option) => option.value === createValues.scenarioId,
    );
    if (!exists) {
      const timer = window.setTimeout(() => {
        setCreateValues((prev) => ({ ...prev, scenarioId: '' }));
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [
    createValues.characterId,
    createValues.scenarioId,
    isScenariosLoading,
    scenarioOptions,
    selectedCharacterDetails,
  ]);

  const errors = useMemo(() => {
    if (!showErrors) return {};

    return {
      characterId: createValues.characterId ? undefined : 'Select a character.',
      scenarioId: createValues.scenarioId ? undefined : 'Select a scenario.',
      value: createValues.value.trim() ? undefined : 'Enter text.',
    };
  }, [
    createValues.characterId,
    createValues.scenarioId,
    createValues.value,
    showErrors,
  ]);

  const characterValueLabel = useMemo(
    () =>
      buildCharacterValueLabel(characterOptions, createValues.characterId) ??
      (selectedCharacterDetails
        ? formatCharacterSelectLabel(
            selectedCharacterDetails.name,
            selectedCharacterDetails.type,
          )
        : undefined),
    [characterOptions, createValues.characterId, selectedCharacterDetails],
  );

  const handleSave = async () => {
    if (
      !createValues.characterId ||
      !createValues.scenarioId ||
      !createValues.value.trim()
    ) {
      setShowErrors(true);
      return;
    }

    try {
      await createMutation.mutateAsync({
        scenarioId: createValues.scenarioId,
        value: createValues.value.trim(),
        note: createValues.note.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
      setShowErrors(true);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isBusy) return;
        onOpenChange(nextOpen);
      }}
      title="Add text"
      className={s.drawer}
    >
      <div className={s.form}>
        <FormRow columns={2}>
          <Field
            label="Character"
            labelFor="post-text-create-character"
            error={errors.characterId}
          >
            <SearchSelect
              id="post-text-create-character"
              value={createValues.characterId}
              valueLabel={characterValueLabel}
              options={characterOptions}
              search={characterSearch}
              onSearchChange={setCharacterSearch}
              onSelect={(value) =>
                setCreateValues((prev) => ({
                  ...prev,
                  characterId: value,
                  scenarioId: '',
                }))
              }
              placeholder={
                isCharactersLoading ? 'Loading characters...' : 'Select character'
              }
              loading={isCharactersLoading}
              invalid={Boolean(errors.characterId)}
              disabled={isBusy}
            />
          </Field>

          <Field
            label="Scenario"
            labelFor="post-text-create-scenario"
            error={errors.scenarioId}
          >
            <Select
              id="post-text-create-scenario"
              size="sm"
              options={scenarioOptions}
              value={createValues.scenarioId}
              placeholder={
                createValues.characterId
                  ? isScenariosLoading
                    ? 'Loading scenarios...'
                    : 'Select scenario'
                  : 'Select character first'
              }
              onChange={(value) =>
                setCreateValues((prev) => ({
                  ...prev,
                  scenarioId: value,
                }))
              }
              fullWidth
              disabled={!createValues.characterId || isScenariosLoading || isBusy}
              invalid={Boolean(errors.scenarioId)}
            />
          </Field>
        </FormRow>

        <Field
          label="Text"
          labelFor="post-text-create-value"
          error={errors.value}
        >
          <Textarea
            id="post-text-create-value"
            size="sm"
            value={createValues.value}
            onChange={(event) =>
              setCreateValues((prev) => ({
                ...prev,
                value: event.target.value,
              }))
            }
            rows={8}
            fullWidth
            disabled={isBusy}
            invalid={Boolean(errors.value)}
          />
        </Field>

        <Field label="Note" labelFor="post-text-create-note">
          <Textarea
            id="post-text-create-note"
            size="sm"
            value={createValues.note}
            onChange={(event) =>
              setCreateValues((prev) => ({
                ...prev,
                note: event.target.value,
              }))
            }
            rows={2}
            fullWidth
            disabled={isBusy}
          />
        </Field>

        <div className={s.drawerActions}>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isBusy} disabled={isBusy}>
            Save
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
