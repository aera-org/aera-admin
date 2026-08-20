import type {
  PaymentsConversionBreakdownItem,
  PaymentsRevenueBreakdownItem,
} from './analyticsApi';

export const TIER_HIGH_MIN_USERS = 5000;
export const TIER_MEDIUM_MIN_USERS = 2000;

export type ConfidenceTier = 'high' | 'medium' | 'low';
export type ConfidenceFilter = 'all' | 'highMedium' | 'high';
export type Quadrant = 'scale' | 'hiddenGems' | 'trafficSinks' | 'belowAverage';
export type RankedJoinKey = 'id' | 'name' | 'none';
export type ScenarioChartMetric =
  | 'rpau'
  | 'revenue'
  | 'conversionRate'
  | 'activeUsers'
  | 'efficiency';

export type RankedItem = {
  id: string;
  name: string;
  characterType: string | null;
  joinKey: RankedJoinKey;
  activeUsers: number;
  payingUsers: number;
  conversionRate: number;
  revenue: number;
  transactions: number;
  rpau: number | null;
  efficiency: number | null;
  arpc: number | null;
  repeat: number | null;
  tier: ConfidenceTier;
};

export type ScenarioRankingPlatform = {
  activeUsers: number;
  payingUsers: number;
  revenue: number;
  transactions: number;
  conversionRate: number;
  rpau: number;
};

export type ScenarioRankingResult = {
  items: RankedItem[];
  platform: ScenarioRankingPlatform;
  unmatchedRevenue: number;
  joinedByName: number;
  medians: { users: number; rpau: number } | null;
  quadrants: Record<Quadrant, RankedItem[]>;
};

