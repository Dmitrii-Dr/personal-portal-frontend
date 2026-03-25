import apiClient from './api';

const OBSERVABILITY_BASE_PATH = '/api/v1/admin/observability';
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Serializes query params with repeated keys for arrays.
 * Example: { methods: ['GET', 'POST'] } => methods=GET&methods=POST
 *
 * @param {Record<string, unknown>} params
 * @returns {string}
 */
const serializeRepeatedParams = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item));
        }
      });
      return;
    }

    searchParams.append(key, String(value));
  });

  return searchParams.toString();
};

/**
 * @template T
 * @typedef {object} PageResponse
 * @property {T[]} content
 * @property {number} number
 * @property {number} size
 * @property {number} totalElements
 * @property {number} totalPages
 * @property {boolean} first
 * @property {boolean} last
 * @property {boolean} empty
 * @property {object} [sort]
 * @property {object} [pageable]
 */

/**
 * @typedef {object} EndpointStatsDailyResponse
 * @property {string} bucketStart
 * @property {string} method
 * @property {string} templatePath
 * @property {number} totalCount
 * @property {number} successCount
 * @property {number} authErrorCount
 * @property {number} clientErrorCount
 * @property {number} serverErrorCount
 * @property {number} otherNonSuccessCount
 */

/**
 * @typedef {object} EndpointStatsPeriodResponse
 * @property {string|null} method
 * @property {string|null} templatePath
 * @property {number} totalCount
 * @property {number} successCount
 * @property {number} authErrorCount
 * @property {number} clientErrorCount
 * @property {number} serverErrorCount
 * @property {number} otherNonSuccessCount
 */

/**
 * @typedef {EndpointStatsPeriodResponse & { totalErrorCount: number }} TopErrorEndpointResponse
 */

/**
 * @typedef {object} RequestLogListItemResponse
 * @property {number} id
 * @property {string} path
 * @property {string} templatePath
 * @property {string} method
 * @property {number} status
 * @property {number} durationMs
 * @property {string|null} userId
 * @property {string} createdAt
 * @property {string|null} errorCode
 * @property {string|null} errorMessage
 */

/**
 * @typedef {object} RequestLogDetailResponse
 * @property {number} id
 * @property {string} path
 * @property {string} templatePath
 * @property {string} method
 * @property {number} status
 * @property {number} durationMs
 * @property {string|null} userId
 * @property {string} createdAt
 * @property {string|null} errorCode
 * @property {string|null} errorMessage
 * @property {string|null} requestBody
 * @property {string|null} requestHeaders
 * @property {string|null} responseHeaders
 * @property {string|null} stackTrace
 */

/**
 * @typedef {object} EndpointDailyStatsParams
 * @property {string} [from] YYYY-MM-DD
 * @property {string} [to] YYYY-MM-DD
 * @property {string[]} [methods] repeated query param
 * @property {string[]} [templatePaths] repeated query param
 * @property {number} [page]
 * @property {number} [size]
 * @property {string|string[]} [sort] field,asc|desc
 */

/**
 * @typedef {object} EndpointPeriodStatsParams
 * @property {string} from YYYY-MM-DD (required)
 * @property {string} to YYYY-MM-DD (required)
 * @property {string[]} [methods] repeated query param
 * @property {string[]} [templatePaths] repeated query param
 */

/**
 * @typedef {object} EndpointTopErrorsParams
 * @property {string} from YYYY-MM-DD (required)
 * @property {string} to YYYY-MM-DD (required)
 * @property {number} [page]
 * @property {number} [size]
 */

/**
 * @typedef {object} RequestLogsParams
 * @property {string} from ISO-8601 instant (required)
 * @property {string} to ISO-8601 instant (required)
 * @property {number} [status]
 * @property {string} [templatePath]
 * @property {string} [method]
 * @property {string} [userId]
 * @property {string} [errorCodeContains]
 * @property {string} [errorMessageContains]
 * @property {number} [page]
 * @property {number} [size]
 * @property {string|string[]} [sort] field,asc|desc
 */

/**
 * @param {EndpointDailyStatsParams} [params]
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<PageResponse<EndpointStatsDailyResponse>>}
 */
export const getEndpointDailyStats = async (params = {}, { signal } = {}) => {
  const response = await apiClient.get(`${OBSERVABILITY_BASE_PATH}/endpoint-stats`, {
    params,
    paramsSerializer: serializeRepeatedParams,
    signal,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
};

/**
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<string[]>}
 */
export const getEndpointPaths = async ({ signal } = {}) => {
  const response = await apiClient.get(`${OBSERVABILITY_BASE_PATH}/endpoint-stats/paths`, {
    signal,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
};

/**
 * @param {EndpointPeriodStatsParams} params
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<EndpointStatsPeriodResponse[]>}
 */
export const getEndpointPeriodStats = async (params, { signal } = {}) => {
  if (!params?.from || !params?.to) {
    throw new Error('getEndpointPeriodStats requires "from" and "to" parameters.');
  }

  const response = await apiClient.get(`${OBSERVABILITY_BASE_PATH}/endpoint-stats/period`, {
    params,
    paramsSerializer: serializeRepeatedParams,
    signal,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
};

/**
 * @param {EndpointTopErrorsParams} params
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<PageResponse<TopErrorEndpointResponse>>}
 */
export const getEndpointTopErrors = async (params, { signal } = {}) => {
  if (!params?.from || !params?.to) {
    throw new Error('getEndpointTopErrors requires "from" and "to" parameters.');
  }

  const response = await apiClient.get(`${OBSERVABILITY_BASE_PATH}/endpoint-stats/period/top-errors`, {
    params,
    paramsSerializer: serializeRepeatedParams,
    signal,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
};

/**
 * @param {RequestLogsParams} params
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<PageResponse<RequestLogListItemResponse>>}
 */
export const getRequestLogs = async (params, { signal } = {}) => {
  if (!params?.from || !params?.to) {
    throw new Error('getRequestLogs requires "from" and "to" parameters.');
  }

  const response = await apiClient.get(`${OBSERVABILITY_BASE_PATH}/request-logs`, {
    params,
    paramsSerializer: serializeRepeatedParams,
    signal,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
};

/**
 * @param {number|string} id
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<RequestLogDetailResponse>}
 */
export const getRequestLogDetail = async (id, { signal } = {}) => {
  if (id === undefined || id === null || id === '') {
    throw new Error('getRequestLogDetail requires "id" parameter.');
  }

  const response = await apiClient.get(`${OBSERVABILITY_BASE_PATH}/request-logs/${id}`, {
    signal,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
};

