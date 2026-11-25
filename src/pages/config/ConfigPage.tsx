import { useMemo, useState } from 'react';

import { useConfig } from '@/app/config';
import {
  Alert,
  Button,
  Container,
  EmptyState,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import type { ConfigScope, IConfigItem } from '@/common/types';
import { AppShell } from '@/components/templates';

import { ConfigEditModal } from './ConfigEditModal';
import s from './ConfigPage.module.scss';

const TITLES: Record<ConfigScope, string> = {
  tg: 'Config',
  web: 'Web config',
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

const columns = [
  { key: 'key', label: 'Key' },
  { key: 'value', label: 'Value' },
  { key: 'default', label: 'Default' },
  { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
];

const skeletonRows = Array.from({ length: 4 }, (_, index) => ({
  key: <Skeleton key={`config-skel-${index}`} width={180} height={12} />,
  value: <Skeleton width={40} height={12} />,
  default: <Skeleton width={40} height={12} />,
  updated: (
    <div className={s.alignRight}>
      <Skeleton width={120} height={12} />
    </div>
  ),
}));

type ConfigPageProps = {
  scope: ConfigScope;
};

export function ConfigPage({ scope }: ConfigPageProps) {
  const { data, error, isLoading, refetch } = useConfig(scope);
  const items = useMemo(() => data?.data ?? [], [data?.data]);
  const [editing, setEditing] = useState<IConfigItem | null>(null);

  const rows = useMemo(
    () =>
      items.map((item) => ({
        key: <Typography variant="body">{item.key}</Typography>,
        value: <Typography variant="body">{item.value}</Typography>,
        default: (
          <Typography variant="body" tone="muted">
            {item.defaultValue}
          </Typography>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(item.updatedAt)}
          </Typography>
        ),
      })),
    [items],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && items.length === 0;
  const showTable = !showEmpty && !error;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <Typography variant="h2">{TITLES[scope]}</Typography>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load config"
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
            title="No settings"
            description="The backend returned no config keys."
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
                      const item = items[index];
                      if (!item) return {};
                      return {
                        className: s.clickableRow,
                        role: 'button',
                        tabIndex: 0,
                        onClick: () => setEditing(item),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setEditing(item);
                          }
                        },
                      };
                    }
              }
            />
          </div>
        ) : null}
      </Container>

      {editing ? (
        <ConfigEditModal
          key={editing.key}
          scope={scope}
          item={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </AppShell>
  );
}
