import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import { PostStatus } from '@/common/consts';
import type {
  IPost,
  IPostContext,
  IPostDetails,
  IPostVersion,
  PlatformType,
  PostCreateDto,
  PostListStatus,
  PostType,
} from '@/common/types';

type GeneratePostResponse = {
  generationId: string;
  postId: string;
};

type GenerationPostPayload = {
  id: string;
  title: string | null;
  status: PostStatus;
  createdAt: string;
  postType: PostType;
  platform: PlatformType;
  themeId: string;
  angleId: string | null;
  finalVersionId: string | null;
};

export type PostsListParams = {
  themeId?: string;
  status?: PostListStatus;
  platform?: PlatformType;
  profileId?: string;
  search?: string;
  skip?: number;
  take?: number;
};

type PaginatedResponse<T> = {
  total: number;
  data: T[];
  skip: number;
  take: number;
};

export type PostUpdateDto = {
  title?: string | null;
  status?: PostStatus;
  currentVersionId?: string;
};

export type PostGenerationPostEvent = {
  post: GenerationPostPayload;
};

export type PostGenerationResultEvent = {
  post: GenerationPostPayload;
  version: IPostVersion | null;
};

export type PostGenerationTitleEvent = {
  postId: string;
  title: string;
};

export type PostGenerationStreamHandlers = {
  onPost?: (payload: PostGenerationPostEvent) => void;
  onResult?: (payload: PostGenerationResultEvent) => void;
  onTitle?: (payload: PostGenerationTitleEvent) => void;
  onError?: (error: unknown) => void;
};

const generateFallbackError = 'Unable to generate the post.';
const postFallbackError = 'Unable to load the post.';
const streamFallbackError = 'Unable to stream the post generation.';
const postsFallbackError = 'Unable to load posts.';
const updateFallbackError = 'Unable to update the post.';
const editTextFallbackError = 'Unable to update post text.';
const deleteFallbackError = 'Unable to delete the post.';
const contextFallbackError = 'Unable to load post context.';
const versionsFallbackError = 'Unable to load post versions.';
const regenerateFallbackError = 'Unable to regenerate the post.';

export async function generatePost(payload: PostCreateDto) {
  const res = await apiFetch('/posts/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, generateFallbackError);
  }
  return (await res.json()) as GeneratePostResponse;
}

export async function getPostDetails(id: string) {
  const res = await apiFetch(`/posts/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, postFallbackError);
  }
  return (await res.json()) as IPostDetails;
}

export async function getPostContext(id: string) {
  const res = await apiFetch(`/posts/${id}/context`);
  if (!res.ok) {
    throw await buildApiError(res, contextFallbackError);
  }
  return (await res.json()) as IPostContext;
}

export async function getPostVersions(id: string) {
  const res = await apiFetch(`/posts/${id}/versions`);
  if (!res.ok) {
    throw await buildApiError(res, versionsFallbackError);
  }
  return (await res.json()) as IPostVersion[];
}

export async function getPosts(params: PostsListParams) {
  const query = new URLSearchParams();
  if (params.themeId) query.set('themeId', params.themeId);
  if (params.status) query.set('status', params.status);
  if (params.platform) query.set('platform', params.platform);
  if (params.profileId) query.set('profileId', params.profileId);
  if (params.search) query.set('search', params.search);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/posts${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, postsFallbackError);
  }
  return (await res.json()) as PaginatedResponse<IPost>;
}

export async function patchPost(id: string, payload: PostUpdateDto) {
  const res = await apiFetch(`/posts/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as IPostDetails;
}

export async function editPostText(id: string, text: string) {
  const res = await apiFetch(`/posts/${id}/edit-text`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw await buildApiError(res, editTextFallbackError);
  }
}

type RegeneratePostResponse = {
  post: {
    id: string;
    status?: PostStatus;
    updatedAt?: string;
    currentVersionId?: string;
  };
  postVersion: IPostVersion;
};

export async function regeneratePost(id: string) {
  const res = await apiFetch(`/posts/${id}/regenerate`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw await buildApiError(res, regenerateFallbackError);
  }
  return (await res.json()) as RegeneratePostResponse;
}

export async function deletePost(id: string) {
  const res = await apiFetch(`/posts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
}

export async function streamPostGeneration(
  generationId: string,
  handlers: PostGenerationStreamHandlers,
  signal: AbortSignal,
) {
  const res = await apiFetch(`/posts/generate/${generationId}/stream`, {
    headers: { Accept: 'text/event-stream' },
    signal,
  });
  if (!res.ok || !res.body) {
    throw await buildApiError(res, streamFallbackError);
  }

  await readSseStream(res.body, handlers, signal);
}

type StreamReader = ReadableStream<Uint8Array>;

async function readSseStream(
  stream: StreamReader,
  handlers: PostGenerationStreamHandlers,
  signal: AbortSignal,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let eventName = 'message';
  let dataLines: string[] = [];

  const dispatch = (event: string, data: string) => {
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (event === 'post') {
        handlers.onPost?.(parsed as PostGenerationPostEvent);
        return;
      }
      if (event === 'result') {
        handlers.onResult?.(parsed as PostGenerationResultEvent);
        return;
      }
      if (event === 'title') {
        handlers.onTitle?.(parsed as PostGenerationTitleEvent);
      }
    } catch (error) {
      handlers.onError?.(error);
    }
  };

  try {
    while (true) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line) {
          if (dataLines.length) {
            dispatch(eventName, dataLines.join('\n'));
          }
          eventName = 'message';
          dataLines = [];
          continue;
        }
        if (line.startsWith(':')) continue;
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
          continue;
        }
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      handlers.onError?.(error);
    }
  } finally {
    if (dataLines.length) {
      dispatch(eventName, dataLines.join('\n'));
    }
    reader.releaseLock();
  }
}
