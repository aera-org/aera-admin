# Frontend Analytics Vision — Deeplinks

This document describes the frontend API contract for Deeplinks analytics.

## Endpoint

`GET /admin/analytics/deeplinks?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&ref=<ref>&characterId=<uuid>&scenarioId=<uuid>`

### Query params
- `startDate` (required) — day in `YYYY-MM-DD`, UTC.
- `endDate` (required) — day in `YYYY-MM-DD`, UTC.
- `ref` (optional) — filter by ref.
- `characterId` (optional) — filter by character id.
- `scenarioId` (optional) — filter by scenario id.

### Response
```
[
  {
    "deeplink": "ref_nikita009__s_eliza-escort",
    "ref": "nikita009",
    "character": { "id": "uuid", "name": "Character A" },
    "scenario": { "id": "uuid", "name": "Scenario A", "slug": "scenario-slug" },
    "total": 120,
    "unique": 30,
    "visits": 200,
    "purchased": 25,
    "revenue": 325.5,
    "conversion": 20.8
  }
]
```

## Metric definitions
- **visits**: raw count of `deeplink_event` in period.
- **unique**: distinct users with `isNewUser = true` in period.
- **total**: distinct users with ≥1 chat session in period and at least one deeplink event in period.
- **purchased**: distinct users (from `total`) with ≥1 payment in period.
- **revenue**: sum of payment amount for the deeplink in period, converted to USD.
- **conversion**: `purchased / total * 100`.

## Notes
- All dates are UTC.
- Revenue values are in USD (amounts in stars converted via `STAR_TO_USD`).
