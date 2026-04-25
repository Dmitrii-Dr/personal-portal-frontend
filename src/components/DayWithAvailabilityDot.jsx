import { PickersDay } from '@mui/x-date-pickers/PickersDay';

export default function DayWithAvailabilityDot(props) {
  const { availableDays, day, outsideCurrentMonth, ...other } = props;
  const isSelected = Boolean(other.selected);

  const isAvailable = !outsideCurrentMonth
    && Array.isArray(availableDays)
    && availableDays.includes(day.format('YYYY-MM-DD'));

  return (
    <PickersDay
      day={day}
      outsideCurrentMonth={outsideCurrentMonth}
      {...other}
      sx={{
        ...(other.sx || {}),
        position: 'relative',
        ...(isAvailable && !isSelected
          ? {
            '&::after': {
              content: '""',
              position: 'absolute',
              left: '50%',
              bottom: 3,
              transform: 'translateX(-50%)',
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: 'success.main',
              boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.9)',
            },
          }
          : {}),
      }}
    />
  );
}
