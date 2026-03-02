export type CsvCell = string | number | boolean | null | undefined;

export type CsvDataSet = {
  headers: string[];
  rows: CsvCell[][];
};

type BuildAnalyticsCsvFileNameParams = {
  section: string;
  start: string;
  end: string;
};

function toCsvString(value: CsvCell) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

function escapeCsvCell(value: CsvCell) {
  const normalized = toCsvString(value);
  if (
    normalized.includes(',') ||
    normalized.includes('"') ||
    normalized.includes('\n') ||
    normalized.includes('\r')
  ) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

function sanitizeFileNamePart(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');
  return normalized || 'all';
}

export function buildAnalyticsCsvFileName({
  section,
  start,
  end,
}: BuildAnalyticsCsvFileNameParams) {
  const safeSection = sanitizeFileNamePart(section);
  const safeStart = sanitizeFileNamePart(start);
  const safeEnd = sanitizeFileNamePart(end);
  return `analytics-${safeSection}-${safeStart}-to-${safeEnd}.csv`;
}

export function createCsvContent({ headers, rows }: CsvDataSet) {
  const lines = [
    headers.map((cell) => escapeCsvCell(cell)).join(','),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')),
  ];
  return lines.join('\r\n');
}

export function downloadCsvFile(dataset: CsvDataSet, fileName: string) {
  const csv = createCsvContent(dataset);
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
