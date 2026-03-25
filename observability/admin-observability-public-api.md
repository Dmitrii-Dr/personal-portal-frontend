# Admin Observability Public API

This document describes the public REST API exposed by:

- `EndpointDailyStatsAdminController`
- `RequestLogAdminController`

It is focused on UI integration (filters, requests, and response models) and omits internal implementation details.

## Base Paths

- Endpoint daily stats: `/api/v1/admin/observability/endpoint-stats`
- Endpoint paths catalog: `/api/v1/admin/observability/endpoint-stats/paths`
- Request logs: `/api/v1/admin/observability/request-logs`

## Common Pagination and Sorting

List endpoints return Spring `Page<T>` JSON with standard fields, including:

- `content`: array of items (`T`)
- `number`: current page index (0-based)
- `size`: requested page size
- `totalElements`: total matched rows
- `totalPages`: total page count
- `first`, `last`, `empty`: booleans
- `sort`: sort metadata

Query parameters available on list endpoints:

- `page` (optional, default `0`)
- `size` (optional, default `20`, max accepted `100`)
- `sort` (optional, repeatable, format: `field,asc|desc`)

---

## 1) Endpoint Daily Stats

### GET `/api/v1/admin/observability/endpoint-stats`

Returns paged daily aggregates by endpoint template and method.

### Filters

- `from` (optional, `YYYY-MM-DD`)
- `to` (optional, `YYYY-MM-DD`)
- `method` (optional, HTTP method string, for example `GET`, `POST`)
- `templatePath` (optional, endpoint template path string)

### Validation Rules

- If both `from` and `to` are provided, `from` must be earlier than or equal to `to`.
- Invalid range returns HTTP `400 Bad Request`.

### Default Sorting

- `bucketStart,desc`
- then `method,desc`
- then `templatePath,desc`

### Response Model (`Page<EndpointStatsDailyResponse>`)

`content[]` item fields:

- `bucketStart` (`date`)
- `method` (`string`)
- `templatePath` (`string`)
- `totalCount` (`number`)
- `successCount` (`number`)
- `authErrorCount` (`number`)
- `clientErrorCount` (`number`)
- `serverErrorCount` (`number`)
- `otherNonSuccessCount` (`number`)

---

## 2) Endpoint Paths Catalog

### GET `/api/v1/admin/observability/endpoint-stats/paths`

Returns a flat list of unique endpoint template paths.

The list is collected from Spring MVC request mappings during startup, then reused for all requests.
Only paths that belong to the observability capture scope are returned.

### Response Model (`string[]`)

- Array of endpoint template paths, for example `/api/v1/public/articles/{id}`.
- Values are unique and sorted ascending.

Example:

```json
[
  "/api/v1/public/articles",
  "/api/v1/public/articles/{id}",
  "/api/v1/public/users/{userId}/profile"
]
```

---

## 3) Endpoint Period Stats (Grouped)

### GET `/api/v1/admin/observability/endpoint-stats/period`

Returns grouped period aggregates with summed counters across matched daily rows.

### Filters

- `from` (**required**, `YYYY-MM-DD`)
- `to` (**required**, `YYYY-MM-DD`)
- `methods` (optional, repeatable HTTP method values, for example `methods=GET&methods=POST`)
- `templatePaths` (optional, repeatable template paths)

### Validation Rules

- `from` must be earlier than or equal to `to`.
- Allowed range is at most one calendar month (`to <= from + 1 month`), for example `2026-08-15` to `2026-09-15`.
- Invalid range returns HTTP `400 Bad Request`.

### Grouping Rules

- If both `methods` and `templatePaths` are provided: group by `method + templatePath`.
- If only `methods` are provided: group by `method` only (`templatePath` is `null` in response).
- If only `templatePaths` are provided: group by `templatePath` only (`method` is `null` in response).
- If neither is provided: response is an empty array.

### Response Model (`EndpointStatsPeriodResponse[]`)

Each item fields:

- `method` (`string`, nullable depending on grouping mode)
- `templatePath` (`string`, nullable depending on grouping mode)
- `totalCount` (`number`, sum in selected period/group)
- `successCount` (`number`, sum in selected period/group)
- `authErrorCount` (`number`, sum in selected period/group)
- `clientErrorCount` (`number`, sum in selected period/group)
- `serverErrorCount` (`number`, sum in selected period/group)
- `otherNonSuccessCount` (`number`, sum in selected period/group)

---

## 4) Endpoint Period Top Errors

### GET `/api/v1/admin/observability/endpoint-stats/period/top-errors`

Returns paged endpoint rows (`method + templatePath`) ranked by total errors in the selected period.

### Filters

- `from` (**required**, `YYYY-MM-DD`)
- `to` (**required**, `YYYY-MM-DD`)

### Validation Rules

- `from` must be earlier than or equal to `to`.
- Allowed range is at most one calendar month (`to <= from + 1 month`).
- Invalid range returns HTTP `400 Bad Request`.

### Pagination

