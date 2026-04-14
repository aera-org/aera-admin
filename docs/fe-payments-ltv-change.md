# Frontend Analytics — Payments LTV Change

This document describes the payments analytics API change for LTV.

## What changed

- `cohortLtvM0` is removed from payments analytics.
- `ltv` is added instead.
- `ltv` is calculated as `averageRevenuePerUniqueUser / churnRate`.
- `averageRevenuePerUniqueUser` keeps the current formula: all monthly revenue divided by unique users of the month.
- `retentionRate` and `churnRate` use M1 cohort logic.

## Formula

```
cohortUsers = users whose first user_message is in month M
retainedUsers = cohortUsers with at least one chat_session in month M+1
retentionRate = cohortUsers > 0 ? retainedUsers / cohortUsers : 0
churnRate = cohortUsers > 0 ? 1 - retentionRate : 0
averageRevenuePerUniqueUser = allMonthlyRevenue / cohortUsers
ltv = churnRate > 0 ? averageRevenuePerUniqueUser / churnRate : 0
```

For example, February retention/churn becomes final only after March is finished.

## Endpoints

### Main monthly metrics

`GET /admin/analytics/main?month=YYYY-MM`

`retentionRate` and `churnRate` now use the M1 cohort formula above.

### Main metric series

`GET /admin/analytics/main/metric?metric=retentionRate&startMonth=YYYY-MM&endMonth=YYYY-MM`

`GET /admin/analytics/main/metric?metric=churnRate&startMonth=YYYY-MM&endMonth=YYYY-MM`

Series values use the same M1 cohort formula.

### Monthly payments metrics

`GET /admin/analytics/payments?month=YYYY-MM`

Response item now includes `ltv` and no longer includes `cohortLtvM0`.

```ts
type PaymentsMetrics = {
  month: string;
  conversionRate: number;
  repeatPurchaseRate: number;
  averagePurchaseValue: number;
  ltv: number;
  revenue: number;
  averageRevenuePerUser: number;
  averageRevenuePerUniqueUser: number;
  averageRevenuePerCustomer: number;
  totalTransactions: number;
  customers: number;
};
```

### Payments metric series

`GET /admin/analytics/payments/metric?metric=ltv&startMonth=YYYY-MM&endMonth=YYYY-MM`

`metric=cohortLtvM0` is no longer supported.

```ts
type PaymentsMetricSeries = {
  metric: 'ltv';
  data: {
    month: string;
    value: number;
  }[];
};
```

### Payments range

`GET /admin/analytics/metrics?section=payments&startMonth=YYYY-MM&endMonth=YYYY-MM`

Each month object now includes `ltv` instead of `cohortLtvM0`.

```ts
type PaymentsMetricsRangeItem = PaymentsMetrics;
```

## Notes

- Values are in USD.
- `ltv` is a monthly proxy LTV, not factual lifetime revenue.
- If `churnRate` is `0`, backend returns `ltv = 0` to avoid division by zero.
- For months whose M+1 retention window is not finished yet, backend returns `retentionRate = 0`, `churnRate = 0`, and `ltv = 0`.
- Backend does not persist cache for immature months; once M+1 is finished, the first request recalculates and stores the final value.
