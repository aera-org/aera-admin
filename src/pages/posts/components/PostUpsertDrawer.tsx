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
import { useCreatePost, useUpdatePost } from '@/app/posts';
import { notifyError } from '@/app/toast';
import {
  Badge,
  Button,
  Field,
  FormRow,
  IconButton,
  Input,
  Select,
  Switch,
  Textarea,
  Typography,
} from '@/atoms';
import { FileDir, FileStatus, type IFile, type IPost } from '@/common/types';
import { formatCharacterSelectLabel } from '@/common/utils';
import {
  Drawer,
  SearchSelect,
  type SearchSelectOption,
} from '@/components/molecules';

import s from './PostUpsertDrawer.module.scss';

type PostUpsertDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: IPost | null;
  initialCharacterId?: string;
  initialScenarioId?: string;
};

type UploadItem = {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'uploading' | 'uploaded' | 'error';
  uploadedFile: IFile | null;
  message?: string;
};

type Values = {
  characterId: string;
  scenarioId: string;
  text: string;
  note: string;
  isActive: boolean;
  isTop: boolean;
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

export function PostUpsertDrawer({
  open,
  onOpenChange,
  post = null,
  initialCharacterId = '',
  initialScenarioId = '',
}: PostUpsertDrawerProps) {
  const [characterSearch, setCharacterSearch] = useState('');
  const [values, setValues] = useState<Values>({
    characterId: '',
    scenarioId: '',
    text: '',
    note: '',
    isActive: true,
    isTop: false,
  });
  const [uploadItem, setUploadItem] = useState<UploadItem | null>(null);
  const [currentImage, setCurrentImage] = useState<IFile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    useCharacterDetails(values.characterId || null);
  const createMutation = useCreatePost();
  const updateMutation = useUpdatePost();

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

  const isUploadingFile = uploadItem?.status === 'uploading';
  const uploadedFile =
    uploadItem?.status === 'uploaded' ? uploadItem.uploadedFile : null;
  const resolvedImage = uploadedFile ?? currentImage;
  const isBusy =
    isSubmitting ||
    isUploadingFile ||
    createMutation.isPending ||
    updateMutation.isPending;

  const resetState = useCallback(() => {
    setCharacterSearch('');
    setValues({
      characterId: post ? initialCharacterId : initialCharacterId,
      scenarioId: post ? post.scenario.id : initialScenarioId,
      text: post?.text ?? '',
      note: post?.note ?? '',
      isActive: post?.isActive ?? true,
      isTop: post?.isTop ?? false,
    });
    setCurrentImage(post?.img ?? null);
    setUploadItem(null);
    setIsSubmitting(false);
    setShowErrors(false);
    setFileInputKey((prev) => prev + 1);
  }, [initialCharacterId, initialScenarioId, post]);

  useEffect(() => {
    if (!open) return;
    resetState();
  }, [open, resetState]);

  useEffect(() => {
    if (!values.scenarioId) return;
    if (values.characterId && (isScenariosLoading || !selectedCharacterDetails)) {
      return;
    }
    const exists = scenarioOptions.some(
      (option) => option.value === values.scenarioId,
    );
    if (!exists) {
      setValues((prev) => ({ ...prev, scenarioId: '' }));
    }
  }, [
    isScenariosLoading,
    scenarioOptions,
    selectedCharacterDetails,
    values.characterId,
    values.scenarioId,
  ]);

  const errors = useMemo(() => {
    if (!showErrors) return {};

    return {
      characterId: values.characterId ? undefined : 'Select a character.',
      scenarioId: values.scenarioId ? undefined : 'Select a scenario.',
      text: values.text.trim() ? undefined : 'Enter text.',
      image: resolvedImage
        ? undefined
        : isUploadingFile
          ? 'Wait for the upload to finish.'
          : 'Upload an image.',
    };
  }, [
    isUploadingFile,
    resolvedImage,
    showErrors,
    values.characterId,
    values.scenarioId,
    values.text,
  ]);

  const characterValueLabel = useMemo(
    () =>
      buildCharacterValueLabel(characterOptions, values.characterId) ??
      (selectedCharacterDetails
        ? formatCharacterSelectLabel(
            selectedCharacterDetails.name,
            selectedCharacterDetails.type,
          )
        : undefined),
    [characterOptions, selectedCharacterDetails, values.characterId],
  );

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFileInputKey((prev) => prev + 1);

    if (!file || isBusy) {
      return;
    }

    const queuedItem: UploadItem = {
      id: createUploadItemId(),
      fileName: file.name,
      fileSize: file.size,
      status: 'uploading',
      uploadedFile: null,
    };

    setUploadItem(queuedItem);

    if (!isAcceptedImageFile(file)) {
      setUploadItem((current) =>
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

      setUploadItem((current) =>
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
      setUploadItem((current) =>
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
    if (
      !values.characterId ||
      !values.scenarioId ||
      !values.text.trim() ||
      !resolvedImage
    ) {
      setShowErrors(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        scenarioId: values.scenarioId,
        text: values.text,
        imgId: resolvedImage.id,
        note: values.note.trim() || undefined,
        isActive: values.isActive,
        isTop: values.isTop,
      };

      if (post) {
        await updateMutation.mutateAsync({ id: post.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      setShowErrors(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isBusy) return;
        onOpenChange(nextOpen);
      }}
      title={post ? 'Edit post' : 'Create post'}
      className={s.drawer}
    >
      <div className={s.form}>
        <FormRow columns={2}>
          <Field
            label="Character"
            labelFor="post-upsert-character"
            error={errors.characterId}
          >
            <SearchSelect
              id="post-upsert-character"
              value={values.characterId}
              valueLabel={characterValueLabel}
              options={characterOptions}
              search={characterSearch}
              onSearchChange={setCharacterSearch}
              onSelect={(value) =>
                setValues((prev) => ({
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
            labelFor="post-upsert-scenario"
            error={errors.scenarioId}
          >
            <Select
              id="post-upsert-scenario"
              size="sm"
              options={scenarioOptions}
              value={values.scenarioId}
              placeholder={
                values.characterId
                  ? isScenariosLoading
                    ? 'Loading scenarios...'
                    : 'Select scenario'
                  : 'Select character first'
              }
              onChange={(value) =>
                setValues((prev) => ({
                  ...prev,
                  scenarioId: value,
                }))
              }
              fullWidth
              disabled={!values.characterId || isScenariosLoading || isBusy}
              invalid={Boolean(errors.scenarioId)}
            />
          </Field>
        </FormRow>

        <FormRow columns={2}>
          <Field label="Status" labelFor="post-upsert-is-active">
            <Switch
              id="post-upsert-is-active"
              checked={values.isActive}
              disabled={isBusy}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  isActive: event.target.checked,
                }))
              }
              label={values.isActive ? 'Active' : 'Inactive'}
            />
          </Field>

          <Field label="Is Top" labelFor="post-upsert-is-top">
            <Switch
              id="post-upsert-is-top"
              checked={values.isTop}
              disabled={isBusy}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  isTop: event.target.checked,
                }))
              }
              label={values.isTop ? 'Top' : 'Regular'}
            />
          </Field>
        </FormRow>

        <Field label="Image file" error={errors.image}>
          {resolvedImage?.url ? (
            <div className={s.previewFrame}>
              <img
                className={s.previewImage}
                src={resolvedImage.url}
                alt={resolvedImage.name}
                loading="lazy"
              />
            </div>
          ) : null}

          <div className={s.uploadActions}>
            <Button
              variant="secondary"
              onClick={() => {
                if (isBusy) return;
                const element = document.getElementById('post-upsert-file');
                if (element instanceof HTMLInputElement) {
                  element.click();
                }
              }}
              disabled={isBusy}
            >
              {resolvedImage ? 'Replace image' : 'Choose image'}
            </Button>
            <Typography variant="meta" tone="muted">
              {isUploadingFile
                ? 'Uploading image...'
                : resolvedImage
                  ? 'Image ready'
                  : 'No image uploaded'}
            </Typography>
          </div>

          {uploadItem ? (
            <div className={s.uploadItem}>
              <div className={s.uploadRow}>
                <div className={s.uploadMeta}>
                  <Typography variant="body" truncate>
                    {uploadItem.fileName}
                  </Typography>
                  <Typography variant="caption" tone="muted">
                    {formatFileSize(uploadItem.fileSize)}
                  </Typography>
                </div>
                <div className={s.uploadActionsRight}>
                  {uploadItem.status === 'uploaded' ? (
                    <Badge tone="success">Uploaded</Badge>
                  ) : uploadItem.status === 'uploading' ? (
                    <Badge>Uploading</Badge>
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
                      setUploadItem(null);
                    }}
                  />
                </div>
              </div>
              {uploadItem.message ? (
                <Typography variant="caption" tone="warning">
                  {uploadItem.message}
                </Typography>
              ) : null}
            </div>
          ) : !resolvedImage ? (
            <div className={s.uploadEmpty}>
              <Typography variant="caption" tone="muted">
                No image uploaded yet.
              </Typography>
            </div>
          ) : null}

          <Input
            key={fileInputKey}
            id="post-upsert-file"
            type="file"
            accept={IMAGE_ACCEPT}
            disabled={isBusy}
            onChange={handleFileChange}
            wrapperClassName={s.hiddenInputWrapper}
            className={s.hiddenInput}
          />
        </Field>

        <Field label="Text" labelFor="post-upsert-text" error={errors.text}>
          <Textarea
            id="post-upsert-text"
            size="sm"
            value={values.text}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                text: event.target.value,
              }))
            }
            rows={10}
            fullWidth
            disabled={isBusy}
          />
        </Field>

        <Field label="Note" labelFor="post-upsert-note">
          <Textarea
            id="post-upsert-note"
            size="sm"
            value={values.note}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                note: event.target.value,
              }))
            }
            rows={3}
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
          <Button
            onClick={handleSave}
            loading={isBusy}
            disabled={isBusy}
          >
            {post ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
