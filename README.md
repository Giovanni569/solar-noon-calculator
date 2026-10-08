# Solar Noon Calculator

Compute the exact solar transit time (solar noon) for a given latitude, longitude, and date, and express it in any fixed UTC offset.

```js
import { computeSolarNoonUtcMs, formatTime } from "solar-noon-calculator";

// Solar noon in London on 2024-06-21, displayed in UTC+1 (BST)
const ms = computeSolarNoonUtcMs(51.5, -0.12, new Date(Date.UTC(2024, 5, 21)));
console.log(formatTime(ms, 60)); // e.g. "13:00:44"
```

## Why

The library exists to answer "when does the sun culminate here, today?" without pulling in a full astronomical or timezone package. It uses the NOAA solar position approximation (Julian Day + equation of time + longitude correction), which is accurate to roughly a minute or two for civil purposes. The trade-off is that it is not suitable for navigation, sundial calibration, or anything where a few arcseconds matter.

Timezones are expressed as a fixed UTC offset in minutes, not as a named zone. This keeps the library dependency-free and deterministic. If you need DST handling, convert the returned UTC instant with a proper tz database library — the instant is what this library gives you.

## Edge cases

- **Polar latitudes**: the sun may not rise or set, but the meridian crossing still occurs; this library returns that instant and does not attempt to detect polar day/night.
- **Antimeridian (±180° longitude)**: produces a valid instant, but the "date" of solar noon may appear shifted relative to local civil date depending on how your offset is defined.
- **Accuracy**: expect ±2 minutes compared to high-precision ephemerides; do not use for navigation.
