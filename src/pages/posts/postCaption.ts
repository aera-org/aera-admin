import type { IPost, IPostButton } from '@/common/types';

/**
 * A piece of the caption as Telegram shows it. Post texts are written in
 * Telegram's legacy Markdown: *bold*, _italic_, `code`, ```pre```,
 * [text](url) and \-escapes. The bot converts them the same way
 * (markdownToHtml in the backend post module).
 */
export type CaptionToken =
  | { kind: 'text' | 'bold' | 'italic' | 'code' | 'pre'; text: string }
  | { kind: 'link'; text: string; url: string };

const INLINE_KIND = {
  '*': 'bold',
  _: 'italic',
  '`': 'code',
} as const;

export function parseCaption(md: string): CaptionToken[] {
  const tokens: CaptionToken[] = [];
  let plain = '';
  let i = 0;

  const push = (token: CaptionToken) => {
    if (plain) {
      tokens.push({ kind: 'text', text: plain });
      plain = '';
    }
    tokens.push(token);
  };

  while (i < md.length) {
    const c = md[i];

    // \_ \* \` \[ are the characters themselves
    if (c === '\\' && '_*`['.includes(md[i + 1] ?? '\0')) {
      plain += md[i + 1];
      i += 2;
      continue;
    }

    if (md.startsWith('```', i)) {
      const end = md.indexOf('```', i + 3);

      if (end !== -1) {
        let body = md.slice(i + 3, end);
        const nl = body.indexOf('\n');

        // a language name on the first line is not shown
        if (nl > 0 && /^[\w+-]+$/.test(body.slice(0, nl))) {
          body = body.slice(nl + 1);
        }

        push({ kind: 'pre', text: body });
        i = end + 3;
        continue;
      }
    }

    if (c === '*' || c === '_' || c === '`') {
      const end = md.indexOf(c, i + 1);

      if (end !== -1) {
        push({ kind: INLINE_KIND[c], text: md.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    if (c === '[') {
      const link = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(md.slice(i));

      if (link) {
        push({ kind: 'link', text: link[1], url: link[2] });
        i += link[0].length;
        continue;
      }
    }

    // a marker that is never closed stays as text
    plain += c;
    i++;
  }

  if (plain) tokens.push({ kind: 'text', text: plain });

  return tokens;
}

/** Caption length as Telegram counts it: the visible text and the link. */
export function captionLength(text: string, shortLink: string) {
  const visible = parseCaption(text).reduce((n, t) => n + t.text.length, 0);

  return visible + 2 + shortLink.length;
}

export const PREVIEW_EN = 'en';

/** 'en' and the languages the post is translated to. */
export function getPostLanguages(
  localizations: Partial<Record<string, string>>,
) {
  return [
    PREVIEW_EN,
    ...Object.entries(localizations)
      .filter(([, text]) => typeof text === 'string' && text.trim())
      .map(([language]) => language),
  ];
}

export function getPostTextIn(
  values: { text: string; localizations: Partial<Record<string, string>> },
  language: string,
) {
  if (language === PREVIEW_EN) return values.text;
  return values.localizations[language]?.trim() || values.text;
}

export function getButtonTextIn(button: IPostButton, language: string) {
  if (language === PREVIEW_EN) return button.text;
  return (
    button.localizations[language as keyof IPostButton['localizations']] ||
    button.text
  );
}

/** Languages whose saved caption does not fit. */
export function getTooLongLanguages(post: IPost, limit: number) {
  return Object.entries(post.captionLength ?? {})
    .filter(([, length]) => (length ?? 0) > limit)
    .map(([language]) => language);
}

export function getButtonError(button: IPostButton, textLimit: number) {
  const text = button.text.trim();
  if (!text) return 'Enter the button text.';
  if (text.length > textLimit) return `Up to ${textLimit} characters.`;
  return undefined;
}

export function formatCaptionLength(length: number, limit: number) {
  return `${length} / ${limit} characters with the link`;
}
