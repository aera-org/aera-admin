import type { ReactNode } from 'react';

import { PostButtonStyle, PostType } from '@/common/types';

import { type CaptionToken, parseCaption } from '../postCaption';
import s from './TelegramPostPreview.module.scss';

type TelegramPostPreviewProps = {
  mediaType: PostType;
  mediaUrl?: string;
  text: string;
  shortLink: string;
  buttons: { text: string; style: PostButtonStyle }[];
};

const BUTTON_CLASS: Record<PostButtonStyle, string> = {
  [PostButtonStyle.Default]: s.buttonDefault,
  [PostButtonStyle.Primary]: s.buttonPrimary,
  [PostButtonStyle.Success]: s.buttonSuccess,
  [PostButtonStyle.Danger]: s.buttonDanger,
};

function renderToken(token: CaptionToken, key: number): ReactNode {
  switch (token.kind) {
    case 'bold':
      return <b key={key}>{token.text}</b>;
    case 'italic':
      return <i key={key}>{token.text}</i>;
    case 'code':
      return (
        <code key={key} className={s.code}>
          {token.text}
        </code>
      );
    case 'pre':
      return (
        <pre key={key} className={s.pre}>
          {token.text}
        </pre>
      );
    case 'link':
      // shown, never opened: the url comes from the post text
      return (
        <span key={key} className={s.link} title={token.url}>
          {token.text}
        </span>
      );
    default:
      return token.text;
  }
}

/** The post as the posting bot sends it, in Telegram's dark theme. */
export function TelegramPostPreview({
  mediaType,
  mediaUrl,
  text,
  shortLink,
  buttons,
}: TelegramPostPreviewProps) {
  return (
    <div className={s.root}>
      <div className={s.bubble}>
        {mediaUrl ? (
          mediaType === PostType.Video ? (
            <video
              className={s.media}
              src={mediaUrl}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img className={s.media} src={mediaUrl} alt="" loading="lazy" />
          )
        ) : (
          <div className={s.mediaEmpty}>No media</div>
        )}
        <div className={s.caption}>
          {parseCaption(text).map(renderToken)}
          {'\n\n'}
          <span className={s.link}>{shortLink}</span>
        </div>
      </div>
      {buttons.length ? (
        <div className={s.buttons}>
          {buttons.map((button, index) => (
            <div
              key={index}
              className={[s.button, BUTTON_CLASS[button.style]].join(' ')}
            >
              {button.text || ' '}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
