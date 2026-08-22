/**
 * Public holidays for India (2024 & 2025).
 * Used to exclude holidays from leave day counts.
 * Format: YYYY-MM-DD
 */
export const PUBLIC_HOLIDAYS: string[] = [
  // 2024
  "2024-01-26", // Republic Day
  "2024-03-25", // Holi
  "2024-04-14", // Dr. Ambedkar Jayanti
  "2024-04-17", // Ram Navami
  "2024-04-21", // Mahavir Jayanti
  "2024-05-23", // Buddha Purnima
  "2024-08-15", // Independence Day
  "2024-10-02", // Gandhi Jayanti
  "2024-10-12", // Dussehra
  "2024-11-01", // Diwali (Lakshmi Puja)
  "2024-11-15", // Guru Nanak Jayanti
  "2024-12-25", // Christmas
  // 2025
  "2025-01-26", // Republic Day
  "2025-03-14", // Holi
  "2025-04-14", // Dr. Ambedkar Jayanti / Baisakhi
  "2025-04-18", // Good Friday
  "2025-08-15", // Independence Day
  "2025-10-02", // Gandhi Jayanti
  "2025-10-02", // Dussehra
  "2025-10-20", // Diwali
  "2025-11-05", // Guru Nanak Jayanti
  "2025-12-25", // Christmas
  // 2026
  "2026-01-26", // Republic Day
  "2026-03-03", // Holi
  "2026-04-14", // Dr. Ambedkar Jayanti
  "2026-08-15", // Independence Day
  "2026-10-02", // Gandhi Jayanti
  "2026-12-25", // Christmas
];

/**
 * Check if a date is a weekend (Saturday or Sunday).
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Check if a date string (YYYY-MM-DD) is a public holiday.
 */
export function isPublicHoliday(dateStr: string): boolean {
  return PUBLIC_HOLIDAYS.includes(dateStr);
}

/**
 * Count working days between two dates (inclusive), excluding weekends and public holidays.
 */
export function countWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endCopy = new Date(end);
  endCopy.setHours(0, 0, 0, 0);

  while (current <= endCopy) {
    const dateStr = current.toISOString().split("T")[0];
    if (!isWeekend(current) && !isPublicHoliday(dateStr)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Returns an array of all working day date strings (YYYY-MM-DD) in the range.
 */
export function getWorkingDays(start: Date, end: Date): string[] {
  const days: string[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endCopy = new Date(end);
  endCopy.setHours(0, 0, 0, 0);

  while (current <= endCopy) {
    const dateStr = current.toISOString().split("T")[0];
    if (!isWeekend(current) && !isPublicHoliday(dateStr)) {
      days.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}
