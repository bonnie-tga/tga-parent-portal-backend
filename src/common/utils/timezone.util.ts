export function getLocalTimestamp(): Date {
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  const offsetMs = offsetMinutes * 60000;
  const localTime = new Date(now.getTime() - offsetMs);
  return localTime;
}

