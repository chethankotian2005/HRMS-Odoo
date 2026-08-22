// Pin the server timezone to IST (UTC+05:30) before loading the module.
// This locks in the regression the suite covers: normalizing a date with
// setHours(0,0,0,0) and then serializing it with toISOString() shifts the
// calendar day back by one east of UTC, so 15 August was never recognized
// as a public holiday and every derived working-day count was wrong.
process.env.TZ = "Asia/Kolkata";

import type * as HolidaysModule from "./holidays";

// Required (not imported) so the TZ assignment above is in effect first.
const { countWorkingDays, getWorkingDays, isPublicHoliday, toDateKey } =
  require("./holidays") as typeof HolidaysModule;

describe("holidays in IST (UTC+05:30)", () => {
  it("runs the suite in IST", () => {
    expect(new Date(Date.UTC(2025, 7, 15)).getTimezoneOffset()).toBe(-330);
  });

  it("keys a UTC-midnight date to the same calendar day", () => {
    // Prisma hands back @db.Date values as UTC midnight.
    expect(toDateKey(new Date(Date.UTC(2025, 7, 15)))).toBe("2025-08-15");
  });

  it("matches Independence Day on 15 August", () => {
    expect(isPublicHoliday(new Date(Date.UTC(2025, 7, 15)))).toBe(true);
    expect(isPublicHoliday("2025-08-15")).toBe(true);
  });

  it("excludes 15 August from working days", () => {
    // 15 Aug 2025 is a Friday, so the weekend rule cannot mask the holiday.
    const days = getWorkingDays(
      new Date(Date.UTC(2025, 7, 11)), // Mon 11 Aug
      new Date(Date.UTC(2025, 7, 15))  // Fri 15 Aug
    );
    expect(days).toEqual(["2025-08-11", "2025-08-12", "2025-08-13", "2025-08-14"]);
    expect(days).not.toContain("2025-08-15");
    // Five weekdays minus the holiday.
    expect(countWorkingDays(
      new Date(Date.UTC(2025, 7, 11)),
      new Date(Date.UTC(2025, 7, 15))
    )).toBe(4);
  });

  it("counts a Fri-Mon range as 2 working days, not 4", () => {
    expect(countWorkingDays(
      new Date(Date.UTC(2025, 7, 22)), // Fri
      new Date(Date.UTC(2025, 7, 25))  // Mon
    )).toBe(2);
  });
});
