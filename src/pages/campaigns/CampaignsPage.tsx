import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { DeeplinkAnalyticsItem } from '@/app/analytics/analyticsApi';
import { downloadCsvFile } from '@/app/analytics/exportCsv';
import { formatCount } from '@/app/analytics/format';
import {
  getCampaigns,
  getOpenCampaignScenarios,
} from '@/app/campaigns';

import s from './CampaignsPage.module.scss';


type CampaignSortKey =
  | 'total'
  | 'activationRate'
  | 'revenue'
  | 'arpu'
  | 'arpuu'
  | 'arpc'
  | 'transactions'
  | 'visits'
  | 'customers'
  | 'unique'
  | 'conversion';

type CampaignViewItem = DeeplinkAnalyticsItem & {
  activationRate: number | null;
};

type QueryUpdate = {
  startDate?: string;
  endDate?: string;
  sort?: string;
  ref?: string;
  scenarioId?: string;
};

const DEFAULT_RANGE_DAYS = 30;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SORT_OPTIONS: { value: CampaignSortKey; label: string }[] = [
  { value: 'total', label: 'Users' },
  { value: 'activationRate', label: 'Activation Rate' },
  { value: 'visits', label: 'CTR' },
  { value: 'unique', label: 'Unique' },
  { value: 'conversion', label: 'Conversion' },
];

