import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { UpdateChatFeaturesDto, UpdateChatStageDto } from '@/common/types';

import {
  getChatDetails,
  getChats,
  type ChatsListParams,
  updateChatFeatures,
  updateChatStage,
} from './chatsApi';

const chatKeys = {
  list: (params: ChatsListParams) => ['chats', params] as const,
  details: (id: string) => ['chat', id] as const,
};

export function useChats(params: ChatsListParams, enabled = true) {
  return useQuery({
    queryKey: chatKeys.list(params),
    queryFn: () => getChats(params),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useChatDetails(id: string | null) {
  return useQuery({
    queryKey: chatKeys.details(id ?? ''),
    queryFn: () => getChatDetails(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useUpdateChatStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateChatStageDto;
    }) => updateChatStage(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.setQueryData(chatKeys.details(variables.id), data);
      notifySuccess('Chat stage updated.', 'Chat stage updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the chat stage.');
    },
  });
}

export function useUpdateChatFeatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateChatFeaturesDto;
    }) => updateChatFeatures(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.setQueryData(chatKeys.details(variables.id), data);
      notifySuccess('Chat features updated.', 'Chat features updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the chat features.');
    },
  });
}
