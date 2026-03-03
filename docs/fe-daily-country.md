# Frontend Analytics Vision — Daily By Country

This document describes the frontend API contract for daily analytics by country.

## Endpoints

### Daily series for a country
`GET /admin/analytics/daily/by-country?country=<code>&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

### Top countries by metric
`GET /admin/analytics/daily/by-country/top?metric=<metric>&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&order=<asc|desc>&limit=20`

## Query params
- `country` (required) — country code or name as stored in `user.country` (use `unknown` for nulls).
- `startDate` (required) — day in `YYYY-MM-DD`, UTC.
- `endDate` (required) — day in `YYYY-MM-DD`, UTC.
- `metric` (top only) — `unique`, `total`, `customers`, `revenue`, `conversion`, `arpu`, `arpc`.
- `order` (optional) — `asc` or `desc` (default: `desc`).
- `limit` (optional) — max number of countries (default: 20, max: 100).

## Responses

### Daily series
```
[
  {
    "day": "2026-01-01",
    "country": "UA",
    "unique": 120,
    "total": 340,
    "customers": 48,
    "revenue": 325.5,
    "conversion": 0.141,
    "arpu": 0.957,
    "arpc": 6.781
  }
]
```

### Top countries
```
[
  {
    "country": "UA",
    "unique": 1200,
    "total": 3400,
    "customers": 480,
    "revenue": 3255,
    "conversion": 0.141,
    "arpu": 0.957,
    "arpc": 6.781
  }
]
```

## Metric definitions
- **unique**: users whose first `user_message` happened in the day.
- **total**: distinct users with ≥1 `chat_session` in the day.
- **customers**: distinct users with ≥1 payment in the day.
- **revenue**: sum of payment amount for the day, converted to USD.
- **conversion**: `customers / total`.
- **arpu**: `revenue / total`.
- **arpc**: `revenue / customers`.

## Notes
- All dates are UTC.
- Revenue values are in USD (amounts in stars converted via `STAR_TO_USD`).
- Current day is computed on-demand; past days are cached.
