import {
  ArrowDownIcon,
  ArrowUpIcon,
  Cross1Icon,
  PlusIcon,
} from '@radix-ui/react-icons';

import { Button, IconButton, Input, Select, Typography } from '@/atoms';
import { type IPostButton, PostButtonStyle } from '@/common/types';

import { getButtonError } from '../postCaption';
import s from './PostButtonsEditor.module.scss';

type PostButtonsEditorProps = {
  buttons: IPostButton[];
  onChange: (buttons: IPostButton[]) => void;
  limit: number;
  textLimit: number;
  disabled?: boolean;
  showErrors?: boolean;
};

const STYLE_OPTIONS = [
  { value: PostButtonStyle.Default, label: 'Default', swatch: s.swatchDefault },
  { value: PostButtonStyle.Primary, label: 'Blue', swatch: s.swatchPrimary },
  { value: PostButtonStyle.Success, label: 'Green', swatch: s.swatchSuccess },
  { value: PostButtonStyle.Danger, label: 'Red', swatch: s.swatchDanger },
].map((option) => ({
  value: option.value,
  label: (
    <span className={s.styleOption}>
      <span className={[s.swatch, option.swatch].join(' ')} />
      {option.label}
    </span>
  ),
}));

/** Url buttons under the post: each on its own row, opening the deeplink. */
export function PostButtonsEditor({
  buttons,
  onChange,
  limit,
  textLimit,
  disabled = false,
  showErrors = false,
}: PostButtonsEditorProps) {
  const update = (index: number, patch: Partial<IPostButton>) =>
    onChange(buttons.map((b, i) => (i === index ? { ...b, ...patch } : b)));

  const move = (index: number, shift: -1 | 1) => {
    const next = [...buttons];
    [next[index], next[index + shift]] = [next[index + shift], next[index]];
    onChange(next);
  };

  return (
    <div className={s.root}>
      {buttons.map((button, index) => {
        const error = showErrors
          ? getButtonError(button, textLimit)
          : undefined;

        return (
          <div key={index} className={s.row}>
            <div className={s.fields}>
              <Input
                size="sm"
                value={button.text}
                placeholder="🫖 Sit with her"
                maxLength={textLimit}
                invalid={Boolean(error)}
                disabled={disabled}
                fullWidth
                wrapperClassName={s.textInput}
                onChange={(event) =>
                  // translations are of the old text: made again on save
                  update(index, {
                    text: event.target.value,
                    localizations: {},
                  })
                }
              />
              <Select
                size="sm"
                options={STYLE_OPTIONS}
                value={button.style}
                onChange={(value) =>
                  update(index, { style: value as PostButtonStyle })
                }
                disabled={disabled}
                triggerClassName={s.styleSelect}
              />
              <IconButton
                aria-label="Move up"
                tooltip="Move up"
                variant="ghost"
                size="sm"
                icon={<ArrowUpIcon />}
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              />
              <IconButton
                aria-label="Move down"
                tooltip="Move down"
                variant="ghost"
                size="sm"
                icon={<ArrowDownIcon />}
                disabled={disabled || index === buttons.length - 1}
                onClick={() => move(index, 1)}
              />
              <IconButton
                aria-label="Remove button"
                tooltip="Remove"
                variant="ghost"
                tone="danger"
                size="sm"
                icon={<Cross1Icon />}
                disabled={disabled}
                onClick={() => onChange(buttons.filter((_, i) => i !== index))}
              />
            </div>
            {error ? (
              <Typography variant="caption" tone="danger">
                {error}
              </Typography>
            ) : null}
          </div>
        );
      })}

      <div className={s.footer}>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || buttons.length >= limit}
          onClick={() =>
            onChange([
              ...buttons,
              { text: '', style: PostButtonStyle.Default, localizations: {} },
            ])
          }
        >
          <PlusIcon /> Add button
        </Button>
        <Typography variant="caption" tone="muted">
          {buttons.length}/{limit}. Each opens the post link with the partner
          ref. Translations are made on save.
        </Typography>
      </div>
    </div>
  );
}
