import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type {
  IPost,
  IPostImg,
  IPostSet,
  IPostText,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';
import {
  createPost,
  type CreatePostDto,
  createPostImage,
  type CreatePostImageDto,
  createPostSet,
  type CreatePostSetDto,
  createPostSetRef,
  type CreatePostSetRefDto,
  createPostText,
  type CreatePostTextDto,
  deletePostImage,
  deletePostSet,
  deletePostText,
  getPostImages,
  getPosts,
  getPostSetDetails,
  getPostSets,
  getPostTexts,
  type PostsListParams,
  updatePostSet,
  type UpdatePostSetDto,
} from './postsApi';

const postKeys = {
  posts: (params: PostsListParams) => ['posts', 'items', params] as const,
  sets: (params: PostsListParams) => ['posts', 'sets', params] as const,
  images: (params: PostsListParams) => ['posts', 'images', params] as const,
  texts: (params: PostsListParams) => ['posts', 'texts', params] as const,
};

type PostsQueryOptions<T> = {
  enabled?: boolean;
  placeholderData?: (
    previousData: T | undefined,
  ) => T | undefined;
};

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

function buildQueryOptions<T>(
  options: PostsQueryOptions<PaginatedResponse<T>>,
) {
  return {
    placeholderData: options.placeholderData ?? ((previousData) => previousData),
    enabled: options.enabled ?? true,
    staleTime: DEFAULT_STALE_TIME,
  };
}

export function usePosts(
  params: PostsListParams,
  options: PostsQueryOptions<PaginatedResponse<IPost>> = {},
) {
  return useQuery({
    queryKey: postKeys.posts(params),
    queryFn: () => getPosts(params),
    ...buildQueryOptions(options),
  });
}

export function usePostSets(
  params: PostsListParams,
  options: PostsQueryOptions<PaginatedResponse<IPostSet>> = {},
) {
  return useQuery({
    queryKey: postKeys.sets(params),
    queryFn: () => getPostSets(params),
    ...buildQueryOptions(options),
  });
}

export function usePostSetDetails(id: string, enabled = true) {
  return useQuery({
    queryKey: ['posts', 'set-details', id],
    queryFn: () => getPostSetDetails(id),
    enabled: enabled && Boolean(id),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function usePostImages(
  params: PostsListParams,
  options: PostsQueryOptions<PaginatedResponse<IPostImg>> = {},
) {
  return useQuery({
    queryKey: postKeys.images(params),
    queryFn: () => getPostImages(params),
    ...buildQueryOptions(options),
  });
}

export function usePostTexts(
  params: PostsListParams,
  options: PostsQueryOptions<PaginatedResponse<IPostText>> = {},
) {
  return useQuery({
    queryKey: postKeys.texts(params),
    queryFn: () => getPostTexts(params),
    ...buildQueryOptions(options),
  });
}

export function useCreatePostSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePostSetDto) => createPostSet(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      notifySuccess('Post set created.', 'Post set created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the post set.');
    },
  });
}

type PostSetRefCreateOptions = {
  id: string;
  payload: CreatePostSetRefDto;
};

export function useCreatePostSetRef() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: PostSetRefCreateOptions) =>
      createPostSetRef(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({
        queryKey: ['posts', 'set-details', variables.id],
      });
      notifySuccess('Ref added.', 'Ref added.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to add the post set ref.');
    },
  });
}

type PostSetUpdateOptions = {
  id: string;
  payload: UpdatePostSetDto;
};

export function useUpdatePostSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: PostSetUpdateOptions) => updatePostSet(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({
        queryKey: ['posts', 'set-details', variables.id],
      });
      notifySuccess('Post set updated.', 'Post set updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the post set.');
    },
  });
}

export function useDeletePostSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePostSet(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'set-details', id] });
      notifySuccess('Post set deleted.', 'Post set deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the post set.');
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePostDto) => createPost(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      notifySuccess('Post created.', 'Post created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the post.');
    },
  });
}

type CreatePostImageOptions = {
  silentSuccess?: boolean;
};

export function useCreatePostImage(options: CreatePostImageOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePostImageDto) => createPostImage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (!options.silentSuccess) {
        notifySuccess('Post image created.', 'Post image created.');
      }
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the post image.');
    },
  });
}

export function useCreatePostText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePostTextDto) => createPostText(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      notifySuccess('Post text created.', 'Post text created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the post text.');
    },
  });
}

export function useDeletePostImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePostImage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      notifySuccess('Post image deleted.', 'Post image deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the post image.');
    },
  });
}

export function useDeletePostText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePostText(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      notifySuccess('Post text deleted.', 'Post text deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the post text.');
    },
  });
}
