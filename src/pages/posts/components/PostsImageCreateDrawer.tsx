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
import { notifyError, notifySuccess } from '@/app/toast';
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
  const [createFiles, setCreateFiles] = useState<CreateImageUploadItem[]>([]);
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
  const createMutation = useCreatePostImage({ silentSuccess: true });

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

  const isUploadingFile = createFiles.some((file) => file.status === 'uploading');
  const uploadedFiles = createFiles
    .filter((file) => file.status === 'uploaded' && file.uploadedFile)
    .map((file) => file.uploadedFile as IFile);
  const isBusy = isCreating || isUploadingFile || createMutation.isPending;

  const resetState = useCallback(() => {
    setCharacterSearch('');
    setCreateValues({
      characterId: initialCharacterId,
      scenarioId: initialScenarioId,
      note: '',
    });
    setCreateFiles([]);
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
      file: uploadedFiles.length > 0
        ? undefined
        : isUploadingFile
          ? 'Wait for uploads to finish.'
          : 'Upload at least one image.',
    };
  }, [
    createValues.characterId,
    createValues.scenarioId,
    isUploadingFile,
    showErrors,
    uploadedFiles.length,
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
      id: string,
      updater: (item: CreateImageUploadItem) => CreateImageUploadItem,
    ) => {
      setCreateFiles((prev) =>
        prev.map((item) => (item.id === id ? updater(item) : item)),
      );
    },
    [],
  );

  const uploadFile = useCallback(
    async (file: File, itemId: string) => {
      if (!isAcceptedImageFile(file)) {
        updateCreateFile(itemId, (current) => ({
          ...current,
          status: 'error',
          message: 'Only PNG, JPG, JPEG, or WEBP files are allowed.',
        }));
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

        updateCreateFile(itemId, (current) => ({
          ...current,
          status: 'uploaded',
          uploadedFile: { ...signedFile, status: FileStatus.UPLOADED },
          message: undefined,
        }));
      } catch (error) {
        updateCreateFile(itemId, (current) => ({
          ...current,
          status: 'error',
          message: resolveErrorMessage(error),
        }));
        notifyError(error, 'Unable to upload the image.');
      }
    },
    [updateCreateFile],
  );

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setFileInputKey((prev) => prev + 1);

    if (files.length === 0 || isBusy) {
      return;
    }

    const queuedItems = files.map((file) => ({
      id: createUploadItemId(),
      fileName: file.name,
      fileSize: file.size,
      status: 'uploading' as const,
      uploadedFile: null,
    }));

    setCreateFiles((prev) => [...prev, ...queuedItems]);

    await Promise.all(
      queuedItems.map((item, index) => uploadFile(files[index], item.id)),
    );
  };

  const handleSave = async () => {
    if (
      !createValues.characterId ||
      !createValues.scenarioId ||
      uploadedFiles.length === 0
    ) {
      setShowErrors(true);
      return;
    }

    setIsCreating(true);

    try {
      for (const file of uploadedFiles) {
        await createMutation.mutateAsync({
          fileId: file.id,
          scenarioId: createValues.scenarioId,
          note: createValues.note.trim() || undefined,
        });
      }
      notifySuccess(
        uploadedFiles.length > 1
          ? `${uploadedFiles.length} post images created.`
          : 'Post image created.',
        uploadedFiles.length > 1
          ? `${uploadedFiles.length} post images created.`
          : 'Post image created.',
      );
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
                ? 'Uploading images...'
                : uploadedFiles.length > 0
                  ? `${uploadedFiles.length} uploaded`
                  : 'No files uploaded'}
            </Typography>
          </div>

          {createFiles.length > 0 ? (
            <div className={s.uploadList}>
              {createFiles.map((file) => (
                <div key={file.id} className={s.uploadItem}>
                  <div className={s.uploadRow}>
                    <div className={s.uploadMeta}>
                      <Typography variant="body" truncate>
                        {file.fileName}
                      </Typography>
                      <Typography variant="caption" tone="muted">
                        {formatFileSize(file.fileSize)}
                      </Typography>
                    </div>
                    <div className={s.uploadActionsRight}>
                      {file.status === 'uploaded' ? (
                        <Badge tone="success">Uploaded</Badge>
                      ) : file.status === 'uploading' ? (
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
                        disabled={file.status === 'uploading' || isCreating}
                        onClick={() => {
                          if (file.status === 'uploading' || isCreating) return;
                          setCreateFiles((prev) =>
                            prev.filter((item) => item.id !== file.id),
                          );
                        }}
                      />
                    </div>
                  </div>
                  {file.message ? (
                    <Typography variant="caption" tone="warning">
                      {file.message}
                    </Typography>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className={s.uploadEmpty}>
              <Typography variant="caption" tone="muted">
                No images uploaded yet.
              </Typography>
            </div>
          )}

          <Input
            key={fileInputKey}
            id="post-image-create-file"
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
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
