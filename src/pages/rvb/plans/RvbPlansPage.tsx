import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useRvbPlans } from '@/app/rvb';
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
import type { IRvbPlan } from '@/common/types';
import { AppShell } from '@/components/templates';

import { formatDate } from '../rvbFormat';
import s from '../RvbPage.module.scss';
import { RvbPlanFormModal } from './RvbPlanFormModal';

type StatusFilter = '' | 'active' | 'inactive';

// Plans are a short list; load them in one page.
const PLANS_TAKE = 200;

const STATUS_OPTIONS = [
  { label: 'Any status', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

function resolveStatus(value: string | null): StatusFilter {
  return value === 'active' || value === 'inactive' ? value : '';
}

type ModalState = { plan: IRvbPlan | null } | null;

export function RvbPlansPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = resolveStatus(searchParams.get('status'));
  const [modal, setModal] = useState<ModalState>(null);

  const updateStatus = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('status', value);
    else next.delete('status');
    setSearchParams(next);
  };

  const queryParams = useMemo(
    () => ({
      isActive: statusFilter ? statusFilter === 'active' : undefined,
      skip: 0,
      take: PLANS_TAKE,
    }),
    [statusFilter],
  );

  const { data, error, isLoading, refetch } = useRvbPlans(queryParams);
  const plans = useMemo(() => data?.data ?? [], [data?.data]);

  const columns = useMemo(
    () => [
      { key: 'plan', label: 'Plan' },
      { key: 'price', label: 'Price, stars' },
      { key: 'credits', label: 'Credits' },
      { key: 'discount', label: 'Discount' },
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
            <Typography variant="body">{plan.code}</Typography>
            <Typography variant="caption" tone="muted">
              {plan.id}
            </Typography>
          </div>
        ),
        price: <Typography variant="body">{plan.price}</Typography>,
        credits: <Typography variant="body">{plan.credits}</Typography>,
        discount: (
          <Typography variant="body" tone="muted">
            {plan.discount == null ? '-' : `${plan.discount}%`}
          </Typography>
        ),
        status: (
          <div className={s.badges}>
            {plan.isActive ? (
              <Badge tone="success">Active</Badge>
            ) : (
              <Badge outline>Inactive</Badge>
            )}
            {plan.isRecommended ? <Badge outline>Recommended</Badge> : null}
          </div>
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
        plan: (
          <Skeleton key={`rvb-plan-skel-${index}`} width={160} height={12} />
        ),
        price: <Skeleton width={50} height={12} />,
        credits: <Skeleton width={50} height={12} />,
        discount: <Skeleton width={30} height={12} />,
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
            <Typography variant="h2">RVB plans</Typography>
          </div>
          <Button
            iconLeft={<PlusIcon />}
            onClick={() => setModal({ plan: null })}
          >
            Create plan
          </Button>
        </div>

        <div className={s.filterRow}>
          <Field label="Status" labelFor="rvb-plans-status">
            <Select
              id="rvb-plans-status"
              options={STATUS_OPTIONS}
              value={statusFilter}
              size="sm"
              variant="ghost"
              onChange={updateStatus}
            />
          </Field>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load RVB plans"
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
            title="No RVB plans found"
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
        <RvbPlanFormModal
          key={modal.plan?.id ?? 'new'}
          plan={modal.plan}
          onClose={() => setModal(null)}
        />
      ) : null}
    </AppShell>
  );
}
