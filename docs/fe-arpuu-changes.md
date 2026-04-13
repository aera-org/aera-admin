# Analytics API Changes — ARPUU

This document describes the new ARPUU metric added without changing the existing ARPU fields.

## Definition

- **arpu**: unchanged; current existing behavior.
- **arpuu**: average revenue per unique user, calculated as `revenue / unique`.
- **averageRevenuePerUniqueUser**: payments analytics equivalent of `arpuu`, calculated as `revenue / unique users`.

For payments analytics, **unique users** means users whose first `user_message` happened in the selected month.

## Updated responses

### Daily

`GET /admin/analytics/daily?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Added field:

```
{
  "arpuu": 2.71
}
```

### Daily by country

`GET /admin/analytics/daily/by-country?country=<country>&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

`GET /admin/analytics/daily/by-country/top?metric=arpuu&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Added field:

```
{
  "arpuu": 2.71
}
```

Top countries now accepts `metric=arpuu`.

### Deeplinks

`GET /admin/analytics/deeplinks?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Added field:

```
{
  "arpuu": 10.85
}
```

Deeplinks sorting now accepts `sortBy=arpuu`.

### Payments

`GET /admin/analytics/payments?month=YYYY-MM`

Added field:

```
{
  "averageRevenuePerUniqueUser": 8.4
}
```

Payments metric series and aggregate metrics endpoints now accept `averageRevenuePerUniqueUser`.
