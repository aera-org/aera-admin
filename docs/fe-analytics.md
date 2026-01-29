# Frontend Analytics Vision (Main Business Metrics)

This document describes how the frontend should present analytics for Main Business Metrics (1–8), based on the current backend API.

## Goals

- Make monthly trends easy to understand at a glance.
- Keep the UI consistent across metrics (rates, counts, durations).
- Provide clear definitions for each metric, aligned with backend formulas.
- Ensure charts and tables are UTC-based.

## Primary Screens

### 1) Overview Dashboard

**Top filters**
- Date range (start month, end month), format `YYYY-MM`, UTC only.
- Metric selector for the main chart.

**KPI cards (current month)**
- Show one month at a time (default: most recent full month).
- Each card shows: value, delta vs previous month, and a short definition tooltip.
- Metrics:
  - Bounce Rate
  - Retention Rate
  - Churn Rate
  - Unique Users
  - Active Users
  - New Users
  - Stickiness Ratio
  - Avg Session Duration
  - Avg Messages per Session
  - Chat Recovery Rate

**Primary chart**
- One metric line chart over the selected range.
- Use the metric selector to switch series (same scale and formatting rules).

**Monthly table**
- Rows = months in range.
- Columns = all metrics.
- Enables scanning and copy/paste for reports.

## UX Recommendations

- **Percent metrics**: render as `0–100%` with one decimal place.
- **Counts**: integer formatting with thousands separators.
- **Duration**: show in `mm:ss` or `Xm Ys` for cards, but keep raw seconds in tooltips.
- **Tooltips**: include exact value and definition.
- **Empty data**: show `—` with tooltip “No data for this month”.
- **Refresh hint**: show last computed time if available (future enhancement).

## Metric Definitions (Frontend Copy)

These tooltips should match backend logic:

- **Bounce Rate**: Users whose total number of messages is exactly 1 and whose first message was in the month / new users in the month.
- **Retention Rate**: (Active users this month – new users this month) / active users last month.
- **Churn Rate**: 1 – retention rate.
- **Unique Users**: Users with at least one session in the month.
- **Active Users**: Users with more than 2 sessions in the month.
- **New Users**: Users whose first-ever message was in the month.
- **Stickiness Ratio**: Average DAU / MAU.
- **Avg Session Duration**: Average duration of sessions (seconds).
- **Avg Messages per Session**: Average number of user messages in a session.
- **Chat Recovery Rate**: Unblocked events / blocked events in the month.

## Frontend Data Flow

### Initial load
1. Fetch KPI cards for a single month (default last full month):
   - `GET /admin/analytics/main?month=YYYY-MM`
2. Fetch the default chart series (e.g. Retention):
   - `GET /admin/analytics/metric?metric=retentionRate&startMonth=YYYY-MM&endMonth=YYYY-MM`
3. Populate the table by requesting each metric series (one request per metric).
   - For performance, request in parallel.

### On filter change
- Re-fetch `metric` series for the selected chart metric.
- Re-fetch `main` for the currently selected month (if changed).
- Re-fetch all series for the table in parallel.

## Backend API (Current)

### 1) Monthly KPI values
`GET /admin/analytics/main?month=YYYY-MM`

Response:
```
{
  "month": "2026-01",
  "bounceRate": 0.35,
  "retentionRate": 0.42,
  "churnRate": 0.58,
  "uniqueUsers": 1200,
  "activeUsers": 340,
  "newUsers": 250,
  "stickinessRatio": 0.12,
  "avgSessionDurationSec": 420,
  "avgMessagesPerSession": 6.4,
  "chatRecoveryRate": 0.7
}
```

### 2) Metric series for charts
`GET /admin/analytics/metric?metric=<key>&startMonth=YYYY-MM&endMonth=YYYY-MM`

Response:
```
{
  "metric": "retentionRate",
  "data": [
    { "month": "2025-07", "value": 0.31 },
    { "month": "2025-08", "value": 0.29 }
  ]
}
```

Supported metric keys:
- `bounceRate`
- `retentionRate`
- `churnRate`
- `uniqueUsers`
- `activeUsers`
- `newUsers`
- `stickinessRatio`
- `avgSessionDurationSec`
- `avgMessagesPerSession`
- `chatRecoveryRate`

## Notes

- All metrics are UTC-based.
- The backend caches per-month calculations; the first request may be slower.
- The data collection starts from analytics rollout time; earlier months will be empty.

## Scaling to Payments + Technical Metrics

The Main Metrics UI is the template. Payments and Technical should reuse the same layout and components.

### UI Structure (same as Main)
- Filters: start month / end month (UTC)
- KPI cards: section-specific set
- Main chart: metric selector tied to section
- Monthly table: months x metrics for the active section

### Shared Metric Registry (frontend)
For each metric keep a single source of truth:
- `key` (unique identifier)
- `label`
- `format` (`percent`, `count`, `currency`, `duration`)
- `description`
- `section` (`main` | `payments` | `technical`)

This registry drives:
- KPI card labels and tooltips
- Formatting rules in cards/table/charts
- Metric selector options

### Backend API Pattern (proposed)
Mirror the Main endpoints per section:

- Main:
  - `GET /admin/analytics/main?month=YYYY-MM`
  - `GET /admin/analytics/metric?metric=<key>&startMonth=YYYY-MM&endMonth=YYYY-MM`

- Payments:
  - `GET /admin/analytics/payments?month=YYYY-MM`
  - `GET /admin/analytics/payments/metric?metric=<key>&startMonth=YYYY-MM&endMonth=YYYY-MM`

- Technical:
  - `GET /admin/analytics/technical?month=YYYY-MM`
  - `GET /admin/analytics/technical/metric?metric=<key>&startMonth=YYYY-MM&endMonth=YYYY-MM`

The frontend only switches the base path and metric list per tab.

### Notes
- Keep formatting consistent across sections (e.g., conversion rates use percent formatting everywhere).
- If any metric is not available for some months, return `null` or `0` and show `—` in the UI.
