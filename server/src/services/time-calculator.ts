const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseTimeToMinutes(timeStr: string): number {
  if (!TIME_REGEX.test(timeStr)) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM in 24h format.`);
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function calculateOvertimeMinutes(
  startTime: string,
  endTime: string,
  breakDurationMinutes: number = 0
): number {
  if (breakDurationMinutes < 0) {
    throw new Error('Break duration cannot be negative.');
  }

  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);

  if (startMin === endMin) {
    throw new Error('Start time and end time cannot be identical.');
  }

  let rawMinutes: number;
  if (endMin > startMin) {
    rawMinutes = endMin - startMin;
  } else {
    // Overnight shift: end time is on the next calendar day
    rawMinutes = (endMin + 24 * 60) - startMin;
  }

  const netMinutes = rawMinutes - breakDurationMinutes;
  if (netMinutes <= 0) {
    throw new Error(`Net overtime duration must be greater than 0 minutes. Computed: ${netMinutes}m`);
  }

  return netMinutes;
}

export function formatMinutesToDisplay(minutes: number): string {
  const isNegative = minutes < 0;
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  const sign = isNegative ? '-' : '';
  return `${sign}${hours}h ${mins.toString().padStart(2, '0')}m`;
}
