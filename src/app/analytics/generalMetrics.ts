import { addMonths, parseMonthId } from './months';

export const GENERAL_CPA_USD = 0.05;

export function getGeneralDateRange(month: string) {
  const next = parseMonthId(addMonths(month, 1));
  const lastDay = new Date(
    Date.UTC(next.year, next.monthIndex, 0),
  ).getUTCDate();
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

type GeneralSourceRow = { uniqueAll: number; revenue: number };

function sumField(
  rows: GeneralSourceRow[] | undefined,
  field: keyof GeneralSourceRow,
): number | null {
  if (!rows || rows.some((row) => !Number.isFinite(row[field]))) return null;
  return rows.reduce((sum, row) => sum + row[field], 0);
}

function divide(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null || denominator <= 0)
    return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

export function calculateGeneralMetrics(
  daily: GeneralSourceRow[] | undefined,
  deeplinks: GeneralSourceRow[] | undefined,
  paymentsRevenue: number | null | undefined,
) {
  const startsUnique = sumField(daily, 'uniqueAll');
  const paidStartsUnique = sumField(deeplinks, 'uniqueAll');
  return {
    startsUnique,
    paidStartsUnique,
    arpuuAll: divide(sumField(daily, 'revenue'), startsUnique),
    arpuuAllPaid: divide(sumField(deeplinks, 'revenue'), paidStartsUnique),
    roas: divide(
      paymentsRevenue ?? null,
      paidStartsUnique === null ? null : paidStartsUnique * GENERAL_CPA_USD,
    ),
  };
}
