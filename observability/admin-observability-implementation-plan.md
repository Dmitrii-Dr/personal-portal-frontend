# Admin Observability — Implementation Plan

## Sources

- API contract: `observability/admin-observability-public-api.md`
- Desktop mockups:
  - `observability/admin-observability-ui-design-daily-stats-active.html`
  - `observability/admin-observability-ui-design-request-logs-popup.html`
- Mobile mockups:
  - `observability/admin-observability-ui-design-daily-stats-active-mobile.html`
  - `observability/admin-observability-ui-design-request-logs-popup-mobile.html`

No localization is required. All UI strings are plain English constants.

---

## Page Layout Summary

The Observability page has two visible regions stacked vertically:

1. **Top Error Endpoints card** — always visible, independent of the active tab.
2. **Main tabbed card** — two tabs: `Request Logs` (default active) and `Daily Endpoint Statistics`.

The Daily Endpoint Statistics tab contains two sub-sections rendered sequentially:
- Daily Endpoint Statistics (chart + data table)
- Endpoint Period Stats (Grouped)

---

## Confirmed Decisions

1. Request Logs filters: `method` and `status` are multi-select with predefined options. Include a "no filter applied" empty default.
2. Request Logs `templatePath` filter: multi-select sourced from `/endpoint-stats/paths` API. Max 5 simultaneous selections.
3. Request Logs auto-loads on initial render with `today` as the date range and all other filters at defaults.
4. Request Logs date range: `from < to`, max 31 days. UI must prevent invalid ranges.
5. Daily Stats — Daily Endpoint Statistics: `from`, `to`, one `method`, one `templatePath` required before loading. Max range 3 months. Force `size=100`.
6. Daily chart: 3 curves — `total` (solid), `success` (solid green), `errors` (dashed orange). Each curve can be toggled show/hide.
7. Errors formula for chart: `authErrorCount + clientErrorCount + serverErrorCount + otherNonSuccessCount`.
8. Chart drill-down: clicking a data point opens the Request Logs tab pre-filled with that day + same method/templatePath + corresponding status filter (errors → error statuses; success → success statuses).
9. Grouped Period Stats: UI enforces at least one `method` and one `templatePath` (method+template grouping mode only).
10. Top Errors size options: `5`, `10`, `20`. Default is `5`.
11. Request Log Detail modal: open immediately with a loading indicator; data arrives asynchronously. `404` is handled as toast-only, no full-page error state.
12. Nullable fields displayed as the string `null`. JSON string fields are pretty-printed.
13. Navigation entry: admin avatar menu only (not admin header links). Menu order: Profile → Dashboard → Observability → Divider → Logout.
14. Mobile: detail view uses full-screen dialog.
15. Global auth/error handling (including `403`) is reused from existing portal behavior.
16. JSON export: available for all three dataset types. Exports the current fetched response payload as-is.

---

## Files Affected

| File | Change |
|---|---|
| `src/App.jsx` | Add `observability` route inside `AdminRoute` |
| `src/components/AppLayout.jsx` | Add Observability item to admin avatar menu |
| `src/utils/adminObservabilityApi.js` | New — API service module |
| `src/pages/AdminObservabilityPage.jsx` | New — main page component |
| `src/components/admin-observability/` | Optional split if page component grows large |

---

## Implementation Steps

---

### Step 1 — Route Registration and Navigation Entry Point

**Files:** `src/App.jsx`, `src/components/AppLayout.jsx`

**Rationale:** Establish the entry point first so the page is reachable for all subsequent development and manual testing.

#### 1.1 — Add route in `src/App.jsx`

Inside the existing `AdminRoute > Routes` block, add a new `Route` entry:

- path: `observability`
- element: `<AdminObservabilityPage />`

Add the corresponding import for `AdminObservabilityPage`.

#### 1.2 — Add navigation item in `src/components/AppLayout.jsx`

In the admin avatar menu (`id="admin-user-menu"`), insert a new `MenuItem` between the Dashboard item and the existing `Divider`. The item navigates to `/admin/observability`.

Final menu order:
1. My Profile → `/admin/profile`
2. Dashboard → `/admin/dashboard`
3. **Observability → `/admin/observability`** ← new
4. `<Divider />`
5. Logout

Use an appropriate MUI icon (e.g. `MonitorHeartIcon` or `BarChartIcon` from `@mui/icons-material`). Label: `Observability`.

