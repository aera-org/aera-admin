import { useMemo, useState } from 'react';

import { useUpdateUser } from '@/app/users';
import { Button, Field, Input, Modal, Stack, Typography } from '@/atoms';
import type { ITgUser } from '@/common/types';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';

import s from './UserActionModals.module.scss';
import {
  formatUserName,
  parseAirValue,
  parseFuelValue,
  toIsoString,
  toLocalInputValue,
} from './userFormat';

export function useUserActionModals() {
  const updateUserMutation = useUpdateUser();
  const [confirmTarget, setConfirmTarget] = useState<{
    user: ITgUser;
    nextBlocked: boolean;
  } | null>(null);
  const [subscriptionTarget, setSubscriptionTarget] = useState<ITgUser | null>(
    null,
  );
  const [subscriptionValue, setSubscriptionValue] = useState('');
  const [subscriptionShowErrors, setSubscriptionShowErrors] = useState(false);
  const [fuelTarget, setFuelTarget] = useState<ITgUser | null>(null);
  const [fuelValue, setFuelValue] = useState('');
  const [fuelShowErrors, setFuelShowErrors] = useState(false);
  const [airTarget, setAirTarget] = useState<ITgUser | null>(null);
  const [airValue, setAirValue] = useState('');
  const [airShowErrors, setAirShowErrors] = useState(false);
  const [actionTarget, setActionTarget] = useState<string | null>(null);

  const openSubscriptionModal = (user: ITgUser) => {
    setSubscriptionTarget(user);
    setSubscriptionValue(toLocalInputValue(user.subscribedUntil));
    setSubscriptionShowErrors(false);
  };

  const closeSubscriptionModal = () => {
    if (updateUserMutation.isPending) return;
    setSubscriptionTarget(null);
    setSubscriptionValue('');
  };

  const openFuelModal = (user: ITgUser) => {
    setFuelTarget(user);
    setFuelValue(String(user.fuel ?? 0));
    setFuelShowErrors(false);
  };

  const closeFuelModal = () => {
    if (updateUserMutation.isPending) return;
    setFuelTarget(null);
    setFuelValue('');
  };

  const openAirModal = (user: ITgUser) => {
    setAirTarget(user);
    setAirValue(String(user.air ?? 0));
    setAirShowErrors(false);
  };

  const closeAirModal = () => {
    if (updateUserMutation.isPending) return;
    setAirTarget(null);
    setAirValue('');
  };

  const closeConfirmModal = () => {
    if (updateUserMutation.isPending) return;
    setConfirmTarget(null);
  };

  const subscriptionErrors = useMemo(() => {
    if (!subscriptionShowErrors) return {};
    const errors: { date?: string } = {};
    if (!subscriptionValue) {
      errors.date = 'Set a date.';
    } else if (!toIsoString(subscriptionValue)) {
      errors.date = 'Enter a valid date.';
    }
    return errors;
  }, [subscriptionShowErrors, subscriptionValue]);

  const subscriptionIsValid = useMemo(
    () => Boolean(subscriptionValue && toIsoString(subscriptionValue)),
    [subscriptionValue],
  );

  const handleSubscriptionSave = async () => {
    if (!subscriptionTarget) return;
    if (!subscriptionIsValid) {
      setSubscriptionShowErrors(true);
      return;
    }
    const nextValue = toIsoString(subscriptionValue);
    if (!nextValue) return;
    setActionTarget(subscriptionTarget.id);
    try {
      await updateUserMutation.mutateAsync({
        id: subscriptionTarget.id,
        payload: { subscribedUntil: nextValue },
      });
      closeSubscriptionModal();
    } finally {
      setActionTarget(null);
    }
  };

  const fuelErrors = useMemo(() => {
    if (!fuelShowErrors) return {};
    const errors: { fuel?: string } = {};
    if (parseFuelValue(fuelValue) === null) {
      errors.fuel = 'Enter a number between 0 and 100.';
    }
    return errors;
  }, [fuelShowErrors, fuelValue]);

  const fuelIsValid = useMemo(
    () => parseFuelValue(fuelValue) !== null,
    [fuelValue],
  );

  const handleFuelSave = async () => {
    if (!fuelTarget) return;
    const nextFuel = parseFuelValue(fuelValue);
    if (nextFuel === null) {
      setFuelShowErrors(true);
      return;
    }
    setActionTarget(fuelTarget.id);
    try {
      await updateUserMutation.mutateAsync({
        id: fuelTarget.id,
        payload: { fuel: nextFuel },
      });
      closeFuelModal();
    } finally {
      setActionTarget(null);
    }
  };

  const airErrors = useMemo(() => {
    if (!airShowErrors) return {};
    const errors: { air?: string } = {};
    if (parseAirValue(airValue) === null) {
      errors.air = 'Enter a whole number greater than or equal to 0.';
    }
    return errors;
  }, [airShowErrors, airValue]);

  const airIsValid = useMemo(
    () => parseAirValue(airValue) !== null,
    [airValue],
  );

  const handleAirSave = async () => {
    if (!airTarget) return;
    const nextAir = parseAirValue(airValue);
    if (nextAir === null) {
      setAirShowErrors(true);
      return;
    }
    setActionTarget(airTarget.id);
    try {
      await updateUserMutation.mutateAsync({
        id: airTarget.id,
        payload: { air: nextAir },
      });
      closeAirModal();
    } finally {
      setActionTarget(null);
    }
  };

  const handleConfirmBlock = async () => {
    if (!confirmTarget) return;
    setActionTarget(confirmTarget.user.id);
    try {
      await updateUserMutation.mutateAsync({
        id: confirmTarget.user.id,
        payload: { isBlocked: confirmTarget.nextBlocked },
      });
      setConfirmTarget(null);
    } finally {
      setActionTarget(null);
    }
  };

  const modals = (
    <>
      <Modal
        open={Boolean(subscriptionTarget)}
        title="Manage subscription"
        onClose={closeSubscriptionModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeSubscriptionModal}
              disabled={updateUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubscriptionSave}
              loading={
                updateUserMutation.isPending && Boolean(subscriptionTarget)
              }
              disabled={!subscriptionIsValid || updateUserMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="12px">
          <Field
            label="Subscribed until"
            labelFor="user-subscription"
            error={subscriptionErrors.date}
          >
            <Input
              id="user-subscription"
              type="datetime-local"
              value={subscriptionValue}
              onChange={(event) => setSubscriptionValue(event.target.value)}
              fullWidth
            />
          </Field>
          <Typography variant="caption" tone="muted" className={s.helperText}>
            Set a past date to expire the subscription.
          </Typography>
        </Stack>
      </Modal>

      <Modal
        open={Boolean(fuelTarget)}
        title="Update fuel"
        onClose={closeFuelModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeFuelModal}
              disabled={updateUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFuelSave}
              loading={updateUserMutation.isPending && Boolean(fuelTarget)}
              disabled={!fuelIsValid || updateUserMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="12px">
          <Field label="Fuel" labelFor="user-fuel" error={fuelErrors.fuel}>
            <Input
              id="user-fuel"
              type="number"
              min={0}
              max={100}
              step={1}
              value={fuelValue}
              onChange={(event) => setFuelValue(event.target.value)}
              fullWidth
            />
          </Field>
          <Typography variant="caption" tone="muted" className={s.helperText}>
            Set a value from 0 to 100.
          </Typography>
        </Stack>
      </Modal>

      <Modal
        open={Boolean(airTarget)}
        title="Update air"
        onClose={closeAirModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeAirModal}
              disabled={updateUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAirSave}
              loading={updateUserMutation.isPending && Boolean(airTarget)}
              disabled={!airIsValid || updateUserMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="12px">
          <Field label="Air" labelFor="user-air" error={airErrors.air}>
            <Input
              id="user-air"
              type="number"
              min={0}
              step={1}
              value={airValue}
              onChange={(event) => setAirValue(event.target.value)}
              fullWidth
            />
          </Field>
          <Typography variant="caption" tone="muted" className={s.helperText}>
            Set a whole number greater than or equal to 0.
          </Typography>
        </Stack>
      </Modal>

      <ConfirmModal
        open={Boolean(confirmTarget)}
        title={confirmTarget?.nextBlocked ? 'Block user' : 'Unblock user'}
        description={
          confirmTarget
            ? confirmTarget.nextBlocked
              ? `Block ${formatUserName(confirmTarget.user)}? User will lose access.`
              : `Unblock ${formatUserName(confirmTarget.user)}? User can access again.`
            : undefined
        }
        confirmLabel={confirmTarget?.nextBlocked ? 'Block' : 'Unblock'}
        tone={confirmTarget?.nextBlocked ? 'danger' : 'default'}
        isConfirming={updateUserMutation.isPending && Boolean(confirmTarget)}
        onConfirm={handleConfirmBlock}
        onClose={closeConfirmModal}
      />
    </>
  );

  return {
    actionTarget,
    isUpdatingUser: updateUserMutation.isPending,
    modals,
    openAirModal,
    openBlockModal: (user: ITgUser, nextBlocked: boolean) =>
      setConfirmTarget({ user, nextBlocked }),
    openFuelModal,
    openSubscriptionModal,
  };
}
