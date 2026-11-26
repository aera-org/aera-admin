import { useState } from 'react';

import { usePreviewPost } from '@/app/posts';
import { Button, Field, Input } from '@/atoms';

import s from './PostTelegramSend.module.scss';

const CHAT_ID_STORAGE_KEY = 'aera_admin_post_preview_chat_id';

function readChatId() {
  try {
    return window.localStorage.getItem(CHAT_ID_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveChatId(value: string) {
  try {
    window.localStorage.setItem(CHAT_ID_STORAGE_KEY, value);
  } catch {
    // ignore storage errors
  }
}

type PostTelegramSendProps = {
  postId: string;
  language: string;
  disabled?: boolean;
};

/** The posting bot sends the saved post to the admin's chat. */
export function PostTelegramSend({
  postId,
  language,
  disabled = false,
}: PostTelegramSendProps) {
  const [chatId, setChatId] = useState(readChatId);
  const [showError, setShowError] = useState(false);
  const previewMutation = usePreviewPost();

  const value = chatId.trim();
  const isValid = /^-?\d+$/.test(value);

  return (
    <Field
      label="Send to Telegram"
      labelFor="post-preview-chat-id"
      hint="Your chat id: the posting bot shows it on /start. The bot sends the saved post, so save your changes first."
      error={showError && !isValid ? 'Enter the chat id (digits).' : undefined}
    >
      <div className={s.row}>
        <Input
          id="post-preview-chat-id"
          size="sm"
          inputMode="numeric"
          placeholder="Chat id"
          value={chatId}
          invalid={showError && !isValid}
          disabled={disabled || previewMutation.isPending}
          wrapperClassName={s.input}
          fullWidth
          onChange={(event) => setChatId(event.target.value)}
        />
        <Button
          variant="secondary"
          size="sm"
          loading={previewMutation.isPending}
          disabled={disabled || previewMutation.isPending}
          onClick={() => {
            if (!isValid) {
              setShowError(true);
              return;
            }
            setShowError(false);
            saveChatId(value);
            previewMutation.mutate({
              id: postId,
              payload: { telegramChatId: Number(value), language },
            });
          }}
        >
          Send preview
        </Button>
      </div>
    </Field>
  );
}
