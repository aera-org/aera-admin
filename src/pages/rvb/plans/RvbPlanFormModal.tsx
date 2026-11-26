import { useMemo, useState } from 'react';

import { useCreateRvbPlan, useUpdateRvbPlan } from '@/app/rvb';
import { Button, Field, FormRow, Input, Modal, Stack, Switch } from '@/atoms';
import type {
  CreateRvbPlanDto,
  IRvbPlan,
  UpdateRvbPlanDto,
} from '@/common/types';

import s from '../RvbPage.module.scss';

type RvbPlanFormModalProps = {
  /** null → create a new plan. */
  plan: IRvbPlan | null;
  onClose: () => void;
};

type Values = {
  code: string;
  price: string;
  credits: string;
  discount: string;
  isActive: boolean;
};

type Errors = Partial<Record<keyof Values, string>>;

function toValues(plan: IRvbPlan | null): Values {
  return {
    code: plan?.code ?? '',
    price: plan ? String(plan.price) : '',
    credits: plan ? String(plan.credits) : '',
    discount: plan?.discount == null ? '' : String(plan.discount),
    isActive: plan?.isActive ?? true,
  };
}

/** Integer in range, null when empty, undefined when invalid. */
function parseIntInRange(
  value: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return undefined;
  }
  return parsed;
}

function getErrors(values: Values): Errors {
  const errors: Errors = {};
  if (!values.code.trim()) errors.code = 'Enter a code.';
  if (!parseIntInRange(values.price, 1))
    errors.price = 'Enter a whole number, 1 or more.';
  if (!parseIntInRange(values.credits, 1)) {
    errors.credits = 'Enter a whole number, 1 or more.';
  }
  if (parseIntInRange(values.discount, 0, 100) === undefined) {
    errors.discount = 'Enter 0 to 100, or leave empty.';
  }
  return errors;
}

function toCreatePayload(values: Values): CreateRvbPlanDto {
  return {
    code: values.code.trim(),
    price: parseIntInRange(values.price, 1) ?? 0,
    credits: parseIntInRange(values.credits, 1) ?? 0,
    discount: parseIntInRange(values.discount, 0, 100) ?? null,
    isActive: values.isActive,
  };
}

/** Sends only changed fields; a cleared discount is sent as null. */
function toUpdatePayload(values: Values, plan: IRvbPlan): UpdateRvbPlanDto {
  const next = toCreatePayload(values);
  const payload: UpdateRvbPlanDto = {};
  if (next.code !== plan.code) payload.code = next.code;
  if (next.price !== plan.price) payload.price = next.price;
  if (next.credits !== plan.credits) payload.credits = next.credits;
  if (next.discount !== plan.discount) payload.discount = next.discount;
  if (next.isActive !== plan.isActive) payload.isActive = next.isActive;
  return payload;
}

/** Mount with a `key` per plan so the form resets between plans. */
export function RvbPlanFormModal({ plan, onClose }: RvbPlanFormModalProps) {
  const createMutation = useCreateRvbPlan();
  const updateMutation = useUpdateRvbPlan();
  const [values, setValues] = useState<Values>(() => toValues(plan));
  const [showErrors, setShowErrors] = useState(false);

  const allErrors = useMemo(() => getErrors(values), [values]);
  const errors = showErrors ? allErrors : {};
  const isValid = Object.keys(allErrors).length === 0;
  const isBusy = createMutation.isPending || updateMutation.isPending;

  const handleChange = <K extends keyof Values>(field: K, value: Values[K]) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleClose = () => {
    if (isBusy) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid) {
      setShowErrors(true);
      return;
    }
    if (plan) {
      const payload = toUpdatePayload(values, plan);
      if (Object.keys(payload).length > 0) {
        await updateMutation.mutateAsync({ id: plan.id, payload });
      }
    } else {
      await createMutation.mutateAsync(toCreatePayload(values));
    }
    onClose();
  };

  return (
    <Modal
      open
      title={plan ? 'Edit RVB plan' : 'Create RVB plan'}
      onClose={handleClose}
      actions={
        <div className={s.modalActions}>
          <div className={s.modalActionsEnd}>
            <Button variant="secondary" onClick={handleClose} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={isBusy}
              disabled={!isValid || isBusy}
            >
              {plan ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </div>
      }
    >
      <Stack gap="16px">
        <FormRow columns={2}>
          <Field label="Code" labelFor="rvb-plan-code" error={errors.code}>
            <Input
              id="rvb-plan-code"
              size="sm"
              value={values.code}
              onChange={(event) => handleChange('code', event.target.value)}
              placeholder="rvb-300"
              disabled={isBusy}
              fullWidth
            />
          </Field>
          <Field
            label="Status"
            labelFor="rvb-plan-active"
            hint={
              plan ? 'Plans cannot be deleted; deactivate instead.' : undefined
            }
          >
            <Switch
              id="rvb-plan-active"
              checked={values.isActive}
              onChange={(event) =>
                handleChange('isActive', event.target.checked)
              }
              label={values.isActive ? 'Active' : 'Inactive'}
              disabled={isBusy}
            />
          </Field>
        </FormRow>

        <FormRow columns={2}>
          <Field
            label="Price, stars"
            labelFor="rvb-plan-price"
            hint="Telegram Stars."
            error={errors.price}
          >
            <Input
              id="rvb-plan-price"
              size="sm"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={values.price}
              onChange={(event) => handleChange('price', event.target.value)}
              placeholder="0"
              disabled={isBusy}
              fullWidth
            />
          </Field>
          <Field
            label="Credits"
            labelFor="rvb-plan-credits"
            error={errors.credits}
          >
            <Input
              id="rvb-plan-credits"
              size="sm"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={values.credits}
              onChange={(event) => handleChange('credits', event.target.value)}
              placeholder="0"
              disabled={isBusy}
              fullWidth
            />
          </Field>
        </FormRow>

        <FormRow columns={2}>
          <Field
            label="Discount, %"
            labelFor="rvb-plan-discount"
            hint="Optional. Display only."
            error={errors.discount}
          >
            <Input
              id="rvb-plan-discount"
              size="sm"
              type="number"
              min={0}
              max={100}
              step={1}
              inputMode="numeric"
              value={values.discount}
              onChange={(event) => handleChange('discount', event.target.value)}
              placeholder="-"
              disabled={isBusy}
              fullWidth
            />
          </Field>
        </FormRow>
      </Stack>
    </Modal>
  );
}
