import { useEffect, useMemo, useState } from 'react';

import { Button, Input, Popover, Typography } from '@/atoms';
import { cn } from '@/common/utils';

import s from './SearchSelect.module.scss';

export type SearchSelectOption = {
  id: string;
  label: string;
  meta?: string;
};

type SearchSelectProps = {
  id?: string;
  value: string;
  valueLabel?: string;
  options: SearchSelectOption[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  emptyLabel?: string;
  loadingLabel?: string;
  clearLabel?: string;
};

export function SearchSelect({
  id,
  value,
  valueLabel,
  options,
  search,
  onSearchChange,
  onSelect,
  placeholder = 'Select',
  disabled = false,
  loading = false,
  invalid = false,
  emptyLabel = 'No results found.',
  loadingLabel = 'Loading...',
  clearLabel = 'Any',
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (!open) {
      onSearchChange('');
    }
  }, [open, onSearchChange]);

  const cachedLabel = selectedLabel?.id === value ? selectedLabel.label : '';
  const resolvedLabel = value
    ? selected?.label || valueLabel || cachedLabel || value
    : '';
  const inputValue = open ? search : resolvedLabel;
  const canClear = Boolean(value) && !disabled && !loading;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      disableTriggerToggle
      content={
        <div className={s.menu}>
          {canClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              fullWidth
              className={s.optionButton}
              onClick={() => {
                setSelectedLabel(null);
                onSelect('');
                setOpen(false);
              }}
            >
              <span className={s.optionContent}>
                <span className={s.optionLabel}>{clearLabel}</span>
              </span>
            </Button>
          ) : null}
          {loading ? (
            <Typography variant="caption" tone="muted">
              {loadingLabel}
            </Typography>
          ) : options.length === 0 ? (
            <Typography variant="caption" tone="muted">
              {emptyLabel}
            </Typography>
          ) : (
            <div className={s.menuList}>
              {options.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  fullWidth
                  className={cn(s.optionButton, [], {
                    [s.optionActive]: option.id === value,
                  })}
                  onClick={() => {
                    setSelectedLabel({ id: option.id, label: option.label });
                    onSelect(option.id);
                    setOpen(false);
                  }}
                >
                  <span className={s.optionContent}>
                    <span className={s.optionLabel}>{option.label}</span>
                    {option.meta ? (
                      <span className={s.optionMeta}>{option.meta}</span>
                    ) : null}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>
      }
      trigger={
        <div className={s.trigger}>
          <Input
            id={id}
            size="sm"
            value={inputValue}
            onChange={(event) => {
              onSearchChange(event.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            fullWidth
            disabled={disabled}
            invalid={invalid}
          />
        </div>
      }
    />
  );
}
