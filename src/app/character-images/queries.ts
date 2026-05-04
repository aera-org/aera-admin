import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type {
  CreateCharacterImageDto,
  UpdateCharacterImageDto,
} from '@/common/types';

import {
  createCharacterImage,
  deleteCharacterImage,
  getCharacterImageDetails,
  getCharacterImages,
  updateCharacterImage,
  type CharacterImagesListParams,
} from './characterImagesApi';

const characterImageKeys = {
  list: (params: CharacterImagesListParams) =>
    ['character-images', params] as const,
  detail: (id: string) => ['character-images', 'detail', id] as const,
};

export function useCharacterImages(params: CharacterImagesListParams) {
  return useQuery({
    queryKey: characterImageKeys.list(params),
    queryFn: () => getCharacterImages(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCharacterImageDetails(id: string | null) {
  return useQuery({
    queryKey: characterImageKeys.detail(id ?? ''),
    queryFn: () => getCharacterImageDetails(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateCharacterImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCharacterImageDto) =>
      createCharacterImage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character-images'] });
      notifySuccess('Image created.', 'Image created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the image.');
    },
  });
}

export function useUpdateCharacterImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateCharacterImageDto;
    }) => updateCharacterImage(id, payload),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.setQueryData(characterImageKeys.detail(variables.id), data);
      }
      queryClient.invalidateQueries({ queryKey: ['character-images'] });
      queryClient.invalidateQueries({
        queryKey: characterImageKeys.detail(variables.id),
      });
      notifySuccess('Image updated.', 'Image updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the image.');
    },
  });
}

export function useDeleteCharacterImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCharacterImage(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['character-images'] });
      queryClient.removeQueries({ queryKey: characterImageKeys.detail(id) });
      notifySuccess('Image deleted.', 'Image deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the image.');
    },
  });
}
