import { CopyIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useQueries } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { useCharacters } from '@/app/characters';
import { getCharacterDetails } from '@/app/characters/charactersApi';
import { getFileSignedUrl } from '@/app/files/filesApi';
import {
  useCreatePost,
  useCreatePostSet,
  useDeletePostImage,
  useDeletePostSet,
  useDeletePostText,
  usePostImages,
  usePosts,
  usePostSets,
  usePostTexts,
} from '@/app/posts';
import { notifyError, notifySuccess } from '@/app/toast';
import { DownloadIcon, TrashIcon } from '@/assets/icons';
import {
  Alert,
  Button,
  ButtonGroup,
  Card,
  Container,
  EmptyState,
  Field,
  IconButton,
  Input,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import type {
  ICharacterDetails,
  IPost,
  IPostImg,
  IPostSet,
  IPostText,
} from '@/common/types';
import { formatCharacterSelectLabel } from '@/common/utils';
import { AppShell } from '@/components/templates';

import {
  PostItemCard,
  PostItemCardSkeleton,
} from './components/PostItemCard';
import { PostsImageCreateDrawer } from './components/PostsImageCreateDrawer';
import { PostsTextCreateDrawer } from './components/PostsTextCreateDrawer';
import s from './PostsPage.module.scss';

type QueryUpdate = {
  search?: string;
  scenarioId?: string;
  page?: number;
  pageSize?: number;
};

type PostsViewKey = 'posts' | 'sets' | 'images' | 'texts';

type PostsViewConfig = {
  key: PostsViewKey;
  label: string;
  path: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  pageSizeOptions: number[];
  defaultPageSize: number;
};

type ScenarioOption = {
  label: string;
  value: string;
};

type ScenarioLookupItem = {
  characterId: string;
  scenarioId: string;
};

type SelectionTarget = {
  image: IPostImg | null;
  text: IPostText | null;
};
type SetSelectionTarget = IPost[];

const SEARCH_DEBOUNCE_MS = 400;
const CHARACTER_LIST_LIMIT = 1000;
const SCENARIO_STALE_TIME = 15 * 60 * 1000;

const VIEW_CONFIG: PostsViewConfig[] = [
  {
    key: 'posts',
    label: 'Posts',
    path: '/posts',
    searchPlaceholder: 'Search posts',
    emptyTitle: 'No posts found',
    emptyDescription: 'Adjust your search or scenario filter to see results.',
    errorTitle: 'Unable to load posts',
    pageSizeOptions: [12, 24, 48],
    defaultPageSize: 12,
  },
  {
    key: 'sets',
    label: 'Sets',
    path: '/posts/sets',
    searchPlaceholder: 'Search sets',
    emptyTitle: 'No sets found',
    emptyDescription: 'Adjust your search or scenario filter to see results.',
    errorTitle: 'Unable to load post sets',
    pageSizeOptions: [20, 50, 100],
    defaultPageSize: 20,
  },
  {
    key: 'images',
    label: 'Images',
    path: '/posts/images',
    searchPlaceholder: 'Search images',
    emptyTitle: 'No images found',
    emptyDescription: 'Adjust your search or scenario filter to see results.',
    errorTitle: 'Unable to load post images',
    pageSizeOptions: [12, 24, 48],
    defaultPageSize: 12,
  },
  {
    key: 'texts',
    label: 'Texts',
    path: '/posts/texts',
    searchPlaceholder: 'Search texts',
    emptyTitle: 'No texts found',
    emptyDescription: 'Adjust your search or scenario filter to see results.',
    errorTitle: 'Unable to load post texts',
    pageSizeOptions: [12, 24, 48],
    defaultPageSize: 12,
  },
];

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function parsePositiveNumber(value: string | null, fallback: number) {
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;

  return Math.floor(parsed);
}

function parsePageSize(
  value: string | null,
  options: number[],
  fallback: number,
) {
  const parsed = parsePositiveNumber(value, fallback);
  return options.includes(parsed) ? parsed : fallback;
}

function resolveView(pathname: string) {
  if (pathname === '/posts/sets') return VIEW_CONFIG[1];
  if (pathname === '/posts/images') return VIEW_CONFIG[2];
  if (pathname === '/posts/texts') return VIEW_CONFIG[3];
  return VIEW_CONFIG[0];
}

function formatScenarioOptionLabel(
  character: Pick<ICharacterDetails, 'name' | 'type'>,
  scenarioName: string,
) {
  return `${formatCharacterSelectLabel(character.name, character.type)} · ${scenarioName}`;
}

function PostImageCard({
  item,
  onDownload,
  isDownloading,
  onDelete,
  onSelect,
  isDeleting,
  isDeleteDisabled,
  isSelected,
}: {
  item: IPostImg;
  onDownload: (item: IPostImg) => void;
  isDownloading: boolean;
  onDelete: (id: string) => void;
  onSelect: (item: IPostImg) => void;
  isDeleting: boolean;
  isDeleteDisabled: boolean;
  isSelected: boolean;
}) {
  const scenarioName = item.scenario.name || 'Untitled';
  const imageUrl = item.file.url;
  const note = item.note?.trim() || 'No note';

  return (
    <Card
      padding="md"
      className={`${s.card} ${s.imageCard} ${isSelected ? s.selectedCard : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(item);
        }
      }}
    >
      <div className={`${s.previewFrame} ${s.imageCardPreview}`}>
        {imageUrl ? (
          <>
            <img
              className={s.previewImage}
              src={imageUrl}
              alt={scenarioName}
              loading="lazy"
            />
            <div className={s.previewActions}>
              <IconButton
                aria-label="Download image"
                tooltip="Download image"
                variant="ghost"
                size="sm"
                icon={<DownloadIcon />}
                loading={isDownloading}
                disabled={isDownloading || isDeleteDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onDownload(item);
                }}
              />
              <IconButton
                aria-label="Delete image"
                tooltip="Delete image"
                variant="ghost"
                tone="danger"
                size="sm"
                icon={<TrashIcon />}
                loading={isDeleting}
                disabled={isDeleteDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(item.id);
                }}
              />
            </div>
          </>
        ) : (
          <div className={s.previewPlaceholder}>
            <Typography variant="caption" tone="muted">
              No image
            </Typography>
          </div>
        )}
      </div>
      <div className={`${s.cardBody} ${s.imageCardBody}`}>
        <Typography
          className={`${s.cardTitle} ${s.imageCardTitle}`}
          variant="body"
        >
          {scenarioName}
        </Typography>
        <Typography className={s.bodyClamp} variant="caption" tone="muted">
          {note}
        </Typography>
      </div>
    </Card>
  );
}

function PostTextCard({
  item,
  onCopy,
  onDelete,
  onSelect,
  isDeleting,
  isDeleteDisabled,
  isSelected,
}: {
  item: IPostText;
  onCopy: (value: string) => void;
  onDelete: (id: string) => void;
  onSelect: (item: IPostText) => void;
  isDeleting: boolean;
  isDeleteDisabled: boolean;
  isSelected: boolean;
}) {
  const scenarioName = item.scenario.name || 'Untitled';
  const value = item.value || '—';
  const note = item.note?.trim() || 'No note';

  return (
    <Card
      padding="md"
      className={`${s.card} ${s.textCard} ${isSelected ? s.selectedCard : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(item);
        }
      }}
    >
      <div className={s.textContentFrame}>
        <div className={s.previewActions}>
          <IconButton
            aria-label="Copy text"
            tooltip="Copy text"
            variant="ghost"
            size="sm"
            icon={<CopyIcon />}
            disabled={isDeleteDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onCopy(item.value);
            }}
          />
          <IconButton
            aria-label="Delete text"
            tooltip="Delete text"
            variant="ghost"
            tone="danger"
            size="sm"
            icon={<TrashIcon />}
            loading={isDeleting}
            disabled={isDeleteDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(item.id);
            }}
          />
        </div>
        <pre className={s.textValue}>{value}</pre>
      </div>
      <div className={`${s.cardBody} ${s.textCardBody}`}>
        <Typography
          className={`${s.cardTitle} ${s.imageCardTitle}`}
          variant="body"
        >
          {scenarioName}
        </Typography>
        <Typography className={s.bodyClamp} variant="caption" tone="muted">
          {note}
        </Typography>
      </div>
    </Card>
  );
}

