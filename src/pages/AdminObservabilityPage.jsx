import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Checkbox,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Snackbar,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import {
  getEndpointDailyStats,
  getEndpointPeriodStats,
  getEndpointTopErrors,
  getEndpointPaths,
  getRequestLogDetail,
  getRequestLogs,
} from '../utils/adminObservabilityApi';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useResponsiveLayout } from '../utils/useResponsiveLayout';

dayjs.extend(utc);

const REQUEST_LOG_METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const REQUEST_LOG_STATUS_OPTIONS = ['200', '201', '400', '401', '404', '500'];
const REQUEST_LOG_PAGE_SIZE_OPTIONS = [20, 50, 100];
const DAILY_STATS_METHOD_OPTIONS = [...REQUEST_LOG_METHOD_OPTIONS];
const DAILY_PERIOD_METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE'];
const TOP_ERROR_SIZE_OPTIONS = [5, 10, 20];

const getDefaultRequestLogsFilters = () => ({
  from: dayjs.utc().startOf('day'),
  to: dayjs.utc().endOf('day'),
  methods: [],
  statuses: [],
  templatePaths: [],
  userId: '',
  errorCodeContains: '',
  errorMessageContains: '',
});

const validateRequestLogsFilters = (filters) => {
  const errors = {};

  if (!dayjs.isDayjs(filters.from) || !filters.from.isValid()) {
    errors.from = 'From date-time is required.';
  }

  if (!dayjs.isDayjs(filters.to) || !filters.to.isValid()) {
    errors.to = 'To date-time is required.';
  }

  if (!errors.from && !errors.to) {
    if (!filters.from.isBefore(filters.to)) {
      errors.range = 'From date-time must be strictly earlier than To date-time.';
    }

    if (filters.to.diff(filters.from, 'day', true) > 31) {
      errors.range = 'Date range must not exceed 31 days.';
    }
  }

  return errors;
};

const getHttpStatusChipColor = (status) => {
  const numericStatus = Number(status);

  if (Number.isNaN(numericStatus)) {
    return 'default';
  }

  if (numericStatus >= 200 && numericStatus < 300) {
    return 'success';
  }

  if (numericStatus >= 400 && numericStatus < 500) {
    return 'warning';
  }

  if (numericStatus >= 500 && numericStatus < 600) {
    return 'error';
  }

  return 'default';
};

const HttpStatusBadge = ({ status, size = 'small' }) => (
  <Chip
    label={String(status)}
    color={getHttpStatusChipColor(status)}
    size={size}
    variant="outlined"
  />
);

const renderNullableField = (value) => {
  if (value === null || value === undefined || value === '') {
    return (
      <Typography
        component="span"
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
      >
        null
      </Typography>
    );
  }

  return value;
};

const MONOSPACE_FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const formatCreatedAt = (value) => {
  if (!value) {
    return 'null';
  }

  const parsed = dayjs.utc(value);
  if (!parsed.isValid()) {
    return String(value);
  }

  return parsed.format('YYYY-MM-DDTHH:mm:ss[Z]');
};

const formatDurationMs = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'null';
  }
  return `${Number(value)} ms`;
};

const formatUserId = (value) => {
  if (!value) {
    return 'null';
  }
  const raw = String(value);
  if (raw.length <= 12) {
    return raw;
  }
  return `${raw.slice(0, 8)}...${raw.slice(-4)}`;
};

const getExportTimestamp = () => dayjs.utc().format('YYYYMMDD-HHmmss');

const downloadJson = (data, filename) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
};

const getErrorDisplayValue = (errorCode, errorMessage) => {
  if ((errorCode === null || errorCode === undefined || errorCode === '')
    && (errorMessage === null || errorMessage === undefined || errorMessage === '')) {
    return '-';
  }
  return errorCode || errorMessage;
};

const JsonCodeBox = ({ value, maxHeight = 280 }) => {
  if (value === null || value === undefined) {
    return renderNullableField(value);
  }

  let displayValue = value;

  if (typeof value === 'string') {
    try {
      displayValue = JSON.stringify(JSON.parse(value), null, 2);
    } catch (_error) {
      displayValue = value;
    }
  }

  if (typeof displayValue !== 'string') {
    displayValue = JSON.stringify(displayValue, null, 2);
  }

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 2,
        borderRadius: 1.5,
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '0.8125rem',
        lineHeight: 1.5,
        overflow: 'auto',
        maxHeight,
      }}
    >
      {displayValue}
    </Box>
  );
};

