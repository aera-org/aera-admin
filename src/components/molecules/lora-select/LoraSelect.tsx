import { useEffect, useMemo, useState } from 'react';

import { Input, Popover, Typography } from '@/atoms';
import { cn } from '@/common/utils';

import s from './LoraSelect.module.scss';

type LoraOption = {
  id: string;
  fileName: string;
};

type LoraSelectProps = {
  id?: string;
  value: string;
  options: LoraOption[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
};

export function LoraSelect({
  id,
  value,
  options,
  search,
  onSearchChange,
  onSelect,
  placeholder = 'Select LoRA',
  disabled = false,
  loading = false,
}: LoraSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<{
    id: string;
    fileName: string;
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

  const cachedLabel =
    selectedLabel?.id === value ? selectedLabel.fileName : '';
  const inputValue = open ? search : selected?.fileName || cachedLabel || '';

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      disableTriggerToggle
      content={
        <div className={s.menu}>
          {loading ? (
            <Typography variant="caption" tone="muted">
              Loading LoRAs...
            </Typography>
          ) : options.length === 0 ? (
            <Typography variant="caption" tone="muted">
              No LoRAs found.
            </Typography>
          ) : (
            <div className={s.menuList}>
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(s.optionButton, [], {
                    [s.optionActive]: option.id === value,
                  })}
                  onClick={() => {
                    setSelectedLabel({
                      id: option.id,
                      fileName: option.fileName,
                    });
                    onSelect(option.id);
                    setOpen(false);
                  }}
                >
                  <span className={s.optionName}>{option.fileName}</span>
                  <span className={s.optionMeta}>{option.id}</span>
                </button>
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
          />
        </div>
      }
    />
  );
}