function buildSetsTableRows(
  items: IPostSet[],
  options: {
    deletingId: string | undefined;
    isDeleting: boolean;
    onDelete: (id: string) => void;
  },
) {
  return items.map((item) => ({
    setId: item.id,
    scenario: (
      <Typography variant="caption" tone="muted">
        {item.id}
      </Typography>
    ),
    postsCount: item.postsCount.toLocaleString(),
    note: (
      <Typography className={s.refsCell} variant="caption" tone="muted">
        {item.note?.trim() || '—'}
      </Typography>
    ),
    refs: (
      <Typography className={s.refsCell} variant="caption" tone="muted">
        {item.refs.length > 0 ? item.refs.join(', ') : '—'}
      </Typography>
    ),
    actions: (
      <div className={s.rowActions}>
        <IconButton
          aria-label="Delete set"
          tooltip="Delete set"
          variant="ghost"
          tone="danger"
          size="sm"
          icon={<TrashIcon />}
          loading={options.isDeleting && options.deletingId === item.id}
          disabled={options.isDeleting}
          onClick={(event) => {
            event.stopPropagation();
            options.onDelete(item.id);
          }}
        />
      </div>
    ),
  }));
}

export function PostsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = resolveView(location.pathname);
  const createPostMutation = useCreatePost();
  const createPostSetMutation = useCreatePostSet();
  const deletePostImageMutation = useDeletePostImage();
  const deletePostSetMutation = useDeletePostSet();
  const deletePostTextMutation = useDeletePostText();
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<SetSelectionTarget>([]);
  const [selectedItems, setSelectedItems] = useState<SelectionTarget>({
    image: null,
    text: null,
  });

  const rawSearch = searchParams.get('search') ?? '';
  const rawScenarioId = searchParams.get('scenarioId') ?? '';
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isCreateTextDrawerOpen, setIsCreateTextDrawerOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const scenarioFilter = rawScenarioId.trim();
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(
    rawPageSize,
    currentView.pageSizeOptions,
    currentView.defaultPageSize,
  );

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.search !== undefined) {
        const nextSearch = update.search.trim();
        if (nextSearch) {
          next.set('search', nextSearch);
        } else {
          next.delete('search');
        }
      }

      if (update.scenarioId !== undefined) {
        const nextScenarioId = update.scenarioId.trim();
        if (nextScenarioId) {
          next.set('scenarioId', nextScenarioId);
        } else {
          next.delete('scenarioId');
        }
      }

      if (update.page !== undefined) {
        if (update.page > 1) {
          next.set('page', String(update.page));
        } else {
          next.delete('page');
        }
      }

      if (update.pageSize !== undefined) {
        if (update.pageSize !== currentView.defaultPageSize) {
          next.set('pageSize', String(update.pageSize));
        } else {
          next.delete('pageSize');
        }
      }

      setSearchParams(next, { replace });
    },
    [currentView.defaultPageSize, searchParams, setSearchParams],
  );

  useEffect(() => {
    setSearchInput(rawSearch);
  }, [rawSearch]);

  useEffect(() => {
    if (normalizedSearch === rawSearch) return;
    updateSearchParams({ search: normalizedSearch, page: 1 }, true);
  }, [normalizedSearch, rawSearch, updateSearchParams]);

  useEffect(() => {
    if (!rawPageSize) return;
    const parsedPageSize = Number(rawPageSize);
    if (currentView.pageSizeOptions.includes(parsedPageSize)) return;
    updateSearchParams({ pageSize: currentView.defaultPageSize, page: 1 }, true);
  }, [
    currentView.defaultPageSize,
    currentView.pageSizeOptions,
    rawPageSize,
    updateSearchParams,
  ]);

  const characterQueryParams = useMemo(
    () => ({
      order: 'ASC',
      skip: 0,
      take: CHARACTER_LIST_LIMIT,
    }),
    [],
  );

  const { data: characterData, isLoading: isCharactersLoading } =
    useCharacters(characterQueryParams);

  const scenarioQueryResults = useQueries({
    queries: (characterData?.data ?? []).map((character) => ({
      queryKey: ['character', character.id] as const,
      queryFn: () => getCharacterDetails(character.id),
      staleTime: SCENARIO_STALE_TIME,
    })),
  });

  const scenarioOptionData = useMemo(() => {
    const optionMap = new Map<string, ScenarioOption>();
    const lookupMap = new Map<string, ScenarioLookupItem>();
    const characters = characterData?.data ?? [];

    for (const [index, character] of characters.entries()) {
      const details = scenarioQueryResults[index]?.data;
      if (!details) continue;

      for (const scenario of details.scenarios) {
        optionMap.set(scenario.id, {
          label: formatScenarioOptionLabel(
            {
              name: character.name,
              type: character.type,
            },
            scenario.name || 'Untitled',
          ),
          value: scenario.id,
        });
        lookupMap.set(scenario.id, {
          characterId: character.id,
          scenarioId: scenario.id,
        });
      }
    }

    return {
      options: [
        { label: 'All scenarios', value: '' },
        ...Array.from(optionMap.values()).sort((left, right) =>
          left.label.localeCompare(right.label),
        ),
      ],
      lookup: lookupMap,
    };
  }, [characterData?.data, scenarioQueryResults]);

  const scenarioOptions = scenarioOptionData.options;
  const selectedScenarioLookup = scenarioFilter
    ? scenarioOptionData.lookup.get(scenarioFilter) ?? null
    : null;

  const areScenarioOptionsLoading =
    isCharactersLoading ||
    scenarioQueryResults.some((query) => query.isLoading);

  useEffect(() => {
    if (!scenarioFilter || areScenarioOptionsLoading) return;

    const exists = scenarioOptions.some((option) => option.value === scenarioFilter);
    if (!exists) {
      updateSearchParams({ scenarioId: '', page: 1 }, true);
    }
  }, [
    areScenarioOptionsLoading,
    scenarioFilter,
    scenarioOptions,
    updateSearchParams,
  ]);

  const queryParams = useMemo(
    () => ({
      search: normalizedSearch || undefined,
      scenarioId:
        currentView.key === 'sets' ? undefined : scenarioFilter || undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [currentView.key, normalizedSearch, page, pageSize, scenarioFilter],
  );

  const postsQuery = usePosts(queryParams, {
    enabled: currentView.key === 'posts',
  });
  const setsQuery = usePostSets(queryParams, {
    enabled: currentView.key === 'sets',
  });
  const imagesQuery = usePostImages(queryParams, {
    enabled: currentView.key === 'images',
  });
  const textsQuery = usePostTexts(queryParams, {
    enabled: currentView.key === 'texts',
  });

  const activeQuery =
    currentView.key === 'posts'
      ? postsQuery
      : currentView.key === 'sets'
        ? setsQuery
        : currentView.key === 'images'
          ? imagesQuery
          : textsQuery;

  const activeItems =
    currentView.key === 'posts'
      ? postsQuery.data?.data ?? []
      : currentView.key === 'sets'
        ? setsQuery.data?.data ?? []
        : currentView.key === 'images'
          ? imagesQuery.data?.data ?? []
          : textsQuery.data?.data ?? [];

  const total = activeQuery.data?.total ?? 0;
  const effectiveTake = activeQuery.data?.take ?? pageSize;
  const effectiveSkip = activeQuery.data?.skip ?? (page - 1) * pageSize;
  const totalPages = total > 0 ? Math.ceil(total / effectiveTake) : 1;

  useEffect(() => {
    if (!activeQuery.data || total === 0) return;
    if (page > totalPages) {
      updateSearchParams({ page: totalPages }, true);
    }
  }, [activeQuery.data, page, total, totalPages, updateSearchParams]);

  const setColumns = useMemo(
    () => [
      { key: 'scenario', label: 'Set ID' },
      { key: 'postsCount', label: 'Posts' },
      { key: 'note', label: 'Note' },
      { key: 'refs', label: 'Refs' },
      { key: 'actions', label: '' },
    ],
    [],
  );

  const setSkeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, () => ({
        scenario: <Skeleton width={180} height={12} />,
        postsCount: <Skeleton width={60} height={12} />,
        note: <Skeleton width={180} height={12} />,
        refs: <Skeleton width={220} height={12} />,
        actions: <Skeleton width={28} height={28} />,
      })),
    [],
  );

  const postSkeletonCards = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => (
        <PostItemCardSkeleton key={`post-skeleton-${index}`} />
      )),
    [],
  );

  const imageSkeletonCards = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => (
        <PostItemCardSkeleton key={`image-skeleton-${index}`} />
      )),
    [],
  );

  const textSkeletonCards = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => (
        <Card padding="md" className={s.card} key={`text-skeleton-${index}`}>
          <div className={s.textContentFrame}>
            <Skeleton width="100%" height={14} />
            <Skeleton width="85%" height={14} />
            <Skeleton width="70%" height={14} />
          </div>
          <div className={s.cardBody}>
            <Skeleton width={180} height={14} />
            <Skeleton width="80%" height={12} />
          </div>
        </Card>
      )),
    [],
  );

  const showSkeleton = activeQuery.isLoading && !activeQuery.data;
  const showEmpty = !showSkeleton && !activeQuery.error && activeItems.length === 0;
  const showContent = !showEmpty && !activeQuery.error;
  const showFooter = showContent && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const searchString = searchParams.toString();

  const handleDeletePostImage = useCallback(
    (id: string) => {
      if (selectedItems.image?.id === id) {
        setSelectedItems((prev) => ({ ...prev, image: null }));
      }
      void deletePostImageMutation.mutateAsync(id);
    },
    [deletePostImageMutation, selectedItems.image?.id],
  );

  const handleDownloadPostImage = useCallback(async (item: IPostImg) => {
    if (!item.file.id || downloadingImageId) return;

    setDownloadingImageId(item.id);

    try {
      const signedUrlResponse = await getFileSignedUrl(item.file.id);
      const signedUrl =
        typeof signedUrlResponse === 'string'
          ? signedUrlResponse
          : // @ts-expect-error Signed URL response type is wrong
            (signedUrlResponse.url ?? signedUrlResponse.signedUrl);

      if (!signedUrl) {
        throw new Error('Unable to download image.');
      }

      const downloadRes = await fetch(signedUrl);
      if (!downloadRes.ok) {
        throw new Error('Unable to download image.');
      }

      const blob = await downloadRes.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.file.name || 'image';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      notifyError(error, 'Unable to download image.');
    } finally {
      setDownloadingImageId(null);
    }
  }, [downloadingImageId]);

  const handleCopyPostText = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notifySuccess('Text copied.', 'Text copied.');
    } catch (error) {
      notifyError(error, 'Unable to copy text.');
    }
  }, []);

  const handleDeletePostText = useCallback(
    (id: string) => {
      if (selectedItems.text?.id === id) {
        setSelectedItems((prev) => ({ ...prev, text: null }));
      }
      void deletePostTextMutation.mutateAsync(id);
    },
    [deletePostTextMutation, selectedItems.text?.id],
  );

  const handleDeletePostSet = useCallback(
    (id: string) => {
      void deletePostSetMutation.mutateAsync(id);
    },
    [deletePostSetMutation],
  );

  const handleSelectImage = useCallback((item: IPostImg) => {
    setSelectedItems((prev) => ({
      ...prev,
      image: prev.image?.id === item.id ? null : item,
    }));
  }, []);

  const handleSelectText = useCallback((item: IPostText) => {
    setSelectedItems((prev) => ({
      ...prev,
      text: prev.text?.id === item.id ? null : item,
    }));
  }, []);

  const handleSelectPost = useCallback((item: IPost) => {
    setSelectedPosts((prev) =>
      prev.some((post) => post.id === item.id)
        ? prev.filter((post) => post.id !== item.id)
        : [...prev, item],
    );
  }, []);

  const selectedScenarioId = useMemo(() => {
    const imageScenarioId = selectedItems.image?.scenario.id ?? null;
    const textScenarioId = selectedItems.text?.scenario.id ?? null;

    if (!imageScenarioId || !textScenarioId) return null;
    return imageScenarioId === textScenarioId ? imageScenarioId : null;
  }, [selectedItems.image, selectedItems.text]);

  const hasScenarioMismatch = Boolean(
    selectedItems.image &&
      selectedItems.text &&
      selectedItems.image.scenario.id !== selectedItems.text.scenario.id,
  );

  const canCreatePost = Boolean(
    selectedItems.image &&
      selectedItems.text &&
      selectedScenarioId &&
      !createPostMutation.isPending,
  );

  const canCreateSet = Boolean(
    selectedPosts.length > 1 &&
      !createPostSetMutation.isPending,
  );

  const createPostSelectionStatus = useMemo(() => {
    if (hasScenarioMismatch) {
      return 'Selected image and text must belong to the same scenario.';
    }

    if (selectedItems.image && selectedItems.text) {
      return 'Image and text selected. Ready to create a post.';
    }

    if (selectedItems.image) {
      return 'Image selected. Pick one text to create a post.';
    }

    if (selectedItems.text) {
      return 'Text selected. Pick one image to create a post.';
    }

    return 'Select one image and one text to create a post.';
  }, [hasScenarioMismatch, selectedItems.image, selectedItems.text]);

  const createSetSelectionStatus = useMemo(() => {
    if (selectedPosts.length > 1) {
      return `${selectedPosts.length} posts selected. Ready to create a set.`;
    }

    if (selectedPosts.length === 1) {
      return '1 post selected. Select one more post to create a set.';
    }

    return 'Select posts to create a set.';
  }, [selectedPosts.length]);

  const headerStatus =
    currentView.key === 'posts'
      ? createSetSelectionStatus
      : createPostSelectionStatus;

  const headerStatusTone =
    currentView.key === 'posts'
      ? 'muted'
      : hasScenarioMismatch
        ? 'warning'
        : 'muted';

  const handleCreatePost = useCallback(async () => {
    if (!selectedItems.image || !selectedItems.text || !selectedScenarioId) {
      return;
    }

    try {
      await createPostMutation.mutateAsync({
        scenarioId: selectedScenarioId,
        imgId: selectedItems.image.id,
        textId: selectedItems.text.id,
      });
      setSelectedItems({ image: null, text: null });
      navigate('/posts');
    } catch {
      // Mutation handles user-facing errors.
    }
  }, [createPostMutation, navigate, selectedItems.image, selectedItems.text, selectedScenarioId]);

  const handleCreateSet = useCallback(async () => {
    if (selectedPosts.length < 2) {
      return;
    }

    try {
      const createdSet = await createPostSetMutation.mutateAsync({
        postIds: selectedPosts.map((post) => post.id),
      });
      setSelectedPosts([]);
      navigate(`/posts/sets/${createdSet.id}`);
    } catch {
      // Mutation handles user-facing errors.
    }
  }, [createPostSetMutation, navigate, selectedPosts]);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Posts</Typography>
            <Typography variant="meta" tone={headerStatusTone}>
              {headerStatus}
            </Typography>
          </div>
          <div className={s.headerActions}>
            <ButtonGroup>
              {VIEW_CONFIG.map((view) => {
                const isActive = view.key === currentView.key;
                return (
                  <Button
                    key={view.key}
                    as={Link}
                    to={`${view.path}${searchString ? `?${searchString}` : ''}`}
                    size="sm"
                    variant={isActive ? 'secondary' : 'ghost'}
                  >
                    {view.label}
                  </Button>
                );
              })}
            </ButtonGroup>
            <div className={s.headerActionButtons}>
              {currentView.key === 'posts' ? (
                <Button
                  variant="secondary"
                  onClick={() => void handleCreateSet()}
                  disabled={!canCreateSet}
                  loading={createPostSetMutation.isPending}
                >
                  Create set
                </Button>
              ) : null}
              {currentView.key === 'images' || currentView.key === 'texts' ? (
                <Button
                  variant="secondary"
                  onClick={() => void handleCreatePost()}
                  disabled={!canCreatePost}
                  loading={createPostMutation.isPending}
                >
                  Create post
                </Button>
              ) : null}
              {currentView.key === 'images' ? (
                <Button onClick={() => setIsCreateDrawerOpen(true)}>Add image</Button>
              ) : currentView.key === 'texts' ? (
                <Button onClick={() => setIsCreateTextDrawerOpen(true)}>Add text</Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Search"
              labelFor="posts-search"
            >
              <Input
                id="posts-search"
                placeholder={currentView.searchPlaceholder}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            {currentView.key !== 'sets' ? (
              <Field
                className={s.scenarioField}
                label="Scenario"
                labelFor="posts-scenario"
              >
                <Select
                  id="posts-scenario"
                  options={scenarioOptions}
                  value={scenarioFilter}
                  size="sm"
                  variant="ghost"
                  placeholder={
                    areScenarioOptionsLoading
                      ? 'Loading scenarios...'
                      : 'All scenarios'
                  }
                  disabled={areScenarioOptionsLoading}
                  onChange={(value) =>
                    updateSearchParams({ scenarioId: value, page: 1 })
                  }
                />
              </Field>
            ) : null}
          </div>
        </div>

        {activeQuery.error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title={currentView.errorTitle}
              description={
                activeQuery.error instanceof Error
                  ? activeQuery.error.message
                  : 'Please try again.'
              }
              tone="warning"
            />
            <Button variant="secondary" onClick={() => activeQuery.refetch()}>
              Retry
            </Button>
          </Stack>
        ) : null}

        {showEmpty ? (
          <EmptyState
            title={currentView.emptyTitle}
            description={currentView.emptyDescription}
            action={
              currentView.key === 'images' ? (
                <Button onClick={() => setIsCreateDrawerOpen(true)}>
                  Add image
                </Button>
              ) : currentView.key === 'texts' ? (
                <Button onClick={() => setIsCreateTextDrawerOpen(true)}>
                  Add text
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {showContent && currentView.key === 'posts' ? (
          <div className={s.galleryWrap}>
            <div className={s.galleryGrid}>
              {showSkeleton
                ? postSkeletonCards
                : (activeItems as IPost[]).map((item) => (
                    <PostItemCard
                      key={item.id}
                      item={item}
                      onSelect={handleSelectPost}
                      isSelected={selectedPosts.some((post) => post.id === item.id)}
                    />
                  ))}
            </div>
          </div>
        ) : null}

        {showContent && currentView.key === 'sets' ? (
          <div className={s.tableWrap}>
            <Table
              columns={setColumns}
              rows={
                showSkeleton
                  ? setSkeletonRows
                  : buildSetsTableRows(activeItems as IPostSet[], {
                      deletingId: deletePostSetMutation.variables,
                      isDeleting: deletePostSetMutation.isPending,
                      onDelete: handleDeletePostSet,
                    })
              }
              getRowProps={(row) => {
                const setId = typeof row.setId === 'string' ? row.setId : '';

                if (!setId) return {};

                const target = `/posts/sets/${setId}${searchString ? `?${searchString}` : ''}`;

                return {
                  className: s.clickableRow,
                  tabIndex: 0,
                  onClick: () => navigate(target),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(target);
                    }
                  },
                };
              }}
            />
          </div>
        ) : null}

        {showContent && currentView.key === 'images' ? (
          <div className={s.galleryWrap}>
            <div className={s.galleryGrid}>
              {showSkeleton
                ? imageSkeletonCards
                : (activeItems as IPostImg[]).map((item) => (
                    <PostImageCard
                      key={item.id}
                      item={item}
                      onDownload={handleDownloadPostImage}
                      isDownloading={downloadingImageId === item.id}
                      onDelete={handleDeletePostImage}
                      onSelect={handleSelectImage}
                      isDeleting={
                        deletePostImageMutation.isPending &&
                        deletePostImageMutation.variables === item.id
                      }
                      isDeleteDisabled={deletePostImageMutation.isPending}
                      isSelected={selectedItems.image?.id === item.id}
                    />
                  ))}
            </div>
          </div>
        ) : null}

        {showContent && currentView.key === 'texts' ? (
          <div className={s.galleryWrap}>
            <div className={s.textGrid}>
              {showSkeleton
                ? textSkeletonCards
                : (activeItems as IPostText[]).map((item) => (
                    <PostTextCard
                      key={item.id}
                      item={item}
                      onCopy={handleCopyPostText}
                      onDelete={handleDeletePostText}
                      onSelect={handleSelectText}
                      isDeleting={
                        deletePostTextMutation.isPending &&
                        deletePostTextMutation.variables === item.id
                      }
                      isDeleteDisabled={deletePostTextMutation.isPending}
                      isSelected={selectedItems.text?.id === item.id}
                    />
                  ))}
            </div>
          </div>
        ) : null}

        {showFooter ? (
          <div className={s.footer}>
            <Typography variant="meta" tone="muted">
              {total === 0
                ? 'No results'
                : `Showing ${rangeStart}-${rangeEnd} of ${total.toLocaleString()}`}
            </Typography>
            <div className={s.paginationRow}>
              <Select
                options={currentView.pageSizeOptions.map((size) => ({
                  label: `${size} / page`,
                  value: String(size),
                }))}
                size="sm"
                variant="ghost"
                value={String(pageSize)}
                onChange={(value) =>
                  updateSearchParams({
                    pageSize: Number(value),
                    page: 1,
                  })
                }
                fitContent
              />
              {totalPages > 1 ? (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={(nextPage) =>
                    updateSearchParams({ page: nextPage })
                  }
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </Container>
      <PostsImageCreateDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
        initialCharacterId={selectedScenarioLookup?.characterId}
        initialScenarioId={selectedScenarioLookup?.scenarioId}
      />
      <PostsTextCreateDrawer
        open={isCreateTextDrawerOpen}
        onOpenChange={setIsCreateTextDrawerOpen}
        initialCharacterId={selectedScenarioLookup?.characterId}
        initialScenarioId={selectedScenarioLookup?.scenarioId}
      />
    </AppShell>
  );
}
