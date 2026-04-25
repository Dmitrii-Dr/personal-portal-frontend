import apiClient from './api';
import { findTimezoneIdByOffset } from './timezoneService';

export const fetchAvailableDays = async (sessionTypeId, timezoneOffset, timezones) => {
  const timezoneId = findTimezoneIdByOffset(timezoneOffset, timezones);
  if (!sessionTypeId || !timezoneId) {
    return null;
  }

  const response = await apiClient.get('/api/v1/public/booking/available/days', {
    params: {
      sessionTypeId,
      timezoneId,
    },
    timeout: 15000,
  });

  return response.data?.days ?? [];
};

export const fetchAvailableDaysForBooking = async (bookingId, timezoneId) => {
  if (!bookingId || !timezoneId) {
    return null;
  }

  const response = await apiClient.get(`/api/v1/booking/${bookingId}/available/days`, {
    params: {
      timezoneId,
    },
    timeout: 15000,
  });

  return response.data?.days ?? [];
};
