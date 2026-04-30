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
import {
  type CreatePostDto,
  useCreatePost,
  useUpdatePost,
} from '@/app/posts';
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
import {
  FileDir,
  FileStatus,
  type IFile,
  type IPost,
  PostType,
} from '@/common/types';
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
  type: PostType;
  text: string;
  isActive: boolean;
};

const CHARACTER_LIST_LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 300;
const MEDIA_CONFIG = {
  [PostType.Img]: {
    label: 'Image file',
    actionLabel: 'Choose image',
    replaceLabel: 'Replace image',
    uploadingLabel: 'Uploading image...',
    readyLabel: 'Image ready',
    emptyLabel: 'No image uploaded',
    missingError: 'Upload an image.',
    invalidError: 'Only PNG, JPG, JPEG, or WEBP files are allowed.',
    uploadErrorTitle: 'Unable to upload the image.',
    accept: 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp',
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  },
  [PostType.Video]: {
    label: 'Video file',
    actionLabel: 'Choose video',
    replaceLabel: 'Replace video',
    uploadingLabel: 'Uploading video...',
    readyLabel: 'Video ready',
    emptyLabel: 'No video uploaded',
    missingError: 'Upload a video.',
    invalidError: 'Only MP4, WEBM, or MOV files are allowed.',
    uploadErrorTitle: 'Unable to upload the video.',
    accept: 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov',
    extensions: ['mp4', 'webm', 'mov'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  },
} as const;
const EXTENSION_TO_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
} as const;
const POST_TYPE_OPTIONS = [
  { label: 'Image', value: PostType.Img },
  { label: 'Video', value: PostType.Video },
];

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

function isAcceptedMediaFile(file: File, type: PostType) {
  const config = MEDIA_CONFIG[type];
  if (file.type && config.mimeTypes.some((mime) => mime === file.type)) {
    return true;
  }

  const extension = getFileExtension(file.name);
  return config.extensions.some(
    (allowedExtension) => allowedExtension === extension,
  );
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
    type: PostType.Img,
    text: '',
    isActive: true,
  });
  const [uploadItem, setUploadItem] = useState<UploadItem | null>(null);
  const [currentMedia, setCurrentMedia] = useState<IFile | null>(null);
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
  const mediaConfig = MEDIA_CONFIG[values.type];
  const resolvedMedia = uploadedFile ?? currentMedia;
  const isBusy =
    isSubmitting ||
    isUploadingFile ||
    createMutation.isPending ||
    updateMutation.isPending;

  const resetState = useCallback(() => {
    const postType = post?.type ?? PostType.Img;

    setCharacterSearch('');
    setValues({
      characterId: initialCharacterId,
      scenarioId: post ? post.scenario.id : initialScenarioId,
      type: postType,
      text: post?.text ?? '',
      isActive: post?.isActive ?? true,
    });
    setCurrentMedia(
      postType === PostType.Video ? (post?.video ?? null) : (post?.img ?? null),
    );
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
      media: resolvedMedia
        ? undefined
        : isUploadingFile
          ? 'Wait for the upload to finish.'
          : mediaConfig.missingError,
    };
  }, [
    isUploadingFile,
    mediaConfig.missingError,
    resolvedMedia,
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

    if (!isAcceptedMediaFile(file, values.type)) {
      setUploadItem((current) =>
        current
          ? {
              ...current,
              status: 'error',
              message: mediaConfig.invalidError,
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
      notifyError(error, mediaConfig.uploadErrorTitle);
    }
  };

  const handleSave = async () => {
    if (
      !values.characterId ||
      !values.scenarioId ||
      !values.text.trim() ||
      !resolvedMedia
    ) {
      setShowErrors(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const basePayload = {
        scenarioId: values.scenarioId,
        text: values.text.trim(),
        isActive: values.isActive,
      };
      const payload: CreatePostDto =
        values.type === PostType.Video
          ? {
              ...basePayload,
              type: PostType.Video,
              videoId: resolvedMedia.id,
            }
          : {
              ...basePayload,
              type: PostType.Img,
              imgId: resolvedMedia.id,
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
          <Field label="Type" labelFor="post-upsert-type">
            <Select
              id="post-upsert-type"
              size="sm"
              options={POST_TYPE_OPTIONS}
              value={values.type}
              onChange={(value) => {
                const nextType = value as PostType;
                if (nextType === values.type) return;
                setValues((prev) => ({
                  ...prev,
                  type: nextType,
                }));
                setCurrentMedia(null);
                setUploadItem(null);
                setFileInputKey((prev) => prev + 1);
              }}
              fullWidth
              disabled={isBusy}
            />
          </Field>

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
        </FormRow>

        <Field label={mediaConfig.label} error={errors.media}>
          {resolvedMedia?.url ? (
            <div className={s.previewFrame}>
              {values.type === PostType.Video ? (
                <video
                  className={s.previewMedia}
                  src={resolvedMedia.url}
                  controls
                  preload="metadata"
                />
              ) : (
                <img
                  className={s.previewMedia}
                  src={resolvedMedia.url}
                  alt={resolvedMedia.name}
                  loading="lazy"
                />
              )}
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
              {resolvedMedia ? mediaConfig.replaceLabel : mediaConfig.actionLabel}
            </Button>
            <Typography variant="meta" tone="muted">
              {isUploadingFile
                ? mediaConfig.uploadingLabel
                : resolvedMedia
                  ? mediaConfig.readyLabel
                  : mediaConfig.emptyLabel}
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
                    aria-label={`Remove ${
                      values.type === PostType.Video ? 'video' : 'image'
                    } file`}
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
          ) : !resolvedMedia ? (
            <div className={s.uploadEmpty}>
              <Typography variant="caption" tone="muted">
                {mediaConfig.emptyLabel}.
              </Typography>
            </div>
          ) : null}

          <Input
            key={fileInputKey}
            id="post-upsert-file"
            type="file"
            accept={mediaConfig.accept}
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
