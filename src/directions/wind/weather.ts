// Live weather for Ulaanbaatar via open-meteo, with a hardcoded winter
// fallback when the fetch fails.

export interface Weather {
  /** Wind speed in m/s. */
  windSpeed: number
  /** Wind direction in degrees (where the wind comes from). */
  windDirection: number
  /** Air temperature in °C. */
  temperature: number
  /** Precipitation in mm. */
  precipitation: number
  /** True when the value came from the live API. */
  live: boolean
}

// Recorded average winter conditions for Ulaanbaatar.
export const FALLBACK_WEATHER: Weather = {
  windSpeed: 4.2,
  windDirection: 315,
  temperature: -18,
  precipitation: 0,
  live: false,
}

const URL =
  "https://api.open-meteo.com/v1/forecast?latitude=47.92&longitude=106.92&current=wind_speed_10m,wind_direction_10m,temperature_2m,precipitation"

interface OpenMeteoResponse {
  current?: {
    wind_speed_10m?: number
    wind_direction_10m?: number
    temperature_2m?: number
    precipitation?: number
  }
}

export async function fetchWeather(): Promise<Weather> {
  try {
    const response = await fetch(URL)
    if (!response.ok) return FALLBACK_WEATHER
    const data = (await response.json()) as OpenMeteoResponse
    const current = data.current
    if (!current || typeof current.wind_speed_10m !== "number") {
      return FALLBACK_WEATHER
    }
    return {
      // open-meteo returns km/h by default; convert to m/s.
      windSpeed: current.wind_speed_10m / 3.6,
      windDirection: current.wind_direction_10m ?? FALLBACK_WEATHER.windDirection,
      temperature: current.temperature_2m ?? FALLBACK_WEATHER.temperature,
      precipitation: current.precipitation ?? 0,
      live: true,
    }
  } catch {
    return FALLBACK_WEATHER
  }
}

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
]

export function compass(degrees: number): string {
  const index = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16
  return COMPASS[index]
}

/** Frost strength 0..1 from temperature. Zero above freezing. */
export function frostIntensity(temperature: number): number {
  if (temperature >= 0) return 0
  return Math.min(Math.max(-temperature / 25, 0.15), 1)
}

/** Cloth wind force from m/s. */
export function clothWind(windSpeed: number): number {
  return Math.min(Math.max(windSpeed * 0.9, 0.6), 8)
}
