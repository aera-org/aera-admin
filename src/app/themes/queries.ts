import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type {
  AngleCreateDto,
  IAngle,
  ITheme,
  IThemeDetails,
  ThemeCreateDto,
  ThemeUpdateDto,
} from '@/common/types';

import {
  createAngle,
  createTheme,
  getTheme,
  getThemes,
  removeAngle,
  removeTheme,
  updateTheme,
} from './themesApi';

const themeKeys = {
  list: () => ['themes'] as const,
  details: (id: string) => ['theme', id] as const,
};

function toThemeListItem(theme: ITheme | IThemeDetails): ITheme {
  if ('recentPostsCount' in theme) return theme;
  return {
    id: theme.id,
    name: theme.name,
    recentPostsCount: theme.recentPosts?.length ?? 0,
  };
}

export function useThemes() {
  return useQuery({
    queryKey: themeKeys.list(),
    queryFn: getThemes,
  });
}

export function useTheme(id: string | null) {
  return useQuery({
    queryKey: themeKeys.details(id ?? ''),
    queryFn: () => getTheme(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ThemeCreateDto) => createTheme(payload),
    onSuccess: (data) => {
      if (!data?.id) {
        queryClient.invalidateQueries({ queryKey: themeKeys.list() });
        return;
      }
      queryClient.setQueryData<ITheme[]>(themeKeys.list(), (prev) => {
        const next = toThemeListItem(data);
        return prev ? [next, ...prev] : [next];
      });
    },
    onError: (error) => {
      notifyError(error, 'Unable to create theme.');
    },
  });
}

export function useUpdateTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ThemeUpdateDto }) =>
      updateTheme(id, payload),
    onSuccess: (data, variables) => {
      if (!data?.id) {
        queryClient.invalidateQueries({ queryKey: themeKeys.list() });
        queryClient.invalidateQueries({
          queryKey: themeKeys.details(variables.id),
        });
        return;
      }
      queryClient.setQueryData<IThemeDetails>(themeKeys.details(data.id), data);
      queryClient.setQueryData<ITheme[]>(themeKeys.list(), (prev) =>
        prev
          ? prev.map((theme) =>
              theme.id === data.id ? toThemeListItem(data) : theme,
            )
          : prev,
      );
    },
    onError: (error) => {
      notifyError(error, 'Unable to update theme.');
    },
  });
}

export function useRemoveTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeTheme(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<ITheme[]>(themeKeys.list(), (prev) =>
        prev ? prev.filter((theme) => theme.id !== id) : prev,
      );
      queryClient.removeQueries({ queryKey: themeKeys.details(id) });
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete theme.');
    },
  });
}

export function useCreateAngle(themeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { themeId: string; data: AngleCreateDto }) =>
      createAngle(payload.themeId, payload.data),
    onSuccess: (angle: IAngle) => {
      queryClient.setQueryData<IThemeDetails>(
        themeKeys.details(themeId),
        (prev) =>
          prev
            ? {
                ...prev,
                angles: [...prev.angles, angle],
              }
            : prev,
      );
    },
    onError: (error) => {
      notifyError(error, 'Unable to create angle.');
    },
  });
}

export function useRemoveAngle(themeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { themeId: string; angleId: string }) =>
      removeAngle(payload.themeId, payload.angleId),
    onSuccess: (_, payload) => {
      queryClient.setQueryData<IThemeDetails>(
        themeKeys.details(themeId),
        (prev) => {
          if (!prev) return prev;
          const nextAngles = prev.angles.filter(
            (angle) => angle.id !== payload.angleId,
          );
          const isDefaultRemoved = prev.defaultAngleId === payload.angleId;
          return {
            ...prev,
            angles: nextAngles,
            defaultAngleId: isDefaultRemoved
              ? (nextAngles[0]?.id ?? '')
              : prev.defaultAngleId,
          };
        },
      );
      notifySuccess('Angle removed.', 'Angle removed.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to remove angle.');
    },
  });
}
