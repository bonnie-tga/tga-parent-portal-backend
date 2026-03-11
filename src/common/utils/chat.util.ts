export function buildDateFilter(month?: number, year?: number, dates?: string): Record<string, any> {
  const filter: Record<string, any> = {};

  if (dates) {
    const [monthStr, yearStr] = dates.split('-');
    if (monthStr && yearStr) {
      const monthNum = parseInt(monthStr, 10);
      const yearNum = parseInt(yearStr, 10);
      if (monthNum >= 1 && monthNum <= 12 && yearNum >= 2000) {
        const startDate = new Date(yearNum, monthNum - 1, 1);
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
        filter.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }
  } else if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    filter.createdAt = {
      $gte: startDate,
      $lte: endDate,
    };
  } else if (year && !month) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    filter.createdAt = {
      $gte: startDate,
      $lte: endDate,
    };
  }

  return filter;
}