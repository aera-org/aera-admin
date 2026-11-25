import { useState } from 'react';

import { useUpdateConfig } from '@/app/config';
import { Button, Field, Input, Modal } from '@/atoms';
import {
  CONFIG_VALUE_MAX,
  type ConfigScope,
  type IConfigItem,
} from '@/common/types';

import { getConfigLabel } from './configLabels';
import s from './ConfigPage.module.scss';

type ConfigEditModalProps = {
  scope: ConfigScope;
  item: IConfigItem;
  onClose: () => void;
};

function parseValue(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > CONFIG_VALUE_MAX) {
    return null;
  }
  return parsed;
}

/** Mount with a `key` per item so the input resets between items. */
export function ConfigEditModal({ scope, item, onClose }: ConfigEditModalProps) {
  const updateMutation = useUpdateConfig(scope);
  const [value, setValue] = useState(() => String(item.value));
  const [showError, setShowError] = useState(false);

  const parsed = parseValue(value);
  const isBusy = updateMutation.isPending;
  const error =
    showError && parsed === null
      ? `Enter a whole number from 0 to ${CONFIG_VALUE_MAX.toLocaleString()}.`
      : undefined;

  const handleClose = () => {
    if (isBusy) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (parsed === null) {
      setShowError(true);
      return;
    }
    if (parsed !== item.value) {
      await updateMutation.mutateAsync({ key: item.key, value: parsed });
    }
    onClose();
  };

  return (
    <Modal
      open
      title={getConfigLabel(scope, item)}
      onClose={handleClose}
      actions={
        <div className={s.modalActions}>
          <Button variant="secondary" onClick={handleClose} disabled={isBusy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isBusy} disabled={isBusy}>
            Save
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Field
          label="Value"
          labelFor="config-value"
          hint={`Default: ${item.defaultValue}`}
          error={error}
        >
          <Input
            id="config-value"
            size="sm"
            type="number"
            min={0}
            max={CONFIG_VALUE_MAX}
            step={1}
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={isBusy}
            autoFocus
            fullWidth
          />
        </Field>
      </form>
    </Modal>
  );
}
