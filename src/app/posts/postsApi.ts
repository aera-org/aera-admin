import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import { type IPost, PostType } from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type PostsListParams = {
  search?: string;
  scenarioId?: string;
  isActive?: boolean;
  skip?: number;
  take?: number;
};

type PostBaseDto = {
  scenarioId: string;
  text: string;
  isActive: boolean;
};

export type CreatePostDto =
  | (PostBaseDto & {
      type: PostType.Img;
      imgId: string;
    })
  | (PostBaseDto & {
      type: PostType.Video;
      videoId: string;
    });

export type UpdatePostDto = CreatePostDto;

const listFallbackError = 'Unable to load posts.';
const createFallbackError = 'Unable to create the post.';
const updateFallbackError = 'Unable to update the post.';
const deleteFallbackError = 'Unable to delete the post.';

function buildListQuery(params: PostsListParams) {
  const query = new URLSearchParams();

  if (params.search) query.set('search', params.search);
  if (params.scenarioId) query.set('scenarioId', params.scenarioId);
  if (typeof params.isActive === 'boolean') {
    query.set('isActive', String(params.isActive));
  }
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

function normalizePaginatedResponse<T>(value: unknown): PaginatedResponse<T> {
  if (Array.isArray(value)) {
    return {
      data: value as T[],
      total: value.length,
      skip: 0,
      take: value.length,
    };
  }

  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    const response = value as Partial<PaginatedResponse<T>>;
    const data = Array.isArray(response.data) ? response.data : [];

    return {
      data,
      total: typeof response.total === 'number' ? response.total : data.length,
      skip: typeof response.skip === 'number' ? response.skip : 0,
      take: typeof response.take === 'number' ? response.take : data.length,
    };
  }

  return {
    data: [],
    total: 0,
    skip: 0,
    take: 0,
  };
}

export async function getPosts(params: PostsListParams) {
  const res = await apiFetch(`/admin/posts${buildListQuery(params)}`);
  if (!res.ok) {
    throw await buildApiError(res, listFallbackError);
  }

  return normalizePaginatedResponse<IPost>(await res.json());
}

export async function createPost(payload: CreatePostDto) {
  const res = await apiFetch('/admin/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as IPost;
}

export async function updatePost(id: string, payload: UpdatePostDto) {
  const res = await apiFetch(`/admin/posts/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as IPost;
}

export async function deletePost(id: string) {
  const res = await apiFetch(`/admin/posts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
}
