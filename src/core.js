/**
 * Core solar noon computation using NOAA's solar position algorithm.
 *
 * The algorithm follows the NOAA Solar Position Calculator approach, which
 * derives solar transit time from Julian Day, the sun's equation of time,
 * and the observer's latitude/longitude. This implementation favors
 * algorithmic clarity over micro-optimization.
 */

/**
 * Julian Day from a JS Date (interpreted as UTC).
 *
 * We compute JD at 0h UT for the date, then add the fractional day so
 * the equation-of-time offset is accurate for the actual time of day
 * within the target date.
 */
function toJulianDay(date) {
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D = date.getUTCDate();
  const h = date.getUTCHours();
  const min = date.getUTCMinutes();
  const s = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();

  const year = M <= 2 ? Y - 1 : Y;
  const month = M > 2 ? M : M + 12;
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD0 = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + D + B - 1524.5;
  const frac = (h + min / 60 + s / 3600 + ms / 3600000) / 24;
  return JD0 + frac;
}

/**
 * Equation of time in minutes. This is the difference between apparent
 * solar time and mean solar time. Returns a number in minutes, range
 * approximately -14.2 .. +22.0 (extremes occur in February and November).
 */
function equationOfTime(jd) {
  const n = jd - 2451545.0; // days since J2000.0
  let L0 = 280.46646 + 0.9856474 * n;
  L0 = ((L0 % 360) + 360) % 360;

  let g = 357.528 + 0.9856003 * n;
  g = ((g % 360) + 360) % 360;

  const gRad = (g * Math.PI) / 180;

  const e = 0.016708;
  const ecc = gRad + e * Math.sin(gRad) + 0.25 * e * e * Math.sin(2 * gRad);

  const L = L0 + 1.914666 * Math.sin(gRad) + 0.02 * Math.sin(2 * gRad) + 0.0003 * Math.sin(3 * gRad);

  let omega = 125.04 - 1934.136 * n;
  omega = ((omega % 360) + 360) % 360;

  const lambda = L - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);

  const eps = 23.439291 - 0.0000004 * n;
  const epsRad = (eps * Math.PI) / 180;
  const lambdaRad = (lambda * Math.PI) / 180;

  const alpha = Math.atan2(Math.cos(epsRad) * Math.sin(lambdaRad), Math.cos(lambdaRad));
  let alphaDeg = (alpha * 180) / Math.PI;
  while (alphaDeg < L0 - 180) alphaDeg += 360;
  while (alphaDeg > L0 + 180) alphaDeg -= 360;

  const y = Math.tan(epsRad / 2) * Math.tan(epsRad / 2);
  const eqTime = 4 * (y * Math.sin(2 * lambdaRad) - 2 * e * Math.sin(gRad) + 4 * e * y * Math.sin(gRad) * Math.cos(2 * lambdaRad) - 8 * y * y * Math.sin(lambdaRad / 2) * Math.sin(2 * (lambdaRad - 0.2592))) * 180 / Math.PI;

  return eqTime;
}

/**
 * Solar noon in UTC milliseconds since epoch.
 *
 * True solar noon occurs when the sun crosses the local meridian, i.e. when
 * the hour angle is zero. The UTC instant of solar noon on a given date is:
 *
 *   12:00 UTC - (longitude / 15) - EoT
 *
 * where longitude is in degrees (positive east) and EoT in hours.
 *
 * For the polar-lat or other unusual cases the algorithm still returns a
 * deterministic instant, but that instant may not be physically meaningful
 * (no sunrise/sunset does not prevent the meridian crossing from occurring).
 */
export function computeSolarNoonUtcMs(latitude, longitude, dateMidnightUtc) {
  const jd = toJulianDay(dateMidnightUtc);
  const eotMin = equationOfTime(jd);
  const eotHours = eotMin / 60;

  const longitudeCorrectionHours = longitude / 15;

  const utcSolarNoonHours = 12 - longitudeCorrectionHours - eotHours;
  const utcSolarNoonSeconds = utcSolarNoonHours * 3600;

  const year = dateMidnightUtc.getUTCFullYear();
  const month = dateMidnightUtc.getUTCMonth();
  const day = dateMidnightUtc.getUTCDate();

  const noonUtcMs = Date.UTC(year, month, day, 0, 0, 0) + utcSolarNoonSeconds * 1000;
  return Math.round(noonUtcMs);
}

/**
 * Format a UTC ms instant as "HH:MM:SS" in a given timezone offset (minutes east of UTC).
 *
 * Using a fixed offset rather than a named zone keeps the library dependency-free
 * and deterministic. Callers who need full DST handling should convert the
 * returned UTC instant with their own tz database.
 */
export function formatTime(utcMs, utcOffsetMinutes) {
  const localMs = Math.floor(utcMs / 1000) * 1000 + utcOffsetMinutes * 60 * 1000;
  const d = new Date(localMs);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
