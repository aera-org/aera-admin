import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { IPost } from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';
import {
  createPost,
  type CreatePostDto,
  getPosts,
  type PostsListParams,
  updatePost,
  type UpdatePostDto,
} from './postsApi';

const postKeys = {
  posts: (params: PostsListParams) => ['posts', 'items', params] as const,
};

type PostsQueryOptions<T> = {
  enabled?: boolean;
  placeholderData?: (previousData: T | undefined) => T | undefined;
};

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

function buildQueryOptions<T>(options: PostsQueryOptions<PaginatedResponse<T>>) {
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

type PostUpdateOptions = {
  id: string;
  payload: UpdatePostDto;
};

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: PostUpdateOptions) => updatePost(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      notifySuccess('Post updated.', 'Post updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the post.');
    },
  });
}
