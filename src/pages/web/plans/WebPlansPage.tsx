import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useWebPlans } from '@/app/web-plans';
import { PlusIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import { type IWebPlan, PlanTier, PlanWebType } from '@/common/types';
import { AppShell } from '@/components/templates';

import {
  formatCents,
  formatDate,
  PLAN_PERIOD_LABELS,
  PLAN_TIER_LABELS,
  PLAN_TYPE_LABELS,
  planTierOptions,
  planTypeOptions,
} from '../webFormat';
import s from '../WebPage.module.scss';
import { WebPlanFormModal } from './WebPlanFormModal';

type StatusFilter = '' | 'active' | 'inactive';

// Plans are a short list; load them in one page.
const PLANS_TAKE = 200;

const STATUS_OPTIONS = [
  { label: 'Any status', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

function resolveEnum<T extends string>(value: string | null, values: T[]) {
  return values.includes(value as T) ? (value as T) : '';
}

function resolveStatus(value: string | null): StatusFilter {
  return value === 'active' || value === 'inactive' ? value : '';
}

type ModalState = { plan: IWebPlan | null } | null;

export function WebPlansPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = resolveEnum(
    searchParams.get('type'),
    Object.values(PlanWebType),
  );
  const tierFilter = resolveEnum(
    searchParams.get('tier'),
    Object.values(PlanTier),
  );
  const statusFilter = resolveStatus(searchParams.get('status'));
  const [modal, setModal] = useState<ModalState>(null);

  const updateFilter = useCallback(
    (key: 'type' | 'tier' | 'status', value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const queryParams = useMemo(
    () => ({
      type: typeFilter || undefined,
      tier: tierFilter || undefined,
      isActive: statusFilter ? statusFilter === 'active' : undefined,
      skip: 0,
      take: PLANS_TAKE,
    }),
    [statusFilter, tierFilter, typeFilter],
  );

  const { data, error, isLoading, refetch } = useWebPlans(queryParams);
  const plans = useMemo(() => data?.data ?? [], [data?.data]);

  const columns = useMemo(
    () => [
      { key: 'plan', label: 'Plan' },
      { key: 'tier', label: 'Tier' },
      { key: 'price', label: 'Price' },
      { key: 'monthly', label: 'Monthly' },
      { key: 'discount', label: 'Discount' },
      { key: 'credits', label: 'Credits' },
      { key: 'status', label: 'Status' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      plans.map((plan) => ({
        plan: (
          <div className={s.cell}>
            <Typography variant="body">
              {PLAN_TYPE_LABELS[plan.type]}
              {plan.period ? ` · ${PLAN_PERIOD_LABELS[plan.period]}` : ''}
            </Typography>
            <Typography variant="caption" tone="muted">
              {plan.id}
            </Typography>
          </div>
        ),
        tier: (
          <Typography variant="body">{PLAN_TIER_LABELS[plan.tier]}</Typography>
        ),
        price: (
          <Typography variant="body">{formatCents(plan.amountCents)}</Typography>
        ),
        monthly: (
          <Typography variant="body" tone="muted">
            {formatCents(plan.monthlyPriceCents)}
          </Typography>
        ),
        discount: (
          <Typography variant="body" tone="muted">
            {plan.discount == null ? '-' : `${plan.discount}%`}
          </Typography>
        ),
        credits: (
          <Typography variant="body">
            {plan.credits}
            {plan.additionalCredits ? ` + ${plan.additionalCredits}` : ''}
          </Typography>
        ),
        status: plan.isActive ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge outline>Inactive</Badge>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(plan.updatedAt)}
          </Typography>
        ),
      })),
    [plans],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => ({
        plan: <Skeleton key={`web-plan-skel-${index}`} width={160} height={12} />,
        tier: <Skeleton width={60} height={12} />,
        price: <Skeleton width={50} height={12} />,
        monthly: <Skeleton width={50} height={12} />,
        discount: <Skeleton width={30} height={12} />,
        credits: <Skeleton width={50} height={12} />,
        status: <Skeleton width={60} height={20} />,
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && plans.length === 0;
  const showTable = !showEmpty && !error;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Web plans</Typography>
          </div>
          <Button iconLeft={<PlusIcon />} onClick={() => setModal({ plan: null })}>
            Create plan
          </Button>
        </div>

        <div className={s.filterRow}>
          <Field label="Type" labelFor="web-plans-type">
            <Select
              id="web-plans-type"
              options={[{ label: 'Any type', value: '' }, ...planTypeOptions]}
              value={typeFilter}
              size="sm"
              variant="ghost"
              onChange={(value) => updateFilter('type', value)}
            />
          </Field>
          <Field label="Tier" labelFor="web-plans-tier">
            <Select
              id="web-plans-tier"
              options={[{ label: 'Any tier', value: '' }, ...planTierOptions]}
              value={tierFilter}
              size="sm"
              variant="ghost"
              onChange={(value) => updateFilter('tier', value)}
            />
          </Field>
          <Field label="Status" labelFor="web-plans-status">
            <Select
              id="web-plans-status"
              options={STATUS_OPTIONS}
              value={statusFilter}
              size="sm"
              variant="ghost"
              onChange={(value) => updateFilter('status', value)}
            />
          </Field>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load web plans"
              description={
                error instanceof Error ? error.message : 'Please try again.'
              }
              tone="warning"
            />
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : null}

        {showEmpty ? (
          <EmptyState
            title="No web plans found"
            description="Create a plan or adjust the filters."
            action={
              <Button onClick={() => setModal({ plan: null })}>
                Create plan
              </Button>
            }
          />
        ) : null}

        {showTable ? (
          <div className={s.tableWrap}>
            <Table
              columns={columns}
              rows={showSkeleton ? skeletonRows : rows}
              getRowProps={
                showSkeleton
                  ? undefined
                  : (_, index) => {
                      const plan = plans[index];
                      if (!plan) return {};
                      return {
                        className: s.clickableRow,
                        role: 'button',
                        tabIndex: 0,
                        onClick: () => setModal({ plan }),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setModal({ plan });
                          }
                        },
                      };
                    }
              }
            />
            {!showSkeleton && data && data.total > plans.length ? (
              <Typography variant="meta" tone="muted">
                Showing {plans.length} of {data.total}.
              </Typography>
            ) : null}
          </div>
        ) : null}
      </Container>

      {modal ? (
        <WebPlanFormModal
          key={modal.plan?.id ?? 'new'}
          plan={modal.plan}
          onClose={() => setModal(null)}
        />
      ) : null}
    </AppShell>
  );
}
