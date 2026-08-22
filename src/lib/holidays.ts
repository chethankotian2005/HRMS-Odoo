import { addDays, format, startOfDay } from "date-fns";

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
 * Calendar-day key for a date, in the server's local timezone.
 *
 * Every calendar-day comparison in this codebase goes through this
 * function. Never compare Date objects or raw ISO timestamps for
 * calendar-day equality: `setHours(0,0,0,0)` normalizes in local time
 * while `.toISOString()` re-serializes in UTC, so in any timezone east
 * of UTC (IST is +05:30) the pair silently shifts the date back a day.
 */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Check if a date is a weekend (Saturday or Sunday).
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Check if a date is a public holiday. Accepts either a Date or an
 * already-computed YYYY-MM-DD key.
 */
export function isPublicHoliday(date: Date | string): boolean {
  const key = typeof date === "string" ? date : toDateKey(date);
  return PUBLIC_HOLIDAYS.includes(key);
}

/**
 * Returns every working day date key (YYYY-MM-DD) in the inclusive range,
 * excluding weekends and public holidays.
 */
export function getWorkingDays(start: Date, end: Date): string[] {
  const days: string[] = [];
  let current = startOfDay(start);
  const endKey = toDateKey(end);

  // String comparison on YYYY-MM-DD is lexicographic == chronological,
  // so the loop bound never touches Date arithmetic.
  while (toDateKey(current) <= endKey) {
    const key = toDateKey(current);
    if (!isWeekend(current) && !isPublicHoliday(key)) {
      days.push(key);
    }
    current = addDays(current, 1);
  }
  return days;
}

/**
 * Count working days between two dates (inclusive), excluding weekends
 * and public holidays.
 */
export function countWorkingDays(start: Date, end: Date): number {
  return getWorkingDays(start, end).length;
}

/**
 * Convert a YYYY-MM-DD key into the UTC-midnight Date that Prisma writes
 * into a `@db.Date` column. AttendanceRecord.date uses this convention
 * (see the check-in route), so every writer must agree on it.
 */
export function dateKeyToUtcDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}
