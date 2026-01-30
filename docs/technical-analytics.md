# Technical Analytics (Spec)

This document defines the technical analytics metrics calculated from:
- `chat_response_log`
- `llm_call`
- `img_gen_log`
- `error_log`

All metrics are monthly (UTC).

## Metrics

### 1) Error Rate
**Formula**
```
errors / (responses + errors)
```
- `responses` = count of `chat_response_log` rows in month
- `errors` = count of `error_log` rows in month
- If both are 0 → return `null`

### 2) Avg Response Time
**Formula**
```
avg(chat_response_log.total_latency)
```
- `total_latency` is used as end-to-end response time.

### 3) Cost Metrics (LLM)
**Formulas**
```
total_cost = sum(llm_call.price)
avg_cost_per_call = avg(llm_call.price)
```

### 4) Img Gen Total Avg
**Formula**
```
avg(img_gen_log.total_latency)
```

### 5) Img Gen Generation Avg
**Formula**
```
avg(img_gen_log.generation_latency)
```

### 6) Img Generation Total
**Formula**
```
count(img_gen_log)
```

### 7) Img Generation per Chat
**Formula**
```
count(img_gen_log) / count(distinct chat_id)
```
- If `count(distinct chat_id) = 0` → return `null`

## Notes
- All metrics are computed in UTC time buckets.
- Error Rate is defined as errors divided by total events (responses + errors).
- Cost metrics are based on `llm_call.price`.