type RevenueMatch = {
  item: PaymentsRevenueBreakdownItem;
  index: number;
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeName(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export function getConfidenceTier(activeUsers: number): ConfidenceTier {
  if (activeUsers >= TIER_HIGH_MIN_USERS) return 'high';
  if (activeUsers >= TIER_MEDIUM_MIN_USERS) return 'medium';
  return 'low';
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function compareByRpau(left: RankedItem, right: RankedItem): number {
  if (left.rpau === null && right.rpau === null) {
    return left.name.localeCompare(right.name);
  }
  if (left.rpau === null) return 1;
  if (right.rpau === null) return -1;
  if (right.rpau !== left.rpau) return right.rpau - left.rpau;
  return left.name.localeCompare(right.name);
}

function takeUnused(
  list: RevenueMatch[] | undefined,
  used: Set<number>,
): RevenueMatch | null {
  if (!list) return null;

  for (const match of list) {
    if (!used.has(match.index)) {
      used.add(match.index);
      return match;
    }
  }

  return null;
}

function buildRevenueIndexes(revenue: PaymentsRevenueBreakdownItem[]) {
  const byId = new Map<string, RevenueMatch[]>();
  const byName = new Map<string, RevenueMatch[]>();

  revenue.forEach((item, index) => {
    const match = { item, index };
    const id = normalizeId(item.id);
    if (id) {
      const list = byId.get(id) ?? [];
      list.push(match);
      byId.set(id, list);
    }

    const name = normalizeName(item.name);
    if (name) {
      const list = byName.get(name) ?? [];
      list.push(match);
      byName.set(name, list);
    }
  });

  return { byId, byName };
}

function emptyQuadrants(): Record<Quadrant, RankedItem[]> {
  return {
    scale: [],
    hiddenGems: [],
    trafficSinks: [],
    belowAverage: [],
  };
}

export function getRankedItemKey(item: RankedItem): string {
  return item.id || item.name;
}

export function getRankedMetricValue(
  item: RankedItem,
  metric: ScenarioChartMetric,
): number | null {
  switch (metric) {
    case 'rpau':
      return item.rpau;
    case 'revenue':
      return item.revenue;
    case 'conversionRate':
      return item.conversionRate;
    case 'activeUsers':
      return item.activeUsers;
    case 'efficiency':
      return item.efficiency;
  }
}

export function getPlatformMetricValue(
  platform: ScenarioRankingPlatform,
  metric: ScenarioChartMetric,
): number | null {
  switch (metric) {
    case 'rpau':
      return platform.activeUsers > 0 ? platform.rpau : null;
    case 'revenue':
      return platform.revenue;
    case 'conversionRate':
      return platform.activeUsers > 0 ? platform.conversionRate : null;
    case 'activeUsers':
      return platform.activeUsers;
    case 'efficiency':
      return 1;
  }
}

export function pickTopItems(
  items: RankedItem[],
  metric: ScenarioChartMetric,
  limit: number,
): RankedItem[] {
  return [...items]
    .sort((left, right) => {
      const leftValue = getRankedMetricValue(left, metric);
      const rightValue = getRankedMetricValue(right, metric);
      if (leftValue === null && rightValue === null) {
        return left.name.localeCompare(right.name);
      }
      if (leftValue === null) return 1;
      if (rightValue === null) return -1;
      if (rightValue !== leftValue) return rightValue - leftValue;
      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

export function rankItems(
  items: RankedItem[],
  filter: ConfidenceFilter,
): RankedItem[] {
  const filtered = items.filter((item) => {
    if (filter === 'high') return item.tier === 'high';
    if (filter === 'highMedium') return item.tier !== 'low';
    return true;
  });

  return [...filtered].sort(compareByRpau);
}

export function buildScenarioRanking(
  conversion: PaymentsConversionBreakdownItem[],
  revenue: PaymentsRevenueBreakdownItem[],
): ScenarioRankingResult {
  const { byId, byName } = buildRevenueIndexes(revenue);
  const usedRevenue = new Set<number>();
  let joinedByName = 0;

  const items: RankedItem[] = conversion.map((row) => {
    const id = normalizeId(row.id) ?? '';
    const name = row.name?.trim() || id || 'Unknown';
    const idMatch = takeUnused(id ? byId.get(id) : undefined, usedRevenue);
    const nameKey = normalizeName(row.name);
    const nameMatch =
      idMatch || !nameKey
        ? null
        : takeUnused(byName.get(nameKey), usedRevenue);
    const match = idMatch ?? nameMatch;
    const joinKey: RankedJoinKey = idMatch
      ? 'id'
      : nameMatch
        ? 'name'
        : 'none';

    if (joinKey === 'name') joinedByName += 1;

    const activeUsers = toFiniteNumber(row.activeUsers);
    const payingUsers = toFiniteNumber(row.payingUsers);
    const conversionRate = toFiniteNumber(row.conversionRate);
    const matchedRevenue = toFiniteNumber(match?.item.revenue);
    const transactions = toFiniteNumber(match?.item.transactions);
    const rpau = ratio(matchedRevenue, activeUsers);

    return {
      id,
      name,
      characterType: row.characterType ?? null,
      joinKey,
      activeUsers,
      payingUsers,
      conversionRate,
      revenue: matchedRevenue,
      transactions,
      rpau,
      efficiency: null,
      arpc: ratio(matchedRevenue, payingUsers),
      repeat: ratio(transactions, payingUsers),
      tier: getConfidenceTier(activeUsers),
    };
  });

  const platformActiveUsers = items.reduce(
    (sum, item) => sum + item.activeUsers,
    0,
  );
  const platformPayingUsers = items.reduce(
    (sum, item) => sum + item.payingUsers,
    0,
  );
  const platformRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
  const platformTransactions = items.reduce(
    (sum, item) => sum + item.transactions,
    0,
  );
  const platformRpau = ratio(platformRevenue, platformActiveUsers) ?? 0;

  for (const item of items) {
    item.efficiency =
      item.rpau === null || platformRpau <= 0
        ? null
        : item.rpau / platformRpau;
  }

  items.sort(compareByRpau);

  const eligible = items.filter(
    (item) => item.tier !== 'low' && item.rpau !== null,
  );
  const medianUsers = median(eligible.map((item) => item.activeUsers));
  const medianRpau = median(eligible.map((item) => item.rpau as number));
  const medians =
    medianUsers === null || medianRpau === null
      ? null
      : { users: medianUsers, rpau: medianRpau };

  const quadrants = emptyQuadrants();
  if (medians) {
    for (const item of eligible) {
      const highTraffic = item.activeUsers >= medians.users;
      const highRpau = (item.rpau ?? 0) >= medians.rpau;
      if (highTraffic && highRpau) quadrants.scale.push(item);
      else if (!highTraffic && highRpau) quadrants.hiddenGems.push(item);
      else if (highTraffic && !highRpau) quadrants.trafficSinks.push(item);
      else quadrants.belowAverage.push(item);
    }
  }

  return {
    items,
    platform: {
      activeUsers: platformActiveUsers,
      payingUsers: platformPayingUsers,
      revenue: platformRevenue,
      transactions: platformTransactions,
      conversionRate: ratio(platformPayingUsers, platformActiveUsers) ?? 0,
      rpau: platformRpau,
    },
    unmatchedRevenue: revenue.length - usedRevenue.size,
    joinedByName,
    medians,
    quadrants,
  };
}
