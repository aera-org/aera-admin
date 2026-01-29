# Frontend Analytics Vision — Payments

This document describes the frontend approach for Payments analytics. It mirrors the Main analytics UX and uses the new payments endpoints.

## Goals

- Provide a clean, monthly view of monetization performance.
- Keep UI consistent with Main Analytics (filters, KPI cards, chart, table).
- Support drill‑downs for conversion and revenue breakdowns.

## UI Structure (recommended)

### 1) Filters
- Date range: `startMonth`, `endMonth` in `YYYY-MM` (UTC only).
- Metric selector for the main chart.

### 2) KPI Cards (monthly)
For a selected month (default: last full month):
- Conversion Rate
- Repeat Purchase Rate
- Average Purchase Value (APV)
- Cohort LTV M0
- Average Revenue Per User (ARPU)
- Total Transactions

Each card shows current value + delta vs previous month.

### 3) Primary Chart
- Line chart for a selected metric over the chosen range.
- Metric selector options match the KPI list.

### 4) Monthly Table
- Rows = months in range.
- Columns = all payments metrics.

### 5) Breakdown Panels
**Conversion by Character / Scenario**
- Top‑N table (or bar chart) for selected month.

**Revenue by Character / Deeplink**
- Top‑N table (or bar chart) for selected month.

---

## Metric Definitions (Frontend Copy)

- **Conversion Rate**: Unique users with at least one payment in month / active users in month.
- **Repeat Purchase Rate**: Users with ≥2 payments by month‑end / users with ≥1 payment by month‑end.
- **Average Purchase Value (APV)**: Total revenue in month / number of payments in month.
- **Cohort LTV M0**: Average revenue in the **first month** from users whose first payment is in that month.
- **ARPU**: Total revenue in month / active users in month.
- **Total Transactions**: Number of payments in month.

---

## Formatting Rules

- **Rates**: percentage with 1 decimal.
- **Money**: currency formatting (use product currency; API returns numeric).
- **Counts**: integer with separators.
- **LTV/APV/ARPU**: same currency formatting.

---

## Backend API (Payments)

### 1) Monthly KPI values
`GET /admin/analytics/payments?month=YYYY-MM`

Response:
```
{
  "month": "2026-01",
  "conversionRate": 0.18,
  "repeatPurchaseRate": 0.32,
  "averagePurchaseValue": 299,
  "cohortLtvM0": 299,
  "averageRevenuePerUser": 2.7,
  "totalTransactions": 124
}
```

### 2) Metric series for charts
`GET /admin/analytics/payments/metric?metric=<key>&startMonth=YYYY-MM&endMonth=YYYY-MM`

Response:
```
{
  "metric": "conversionRate",
  "data": [
    { "month": "2025-07", "value": 0.31 },
    { "month": "2025-08", "value": 0.29 }
  ]
}
```

Supported metric keys:
- `conversionRate`
- `repeatPurchaseRate`
- `averagePurchaseValue`
- `cohortLtvM0`
- `averageRevenuePerUser`
- `totalTransactions`

### 3) Monthly range for all payments metrics
`GET /admin/analytics/main-range?section=payments&startMonth=YYYY-MM&endMonth=YYYY-MM`

Response:
```
{
  "section": "payments",
  "data": [
    {
      "month": "2025-08",
      "conversionRate": 0.18,
      "repeatPurchaseRate": 0.32,
      "averagePurchaseValue": 299,
      "cohortLtvM0": 299,
      "averageRevenuePerUser": 2.7,
      "totalTransactions": 124
    }
  ]
}
```

### 4) Multiple metrics series in one request
`GET /admin/analytics/metrics?section=payments&metrics=conversionRate,averagePurchaseValue&startMonth=YYYY-MM&endMonth=YYYY-MM`

Response:
```
{
  "section": "payments",
  "metrics": [
    {
      "metric": "conversionRate",
      "data": [
        { "month": "2025-07", "value": 0.31 },
        { "month": "2025-08", "value": 0.29 }
      ]
    },
    {
      "metric": "averagePurchaseValue",
      "data": [
        { "month": "2025-07", "value": 299 },
        { "month": "2025-08", "value": 279 }
      ]
    }
  ]
}
```

### 5) Conversion breakdown (character / scenario)
`GET /admin/analytics/payments/breakdown/conversion?groupBy=character&month=YYYY-MM`

Response:
```
[
  { "id": "uuid", "name": "Character A", "activeUsers": 120, "payingUsers": 30, "conversionRate": 0.25 }
]
```

### 6) Revenue breakdown (character / deeplink)
`GET /admin/analytics/payments/breakdown/revenue?groupBy=deeplink&month=YYYY-MM`

Response:
```
[
  { "deeplink": "ref_campaign", "revenue": 1200, "transactions": 40 }
]
```

---

## Notes

- All metrics are UTC‑based.
- Range endpoints enforce a maximum of 24 months per request.
- Deeplink attribution is **last‑touch** at the moment of payment.
