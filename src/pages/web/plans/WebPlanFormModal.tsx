import { useMemo, useState } from 'react';

import {
  useCreateWebPlan,
  useDeleteWebPlan,
  useUpdateWebPlan,
} from '@/app/web-plans';
import {
  Button,
  Field,
  FormRow,
  Input,
  Modal,
  Select,
  Stack,
  Switch,
} from '@/atoms';
import {
  type IWebPlan,
  type PlanTier,
  type PlanWebPeriod,
  PlanWebType,
} from '@/common/types';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';

import {
  planPeriodOptions,
  planTierOptions,
  planTypeOptions,
} from '../webFormat';
import s from '../WebPage.module.scss';
import {
  getEmptyWebPlanFormValues,
  getWebPlanFormErrors,
  toCreateWebPlanPayload,
  toUpdateWebPlanPayload,
  toWebPlanFormValues,
  type WebPlanFormValues,
} from './webPlanForm';

type WebPlanFormModalProps = {
  /** null → create a new plan. */
  plan: IWebPlan | null;
  onClose: () => void;
};

/** Mount with a `key` per plan so the form resets between plans. */
export function WebPlanFormModal({ plan, onClose }: WebPlanFormModalProps) {
  const isEdit = Boolean(plan);
  const createMutation = useCreateWebPlan();
  const updateMutation = useUpdateWebPlan();
  const deleteMutation = useDeleteWebPlan();

  const [values, setValues] = useState<WebPlanFormValues>(() =>
    plan ? toWebPlanFormValues(plan) : getEmptyWebPlanFormValues(),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const allErrors = useMemo(() => getWebPlanFormErrors(values), [values]);
  const errors = showErrors ? allErrors : {};
  const isValid = Object.keys(allErrors).length === 0;
  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;
  const isSubscription = values.type === PlanWebType.Subscription;

  const handleChange = <K extends keyof WebPlanFormValues>(
    field: K,
    value: WebPlanFormValues[K],
  ) => {
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
      await updateMutation.mutateAsync({
        id: plan.id,
        payload: toUpdateWebPlanPayload(values),
      });
    } else {
      await createMutation.mutateAsync(toCreateWebPlanPayload(values));
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!plan) return;
    await deleteMutation.mutateAsync(plan.id);
    setIsDeleteOpen(false);
    onClose();
  };

  return (
    <>
      <Modal
        open
        title={isEdit ? 'Edit web plan' : 'Create web plan'}
        onClose={handleClose}
        actions={
          <div className={s.modalActions}>
            {isEdit ? (
              <Button
                variant="ghost"
                tone="danger"
                onClick={() => setIsDeleteOpen(true)}
                disabled={isBusy}
              >
                Delete
              </Button>
            ) : null}
            <div className={s.modalActionsEnd}>
              <Button variant="secondary" onClick={handleClose} disabled={isBusy}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={!isValid || isBusy}
              >
                {isEdit ? 'Save changes' : 'Create'}
              </Button>
            </div>
          </div>
        }
      >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Type"
              labelFor="web-plan-type"
              hint={isEdit ? 'Cannot be changed after creation.' : undefined}
            >
              <Select
                id="web-plan-type"
                size="sm"
                options={planTypeOptions}
                value={values.type}
                onChange={(value) => handleChange('type', value as PlanWebType)}
                disabled={isEdit || isBusy}
                fullWidth
              />
            </Field>
            {isSubscription ? (
              <Field
                label="Period"
                labelFor="web-plan-period"
                hint={isEdit ? 'Cannot be changed after creation.' : undefined}
              >
                <Select
                  id="web-plan-period"
                  size="sm"
                  options={planPeriodOptions}
                  value={values.period}
                  onChange={(value) =>
                    handleChange('period', value as PlanWebPeriod)
                  }
                  disabled={isEdit || isBusy}
                  fullWidth
                />
              </Field>
            ) : null}
          </FormRow>

          <FormRow columns={2}>
            <Field label="Tier" labelFor="web-plan-tier">
              <Select
                id="web-plan-tier"
                size="sm"
                options={planTierOptions}
                value={values.tier}
                onChange={(value) => handleChange('tier', value as PlanTier)}
                disabled={isBusy}
                fullWidth
              />
            </Field>
            <Field
              label="Status"
              labelFor="web-plan-active"
              hint={
                isSubscription
                  ? 'One active plan per period and tier.'
                  : undefined
              }
            >
              <Switch
                id="web-plan-active"
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
              label="Price"
              labelFor="web-plan-amount"
              hint="Total charged, e.g. 29.97."
              error={errors.amount}
            >
              <Input
                id="web-plan-amount"
                size="sm"
                inputMode="decimal"
                value={values.amount}
                onChange={(event) => handleChange('amount', event.target.value)}
                placeholder="0.00"
                disabled={isBusy}
                fullWidth
              />
            </Field>
            <Field
              label="Monthly price"
              labelFor="web-plan-monthly"
              hint="Optional. Shown for subscriptions."
              error={errors.monthlyPrice}
            >
              <Input
                id="web-plan-monthly"
                size="sm"
                inputMode="decimal"
                value={values.monthlyPrice}
                onChange={(event) =>
                  handleChange('monthlyPrice', event.target.value)
                }
                placeholder="-"
                disabled={isBusy}
                fullWidth
              />
            </Field>
          </FormRow>

          <FormRow columns={2}>
            <Field
              label="Credits"
              labelFor="web-plan-credits"
              error={errors.credits}
            >
              <Input
                id="web-plan-credits"
                size="sm"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={values.credits}
                onChange={(event) =>
                  handleChange('credits', event.target.value)
                }
                placeholder="0"
                disabled={isBusy}
                fullWidth
              />
            </Field>
            <Field
              label="Additional credits"
              labelFor="web-plan-additional"
              hint="Optional bonus."
              error={errors.additionalCredits}
            >
              <Input
                id="web-plan-additional"
                size="sm"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={values.additionalCredits}
                onChange={(event) =>
                  handleChange('additionalCredits', event.target.value)
                }
                placeholder="0"
                disabled={isBusy}
                fullWidth
              />
            </Field>
          </FormRow>

          <FormRow columns={2}>
            <Field
              label="Discount, %"
              labelFor="web-plan-discount"
              hint="Optional. Display only."
              error={errors.discount}
            >
              <Input
                id="web-plan-discount"
                size="sm"
                type="number"
                min={0}
                max={100}
                step={1}
                inputMode="numeric"
                value={values.discount}
                onChange={(event) =>
                  handleChange('discount', event.target.value)
                }
                placeholder="-"
                disabled={isBusy}
                fullWidth
              />
            </Field>
          </FormRow>
        </Stack>
      </Modal>

      <ConfirmModal
        open={isDeleteOpen}
        title="Delete web plan"
        description="Delete this plan? This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setIsDeleteOpen(false)}
      />
    </>
  );
}