No changes to the desktop admin header link row or mobile drawer are needed (confirmed decision #13).

---

### Step 2 — API Service Module

**File:** `src/utils/adminObservabilityApi.js` (new)

**Rationale:** Centralize all network calls before building any UI panel. Every panel will import from this module. All functions must accept a `signal` parameter for `AbortController` cancellation.

#### Functions to implement

| Function | Endpoint | Required params |
|---|---|---|
| `getEndpointDailyStats(params, { signal })` | `GET /endpoint-stats` | none required |
| `getEndpointPaths({ signal })` | `GET /endpoint-stats/paths` | — |
| `getEndpointPeriodStats(params, { signal })` | `GET /endpoint-stats/period` | `from`, `to` |
| `getEndpointTopErrors(params, { signal })` | `GET /endpoint-stats/period/top-errors` | `from`, `to` |
| `getRequestLogs(params, { signal })` | `GET /request-logs` | `from`, `to` |
| `getRequestLogDetail(id, { signal })` | `GET /request-logs/{id}` | `id` |

#### Requirements for all functions

- Use `apiClient` from `src/utils/api.js` so JWT is attached automatically.
- Pass `signal` through to `apiClient` call options.
- Set an explicit `timeout` (e.g. 15 000 ms).
- For params with repeatable values (`methods`, `templatePaths`), serialize them as repeated query params (e.g. `methods=GET&methods=POST`). Use `params` serializer that handles arrays correctly — verify against `apiClient`'s axios configuration.
- Include JSDoc type comments for all param shapes and return shapes based on `admin-observability-public-api.md`.

---

### Step 3 — Page Skeleton and Tab Structure

**File:** `src/pages/AdminObservabilityPage.jsx` (new)

**Rationale:** Create the visual shell and tab switching before adding any data-fetching logic. This gives a stable mount point for every subsequent step.

#### Page structure

```
AdminObservabilityPage
  ├── Page title area: "Observability" heading + short description
  ├── TopErrorEndpointsCard       ← always visible
  └── Main MUI Paper/Card
        └── MUI Tabs
              ├── Tab: "Request Logs"
              │     └── RequestLogsPanel (empty placeholder)
              └── Tab: "Daily Endpoint Statistics"
                    └── DailyStatsPanel (empty placeholder)
```

Tabs use MUI `Tabs` + `Tab` components. Active tab is tracked in local component state; default active tab is `Request Logs` (index 0).

Both panel components and `TopErrorEndpointsCard` can be inline in the page file initially and extracted to `src/components/admin-observability/` if the file grows large.

---

### Step 4 — Shared Presentational Components

**File:** `src/pages/AdminObservabilityPage.jsx` (or sub-components)

**Rationale:** Define reusable display helpers before building data panels so they are available in every subsequent step.

#### 4.1 — HTTP status badge

Colored `Chip` or `Box` that visually classifies a numeric HTTP status:
- 2xx → green (success)
- 4xx → orange (warning)
- 5xx → red (error)
- Other → grey (neutral)

Renders the raw status number as its label.

#### 4.2 — Nullable field renderer

A helper that receives a value and returns:
- The value as-is if not null/undefined/empty.
- The string `"null"` styled in muted monospace if the value is null, undefined, or empty string.

#### 4.3 — JSON pretty-print code box

A scrollable dark-background code block (`background: #0f172a`, monospace font, `overflow: auto`, `max-height` capped) that:
- Attempts `JSON.parse` + `JSON.stringify(val, null, 2)` on the input string.
- Falls back to displaying the raw string if parsing fails.
- Shows `"null"` if the value is null/undefined.

#### 4.4 — Section loading / error / empty states

A reusable inline component that shows:
- A centered `CircularProgress` when `loading` is true.
- An MUI `Alert severity="error"` when an error string is present.
- An MUI `Alert severity="info"` with a configurable "no results" message when data is empty.
- Children otherwise.

---

### Step 5 — Endpoint Paths Catalog (Shared Loader)

**File:** `src/pages/AdminObservabilityPage.jsx`

**Rationale:** The paths list from `GET /endpoint-stats/paths` is consumed by multiple controls (Request Logs template path multi-select, Daily Stats template path autocomplete). Load it once at page mount and share the result.

#### Behavior

- Fetch `getEndpointPaths()` in a `useEffect` that runs once on page mount.
- Store the result in page-level state: `endpointPaths` (string array), `endpointPathsLoading` (boolean), `endpointPathsError` (string|null).
- Pass `endpointPaths` down as a prop to both the Request Logs filter panel and the Daily Stats filter panel.
- Follow the AbortController + `isMounted` pattern (see Step 15 for compliance details).
- On error: show a non-blocking warning (toast or inline notice) but do not block the rest of the page.

---

### Step 6 — Request Logs: Filter Controls, Validation, and Initial Load

**File:** `src/pages/AdminObservabilityPage.jsx`

**Rationale:** Build the full filter model and initial auto-fetch before wiring up the table. This keeps data concerns separate from display concerns.

#### Filter state fields

| Field | Control type | Default |
|---|---|---|
| `from` | MUI `DateTimePicker` | today at `00:00:00` (UTC midnight) |
| `to` | MUI `DateTimePicker` | today at `23:59:59` (UTC end of day) |
| `methods` | Multi-select `Autocomplete` or `Select` with checkboxes | empty (no filter) |
| `statuses` | Multi-select `Autocomplete` or `Select` with checkboxes | empty (no filter) |
| `templatePaths` | Multi-select `Autocomplete` populated from `endpointPaths` | empty (no filter) |
| `userId` | Free-text `TextField` | empty |
| `errorCodeContains` | Free-text `TextField` | empty |
| `errorMessageContains` | Free-text `TextField` | empty |

Predefined options:
- `methods`: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- `statuses`: `200`, `201`, `400`, `401`, `404`, `500`
- `templatePaths`: populated from Step 5 paths catalog
- `templatePaths` selection cap: max 5 simultaneous entries

#### Validation rules

Validation runs before every fetch (not on every keystroke):
- `from` must be set and be a valid datetime.
- `to` must be set and be a valid datetime.
- `from` must be strictly before `to`.
- `to − from` must not exceed 31 days.

Show inline validation errors adjacent to the relevant fields. Disable the Apply button while validation is failing.

#### Auto-load on mount

When the page first mounts, trigger a fetch for Request Logs using the default `from`/`to` range (today) and all other filters at their defaults (no filter applied). This is the only panel that auto-fetches; Daily Stats panels require an explicit user action.

#### Pagination state

Maintain as part of Request Logs state:
- `page` (0-based, default `0`)
- `size` (default `20`, options: `20`, `50`, `100`)

Changing `page` or `size` triggers a new fetch without resetting filters.

#### Apply and Reset actions

- **Apply**: validate → reset to page 0 → fetch with current filter state.
- **Reset**: restore all filters to defaults → reset pagination → fetch defaults.

---

### Step 7 — Request Logs: Data Table and Pagination Controls

**File:** `src/pages/AdminObservabilityPage.jsx`

**Rationale:** Wire the fetched data into a readable table with navigation controls.

#### Table columns

| Column | Field | Notes |
|---|---|---|
| ID | `id` | monospace |
| Created At | `createdAt` | formatted as `YYYY-MM-DDTHH:mm:ssZ` |
| Method | `method` | plain text |
| Status | `status` | rendered via status badge (Step 4.1) |
| Duration | `durationMs` | formatted as `N ms` |
| Template Path | `templatePath` | monospace |
| User | `userId` | truncated UUID monospace or `null` |
| Error | `errorCode` | monospace, `-` if both errorCode and errorMessage are null |
| Action | — | `Details` button triggering Step 8 |

#### Pagination controls (below table)

- Left side: total record count label (e.g. `Total: 1,648 records`).
- Right side:
  - Size select (`20` / `50` / `100`)
  - Page select (1-based display, populated from `totalPages`)
  - Prev / Next buttons (disabled at first/last page respectively)

#### Header hint

Above the table, display a short string: `Page X / Y | size N`.

#### JSON export

An `Export JSON` button in the card header area. On click, download the current page's raw response payload as a `.json` file (see Step 13 for export mechanics).

---

### Step 8 — Request Log Detail: Modal (Desktop) and Full-Screen Dialog (Mobile)

**File:** `src/pages/AdminObservabilityPage.jsx`

**Rationale:** Implement the detail view triggered by the table's Details button.

#### Trigger

Clicking the `Details` button on any row:
1. Sets `selectedLogId` state to that row's `id`.
2. Opens the modal/dialog immediately (showing a loading spinner).
3. Fires a `getRequestLogDetail(id, { signal })` fetch.

#### Desktop modal layout

Use MUI `Dialog` with `maxWidth="md"` (approx 980 px), `fullWidth`. The dialog is scrollable internally.

- **Sticky header**: title `Request Detail (selected: #ID)` + `Close` button on the right.
- **Body — key-value rows** (label left, value right):
  - Path
  - Template Path
  - Method / Status (method string + status badge)
  - Duration (`N ms`)
  - User ID (nullable)
  - Error (`errorCode | errorMessage`, nullable)
- **Body — code boxes** (each with a label above, dark bg, scrollable, max-height ~140 px):
  - Request Headers (sanitized)
  - Response Headers (sanitized)
  - Request Body (sanitized)
  - Stack Trace
- All nullable fields use the nullable renderer (Step 4.2).
- All JSON string fields use the JSON pretty-print code box (Step 4.3).

#### Mobile behavior

On mobile breakpoints (`xs`/`sm`), use `fullScreen` mode on the same MUI `Dialog` instead of a centered floating card.

#### Loading state

While the detail fetch is in flight, render a centered `CircularProgress` inside the open dialog body.

#### 404 handling

If the detail fetch returns 404, close (or keep open and show) the dialog and display an MUI `Snackbar` toast with a `"Record not found"` message. Do not show a full error panel inside the dialog.

#### Other errors

Show an inline `Alert` inside the dialog body with the error message and a Retry button.

#### Cleanup

On dialog close, cancel any in-flight detail fetch via `AbortController`, clear `selectedLogId` and detail state.

---

### Step 9 — Daily Stats: Daily Endpoint Statistics

**File:** `src/pages/AdminObservabilityPage.jsx`

**Rationale:** First section inside the Daily Endpoint Statistics tab. Requires all four filter fields before fetching.

#### Filter controls

Displayed in a 4-column grid:

| Field | Control | Constraint |
|---|---|---|
| From (date) | MUI `DatePicker` | required |
| To (date) | MUI `DatePicker` | required, ≥ From |
| Method | Single `Select` with `ALL` + HTTP methods | required (ALL = no filter; but API requires exactly one value, see below) |
| Template Path | `Autocomplete` populated from `endpointPaths` | required |

Per confirmed decision #5: all four fields are required. `method` and `templatePath` must be explicitly selected (not left at ALL/empty) before the Load button is enabled.

Validation:
- All four fields must be set.
- `from ≤ to`.
- `to − from ≤ 3 months`.

Buttons: `Load Statistics` (disabled until validation passes), `Reset`.

Force `size=100` in the API request (no pagination UI for this section).

#### Data display — two-column layout

Left column (wider, ~55%): **Line chart**
- X-axis: bucket dates from response data.
- 3 curves:
  - `Total count` — solid line, primary color.
  - `Success count` — solid line, green.
  - `Errors` (computed: `authErrorCount + clientErrorCount + serverErrorCount + otherNonSuccessCount`) — dashed line, orange.
- Each curve has a legend toggle checkbox to show/hide it.
- Clicking a data point triggers the drill-down to Request Logs (Step 12).
- Use an appropriate charting library already in the project, or add one (e.g. Recharts or Chart.js).

Right column (~45%): **Compact data table**

| Column | Field |
|---|---|
| Day | `bucketStart` |
| Method | `method` |
| Total | `totalCount` |
| Success | `successCount` |
| 4xx | `clientErrorCount + authErrorCount` |
| 5xx | `serverErrorCount` |

#### Export

`Export JSON` button in the section header. Downloads the full response payload.

---

### Step 10 — Daily Stats: Endpoint Period Stats (Grouped)

**File:** `src/pages/AdminObservabilityPage.jsx`

**Rationale:** Second sub-section within the Daily Endpoint Statistics tab, rendered below the Daily Stats chart section. Has its own independent filter state.

#### Filter controls

| Field | Control | Constraint |
|---|---|---|
| From (date) | MUI `DatePicker` | required |
| To (date) | MUI `DatePicker` | required |
| Methods | Multi-select (GET, POST, PUT, DELETE) | at least 1 required |
| Template Paths | Multi-select from `endpointPaths` | at least 1 required |

Validation:
- `from` and `to` required.
- `from ≤ to`.
- `to − from ≤ 1 calendar month`.
- At least one method and one template path must be selected (per confirmed decision #9).

Hint text below action buttons: `"Grouping depends on selected filters: method + templatePath. Allowed range: up to one calendar month."`

Buttons: `Load grouped stats`, `Reset`.

#### Data table

| Column | Field |
|---|---|
| Method | `method` (nullable renderer) |
| Template Path | `templatePath` (nullable renderer) |
| Total | `totalCount` |
| Success | `successCount` |
| Auth Errors | `authErrorCount` |
| Client Errors | `clientErrorCount` |
| Server Errors | `serverErrorCount` |
| Other Non-success | `otherNonSuccessCount` |

#### Export

`Export JSON` button in the section header.

---

### Step 11 — Top Error Endpoints Card

**File:** `src/pages/AdminObservabilityPage.jsx`

**Rationale:** Standalone card rendered above the main tabbed card. Has its own independent state and is not tied to the active tab.

#### Card header

Title: `Top Error Endpoints in Selected Period`  
Hint text (right side): `GET /api/v1/admin/observability/endpoint-stats/period/top-errors`

#### Filter controls

| Field | Control | Constraint |
|---|---|---|
| From (date) | MUI `DatePicker` | required |
| To (date) | MUI `DatePicker` | required |
| Size | `Select` with `5` / `10` / `20` | default `5` |

Validation:
- `from` and `to` required.
- `from ≤ to`.
- `to − from ≤ 1 calendar month`.

No page filter control in the UI — always fetches page 0 only. The card is a "top-N" view, not a full paginated list.

Hint text below action buttons: `"Sorted by totalErrorCount desc. Rows with 0 errors are excluded."`

Buttons: `Load top errors`, `Reset`.

#### Data table

| Column | Field |
|---|---|
| Rank | Row index (1-based) |
| Method | `method` |
| Template Path | `templatePath` |
| Total | `totalCount` |
| Success | `successCount` |
| Errors (sum) | `totalErrorCount` |
| Auth Errors | `authErrorCount` |
| Client Errors | `clientErrorCount` |
| Server Errors | `serverErrorCount` |
| Other Non-success | `otherNonSuccessCount` |

#### Export

`Export JSON` button in the card header.

---

### Step 12 — Chart Drill-Down to Request Logs Tab

**File:** `src/pages/AdminObservabilityPage.jsx`

**Rationale:** Cross-feature integration between the Daily Stats chart and the Request Logs tab.

#### Trigger

A click event on a data point in the Daily Endpoint Statistics line chart (Step 9).

#### Behavior

1. Switch the active main tab to `Request Logs` (tab index 0).
2. Pre-fill the Request Logs filter state with:
   - `from`: the clicked bucket date, `00:00:00` UTC.
   - `to`: the clicked bucket date, `23:59:59` UTC.
   - `methods`: the single method currently selected in the Daily Stats filter.
   - `templatePaths`: the single template path currently selected in the Daily Stats filter.
   - `statuses`:
     - If the user clicked the **errors** curve data point: pre-select error statuses (`400`, `401`, `404`, `500`).
     - If the user clicked the **success** curve data point: pre-select `200`, `201`.
     - If the user clicked the **total** curve data point: no status filter (clear).
3. Trigger an immediate fetch with the new filter state (same as clicking Apply).
4. Scroll to top of the page so the Request Logs panel is visible.

---

### Step 13 — JSON Export

**File:** `src/pages/AdminObservabilityPage.jsx`

**Rationale:** Available for all three dataset types. Implemented as a small shared utility.

#### Mechanic

Create a helper function `downloadJson(data, filename)` that:
1. Converts `data` to a formatted JSON string (`JSON.stringify(data, null, 2)`).
2. Creates a `Blob` with `type: application/json`.
3. Creates a temporary `<a>` element, sets `href` to an object URL, sets `download` to `filename`, clicks it, then revokes the URL.

#### Export buttons

Each section has an `Export JSON` button in its card/section header. The button is disabled when the section has no loaded data.

Suggested filenames:
- Request Logs: `request-logs-page-{page}-{timestamp}.json`
- Daily Stats: `daily-stats-{from}-{to}-{timestamp}.json`
- Period Stats: `period-stats-{from}-{to}-{timestamp}.json`
- Top Errors: `top-errors-{from}-{to}-{timestamp}.json`

---

### Step 14 — Mobile Responsive Behavior

**File:** `src/pages/AdminObservabilityPage.jsx`

**Rationale:** Apply responsive adjustments after all desktop panels are complete and functional.

#### Breakpoint strategy

Use `useResponsiveLayout` from `src/utils/useResponsiveLayout.js` (existing utility) or MUI's `useMediaQuery` to detect mobile vs desktop.

#### Layout changes at mobile breakpoints

| Area | Desktop | Mobile |
|---|---|---|
| Filter grids | 4-column grid | 2-column or 1-column stack |
| Daily Stats chart + table | Side-by-side (2-column) | Stacked (chart above, table below) |
| Request Log Detail | Centered dialog (`maxWidth="md"`) | `fullScreen` dialog |
| Top Errors table | Full column set | Horizontally scrollable with core columns prioritized |
| Grouped stats table | Full column set | Horizontally scrollable |
| Multi-select controls | Inline chips | Full-width stacked |
| Pagination controls | Inline row | Stacked, full-width selects |

#### MUI `DatePicker` / `DateTimePicker`

Use MUI X pickers which are already mobile-friendly. Ensure they are full-width on small screens.

---

### Step 15 — Async Safety and Error Handling

**File:** `src/pages/AdminObservabilityPage.jsx`

**Rationale:** Final compliance pass before delivery. Every async effect and event-triggered fetch must follow the portal's AbortController + isMounted pattern.

#### AbortController + isMounted checklist

For every `useEffect` or event handler that calls an API function:

1. Create an `AbortController` and store its `signal`.
2. Set `isMounted = true` at the start of the effect.
3. Pass `signal` to the API call.
4. Check `isMounted` before all `setState` calls after `await`.
5. In catch blocks: silently return if `err.name === 'AbortError'` or `err.name === 'CanceledError'` or `err.code === 'ERR_CANCELED'`.
6. In the cleanup function: set `isMounted = false` and call `controller.abort()`.

Affected fetch sites:
- Endpoint paths catalog (Step 5) — page-mount effect
- Request Logs auto-load (Step 6) — page-mount effect
- Request Logs Apply / pagination change — event-triggered
- Request Log Detail fetch (Step 8) — triggered by row Details click
- Daily Stats load (Step 9) — triggered by Load Statistics button
- Period Stats load (Step 10) — triggered by Load grouped stats button
- Top Errors load (Step 11) — triggered by Load top errors button

#### API error handling rules

| Error | Handling |
|---|---|
| `400 Bad Request` | Show inline `Alert` with the server's validation message (or a friendly reformulation). |
| `401 / 403` | Delegate to the existing global auth handler (do not add custom token logic here). |
| `404` on detail fetch | Show a toast (`Snackbar`) only. Do not block the list panel. |
| `404` on list endpoints | Treat as an empty result with an `Alert info` "No data found" message. |
| Network / timeout | Show inline `Alert error` with a Retry button that re-triggers the same fetch. |
| Empty period stats (neither methods nor paths selected) | Not an error — show an `Alert info` explaining that selection is required. |

#### State isolation

Each data section maintains its own independent state slice:

- `requestLogsState` — filters, pagination, data, loading, error
- `requestLogDetailState` — selectedId, data, loading, error
- `dailyStatsState` — filters, data, loading, error
- `periodGroupedState` — filters, data, loading, error
- `topErrorsState` — filters, data, loading, error
- `endpointPathsState` — data, loading, error (shared, page-level)

Changing filters or pagination in one section does not affect any other section.

---

## Delivery Sequence (Recommended PR Slicing)

| PR | Scope |
|---|---|
| **PR 1** | Step 1: Route + admin menu item only (empty page placeholder). |
| **PR 2** | Steps 2–5: API service module + page skeleton + shared components + paths loader. |
| **PR 3** | Steps 6–8: Request Logs filters, table, pagination, and detail modal. |
| **PR 4** | Steps 9–11: Daily Stats chart + table, Grouped Period Stats, Top Errors card. |
| **PR 5** | Steps 12–15: Drill-down, JSON export, mobile responsive pass, async safety audit, error handling. |