const SectionState = ({
  loading = false,
  error = null,
  onRetry = null,
  isEmpty = false,
  emptyMessage = 'No results found.',
  children,
}) => {
  if (loading) {
    return (
      <Box sx={{ py: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      >
        {error}
      </Alert>
    );
  }

  if (isEmpty) {
    return <Alert severity="info">{emptyMessage}</Alert>;
  }

  return children;
};

const RequestLogsPanel = ({
  filters,
  validationErrors,
  endpointPaths,
  endpointPathsLoading,
  page,
  size,
  totalElements,
  totalPages,
  loading,
  error,
  requestLogsData,
  canApply,
  onFilterChange,
  onApply,
  onReset,
  onPageChange,
  onSizeChange,
  onExportJson,
  onDetailsClick,
  onRetryLoad,
  isMobileLayout,
}) => (
  <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <Paper variant="outlined" sx={{ p: { xs: 1, sm: 1.25 } }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Date range
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={6}>
          <DatePicker
            label="From"
            value={filters.from}
            format="YYYY-MM-DD HH:mm"
            onChange={(value) => onFilterChange('from', value ? value.startOf('day') : value)}
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                error: Boolean(validationErrors.from || validationErrors.range),
                helperText: validationErrors.from || '',
              },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={6}>
          <DatePicker
            label="To"
            value={filters.to}
            format="YYYY-MM-DD HH:mm"
            onChange={(value) => onFilterChange('to', value ? value.endOf('day') : value)}
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                error: Boolean(validationErrors.to || validationErrors.range),
                helperText: validationErrors.to || '',
              },
            }}
          />
        </Grid>

        {validationErrors.range ? (
          <Grid item xs={12}>
            <FormHelperText error>{validationErrors.range}</FormHelperText>
          </Grid>
        ) : null}

        {dayjs.isDayjs(filters.from)
        && filters.from.isValid()
        && dayjs.isDayjs(filters.to)
        && filters.to.isValid()
        && filters.to.diff(filters.from, 'day', true) > 31 ? (
          <Grid item xs={12}>
            <Alert severity="warning" sx={{ py: 0.25 }}>
              Request logs can be loaded only for a maximum 31-day range.
            </Alert>
          </Grid>
          ) : null}
      </Grid>
    </Paper>

    <Paper variant="outlined" sx={{ p: { xs: 1, sm: 1.25 } }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Other filters
      </Typography>
      <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={4}>
        <FormControl fullWidth size="small">
          <InputLabel id="request-logs-methods-label">Methods</InputLabel>
          <Select
            labelId="request-logs-methods-label"
            multiple
            value={filters.methods}
            label="Methods"
            onChange={(event) => onFilterChange('methods', event.target.value)}
            renderValue={(selected) => (isMobileLayout ? `${selected.length} selected` : selected.join(', '))}
          >
            {REQUEST_LOG_METHOD_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                <Checkbox checked={filters.methods.includes(option)} />
                <ListItemText primary={option} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <FormControl fullWidth size="small">
          <InputLabel id="request-logs-statuses-label">Statuses</InputLabel>
          <Select
            labelId="request-logs-statuses-label"
            multiple
            value={filters.statuses}
            label="Statuses"
            onChange={(event) => onFilterChange('statuses', event.target.value)}
            renderValue={(selected) => (isMobileLayout ? `${selected.length} selected` : selected.join(', '))}
          >
            {REQUEST_LOG_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                <Checkbox checked={filters.statuses.includes(option)} />
                <ListItemText primary={option} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <Autocomplete
          multiple
          options={endpointPaths}
          value={filters.templatePaths}
          onChange={(_event, nextValue) => onFilterChange('templatePaths', nextValue)}
          disableCloseOnSelect
          loading={endpointPathsLoading}
          size="small"
          limitTags={isMobileLayout ? 1 : 2}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Template Paths"
              helperText={
                endpointPathsLoading
                  ? 'Loading endpoint paths...'
                  : `Selected ${filters.templatePaths.length}`
              }
            />
          )}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <TextField
          fullWidth
          size="small"
          label="User ID"
          value={filters.userId}
          onChange={(event) => onFilterChange('userId', event.target.value)}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <TextField
          fullWidth
          size="small"
          label="Error Code Contains"
          value={filters.errorCodeContains}
          onChange={(event) => onFilterChange('errorCodeContains', event.target.value)}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <TextField
          fullWidth
          size="small"
          label="Error Message Contains"
          value={filters.errorMessageContains}
          onChange={(event) => onFilterChange('errorMessageContains', event.target.value)}
        />
      </Grid>
      </Grid>
    </Paper>

    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
      <Button size="small" variant="contained" onClick={onApply} disabled={!canApply || loading}>
        Apply
      </Button>
      <Button size="small" variant="outlined" onClick={onReset} disabled={loading}>
        Reset
      </Button>
      <Tooltip title="Export JSON">
        <span>
          <IconButton
            size="small"
            color="primary"
            onClick={onExportJson}
            disabled={!requestLogsData || loading}
            aria-label="Export request logs JSON"
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>

    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary">
        Page {Math.min(page + 1, Math.max(totalPages, 1))} / {Math.max(totalPages, 1)} | size {size}
      </Typography>
    </Box>

    <SectionState
      loading={loading}
      error={error}
      onRetry={onRetryLoad}
      isEmpty={!requestLogsData?.content?.length}
      emptyMessage="No request logs found for the selected filters."
    >
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ width: '100%', overflowX: 'hidden', px: { xs: 0.75, sm: 1 } }}
      >
        <Table
          size="small"
          aria-label="Request logs table"
          sx={{
            width: '100%',
            tableLayout: 'fixed',
            minWidth: 0,
            '& .MuiTableCell-root': {
              px: 0.5,
              py: 0.5,
              fontSize: '0.66rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.2,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '8%', fontFamily: MONOSPACE_FONT_FAMILY }}>ID</TableCell>
              <TableCell sx={{ width: '14%' }}>Created At</TableCell>
              <TableCell sx={{ width: '7%' }}>Method</TableCell>
              <TableCell sx={{ width: '8%' }}>Status</TableCell>
              <TableCell sx={{ width: '8%' }}>Duration</TableCell>
              <TableCell sx={{ width: '24%', fontFamily: MONOSPACE_FONT_FAMILY }}>Template Path</TableCell>
              <TableCell sx={{ width: '13%', fontFamily: MONOSPACE_FONT_FAMILY }}>User</TableCell>
              <TableCell sx={{ width: '10%', fontFamily: MONOSPACE_FONT_FAMILY }}>Error</TableCell>
              <TableCell sx={{ width: '8%' }} align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(requestLogsData?.content || []).map((log) => (
              <TableRow key={log.id} hover>
                <TableCell sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>{log.id}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCreatedAt(log.createdAt)}</TableCell>
                <TableCell>{log.method}</TableCell>
                <TableCell>
                  <HttpStatusBadge status={log.status} />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDurationMs(log.durationMs)}</TableCell>
                <TableCell sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>{log.templatePath}</TableCell>
                <TableCell sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>{formatUserId(log.userId)}</TableCell>
                <TableCell sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>
                  {renderNullableField(log.errorCode)}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="text"
                    sx={{ minWidth: 0, px: 0.75, fontSize: '0.64rem' }}
                    onClick={() => onDetailsClick(log)}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobileLayout ? 'stretch' : 'center',
          gap: 1,
          flexWrap: 'wrap',
          flexDirection: isMobileLayout ? 'column' : 'row',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Total: {Number(totalElements || 0).toLocaleString()} records
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            flexWrap: 'wrap',
            width: isMobileLayout ? '100%' : 'auto',
            flexDirection: isMobileLayout ? 'column' : 'row',
          }}
        >
          <TextField
            select
            size="small"
            label="Size"
            value={size}
            onChange={(event) => onSizeChange(Number(event.target.value))}
            sx={{ minWidth: 96, width: isMobileLayout ? '100%' : 'auto' }}
          >
            {REQUEST_LOG_PAGE_SIZE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Page"
            value={Math.min(page + 1, Math.max(totalPages, 1))}
            onChange={(event) => onPageChange(Number(event.target.value) - 1)}
            sx={{ minWidth: 110, width: isMobileLayout ? '100%' : 'auto' }}
            disabled={totalPages <= 0}
          >
            {Array.from({ length: Math.max(totalPages, 1) }, (_unused, index) => index + 1).map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <Button size="small" variant="outlined" fullWidth={isMobileLayout} disabled={loading || page <= 0} onClick={() => onPageChange(page - 1)}>
            Prev
          </Button>
          <Button
            size="small"
            variant="outlined"
            fullWidth={isMobileLayout}
            disabled={loading || page >= Math.max(totalPages - 1, 0)}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </Box>
      </Box>
    </SectionState>
  </Box>
);

const getDefaultDailyStatsFilters = () => ({
  from: dayjs.utc().startOf('month'),
  to: dayjs.utc(),
  methods: [...DAILY_STATS_METHOD_OPTIONS],
  templatePaths: [],
});

const validateDailyStatsFilters = (filters) => {
  const errors = {};

  if (!dayjs.isDayjs(filters.from) || !filters.from.isValid()) {
    errors.from = 'From date is required.';
  }
  if (!dayjs.isDayjs(filters.to) || !filters.to.isValid()) {
    errors.to = 'To date is required.';
  }
  if (!Array.isArray(filters.methods) || filters.methods.length === 0) {
    errors.methods = 'At least one method is required.';
  }
  if (!Array.isArray(filters.templatePaths) || filters.templatePaths.length === 0) {
    errors.templatePaths = 'At least one template path is required.';
  }

  if (!errors.from && !errors.to) {
    if (filters.from.isAfter(filters.to, 'day')) {
      errors.range = 'From date must be earlier than or equal to To date.';
    }
    if (filters.to.diff(filters.from, 'month', true) > 3) {
      errors.range = 'Date range must not exceed 3 months.';
    }
  }

  return errors;
};

const getDefaultDailyPeriodStatsFilters = () => ({
  from: dayjs.utc().startOf('month'),
  to: dayjs.utc(),
  methods: [...DAILY_PERIOD_METHOD_OPTIONS],
  templatePaths: [],
});

const validateDailyPeriodStatsFilters = (filters) => {
  const errors = {};

  if (!dayjs.isDayjs(filters.from) || !filters.from.isValid()) {
    errors.from = 'From date is required.';
  }
  if (!dayjs.isDayjs(filters.to) || !filters.to.isValid()) {
    errors.to = 'To date is required.';
  }

  if (!Array.isArray(filters.methods) || filters.methods.length === 0) {
    errors.methods = 'At least one method is required.';
  }
  if (!Array.isArray(filters.templatePaths) || filters.templatePaths.length === 0) {
    errors.templatePaths = 'At least one template path is required.';
  }

  if (!errors.from && !errors.to) {
    if (filters.from.isAfter(filters.to, 'day')) {
      errors.range = 'From date must be earlier than or equal to To date.';
    }
    if (filters.to.diff(filters.from, 'month', true) > 1) {
      errors.range = 'Date range must not exceed one calendar month.';
    }
  }

  return errors;
};

const DailyStatsPanel = ({ endpointPaths, endpointPathsLoading, onDrillDown, isMobileLayout }) => {
  const [filters, setFilters] = useState(() => getDefaultDailyStatsFilters());
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [visibleSeries, setVisibleSeries] = useState({
    total: true,
    success: true,
    errors: true,
  });
  const [periodFilters, setPeriodFilters] = useState(() => getDefaultDailyPeriodStatsFilters());
  const [periodValidationErrors, setPeriodValidationErrors] = useState({});
  const [periodStatsLoading, setPeriodStatsLoading] = useState(false);
  const [periodStatsError, setPeriodStatsError] = useState(null);
  const [periodStatsData, setPeriodStatsData] = useState(null);
  const [dailyStatsRetryHandler, setDailyStatsRetryHandler] = useState(null);
  const [periodStatsRetryHandler, setPeriodStatsRetryHandler] = useState(null);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const periodAbortControllerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      periodAbortControllerRef.current?.abort();
    };
  }, []);

  const canLoad = useMemo(
    () => Object.keys(validateDailyStatsFilters(filters)).length === 0,
    [filters],
  );

  const chartRows = useMemo(
    () => (data?.content || []).map((item) => {
      const totalErrorCount = Number(item.authErrorCount || 0)
        + Number(item.clientErrorCount || 0)
        + Number(item.serverErrorCount || 0)
        + Number(item.otherNonSuccessCount || 0);
      return {
        ...item,
        day: dayjs.utc(item.bucketStart).format('YYYY-MM-DD'),
        totalErrorCount,
      };
    }),
    [data],
  );

  const canLoadPeriodStats = useMemo(
    () => Object.keys(validateDailyPeriodStatsFilters(periodFilters)).length === 0,
    [periodFilters],
  );

  const fetchDailyStats = async (nextFilters) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      setDailyStatsRetryHandler(() => () => fetchDailyStats(nextFilters));

      const response = await getEndpointDailyStats({
        from: nextFilters.from.format('YYYY-MM-DD'),
        to: nextFilters.to.format('YYYY-MM-DD'),
        methods: nextFilters.methods,
        templatePaths: nextFilters.templatePaths,
        page: 0,
        size: 100,
      }, { signal: controller.signal });

      if (!mountedRef.current) {
        return;
      }
      setData(response);
    } catch (fetchError) {
      if (fetchError?.name === 'AbortError' || fetchError?.name === 'CanceledError' || fetchError?.code === 'ERR_CANCELED') {
        return;
      }
      if (!mountedRef.current) {
        return;
      }
      if (fetchError?.response?.status === 401 || fetchError?.response?.status === 403) {
        return;
      }
      if (fetchError?.response?.status === 404) {
        setData({ content: [] });
        setError(null);
        return;
      }
      setError(fetchError?.response?.data?.message || fetchError?.message || 'Failed to load daily endpoint statistics.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleLoad = () => {
    const errors = validateDailyStatsFilters(filters);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    fetchDailyStats(filters);
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();
    setFilters(getDefaultDailyStatsFilters());
    setValidationErrors({});
    setError(null);
    setLoading(false);
    setData(null);
    setVisibleSeries({ total: true, success: true, errors: true });
  };

  const handleExportJson = () => {
    if (!data) {
      return;
    }
    const filename = `daily-stats-${filters.from.format('YYYYMMDD')}-${filters.to.format('YYYYMMDD')}-${getExportTimestamp()}.json`;
    downloadJson(data, filename);
  };

  const fetchPeriodStats = async (nextFilters) => {
    periodAbortControllerRef.current?.abort();
    const controller = new AbortController();
    periodAbortControllerRef.current = controller;

    try {
      setPeriodStatsLoading(true);
      setPeriodStatsError(null);
      setPeriodStatsRetryHandler(() => () => fetchPeriodStats(nextFilters));

      const response = await getEndpointPeriodStats({
        from: nextFilters.from.format('YYYY-MM-DD'),
        to: nextFilters.to.format('YYYY-MM-DD'),
        methods: nextFilters.methods,
        templatePaths: nextFilters.templatePaths,
      }, { signal: controller.signal });

      if (!mountedRef.current) {
        return;
      }
      setPeriodStatsData(Array.isArray(response) ? response : []);
    } catch (fetchError) {
      if (fetchError?.name === 'AbortError' || fetchError?.name === 'CanceledError' || fetchError?.code === 'ERR_CANCELED') {
        return;
      }
      if (!mountedRef.current) {
        return;
      }
      if (fetchError?.response?.status === 401 || fetchError?.response?.status === 403) {
        return;
      }
      if (fetchError?.response?.status === 404) {
        setPeriodStatsData([]);
        setPeriodStatsError(null);
        return;
      }
      setPeriodStatsError(fetchError?.response?.data?.message || fetchError?.message || 'Failed to load grouped endpoint period statistics.');
    } finally {
      if (mountedRef.current) {
        setPeriodStatsLoading(false);
      }
    }
  };

  const handlePeriodLoad = () => {
    const errors = validateDailyPeriodStatsFilters(periodFilters);
    setPeriodValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    fetchPeriodStats(periodFilters);
  };

  const handlePeriodReset = () => {
    periodAbortControllerRef.current?.abort();
    setPeriodFilters(getDefaultDailyPeriodStatsFilters());
    setPeriodValidationErrors({});
    setPeriodStatsError(null);
    setPeriodStatsLoading(false);
    setPeriodStatsData(null);
  };

  const handlePeriodExportJson = () => {
    if (!periodStatsData) {
      return;
    }
    const filename = `period-stats-${periodFilters.from.format('YYYYMMDD')}-${periodFilters.to.format('YYYYMMDD')}-${getExportTimestamp()}.json`;
    downloadJson(periodStatsData, filename);
  };

  const handleChartSeriesDrillDown = (pointPayload, seriesType) => {
    if (!pointPayload || typeof onDrillDown !== 'function') {
      return;
    }

    onDrillDown(
      {
        bucketStart: pointPayload.bucketStart,
        method: pointPayload.method || filters.methods[0] || null,
        templatePath: pointPayload.templatePath || filters.templatePaths[0] || null,
      },
      seriesType,
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <DatePicker
              label="From"
              value={filters.from}
              onChange={(value) => setFilters((prev) => ({ ...prev, from: value }))}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  error: Boolean(validationErrors.from || validationErrors.range),
                  helperText: validationErrors.from || '',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DatePicker
              label="To"
              value={filters.to}
              onChange={(value) => setFilters((prev) => ({ ...prev, to: value }))}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  error: Boolean(validationErrors.to || validationErrors.range),
                  helperText: validationErrors.to || '',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small" error={Boolean(validationErrors.methods)}>
              <InputLabel id="daily-stats-methods-label">Methods</InputLabel>
              <Select
                labelId="daily-stats-methods-label"
                value={filters.methods[0] || ''}
                label="Methods"
                renderValue={(selected) => selected || ''}
                sx={{
                  '& .MuiSelect-select': {
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '1.4375em',
                    py: 1,
                  },
                }}
                onChange={(event) => setFilters((prev) => ({
                  ...prev,
                  methods: event.target.value ? [event.target.value] : [],
                }))}
              >
                {DAILY_STATS_METHOD_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{validationErrors.methods || ''}</FormHelperText>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={12}>
            <Autocomplete
              options={endpointPaths}
              value={filters.templatePaths[0] || null}
              onChange={(_event, nextValue) => setFilters((prev) => ({
                ...prev,
                templatePaths: nextValue ? [nextValue] : [],
              }))}
              loading={endpointPathsLoading}
              size="small"
              sx={{
                '& .MuiAutocomplete-input': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  direction: 'rtl',
                  textAlign: 'left',
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Template Paths"
                  error={Boolean(validationErrors.templatePaths)}
                  helperText={
                    validationErrors.templatePaths
                    || (endpointPathsLoading ? 'Loading endpoint paths...' : '')
                  }
                />
              )}
            />
          </Grid>
          {validationErrors.range ? (
            <Grid item xs={12}>
              <FormHelperText error>{validationErrors.range}</FormHelperText>
            </Grid>
          ) : null}

          {dayjs.isDayjs(filters.from)
          && filters.from.isValid()
          && dayjs.isDayjs(filters.to)
          && filters.to.isValid()
          && filters.to.diff(filters.from, 'month', true) > 3 ? (
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ py: 0.25 }}>
                Daily stats can be loaded only for a maximum 3-month range.
              </Alert>
            </Grid>
            ) : null}
        </Grid>

        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          <Button size="small" variant="contained" onClick={handleLoad} disabled={!canLoad || loading}>
            Load Statistics
          </Button>
          <Button size="small" variant="outlined" onClick={handleReset} disabled={loading}>
            Reset
          </Button>
          <Tooltip title="Export JSON">
            <span>
              <IconButton
                size="small"
                color="primary"
                onClick={handleExportJson}
                disabled={!data || loading}
                aria-label="Export daily stats JSON"
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <SectionState
          loading={loading}
          error={error}
          onRetry={dailyStatsRetryHandler}
          isEmpty={Boolean(data && !chartRows.length)}
          emptyMessage="No daily statistics found for the selected filters."
        >
          {!data ? null : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={7}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Checkbox
                        size="small"
                        checked={visibleSeries.total}
                        onChange={(event) => setVisibleSeries((prev) => ({ ...prev, total: event.target.checked }))}
                      />
                      <Typography variant="body2">Total count</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Checkbox
                        size="small"
                        checked={visibleSeries.success}
                        onChange={(event) => setVisibleSeries((prev) => ({ ...prev, success: event.target.checked }))}
                      />
                      <Typography variant="body2">Success count</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Checkbox
                        size="small"
                        checked={visibleSeries.errors}
                        onChange={(event) => setVisibleSeries((prev) => ({ ...prev, errors: event.target.checked }))}
                      />
                      <Typography variant="body2">Errors</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <LineChart data={chartRows}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip />
                        <Legend />
                        {visibleSeries.total ? (
                          <Line
                            type="monotone"
                            dataKey="totalCount"
                            stroke="#1976d2"
                            dot={{ r: 3 }}
                            name="Total count"
                            onClick={(point) => handleChartSeriesDrillDown(point?.payload, 'total')}
                          />
                        ) : null}
                        {visibleSeries.success ? (
                          <Line
                            type="monotone"
                            dataKey="successCount"
                            stroke="#2e7d32"
                            dot={{ r: 3 }}
                            name="Success count"
                            onClick={(point) => handleChartSeriesDrillDown(point?.payload, 'success')}
                          />
                        ) : null}
                        {visibleSeries.errors ? (
                          <Line
                            type="monotone"
                            dataKey="totalErrorCount"
                            stroke="#ed6c02"
                            dot={{ r: 3 }}
                            strokeDasharray="6 4"
                            name="Errors"
                            onClick={(point) => handleChartSeriesDrillDown(point?.payload, 'errors')}
                          />
                        ) : null}
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={5}>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    height: 360,
                    maxHeight: 360,
                    overflowY: 'auto',
                  }}
                >
                  <Table size="small" aria-label="Daily endpoint stats table" sx={{ minWidth: 640 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'background.paper' }}>Day</TableCell>
                        <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'background.paper' }}>Method</TableCell>
                        <TableCell align="right" sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'background.paper' }}>Total</TableCell>
                        <TableCell align="right" sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'background.paper' }}>Success</TableCell>
                        <TableCell align="right" sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'background.paper' }}>4xx</TableCell>
                        <TableCell align="right" sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'background.paper' }}>5xx</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {chartRows.map((row) => (
                        <TableRow key={`${row.bucketStart}-${row.method}-${row.templatePath}`} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.day}</TableCell>
                          <TableCell>{row.method}</TableCell>
                          <TableCell align="right">{row.totalCount}</TableCell>
                          <TableCell align="right">{row.successCount}</TableCell>
                          <TableCell align="right">{Number(row.clientErrorCount || 0) + Number(row.authErrorCount || 0)}</TableCell>
                          <TableCell align="right">{row.serverErrorCount || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}
        </SectionState>

        <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 1.5 }, mt: 0.75 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Typography variant="subtitle1">Endpoint Period Stats (Grouped)</Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <DatePicker
                label="From"
                value={periodFilters.from}
                onChange={(value) => setPeriodFilters((prev) => ({ ...prev, from: value }))}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    error: Boolean(periodValidationErrors.from || periodValidationErrors.range),
                    helperText: periodValidationErrors.from || '',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DatePicker
                label="To"
                value={periodFilters.to}
                onChange={(value) => setPeriodFilters((prev) => ({ ...prev, to: value }))}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    error: Boolean(periodValidationErrors.to || periodValidationErrors.range),
                    helperText: periodValidationErrors.to || '',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small" error={Boolean(periodValidationErrors.methods)}>
                <InputLabel id="period-stats-methods-label">Methods</InputLabel>
                <Select
                  labelId="period-stats-methods-label"
                  multiple
                  value={periodFilters.methods}
                  label="Methods"
                  onChange={(event) => setPeriodFilters((prev) => ({ ...prev, methods: event.target.value }))}
                  renderValue={(selected) => (isMobileLayout ? `${selected.length} selected` : selected.join(', '))}
                >
                  {DAILY_PERIOD_METHOD_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      <Checkbox checked={periodFilters.methods.includes(option)} />
                      <ListItemText primary={option} />
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{periodValidationErrors.methods || ''}</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={12}>
              <Autocomplete
                multiple
                options={endpointPaths}
                value={periodFilters.templatePaths}
                onChange={(_event, nextValue) => setPeriodFilters((prev) => ({ ...prev, templatePaths: nextValue }))}
                disableCloseOnSelect
                loading={endpointPathsLoading}
                size="small"
                limitTags={isMobileLayout ? 1 : 2}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Template Paths"
                    error={Boolean(periodValidationErrors.templatePaths)}
                    helperText={
                      periodValidationErrors.templatePaths
                      || (endpointPathsLoading ? 'Loading endpoint paths...' : '')
                    }
                  />
                )}
              />
            </Grid>

            {periodValidationErrors.range ? (
              <Grid item xs={12}>
                <FormHelperText error>{periodValidationErrors.range}</FormHelperText>
              </Grid>
            ) : null}
          </Grid>

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.5 }}>
            <Button size="small" variant="contained" onClick={handlePeriodLoad} disabled={!canLoadPeriodStats || periodStatsLoading}>
              Load grouped stats
            </Button>
            <Button size="small" variant="outlined" onClick={handlePeriodReset} disabled={periodStatsLoading}>
              Reset
            </Button>
            <Tooltip title="Export JSON">
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={handlePeriodExportJson}
                  disabled={!periodStatsData || periodStatsLoading}
                  aria-label="Export grouped period stats JSON"
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <Box sx={{ mt: 1.5 }}>
            <SectionState
              loading={periodStatsLoading}
              error={periodStatsError}
              onRetry={periodStatsRetryHandler}
              isEmpty={Array.isArray(periodStatsData) && periodStatsData.length === 0}
              emptyMessage="No grouped period statistics found for the selected filters."
            >
              {!periodStatsData ? null : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small" aria-label="Grouped period endpoint stats table" sx={{ minWidth: 920 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Method</TableCell>
                        <TableCell sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>Template Path</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="right">Success</TableCell>
                        <TableCell align="right">Auth Errors</TableCell>
                        <TableCell align="right">Client Errors</TableCell>
                        <TableCell align="right">Server Errors</TableCell>
                        <TableCell align="right">Other Non-success</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
            {(periodStatsData || []).map((row, index) => (
                        <TableRow key={`${row.method || 'null'}-${row.templatePath || 'null'}-${index}`} hover>
                          <TableCell>{renderNullableField(row.method)}</TableCell>
                          <TableCell sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>{renderNullableField(row.templatePath)}</TableCell>
                          <TableCell align="right">{row.totalCount ?? 0}</TableCell>
                          <TableCell align="right">{row.successCount ?? 0}</TableCell>
                          <TableCell align="right">{row.authErrorCount ?? 0}</TableCell>
                          <TableCell align="right">{row.clientErrorCount ?? 0}</TableCell>
                          <TableCell align="right">{row.serverErrorCount ?? 0}</TableCell>
                          <TableCell align="right">{row.otherNonSuccessCount ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </SectionState>
          </Box>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

const getDefaultTopErrorsFilters = () => ({
  from: dayjs.utc().startOf('month'),
  to: dayjs.utc(),
  size: 5,
});

const validateTopErrorsFilters = (filters) => {
  const errors = {};

  if (!dayjs.isDayjs(filters.from) || !filters.from.isValid()) {
    errors.from = 'From date is required.';
  }
  if (!dayjs.isDayjs(filters.to) || !filters.to.isValid()) {
    errors.to = 'To date is required.';
  }

  if (!errors.from && !errors.to) {
    if (filters.from.isAfter(filters.to, 'day')) {
      errors.range = 'From date must be earlier than or equal to To date.';
    }
    if (filters.to.diff(filters.from, 'month', true) > 1) {
      errors.range = 'Date range must not exceed one calendar month.';
    }
  }

  return errors;
};

const TopErrorEndpointsCard = ({ isMobileLayout }) => {
  const [filters, setFilters] = useState(() => getDefaultTopErrorsFilters());
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: TOP_ERROR_SIZE_OPTIONS[0],
    first: true,
    last: true,
    empty: true,
  });
  const [retryHandler, setRetryHandler] = useState(null);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const canLoad = useMemo(
    () => Object.keys(validateTopErrorsFilters(filters)).length === 0,
    [filters],
  );

  const fetchTopErrors = async (nextFilters) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      setRetryHandler(() => () => fetchTopErrors(nextFilters));

      const response = await getEndpointTopErrors({
        from: nextFilters.from.format('YYYY-MM-DD'),
        to: nextFilters.to.format('YYYY-MM-DD'),
        page: 0,
        size: nextFilters.size,
      }, { signal: controller.signal });

      if (!mountedRef.current) {
        return;
      }
      setData(response);
    } catch (fetchError) {
      if (fetchError?.name === 'AbortError' || fetchError?.name === 'CanceledError' || fetchError?.code === 'ERR_CANCELED') {
        return;
      }
      if (!mountedRef.current) {
        return;
      }
      if (fetchError?.response?.status === 401 || fetchError?.response?.status === 403) {
        return;
      }
      if (fetchError?.response?.status === 404) {
        setData({ content: [] });
        setError(null);
        return;
      }
      setError(fetchError?.response?.data?.message || fetchError?.message || 'Failed to load top error endpoints.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleLoad = () => {
    const errors = validateTopErrorsFilters(filters);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    fetchTopErrors(filters);
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();
    setFilters(getDefaultTopErrorsFilters());
    setValidationErrors({});
    setLoading(false);
    setError(null);
    setData({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: TOP_ERROR_SIZE_OPTIONS[0],
      first: true,
      last: true,
      empty: true,
    });
  };

  const handleExportJson = () => {
    if (!data?.content?.length) {
      return;
    }
    const filename = `top-errors-${filters.from.format('YYYYMMDD')}-${filters.to.format('YYYYMMDD')}-${getExportTimestamp()}.json`;
    downloadJson(data, filename);
  };

  useEffect(() => {
    const errors = validateTopErrorsFilters(filters);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    fetchTopErrors(filters);
  }, [filters]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Card variant="outlined">
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" component="h2">
              Top Error Endpoints in Selected Period
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>
              GET /api/v1/admin/observability/endpoint-stats/period/top-errors
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <DatePicker
                label="From"
                value={filters.from}
                onChange={(value) => setFilters((prev) => ({ ...prev, from: value }))}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    error: Boolean(validationErrors.from || validationErrors.range),
                    helperText: validationErrors.from || '',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <DatePicker
                label="To"
                value={filters.to}
                onChange={(value) => setFilters((prev) => ({ ...prev, to: value }))}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    error: Boolean(validationErrors.to || validationErrors.range),
                    helperText: validationErrors.to || '',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Size"
                value={filters.size}
                onChange={(event) => setFilters((prev) => ({ ...prev, size: Number(event.target.value) }))}
              >
                {TOP_ERROR_SIZE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {validationErrors.range ? (
              <Grid item xs={12}>
                <FormHelperText error>{validationErrors.range}</FormHelperText>
              </Grid>
            ) : null}
          </Grid>

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Button size="small" variant="contained" onClick={handleLoad} disabled={!canLoad || loading}>
              Load top errors
            </Button>
            <Button size="small" variant="outlined" onClick={handleReset} disabled={loading}>
              Reset
            </Button>
            <Tooltip title="Export JSON">
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={handleExportJson}
                  disabled={!data?.content?.length || loading}
                  aria-label="Export top errors JSON"
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <SectionState
            loading={loading}
            error={error}
            onRetry={retryHandler}
            isEmpty={false}
          >
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" aria-label="Top error endpoints table" sx={{ minWidth: isMobileLayout ? 980 : 0 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="right">Rank</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>Template Path</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Success</TableCell>
                    <TableCell align="right">Errors (sum)</TableCell>
                    <TableCell align="right">Auth Errors</TableCell>
                    <TableCell align="right">Client Errors</TableCell>
                    <TableCell align="right">Server Errors</TableCell>
                    <TableCell align="right">Other Non-success</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.content || []).map((row, index) => (
                    <TableRow key={`${row.method || 'null'}-${row.templatePath || 'null'}-${index}`} hover>
                      <TableCell align="right">{index + 1}</TableCell>
                      <TableCell>{renderNullableField(row.method)}</TableCell>
                      <TableCell sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>{renderNullableField(row.templatePath)}</TableCell>
                      <TableCell align="right">{row.totalCount ?? 0}</TableCell>
                      <TableCell align="right">{row.successCount ?? 0}</TableCell>
                      <TableCell align="right">{row.totalErrorCount ?? 0}</TableCell>
                      <TableCell align="right">{row.authErrorCount ?? 0}</TableCell>
                      <TableCell align="right">{row.clientErrorCount ?? 0}</TableCell>
                      <TableCell align="right">{row.serverErrorCount ?? 0}</TableCell>
                      <TableCell align="right">{row.otherNonSuccessCount ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionState>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
};

const RequestLogDetailDialog = ({
  open,
  selectedLogId,
  detail,
  loading,
  error,
  isMobile,
  onClose,
  onRetry,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="md"
    fullScreen={isMobile}
    scroll="paper"
  >
    <DialogTitle
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        backgroundColor: 'background.paper',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="h6" component="span">
          Request Detail (selected: #{selectedLogId})
        </Typography>
        <Button variant="outlined" size="small" onClick={onClose}>
          Close
        </Button>
      </Box>
    </DialogTitle>

    <DialogContent dividers>
      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={30} />
        </Box>
      ) : null}

      {!loading && error ? (
        <Alert
          severity="error"
          action={(
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          )}
        >
          {error}
        </Alert>
      ) : null}

      {!loading && !error && detail ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grid container spacing={1.25}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Path</Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="body2" sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>{detail.path}</Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Template Path</Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="body2" sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>{detail.templatePath}</Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Method / Status</Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2">{detail.method}</Typography>
                <HttpStatusBadge status={detail.status} />
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Duration</Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="body2">{formatDurationMs(detail.durationMs)}</Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">User ID</Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography component="div" variant="body2" sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>
                {renderNullableField(detail.userId)}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Error</Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography component="div" variant="body2" sx={{ fontFamily: MONOSPACE_FONT_FAMILY }}>
                {renderNullableField(getErrorDisplayValue(detail.errorCode, detail.errorMessage) === '-' ? null : `${detail.errorCode || 'null'} | ${detail.errorMessage || 'null'}`)}
              </Typography>
            </Grid>
          </Grid>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Request Headers (sanitized)</Typography>
            <JsonCodeBox value={detail.requestHeaders} maxHeight={140} />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Response Headers (sanitized)</Typography>
            <JsonCodeBox value={detail.responseHeaders} maxHeight={140} />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Request Body (sanitized)</Typography>
            <JsonCodeBox value={detail.requestBody} maxHeight={140} />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Stack Trace</Typography>
            <JsonCodeBox value={detail.stackTrace} maxHeight={140} />
          </Box>
        </Box>
      ) : null}
    </DialogContent>
  </Dialog>
);

const AdminObservabilityPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isMobileLayout } = useResponsiveLayout();
  const [activeTab, setActiveTab] = useState(0);
  const [endpointPaths, setEndpointPaths] = useState([]);
  const [endpointPathsLoading, setEndpointPathsLoading] = useState(false);
  const [endpointPathsError, setEndpointPathsError] = useState(null);
  const [requestLogsFilters, setRequestLogsFilters] = useState(() => getDefaultRequestLogsFilters());
  const [requestLogsValidationErrors, setRequestLogsValidationErrors] = useState({});
  const [requestLogsPage, setRequestLogsPage] = useState(0);
  const [requestLogsSize, setRequestLogsSize] = useState(20);
  const [requestLogsLoading, setRequestLogsLoading] = useState(false);
  const [requestLogsError, setRequestLogsError] = useState(null);
  const [requestLogsData, setRequestLogsData] = useState(null);
  const [requestLogsReloadToken, setRequestLogsReloadToken] = useState(0);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [requestLogDetail, setRequestLogDetail] = useState(null);
  const [requestLogDetailLoading, setRequestLogDetailLoading] = useState(false);
  const [requestLogDetailError, setRequestLogDetailError] = useState(null);
  const [requestLogDetailNotFoundOpen, setRequestLogDetailNotFoundOpen] = useState(false);
  const [requestLogsRetryHandler, setRequestLogsRetryHandler] = useState(null);
  const [endpointPathsReloadToken, setEndpointPathsReloadToken] = useState(0);
  const requestLogsAbortControllerRef = useRef(null);
  const requestLogDetailAbortControllerRef = useRef(null);
  const requestLogsMountedRef = useRef(true);

  useEffect(() => {
    requestLogsMountedRef.current = true;

    return () => {
      requestLogsMountedRef.current = false;
      requestLogsAbortControllerRef.current?.abort();
      requestLogDetailAbortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadEndpointPaths = async () => {
      try {
        setEndpointPathsLoading(true);
        setEndpointPathsError(null);

        const paths = await getEndpointPaths({ signal: controller.signal });

        if (!isMounted) {
          return;
        }

        setEndpointPaths(Array.isArray(paths) ? paths : []);
      } catch (error) {
        if (error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
          return;
        }

        if (!isMounted) {
          return;
        }
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return;
        }
        if (error?.response?.status === 404) {
          setEndpointPaths([]);
          setEndpointPathsError(null);
          return;
        }

        setEndpointPathsError(
          error?.response?.data?.message || error?.message || 'Failed to load endpoint paths catalog.',
        );
      } finally {
        if (isMounted) {
          setEndpointPathsLoading(false);
        }
      }
    };

    loadEndpointPaths();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [endpointPathsReloadToken]);

  const canApplyRequestLogsFilters = useMemo(
    () => Object.keys(validateRequestLogsFilters(requestLogsFilters)).length === 0,
    [requestLogsFilters],
  );

  const fetchRequestLogs = async (filters, page, size) => {
    const validationErrors = validateRequestLogsFilters(filters);
    setRequestLogsValidationErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    requestLogsAbortControllerRef.current?.abort();
    const controller = new AbortController();
    requestLogsAbortControllerRef.current = controller;

    try {
      setRequestLogsLoading(true);
      setRequestLogsError(null);
      setRequestLogsRetryHandler(() => () => fetchRequestLogs(filters, page, size));

      const params = {
        from: filters.from.toISOString(),
        to: filters.to.toISOString(),
        method: filters.methods[0] || undefined,
        status: filters.statuses.length > 0 ? Number(filters.statuses[0]) : undefined,
        templatePath: filters.templatePaths[0] || undefined,
        userId: filters.userId || undefined,
        errorCodeContains: filters.errorCodeContains || undefined,
        errorMessageContains: filters.errorMessageContains || undefined,
        page,
        size,
      };

      const response = await getRequestLogs(params, { signal: controller.signal });

      if (!requestLogsMountedRef.current) {
        return;
      }

      setRequestLogsData(response);
    } catch (error) {
      if (error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        return;
      }

      if (!requestLogsMountedRef.current) {
        return;
      }
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return;
      }
      if (error?.response?.status === 404) {
        setRequestLogsData({
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: page,
          size,
          first: true,
          last: true,
          empty: true,
        });
        setRequestLogsError(null);
        return;
      }

      setRequestLogsError(
        error?.response?.data?.message || error?.message || 'Failed to load request logs.',
      );
    } finally {
      if (requestLogsMountedRef.current) {
        setRequestLogsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRequestLogs(requestLogsFilters, requestLogsPage, requestLogsSize);
  }, [requestLogsPage, requestLogsSize, requestLogsReloadToken]);

  const handleTabChange = (_event, nextTab) => {
    setActiveTab(nextTab);
  };

  const handleDailyStatsDrillDown = (payload, seriesType) => {
    const bucketDate = dayjs.utc(payload.bucketStart);
    if (!bucketDate.isValid()) {
      return;
    }

    let statuses = [];
    if (seriesType === 'errors') {
      statuses = ['400', '401', '404', '500'];
    } else if (seriesType === 'success') {
      statuses = ['200', '201'];
    }

    setRequestLogsFilters((prev) => ({
      ...prev,
      from: bucketDate.startOf('day'),
      to: bucketDate.endOf('day'),
      methods: payload.method ? [payload.method] : [],
      templatePaths: payload.templatePath ? [payload.templatePath] : [],
      statuses,
    }));
    setRequestLogsPage(0);
    setRequestLogsReloadToken((prev) => prev + 1);
    setActiveTab(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestLogsFilterChange = (field, value) => {
    setRequestLogsFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleRequestLogsApply = () => {
    const errors = validateRequestLogsFilters(requestLogsFilters);
    setRequestLogsValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setRequestLogsPage(0);
    setRequestLogsReloadToken((prev) => prev + 1);
  };

  const handleRequestLogsReset = () => {
    setRequestLogsFilters(getDefaultRequestLogsFilters());
    setRequestLogsValidationErrors({});
    setRequestLogsPage(0);
    setRequestLogsSize(20);
    setRequestLogsReloadToken((prev) => prev + 1);
  };

  const handleExportRequestLogsJson = () => {
    if (!requestLogsData) {
      return;
    }
    const safePage = Math.max(requestLogsPage + 1, 1);
    const filename = `request-logs-page-${safePage}-${getExportTimestamp()}.json`;
    downloadJson(requestLogsData, filename);
  };

  const closeRequestLogDetailDialog = () => {
    requestLogDetailAbortControllerRef.current?.abort();
    setSelectedLogId(null);
    setRequestLogDetail(null);
    setRequestLogDetailError(null);
    setRequestLogDetailLoading(false);
  };

  const fetchRequestLogDetailById = async (logId) => {
    if (!logId && logId !== 0) {
      return;
    }

    requestLogDetailAbortControllerRef.current?.abort();
    const controller = new AbortController();
    requestLogDetailAbortControllerRef.current = controller;

    try {
      setRequestLogDetailLoading(true);
      setRequestLogDetailError(null);
      setRequestLogDetail(null);

      const response = await getRequestLogDetail(logId, { signal: controller.signal });

      if (!requestLogsMountedRef.current) {
        return;
      }

      setRequestLogDetail(response);
    } catch (error) {
      if (error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        return;
      }

      if (!requestLogsMountedRef.current) {
        return;
      }

      if (error?.response?.status === 404) {
        closeRequestLogDetailDialog();
        setRequestLogDetailNotFoundOpen(true);
        return;
      }

      setRequestLogDetailError(
        error?.response?.data?.message || error?.message || 'Failed to load request detail.',
      );
    } finally {
      if (requestLogsMountedRef.current) {
        setRequestLogDetailLoading(false);
      }
    }
  };

  useEffect(() => {
    if (selectedLogId === null || selectedLogId === undefined) {
      return;
    }
    fetchRequestLogDetailById(selectedLogId);
  }, [selectedLogId]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        '& .MuiButton-root': { minHeight: 30 },
        '& .MuiInputBase-root': { fontSize: '0.875rem' },
        '& .MuiFormLabel-root': { fontSize: '0.85rem' },
        '& .MuiFormHelperText-root': { marginTop: 0.25, fontSize: '0.7rem' },
      }}
    >
      <Box>
        <Typography variant="h5" component="h1" gutterBottom>
          Observability
        </Typography>
      </Box>

      <TopErrorEndpointsCard isMobileLayout={isMobileLayout} />

      {endpointPathsError ? (
        <Alert
          severity="warning"
          variant="outlined"
          action={(
            <Button color="inherit" size="small" onClick={() => setEndpointPathsReloadToken((prev) => prev + 1)}>
              Retry
            </Button>
          )}
        >
          Endpoint paths catalog is unavailable right now. Filters will still work with manual input.
        </Alert>
      ) : null}

      <Paper variant="outlined">
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Observability sections"
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab label="Request Logs" id="observability-tab-0" aria-controls="observability-tabpanel-0" />
          <Tab label="Daily Endpoint Statistics" id="observability-tab-1" aria-controls="observability-tabpanel-1" />
        </Tabs>

        <Box
          role="tabpanel"
          id={`observability-tabpanel-${activeTab}`}
          aria-labelledby={`observability-tab-${activeTab}`}
        >
          {activeTab === 0 ? (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <RequestLogsPanel
                filters={requestLogsFilters}
                validationErrors={requestLogsValidationErrors}
                endpointPaths={endpointPaths}
                endpointPathsLoading={endpointPathsLoading}
                page={requestLogsPage}
                size={requestLogsSize}
                totalElements={requestLogsData?.totalElements || 0}
                totalPages={requestLogsData?.totalPages || 0}
                loading={requestLogsLoading}
                error={requestLogsError}
                requestLogsData={requestLogsData}
                canApply={canApplyRequestLogsFilters}
                onFilterChange={handleRequestLogsFilterChange}
                onApply={handleRequestLogsApply}
                onReset={handleRequestLogsReset}
                onPageChange={setRequestLogsPage}
                onSizeChange={(nextSize) => {
                  setRequestLogsPage(0);
                  setRequestLogsSize(nextSize);
                }}
                onExportJson={handleExportRequestLogsJson}
                onDetailsClick={(log) => {
                  setSelectedLogId(log.id);
                }}
                onRetryLoad={requestLogsRetryHandler}
                isMobileLayout={isMobileLayout}
              />
            </LocalizationProvider>
          ) : (
            <DailyStatsPanel
              endpointPaths={endpointPaths}
              endpointPathsLoading={endpointPathsLoading}
              onDrillDown={handleDailyStatsDrillDown}
              isMobileLayout={isMobileLayout}
            />
          )}
        </Box>
      </Paper>

      <RequestLogDetailDialog
        open={selectedLogId !== null && selectedLogId !== undefined}
        selectedLogId={selectedLogId}
        detail={requestLogDetail}
        loading={requestLogDetailLoading}
        error={requestLogDetailError}
        isMobile={isMobile}
        onClose={closeRequestLogDetailDialog}
        onRetry={() => fetchRequestLogDetailById(selectedLogId)}
      />

      <Snackbar
        open={requestLogDetailNotFoundOpen}
        autoHideDuration={4000}
        onClose={() => setRequestLogDetailNotFoundOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: { xs: 8, sm: 9, md: 10 } }}
      >
        <Alert
          severity="warning"
          variant="filled"
          onClose={() => setRequestLogDetailNotFoundOpen(false)}
          sx={{ width: '100%' }}
        >
          Record not found
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminObservabilityPage;
