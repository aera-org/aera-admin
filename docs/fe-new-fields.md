# Analytics API Changes — `All` Fields

This document lists only the newly added registration-based fields with the `All` suffix.

## Payments

Endpoint:

`GET /admin/analytics/payments?month=YYYY-MM`

Added fields:

```json
{
  "ltvAll": 245,
  "averageRevenuePerUniqueUserAll": 3.2,
  "uniqueAll": 390
}
```

Definitions:
- `uniqueAll`: users registered in the selected month by `user.createdAt`.
- `averageRevenuePerUniqueUserAll`: `revenue / uniqueAll`.
- `ltvAll`: `averageRevenuePerUniqueUserAll / churnRate`.

Notes:
- Existing `averageRevenuePerUniqueUser` still uses activation-based `unique` (first `user_message`).
- `uniqueAll` is registration-based and does not require `chat_session` or `user_message`.

Metric series support:
- `ltvAll`
- `averageRevenuePerUniqueUserAll`
- `uniqueAll`

## Deeplinks

Endpoint:

`GET /admin/analytics/deeplinks?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Added fields:

```json
{
  "uniqueAll": 45,
  "arpuuAll": 7.23
}
```

Definitions:
- `uniqueAll`: users for the deeplink whose `user.createdAt` is inside the selected period, without `chat_session` filtering.
- `arpuuAll`: `revenue / uniqueAll`.

Sorting:
- `sortBy=uniqueAll`
- `sortBy=arpuuAll`

Notes:
- Existing `unique` in deeplinks remains activation-based: new users with a deeplink event that also reached `chat_session` in the period.
- `uniqueAll` is registration-based and does not require `chat_session`.
