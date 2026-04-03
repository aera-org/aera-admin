import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useCharacters } from '@/app/characters';
import { useCreateScenarioGen } from '@/app/scenario-gen';
import { PlusIcon } from '@/assets/icons';
import {
  Alert,
  Button,
  Container,
  Field,
  FormRow,
  Input,
  Select,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import { formatCharacterSelectLabel } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './ScenarioGenCreatePage.module.scss';

type ScenarioGenCreateTemplate = {
  characterId: string;
  name: string;
  context: string;
};

export function ScenarioGenCreatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const createMutation = useCreateScenarioGen();
  const { data: charactersData, isLoading: areCharactersLoading } =
    useCharacters(
      {
        order: 'ASC',
        skip: 0,
        take: 500,
      },
      {
        placeholderData: (previousData) => previousData,
      },
    );

  const template = (
    location.state as { template?: ScenarioGenCreateTemplate } | null
  )?.template;

  const initialValues = useMemo(
    () => ({
      characterId: template?.characterId ?? '',
      name: template?.name ?? '',
      context: template?.context ?? '',
    }),
    [template],
  );

  const [values, setValues] = useState(initialValues);
  const [showErrors, setShowErrors] = useState(false);

  const characterOptions = useMemo(
    () =>
      (charactersData?.data ?? []).map((character) => ({
        label: formatCharacterSelectLabel(character.name, character.type),
        value: character.id,
      })),
    [charactersData?.data],
  );

  const errors = useMemo(() => {
    if (!showErrors) return {};
    return {
      characterId: values.characterId ? undefined : 'Select a character.',
      name: values.name.trim() ? undefined : 'Enter a name.',
      context: values.context.trim() ? undefined : 'Enter context.',
    };
  }, [showErrors, values.characterId, values.context, values.name]);

  const isValid = useMemo(
    () => Boolean(values.characterId && values.name.trim() && values.context.trim()),
    [values.characterId, values.context, values.name],
  );

  const handleCreate = async () => {
    const characterId = values.characterId;
    const name = values.name.trim();
    const context = values.context.trim();

    if (!characterId || !name || !context) {
      setShowErrors(true);
      return;
    }

    const result = await createMutation.mutateAsync({
      characterId,
      name,
      context,
    });

    navigate(`/scenario-gen/${result.id}`);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Generate scenario</Typography>
            <Typography variant="body" tone="muted">
              Create a new scenario draft from a source context. The generated
              result will open on its detail page for review.
            </Typography>
          </div>
          <Button variant="ghost" onClick={() => navigate('/scenario-gen')}>
            Back to Scenario Gen
          </Button>
        </div>

        {createMutation.error ? (
          <Alert
            title="Unable to generate scenario"
            description={
              createMutation.error instanceof Error
                ? createMutation.error.message
                : 'Please try again.'
            }
            tone="warning"
          />
        ) : null}

        <Stack gap="16px" className={s.form}>
          <FormRow columns={2}>
            <Field
              label="Character"
              labelFor="scenario-gen-create-character"
              error={errors.characterId}
            >
              <Select
                id="scenario-gen-create-character"
                size="sm"
                options={characterOptions}
                value={values.characterId}
                onChange={(value) =>
                  setValues((prev) => ({
                    ...prev,
                    characterId: value,
                  }))
                }
                placeholder={
                  areCharactersLoading ? 'Loading characters...' : 'Select character'
                }
                invalid={Boolean(errors.characterId)}
                fullWidth
              />
            </Field>

            <Field
              label="Name"
              labelFor="scenario-gen-create-name"
              error={errors.name}
            >
              <Input
                id="scenario-gen-create-name"
                size="sm"
                value={values.name}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                invalid={Boolean(errors.name)}
                fullWidth
              />
            </Field>
          </FormRow>

          <Field
            label="Context"
            labelFor="scenario-gen-create-context"
            error={errors.context}
            hint="Provide the source brief that the generator should transform into a scenario."
          >
            <Textarea
              id="scenario-gen-create-context"
              size="sm"
              value={values.context}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  context: event.target.value,
                }))
              }
              rows={18}
              invalid={Boolean(errors.context)}
              fullWidth
            />
          </Field>

          <div className={s.actions}>
            <Button
              variant="secondary"
              onClick={() => navigate('/scenario-gen')}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              iconLeft={<PlusIcon />}
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!isValid || createMutation.isPending}
            >
              Generate scenario
            </Button>
          </div>
        </Stack>
      </Container>
    </AppShell>
  );
}
