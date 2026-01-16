import { useQuery } from '@tanstack/react-query';

import { getPosts, type PostsListParams } from './postsApi';

const postKeys = {
  list: (params: PostsListParams) => ['posts', params] as const,
};

export function usePosts(params: PostsListParams) {
  return useQuery({
    queryKey: postKeys.list(params),
    queryFn: () => getPosts(params),
  });
}
