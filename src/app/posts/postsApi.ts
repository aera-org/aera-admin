import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  IPost,
  IPostImg,
  IPostSet,
  IPostSetDetails,
  IPostText,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type PostsListParams = {
  search?: string;
  scenarioId?: string;
  skip?: number;
  take?: number;
};

export type CreatePostImageDto = {
  fileId: string;
  scenarioId: string;
  note?: string;
};

export type CreatePostTextDto = {
  scenarioId: string;
  value: string;
  note?: string;
};

export type CreatePostDto = {
  scenarioId: string;
  imgId: string;
  textId: string;
};

export type CreatePostSetDto = {
  postIds: string[];
};

export type UpdatePostSetDto = {
  note?: string;
};

export type CreatePostSetRefDto = {
  ref: string;
};

const postsFallbackError = 'Unable to load posts.';
const setsFallbackError = 'Unable to load post sets.';
const setDetailsFallbackError = 'Unable to load the post set.';
const imagesFallbackError = 'Unable to load post images.';
const textsFallbackError = 'Unable to load post texts.';
const createPostFallbackError = 'Unable to create the post.';
const createSetFallbackError = 'Unable to create the post set.';
const createSetRefFallbackError = 'Unable to add the post set ref.';
const updateSetFallbackError = 'Unable to update the post set.';
const deleteSetFallbackError = 'Unable to delete the post set.';
const createImageFallbackError = 'Unable to create the post image.';
const createTextFallbackError = 'Unable to create the post text.';
const deleteImageFallbackError = 'Unable to delete the post image.';
const deleteTextFallbackError = 'Unable to delete the post text.';

function buildListQuery(params: PostsListParams) {
  const query = new URLSearchParams();

  if (params.search) query.set('search', params.search);
  if (params.scenarioId) query.set('scenarioId', params.scenarioId);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

function normalizePaginatedResponse<T>(
  value: unknown,
): PaginatedResponse<T> {
  if (Array.isArray(value)) {
    return {
      data: value as T[],
      total: value.length,
      skip: 0,
      take: value.length,
    };
  }

  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
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

async function getPostsList<T>(
  path: string,
  params: PostsListParams,
  fallbackError: string,
) {
  const res = await apiFetch(`${path}${buildListQuery(params)}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }

  return normalizePaginatedResponse<T>(await res.json());
}

export async function getPosts(params: PostsListParams) {
  return getPostsList<IPost>('/admin/posts', params, postsFallbackError);
}

export async function getPostSets(params: PostsListParams) {
  return getPostsList<IPostSet>('/admin/posts/sets', params, setsFallbackError);
}

export async function getPostSetDetails(id: string) {
  const res = await apiFetch(`/admin/posts/sets/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, setDetailsFallbackError);
  }
  return (await res.json()) as IPostSetDetails;
}

export async function getPostImages(params: PostsListParams) {
  return getPostsList<IPostImg>('/admin/posts/images', params, imagesFallbackError);
}

export async function getPostTexts(params: PostsListParams) {
  return getPostsList<IPostText>('/admin/posts/texts', params, textsFallbackError);
}

export async function createPost(payload: CreatePostDto) {
  const res = await apiFetch('/admin/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createPostFallbackError);
  }
  return (await res.json()) as IPost;
}

export async function createPostSet(payload: CreatePostSetDto) {
  const res = await apiFetch('/admin/posts/sets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createSetFallbackError);
  }
  return (await res.json()) as IPostSetDetails;
}

export async function updatePostSet(id: string, payload: UpdatePostSetDto) {
  const res = await apiFetch(`/admin/posts/sets/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateSetFallbackError);
  }
  return (await res.json()) as IPostSetDetails;
}

export async function createPostSetRef(id: string, payload: CreatePostSetRefDto) {
  const res = await apiFetch(`/admin/posts/sets/${id}/refs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createSetRefFallbackError);
  }
  return (await res.json()) as IPostSetDetails;
}

export async function deletePostSet(id: string) {
  const res = await apiFetch(`/admin/posts/sets/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteSetFallbackError);
  }
}

export async function createPostImage(payload: CreatePostImageDto) {
  const res = await apiFetch('/admin/posts/images', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createImageFallbackError);
  }
  return (await res.json()) as IPostImg;
}

export async function createPostText(payload: CreatePostTextDto) {
  const res = await apiFetch('/admin/posts/texts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createTextFallbackError);
  }
  return (await res.json()) as IPostText;
}

export async function deletePostImage(id: string) {
  const res = await apiFetch(`/admin/posts/images/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteImageFallbackError);
  }
}

export async function deletePostText(id: string) {
  const res = await apiFetch(`/admin/posts/texts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteTextFallbackError);
  }
}
