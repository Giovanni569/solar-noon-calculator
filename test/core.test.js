import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeSolarNoonUtcMs, formatTime } from "../src/index.js";

/**
 * Within a small tolerance to absorb rounding in the solar algorithm.
 * The NOAA-style formula is accurate to within about 1-2 minutes
 * for civil purposes; we use 3 minutes to be safe against floating
 * point noise without pretending the formula is exact.
 */
const TOLERANCE_MS = 3 * 60 * 1000;

function midnightUtc(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

describe("computeSolarNoonUtcMs", () => {
  it("returns 12:00 UTC at the prime meridian on an equinox", () => {
    // 2024-03-20 is the spring equinox; EoT is near -7.5 min.
    const lon = 0;
    const ms = computeSolarNoonUtcMs(0, lon, midnightUtc(2024, 3, 20));
    const expected = Date.UTC(2024, 2, 20, 12, 0, 0) + (7.5 * 60 * 1000);
    assert.ok(Math.abs(ms - expected) < TOLERANCE_MS);
  });

  it("returns 12:00 local at 15°E (offset 60min)", () => {
    const lon = 15;
    const ms = computeSolarNoonUtcMs(52.5, lon, midnightUtc(2024, 6, 21));
    // Solar noon in UTC ≈ 12:00 - 1h - EoT. EoT ~ -2 min around Jun 21.
    const expectedUtc = Date.UTC(2024, 5, 21, 12, 0, 0) - 60 * 60 * 1000 + (2 * 60 * 1000);
    assert.ok(Math.abs(ms - expectedUtc) < TOLERANCE_MS);
  });

  it("returns 12:00 local at -75°W (offset -300min)", () => {
    const lon = -75;
    const ms = computeSolarNoonUtcMs(40, lon, midnightUtc(2024, 12, 21));
    // EoT ~ +1.5 min around Dec 21.
    const expectedUtc = Date.UTC(2024, 11, 21, 12, 0, 0) - (-75 / 15) * 3600 * 1000 - (1.5 * 60 * 1000);
    assert.ok(Math.abs(ms - expectedUtc) < TOLERANCE_MS);
  });

  it("is symmetric in longitude", () => {
    // Solar noon at +lon and -lon should be symmetric about 12:00 UTC - EoT.
    const e = computeSolarNoonUtcMs(0, 30, midnightUtc(2024, 7, 4));
    const w = computeSolarNoonUtcMs(0, -30, midnightUtc(2024, 7, 4));
    const mid = (e + w) / 2;
    const expectedMid = Date.UTC(2024, 6, 4, 12, 0, 0) + (4.5 * 60 * 1000);
    assert.ok(Math.abs(mid - expectedMid) < TOLERANCE_MS);
  });

  it("handles polar latitude without throwing", () => {
    // There is no sunrise/sunset but the meridian crossing still occurs
    // once per day. The library does not attempt to detect polar day/night.
    const ms = computeSolarNoonUtcMs(78, 15, midnightUtc(2024, 6, 21));
    assert.equal(typeof ms, "number");
    assert.ok(Number.isFinite(ms));
  });

  it("handles antimeridian longitude", () => {
    // At ±180°, solar noon is 12:00 ± 12h UTC. Should still produce a finite instant.
    const ms = computeSolarNoonUtcMs(0, 180, midnightUtc(2024, 3, 20));
    assert.ok(Number.isFinite(ms));
  });

  it("produces a result within the same UTC day for a mid-latitude site", () => {
    const ms = computeSolarNoonUtcMs(51.5, 0, midnightUtc(2024, 6, 21));
    const start = Date.UTC(2024, 5, 21, 0, 0, 0);
    const end = Date.UTC(2024, 5, 22, 0, 0, 0);
    assert.ok(ms > start && ms < end);
  });
});

describe("formatTime", () => {
  it("formats UTC noon as 12:00:00 with 0 offset", () => {
    const ms = Date.UTC(2024, 0, 1, 12, 0, 0);
    assert.equal(formatTime(ms, 0), "12:00:00");
  });

  it("formats UTC noon as 13:00:00 with +60 offset", () => {
    const ms = Date.UTC(2024, 0, 1, 12, 0, 0);
    assert.equal(formatTime(ms, 60), "13:00:00");
  });

  it("formats UTC noon as 07:00:00 with -300 offset", () => {
    const ms = Date.UTC(2024, 0, 1, 12, 0, 0);
    assert.equal(formatTime(ms, -300), "07:00:00");
  });

  it("zero-pads single-digit hours", () => {
    const ms = Date.UTC(2024, 0, 1, 0, 5, 3);
    assert.equal(formatTime(ms, 0), "00:05:03");
  });

  it("truncates sub-second milliseconds", () => {
    const ms = Date.UTC(2024, 0, 1, 12, 0, 0, 500);
    assert.equal(formatTime(ms, 0), "12:00:00");
  });
});