- `page` (optional, default `0`)
- `size` (optional, default `20`, max accepted `20`)

### Sorting

- Primary: `totalErrorCount,desc`
- Tie-breakers: `method,asc`, then `templatePath,asc`
- Rows with `totalErrorCount = 0` are excluded.

### Response Model (`Page<TopErrorEndpointResponse>`)

`content[]` item fields:

- `method` (`string`)
- `templatePath` (`string`)
- `totalCount` (`number`, sum in selected period/group)
- `successCount` (`number`, sum in selected period/group)
- `authErrorCount` (`number`, sum in selected period/group)
- `clientErrorCount` (`number`, sum in selected period/group)
- `serverErrorCount` (`number`, sum in selected period/group)
- `otherNonSuccessCount` (`number`, sum in selected period/group)
- `totalErrorCount` (`number`, computed as sum of all non-success buckets)

---

## 5) Request Logs (List)

### GET `/api/v1/admin/observability/request-logs`

Returns paged request log records for table/list views.

### Filters

- `from` (**required**, ISO-8601 instant, for example `2026-03-01T00:00:00Z`)
- `to` (**required**, ISO-8601 instant)
- `status` (optional, HTTP status code as integer)
- `templatePath` (optional, endpoint template path string)
- `method` (optional, HTTP method string)
- `userId` (optional, UUID)
- `errorCodeContains` (optional, string match)
- `errorMessageContains` (optional, string match)

### Validation Rules

- `from` must be strictly earlier than `to`.
- Maximum allowed range is 31 days.
- Invalid range returns HTTP `400 Bad Request`.

### Default Sorting

- `createdAt,desc`
- then `id,desc`

### Response Model (`Page<RequestLogListItemResponse>`)

Full response envelope fields:

- `content` (`RequestLogListItemResponse[]`)
- `pageable.pageNumber` (`number`)
- `pageable.pageSize` (`number`)
- `pageable.sort.sorted` (`boolean`)
- `pageable.sort.unsorted` (`boolean`)
- `pageable.sort.empty` (`boolean`)
- `pageable.offset` (`number`)
- `pageable.paged` (`boolean`)
- `pageable.unpaged` (`boolean`)
- `last` (`boolean`)
- `totalPages` (`number`)
- `totalElements` (`number`)
- `first` (`boolean`)
- `numberOfElements` (`number`)
- `size` (`number`)
- `number` (`number`)
- `sort.sorted` (`boolean`)
- `sort.unsorted` (`boolean`)
- `sort.empty` (`boolean`)
- `empty` (`boolean`)

`content[]` item fields (`RequestLogListItemResponse`):

- `id` (`number`)
- `path` (`string`)
- `templatePath` (`string`)
- `method` (`string`)
- `status` (`number`)
- `durationMs` (`number`)
- `userId` (`string` UUID, nullable)
- `createdAt` (`string` datetime, ISO-8601 instant)
- `errorCode` (`string`, nullable)
- `errorMessage` (`string`, nullable)

Example:

```json
{
  "content": [],
  "pageable": {
    "pageNumber": 2,
    "pageSize": 20,
    "sort": {
      "sorted": true,
      "unsorted": false,
      "empty": false
    },
    "offset": 40,
    "paged": true,
    "unpaged": false
  },
  "last": true,
  "totalPages": 2,
  "totalElements": 24,
  "first": false,
  "numberOfElements": 0,
  "size": 20,
  "number": 2,
  "sort": {
    "sorted": true,
    "unsorted": false,
    "empty": false
  },
  "empty": true
}
```

---

## 6) Request Log Detail

### GET `/api/v1/admin/observability/request-logs/{id}`

Returns full details for a single request log row.

### Path Parameters

- `id` (**required**, numeric log ID)

### Responses

- `200 OK`: `RequestLogDetailResponse`
- `404 Not Found`: when record does not exist

### Response Model (`RequestLogDetailResponse`)

- `id` (`number`)
- `path` (`string`)
- `templatePath` (`string`)
- `method` (`string`)
- `status` (`number`)
- `durationMs` (`number`)
- `userId` (`string` UUID, nullable)
- `createdAt` (`string` datetime, ISO-8601 instant)
- `errorCode` (`string`, nullable)
- `errorMessage` (`string`, nullable)
- `requestBody` (`string`, nullable, sanitized JSON payload with personal fields redacted)
- `requestHeaders` (`string`, nullable, sanitized request headers JSON with sensitive values redacted)
- `responseHeaders` (`string`, nullable, sanitized response headers JSON with sensitive values redacted)
- `stackTrace` (`string`, nullable)

---

## UI Notes

- Use daily stats endpoint for chart aggregates (already grouped by day/method/template).
- Use period stats endpoint when the UI needs summed grouped totals for a selected month window.
- Use period top-errors endpoint when the UI needs a ranked, paged list of endpoints with the highest error volume.
- Use request logs list endpoint for searchable table views and drill-down entry selection.
- Use request log detail endpoint for expanded error/debug panels.