function toUtcDateId(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseUtcDateId(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isValidDateId(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE_PATTERN.test(value)) return false;
  const parsed = parseUtcDateId(value);
  return toUtcDateId(parsed) === value;
}

function addDaysToDateId(value: string, delta: number) {
  const date = parseUtcDateId(value);
  date.setUTCDate(date.getUTCDate() + delta);
  return toUtcDateId(date);
}

function normalizeDateRange(
  rawStart: string | null,
  rawEnd: string | null,
  fallbackStart: string,
  fallbackEnd: string,
) {
  let start = isValidDateId(rawStart) ? rawStart : fallbackStart;
  let end = isValidDateId(rawEnd) ? rawEnd : fallbackEnd;

  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  return { start, end };
}

function isValidSort(value: string | null | undefined): value is CampaignSortKey {
  return SORT_OPTIONS.some((option) => option.value === value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return `${formatCount(value, 1)}%`;
}

function formatNumber(value: number | null | undefined, precision = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return formatCount(value, precision);
}

function getActivationRate(item: Pick<DeeplinkAnalyticsItem, 'total' | 'visits'>) {
  if (
    !Number.isFinite(item.total) ||
    !Number.isFinite(item.visits) ||
    item.visits <= 0
  ) {
    return null;
  }
  return (item.total / item.visits) * 100;
}

function formatEntityName(value: string | null | undefined) {
  return value?.trim() || '—';
}

function buildCampaignsCsvFileName(start: string, end: string) {
  return `campaigns-${start}-to-${end}.csv`;
}

function formatScenarioLabel(name: string, slug?: string | null) {
  const normalizedName = name.trim() || 'Untitled';
  return slug ? `${normalizedName} (${slug})` : normalizedName;
}

export function CampaignsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStartDate = searchParams.get('startDate');
  const rawEndDate = searchParams.get('endDate');
  const rawSort = searchParams.get('sort');
  const campaign = searchParams.get('ref') ?? '';
  const scenarioId = searchParams.get('scenarioId') ?? '';

  const defaultEnd = useMemo(() => toUtcDateId(new Date()), []);
  const defaultStart = useMemo(
    () => addDaysToDateId(defaultEnd, -(DEFAULT_RANGE_DAYS - 1)),
    [defaultEnd],
  );
  const { start, end } = useMemo(
    () => normalizeDateRange(rawStartDate, rawEndDate, defaultStart, defaultEnd),
    [defaultEnd, defaultStart, rawEndDate, rawStartDate],
  );
  const sort = isValidSort(rawSort) ? rawSort : 'total';

  const [scenarioSearch, setScenarioSearch] = useState('');
  const [isScenarioMenuOpen, setIsScenarioMenuOpen] = useState(false);

  const updateSearchParams = useCallback(
    (update: QueryUpdate) => {
      const next = new URLSearchParams(searchParams);

      for (const [key, value] of Object.entries(update)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }

      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const {
    data: scenarioData,
    isLoading: isScenariosLoading,
  } = useQuery({
    queryKey: ['campaigns', 'scenarios-open', scenarioSearch.trim()],
    queryFn: () =>
      getOpenCampaignScenarios({
        search: scenarioSearch.trim() || undefined,
        skip: 0,
        take: 100,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const scenarioOptions = useMemo(() => {
    const options = (scenarioData?.data ?? []).map((scenario) => ({
      value: scenario.id,
      label: formatScenarioLabel(scenario.name, scenario.slug),
    }));
    if (scenarioId && !options.some((option) => option.value === scenarioId)) {
      options.push({ value: scenarioId, label: scenarioId });
    }
    return [{ value: '', label: 'All scenarios' }, ...options];
  }, [scenarioData, scenarioId]);

  useEffect(() => {
    if (isScenarioMenuOpen) return;
    if (!scenarioId) {
      setScenarioSearch('');
      return;
    }

    const selected = scenarioOptions.find((option) => option.value === scenarioId);
    if (selected) {
      setScenarioSearch(selected.label);
    }
  }, [isScenarioMenuOpen, scenarioId, scenarioOptions]);

  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      'campaigns',
      {
        startDate: start,
        endDate: end,
        ref: campaign.trim() || undefined,
        scenarioId: scenarioId.trim() || undefined,
      },
    ],
    queryFn: () =>
      getCampaigns({
        startDate: start,
        endDate: end,
        ref: campaign.trim() || undefined,
        scenarioId: scenarioId.trim() || undefined,
      }),
    placeholderData: (previous) => previous,
    enabled: isValidDateId(start) && isValidDateId(end),
  });

  const viewData = useMemo<CampaignViewItem[]>(
    () =>
      (data ?? []).map((item) => ({
        ...item,
        activationRate: getActivationRate(item),
      })),
    [data],
  );

  const sortedRows = useMemo(() => {
    const getValue = (item: CampaignViewItem) => {
      const value = item[sort];
      return Number.isFinite(value) ? (value as number) : Number.NEGATIVE_INFINITY;
    };
    return [...viewData].sort((a, b) => getValue(b) - getValue(a));
  }, [sort, viewData]);

  const totals = useMemo(() => {
    if (!viewData.length) return null;
    const base = viewData.reduce(
      (acc, item) => {
        acc.visits += Number.isFinite(item.visits) ? item.visits : 0;
        acc.unique += Number.isFinite(item.unique) ? item.unique : 0;
        acc.total += Number.isFinite(item.total) ? item.total : 0;
        acc.customers += Number.isFinite(item.customers) ? item.customers : 0;
        acc.transactions += Number.isFinite(item.transactions)
          ? item.transactions
          : 0;
        acc.revenue += Number.isFinite(item.revenue) ? item.revenue : 0;
        return acc;
      },
      {
        visits: 0,
        unique: 0,
        total: 0,
        customers: 0,
        transactions: 0,
        revenue: 0,
      },
    );

    const conversion = base.total > 0 ? (base.customers / base.total) * 100 : null;
    const arpu = base.total > 0 ? base.revenue / base.total : null;
    const arpuu = base.unique > 0 ? base.revenue / base.unique : null;
    const arpc = base.customers > 0 ? base.revenue / base.customers : null;
    const activationRate = getActivationRate(base);

    return { ...base, conversion, arpu, arpuu, arpc, activationRate };
  }, [viewData]);

  const exportCsv = () => {
    downloadCsvFile(
      {
        headers: [
          'Campaign',
          'Deeplink',
          'Character',
          'Scenario',
          'Scenario slug',
          'CTR',
          'Users',
          'Unique',
          'Activation Rate',
          'Customers',
          'Transactions',
          'Revenue (USD)',
          'ARPU (USD)',
          'ARPUU (USD)',
          'ARPC (USD)',
          'Conversion rate',
        ],
        rows: sortedRows.map((item) => [
          item.ref ?? '',
          item.deeplink,
          item.character?.name ?? '',
          item.scenario?.name ?? '',
          item.scenario?.slug ?? '',
          Number.isFinite(item.visits) ? item.visits : null,
          Number.isFinite(item.total) ? item.total : null,
          Number.isFinite(item.unique) ? item.unique : null,
          Number.isFinite(item.activationRate) ? item.activationRate : null,
          Number.isFinite(item.customers) ? item.customers : null,
          Number.isFinite(item.transactions) ? item.transactions : null,
          Number.isFinite(item.revenue) ? item.revenue : null,
          Number.isFinite(item.arpu) ? item.arpu : null,
          Number.isFinite(item.arpuu) ? item.arpuu : null,
          Number.isFinite(item.arpc) ? item.arpc : null,
          Number.isFinite(item.conversion) ? item.conversion : null,
        ]),
      },
      buildCampaignsCsvFileName(start, end),
    );
  };

  const loadingLabel = isLoading ? 'Loading' : isFetching ? 'Updating' : 'Ready';

  return (
    <main className={s.page}>
      <div className={s.shell}>
        <header className={s.topbar}>
          <div className={s.titleBlock}>
            <p className={s.eyebrow}>Performance report</p>
            <h1 className={s.title}>Campaigns</h1>
            <p className={s.subtle}>
              UTC dates. Revenue is reported in USD.
            </p>
          </div>
          <div className={s.toolbar}>
            <button
              className={`${s.button} ${s.buttonSecondary}`}
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Refresh
            </button>
            <button
              className={s.button}
              type="button"
              onClick={exportCsv}
              disabled={isLoading || sortedRows.length === 0}
            >
              Export CSV
            </button>
          </div>
        </header>

        <section className={`${s.panel} ${s.filters}`}>
          <div className={s.filterGrid}>
            <label className={s.field}>
              <span className={s.label}>Start date</span>
              <input
                className={s.input}
                type="date"
                value={start}
                onChange={(event) =>
                  updateSearchParams({ startDate: event.target.value })
                }
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>End date</span>
              <input
                className={s.input}
                type="date"
                value={end}
                onChange={(event) =>
                  updateSearchParams({ endDate: event.target.value })
                }
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>Sort by</span>
              <select
                className={s.select}
                value={sort}
                onChange={(event) => updateSearchParams({ sort: event.target.value })}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              <span className={s.label}>Campaign</span>
              <input
                className={s.input}
                type="text"
                value={campaign}
                onChange={(event) =>
                  updateSearchParams({ ref: event.target.value.trim() })
                }
                placeholder="All campaigns"
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>Scenario</span>
              <div className={s.scenarioPicker}>
                <input
                  className={s.input}
                  type="text"
                  value={scenarioSearch}
                  onChange={(event) => {
                    setScenarioSearch(event.target.value);
                    setIsScenarioMenuOpen(true);
                    if (scenarioId) {
                      updateSearchParams({ scenarioId: '' });
                    }
                  }}
                  onFocus={() => setIsScenarioMenuOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsScenarioMenuOpen(false), 120);
                  }}
                  placeholder="Search by name or slug"
                />
                {isScenarioMenuOpen ? (
                  <div className={s.scenarioMenu}>
                    {isScenariosLoading ? (
                      <div className={s.scenarioMenuState}>
                        Loading scenarios...
                      </div>
                    ) : scenarioOptions.length === 0 ? (
                      <div className={s.scenarioMenuState}>
                        No scenarios found.
                      </div>
                    ) : (
                      scenarioOptions.map((option) => (
                        <button
                          key={option.value || 'all'}
                          className={s.scenarioOption}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            updateSearchParams({ scenarioId: option.value });
                            setScenarioSearch(option.value ? option.label : '');
                            setIsScenarioMenuOpen(false);
                          }}
                        >
                          {option.label}
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </label>
          </div>
          <p className={s.note}>Status: {loadingLabel}</p>
        </section>

        {error ? (
          <div className={s.error}>
            {error instanceof Error ? error.message : 'Unable to load campaigns.'}
          </div>
        ) : null}

        <section className={s.summary}>
          <div className={s.metric}>
            <span className={s.metricLabel}>CTR</span>
            <span className={s.metricValue}>{formatNumber(totals?.visits)}</span>
          </div>
          <div className={s.metric}>
            <span className={s.metricLabel}>Users</span>
            <span className={s.metricValue}>{formatNumber(totals?.total)}</span>
          </div>
          <div className={s.metric}>
            <span className={s.metricLabel}>Unique</span>
            <span className={s.metricValue}>{formatNumber(totals?.unique)}</span>
          </div>
          <div className={s.metric}>
            <span className={s.metricLabel}>Activation Rate</span>
            <span className={s.metricValue}>
              {formatPercent(totals?.activationRate)}
            </span>
          </div>
          <div className={s.metric}>
            <span className={s.metricLabel}>Conversion</span>
            <span className={s.metricValue}>{formatPercent(totals?.conversion)}</span>
          </div>
        </section>

        <section className={`${s.panel} ${s.tablePanel}`}>
          <div className={s.tableHeader}>
            <h2 className={s.tableTitle}>Campaign detail</h2>
            <p className={s.subtle}>{start} to {end}</p>
          </div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <colgroup>
                <col className={s.campaignColumn} />
                <col className={s.scenarioColumn} />
              </colgroup>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Scenario</th>
                  <th className={s.number}>CTR</th>
                  <th className={s.number}>Users</th>
                  <th className={s.number}>Unique</th>
                  <th className={s.number}>Activation</th>
                  <th className={s.number}>Conversion</th>
                </tr>
              </thead>
              <tbody className={isLoading ? s.loadingRows : undefined}>
                {isLoading ? (
                  <tr>
                    <td colSpan={13}>Loading campaign rows...</td>
                  </tr>
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td className={s.empty} colSpan={13}>
                      No campaigns match the current filters.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((item) => (
                    <tr key={`${item.deeplink}-${item.ref ?? ''}-${item.scenario?.id ?? ''}`}>
                      <td>
                        <span className={s.compactText}>
                          {item.ref || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={s.compactText}>
                          {formatEntityName(item.scenario?.name)}
                        </span>
                      </td>
                      <td className={s.number}>{formatNumber(item.visits)}</td>
                      <td className={s.number}>{formatNumber(item.total)}</td>
                      <td className={s.number}>{formatNumber(item.unique)}</td>
                      <td className={s.number}>
                        {formatPercent(item.activationRate)}
                      </td>
                      <td className={s.number}>{formatPercent(item.conversion)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
