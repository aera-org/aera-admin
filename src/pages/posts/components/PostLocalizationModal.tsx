import { useMemo, useState } from 'react';

import {
  Button,
  Checkbox,
  Field,
  Modal,
  Select,
  Stack,
  Typography,
} from '@/atoms';
import { Language } from '@/common/types';

import { getLanguageOptions } from '../postLocalization';
import s from './PostLocalizationModal.module.scss';

type PostLocalizationModalProps = {
  open: boolean;
  mode: 'single' | 'multiple';
  title: string;
  description: string;
  submitLabel: string;
  loading?: boolean;
  initialLanguage?: Language;
  initialLanguages?: Language[];
  onClose: () => void;
  onSubmit: (payload: { language: Language } | { languages: Language[] }) => Promise<void>;
};

export function PostLocalizationModal({
  open,
  mode,
  title,
  description,
  submitLabel,
  loading = false,
  initialLanguage,
  initialLanguages,
  onClose,
  onSubmit,
}: PostLocalizationModalProps) {
  const [language, setLanguage] = useState(initialLanguage ?? '');
  const [languages, setLanguages] = useState<Language[]>(initialLanguages ?? []);
  const [showErrors, setShowErrors] = useState(false);

  const options = useMemo(() => getLanguageOptions(), []);
  const languageError =
    showErrors && mode === 'single' && !language ? 'Select a language.' : undefined;
  const languagesError =
    showErrors && mode === 'multiple' && languages.length === 0
      ? 'Select at least one language.'
      : undefined;

  const handleSubmit = async () => {
    if (mode === 'single') {
      if (!language) {
        setShowErrors(true);
        return;
      }
      await onSubmit({ language: language as Language });
      return;
    }

    if (languages.length === 0) {
      setShowErrors(true);
      return;
    }
    await onSubmit({ languages });
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={() => {
        if (loading) return;
        onClose();
      }}
      actions={
        <div className={s.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={loading}>
            {submitLabel}
          </Button>
        </div>
      }
    >
      <Stack className={s.content} gap="12px">
        <Typography variant="body" tone="muted">
          {description}
        </Typography>

        {mode === 'single' ? (
          <Field
            label="Language"
            labelFor="posts-localize-language"
            error={languageError}
          >
            <Select
              id="posts-localize-language"
              options={options}
              value={language}
              placeholder="Select language"
              onChange={setLanguage}
              fullWidth
              invalid={Boolean(languageError)}
              disabled={loading}
            />
          </Field>
        ) : (
          <Field label="Languages" error={languagesError}>
            <div className={s.checkboxList}>
              {options.map((option) => {
                const checked = languages.includes(option.value as Language);
                return (
                  <Checkbox
                    key={option.value}
                    label={option.label}
                    checked={checked}
                    disabled={loading}
                    onChange={(event) => {
                      const nextLanguage = option.value as Language;
                      setLanguages((prev) =>
                        event.target.checked
                          ? [...prev, nextLanguage]
                          : prev.filter((item) => item !== nextLanguage),
                      );
                    }}
                  />
                );
              })}
            </div>
          </Field>
        )}
      </Stack>
    </Modal>
  );
}
