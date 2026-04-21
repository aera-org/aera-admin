import { Cross1Icon } from '@radix-ui/react-icons';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { isApiRequestError } from '@/app/api/apiErrors';
import { useCharacterDetails, useCharacters } from '@/app/characters';
import { markFileUploaded, signUpload } from '@/app/files/filesApi';
import { useCreatePostImage } from '@/app/posts';
import { notifyError } from '@/app/toast';
import {
  Badge,
  Button,
  Field,
  FormRow,
  IconButton,
  Input,
  Select,
  Textarea,
  Typography,
} from '@/atoms';
import { FileDir, FileStatus, type IFile } from '@/common/types';
import { formatCharacterSelectLabel } from '@/common/utils';
import {
  Drawer,
  SearchSelect,
  type SearchSelectOption,
} from '@/components/molecules';

import s from './PostsImageCreateDrawer.module.scss';

type PostsImageCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCharacterId?: string;
  initialScenarioId?: string;
};

type CreateImageUploadItem = {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'uploading' | 'uploaded' | 'error';
  uploadedFile: IFile | null;
  message?: string;
};

type CreateValues = {
  characterId: string;
  scenarioId: string;
  note: string;
};

const CHARACTER_LIST_LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 300;
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
const ACCEPTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);
const EXTENSION_TO_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
} as const;

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function getFileExtension(name: string) {
  const parts = name.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

function isAcceptedImageFile(file: File) {
  if (ACCEPTED_MIME_TYPES.has(file.type)) {
    return true;
  }
  const extension = getFileExtension(file.name);
  return extension in EXTENSION_TO_MIME;
}

function resolveMimeType(file: File) {
  if (file.type) {
    return file.type;
  }
  const extension = getFileExtension(file.name);
  return (
    EXTENSION_TO_MIME[extension as keyof typeof EXTENSION_TO_MIME] ??
    'application/octet-stream'
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function resolveErrorMessage(error: unknown) {
  if (isApiRequestError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Request failed.';
}

function createUploadItemId() {
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    typeof window.crypto.randomUUID === 'function'
  ) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function uploadToPresigned(
  presigned: { url: string; fields: Record<string, string> },
  file: File,
) {
  const formData = new FormData();
  Object.entries(presigned.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);

  const uploadRes = await fetch(presigned.url, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error('Upload failed.');
  }
}

function buildCharacterValueLabel(
  options: SearchSelectOption[],
  value: string,
) {
  return options.find((option) => option.id === value)?.label;
}

export function PostsImageCreateDrawer({
  open,
  onOpenChange,
  initialCharacterId = '',
  initialScenarioId = '',
}: PostsImageCreateDrawerProps) {
  const [characterSearch, setCharacterSearch] = useState('');
  const [createValues, setCreateValues] = useState<CreateValues>({
    characterId: '',
    scenarioId: '',
    note: '',
  });
  const [createFile, setCreateFile] = useState<CreateImageUploadItem | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

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
  const createMutation = useCreatePostImage();

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

  const isUploadingFile = createFile?.status === 'uploading';
  const uploadedFile =
    createFile?.status === 'uploaded' ? createFile.uploadedFile : null;
  const isBusy = isCreating || isUploadingFile || createMutation.isPending;

  const resetState = useCallback(() => {
    setCharacterSearch('');
    setCreateValues({
      characterId: initialCharacterId,
      scenarioId: initialScenarioId,
      note: '',
    });
    setCreateFile(null);
    setIsCreating(false);
    setShowErrors(false);
    setFileInputKey((prev) => prev + 1);
  }, [initialCharacterId, initialScenarioId]);

  useEffect(() => {
    if (!open) return;
    resetState();
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
      setCreateValues((prev) => ({ ...prev, scenarioId: '' }));
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
      file: uploadedFile
        ? undefined
        : isUploadingFile
          ? 'Wait for the upload to finish.'
          : 'Upload an image.',
    };
  }, [
    createValues.characterId,
    createValues.scenarioId,
    isUploadingFile,
    showErrors,
    uploadedFile,
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

  const updateCreateFile = useCallback(
    (
      updater: (
        item: CreateImageUploadItem | null,
      ) => CreateImageUploadItem | null,
    ) => {
      setCreateFile((prev) => updater(prev));
    },
    [],
  );

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFileInputKey((prev) => prev + 1);

    if (!file || isBusy) {
      return;
    }

    const queuedItem: CreateImageUploadItem = {
      id: createUploadItemId(),
      fileName: file.name,
      fileSize: file.size,
      status: 'uploading',
      uploadedFile: null,
    };

    setCreateFile(queuedItem);

    if (!isAcceptedImageFile(file)) {
      updateCreateFile((current) =>
        current
          ? {
              ...current,
              status: 'error',
              message: 'Only PNG, JPG, JPEG, or WEBP files are allowed.',
            }
          : current,
      );
      return;
    }

    try {
      const mime = resolveMimeType(file);
      const { presigned, file: signedFile } = await signUpload({
        fileName: file.name,
        mime,
        folder: FileDir.Public,
      });

      await uploadToPresigned(presigned, file);
      const success = await markFileUploaded(signedFile.id);
      if (!success) {
        throw new Error('Unable to finalize upload.');
      }

      updateCreateFile((current) =>
        current
          ? {
              ...current,
              status: 'uploaded',
              uploadedFile: { ...signedFile, status: FileStatus.UPLOADED },
              message: undefined,
            }
          : current,
      );
    } catch (error) {
      updateCreateFile((current) =>
        current
          ? {
              ...current,
              status: 'error',
              message: resolveErrorMessage(error),
            }
          : current,
      );
      notifyError(error, 'Unable to upload the image.');
    }
  };

  const handleSave = async () => {
    if (!createValues.characterId || !createValues.scenarioId || !uploadedFile) {
      setShowErrors(true);
      return;
    }

    setIsCreating(true);

    try {
      await createMutation.mutateAsync({
        fileId: uploadedFile.id,
        scenarioId: createValues.scenarioId,
        note: createValues.note.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
      setShowErrors(true);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isBusy) return;
        onOpenChange(nextOpen);
      }}
      title="Add image"
      className={s.drawer}
    >
      <div className={s.form}>
        <FormRow columns={2}>
          <Field
            label="Character"
            labelFor="post-image-create-character"
            error={errors.characterId}
          >
            <SearchSelect
              id="post-image-create-character"
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
            labelFor="post-image-create-scenario"
            error={errors.scenarioId}
          >
            <Select
              id="post-image-create-scenario"
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

        <Field label="Note" labelFor="post-image-create-note">
          <Textarea
            id="post-image-create-note"
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

        <Field label="Image file" error={errors.file}>
          <div className={s.uploadActions}>
            <Button
              variant="secondary"
              onClick={() => {
                if (isBusy) return;
                const element = document.getElementById(
                  'post-image-create-file',
                );
                if (element instanceof HTMLInputElement) {
                  element.click();
                }
              }}
              disabled={isBusy}
            >
              Choose image
            </Button>
            <Typography variant="meta" tone="muted">
              {isUploadingFile
                ? 'Uploading image...'
                : uploadedFile
                  ? '1 uploaded'
                  : 'No file uploaded'}
            </Typography>
          </div>

          {createFile ? (
            <div className={s.uploadItem}>
              <div className={s.uploadRow}>
                <div className={s.uploadMeta}>
                  <Typography variant="body" truncate>
                    {createFile.fileName}
                  </Typography>
                  <Typography variant="caption" tone="muted">
                    {formatFileSize(createFile.fileSize)}
                  </Typography>
                </div>
                <div className={s.uploadActionsRight}>
                  {createFile.status === 'uploaded' ? (
                    <Badge tone="success">Uploaded</Badge>
                  ) : createFile.status === 'uploading' ? (
                    <Badge tone="accent">Uploading</Badge>
                  ) : (
                    <Badge tone="warning">Failed</Badge>
                  )}
                  <IconButton
                    aria-label="Remove image file"
                    tooltip="Remove"
                    variant="ghost"
                    tone="danger"
                    size="sm"
                    icon={<Cross1Icon />}
                    disabled={isUploadingFile}
                    onClick={() => {
                      if (isUploadingFile) return;
                      setCreateFile(null);
                    }}
                  />
                </div>
              </div>
              {createFile.message ? (
                <Typography variant="caption" tone="warning">
                  {createFile.message}
                </Typography>
              ) : null}
            </div>
          ) : (
            <div className={s.uploadEmpty}>
              <Typography variant="caption" tone="muted">
                No image uploaded yet.
              </Typography>
            </div>
          )}

          <Input
            key={fileInputKey}
            id="post-image-create-file"
            type="file"
            accept={IMAGE_ACCEPT}
            disabled={isBusy}
            onChange={handleFileChange}
            wrapperClassName={s.hiddenInputWrapper}
            className={s.hiddenInput}
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
          <Button
            onClick={handleSave}
            loading={isCreating || createMutation.isPending}
            disabled={isBusy}
          >
            Save
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
