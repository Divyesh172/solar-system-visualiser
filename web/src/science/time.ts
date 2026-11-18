/**
 * Astronomical Time and Julian Ephemeris Date (JDE) Engine.
 * 
 * Implements bidirectional conversions between Gregorian calendar dates (UTC)
 * and Julian Ephemeris Date (JDE / Terrestrial Time), based on Jean Meeus' Astronomical Algorithms.
 */

export const J2000_JDE = 2451545.0; // 2000-01-01 12:00:00 TT
export const DAYS_PER_CENTURY = 36525.0;

export type TimeSpeedPreset =
  | 'realtime'    // 1x real time
  | 'hour_per_sec' // 1 sec = 1 hour (1/24 days/sec)
  | 'day_per_sec'  // 1 sec = 1 day (1.0 days/sec)
  | 'week_per_sec' // 1 sec = 7 days (7.0 days/sec)
  | 'month_per_sec'// 1 sec = 30 days (30.0 days/sec)
  | 'year_per_sec';// 1 sec = 365.25 days (365.25 days/sec)

export const TIME_SPEED_RATES: Record<TimeSpeedPreset, number> = {
  realtime: 1.0 / 86400.0,
  hour_per_sec: 1.0 / 24.0,
  day_per_sec: 1.0,
  week_per_sec: 7.0,
  month_per_sec: 30.0,
  year_per_sec: 365.25,
};

export const TIME_SPEED_LABELS: Record<TimeSpeedPreset, string> = {
  realtime: '1x (Real Time)',
  hour_per_sec: '1 Hr / sec',
  day_per_sec: '1 Day / sec',
  week_per_sec: '1 Week / sec',
  month_per_sec: '1 Month / sec',
  year_per_sec: '1 Year / sec',
};

/**
 * Converts a JavaScript Date (UTC) to Julian Ephemeris Date (JDE).
 */
export function dateToJde(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // 1-12
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds() + date.getUTCMilliseconds() / 1000.0;

  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  const dayFraction = (hour + minute / 60.0 + second / 3600.0) / 24.0;

  const jd = Math.floor(365.25 * (y + 4716)) +
             Math.floor(30.6001 * (m + 1)) +
             day + dayFraction + B - 1524.5;

  return jd;
}

/**
 * Converts a Julian Ephemeris Date (JDE) to a JavaScript Date object (UTC).
 */
export function jdeToDate(jde: number): Date {
  const jd = jde + 0.5;
  const Z = Math.floor(jd);
  const F = jd - Z;

  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const dayWithFraction = B - D - Math.floor(30.6001 * E) + F;
  const day = Math.floor(dayWithFraction);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const dayFraction = dayWithFraction - day;
  const totalSeconds = Math.round(dayFraction * 86400);
  const hour = Math.floor(totalSeconds / 3600);
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = totalSeconds % 60;

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date;
}

/**
 * Formats a JDE into a child-friendly Gregorian date string (e.g. "November 5, 2026").
 */
export function formatJde(jde: number): string {
  const date = jdeToDate(jde);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Formats a JDE into a full astronomical timestamp string (e.g. "Nov 5, 2026 23:37:00 UTC").
 */
export function formatJdeFull(jde: number): string {
  const date = jdeToDate(jde);
  return date.toUTCString().replace('GMT', 'UTC');
}
