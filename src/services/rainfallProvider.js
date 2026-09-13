import { getRainfallDataSource, getRainfallInput } from './dataSourceService.js'
import { DEFAULT_REGION_ID } from './regionService.js'


const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

const apiUrl = env.VITE_RAINFALL_API_URL || env.VITE_IMD_RAINFALL_ENDPOINT
const apiKey = env.VITE_RAINFALL_API_KEY
const apiTimeoutMs = Number(env.VITE_RAINFALL_API_TIMEOUT_MS) || 6000
const staleMs = Number(env.VITE_RAINFALL_STALE_MS) || 30 * 60 * 1000

// DEMO is the default. A live source is only used when explicitly enabled via
// VITE_RAINFALL_PROVIDER=LIVE, or when the existing legacy endpooint var is set.
const configuredProvider = String(env.VITE_RAINFALL_PROVIDER || (apiUrl ? 'LIVE' : 'DEMO')).toUpperCase()
const liveEnabled = configuredProvider === 'LIVE'

const DEMO_PROVIDER = {
  id: 'DEMO',
  mode: 'DEMO',
  description: 'Reads the existing region-specific simulated rainfall datasets (default).',
  getRainfallInput,
  getRainfallSourceStatus: getRainfallDataSource
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function deriveOffsetMinutes(time) {
  if (time === 'NOW') return 0
  const match = /^\+\s*(\d+)\s*MIN.*$/i.exec(String(time))
  return match ? Number(match[1]) : 0
}

function normalizeObservation(observation) {
  if (!observation || typeof observation !== 'object') return null
  const time = typeof observation.time === 'string' ? observation.time : null
  const intensity = toNumber(observation.intensity)
  if (!time || intensity <= 0) return null
  return { time, intensity, quality: toNumber(observation.quality) }
}

function normalizeForecastPoint(point) {
  if (!point || typeof point !== 'object') return null
  const time = typeof point.time === 'string' ? point.time : null
  const intensity = toNumber(point.intensity)
  if (!time || intensity <= 0) return null
  return {
    time,
    offsetMinutes: toNumber(point.offsetMinutes, deriveOffsetMinutes(time)),
    intensity,
    accumulated: toNumber(point.accumulated ?? point.cumulative ?? point.totalAccumulated),
    confidence: toNumber(point.confidence)
  }
}

/**
 * Validates and normalizes an external rainfall payload into the DEMO-compatible
 * rainfall input shape ({ observations, forecast, sourceProfile, dataSource }).
 * Throws on missing configuration, malformed data, or stale timestamps so callers
 * can fall back to DEMO instead of ever surfacing fake live values.
 */
export function normalizeRainfallPayload(payload, sourceUrl = apiUrl) {
  if (!payload || typeof payload !== 'object') throw new Error('LIVE API: response payload is not an object')
  if (!sourceUrl && !apiUrl) throw new Error('LIVE API: VITE_RAINFALL_API_URL is not configured')

  const observations = Array.isArray(payload.observations) ? payload.observations.map(normalizeObservation).filter(Boolean) : []
  const forecast = Array.isArray(payload.forecast) ? payload.forecast.map(normalizeForecastPoint).filter(Boolean) : []
  if (forecast.length === 0 && observations.length === 0) throw new Error('LIVE API: no usable observations or forecast present')

  const profile = payload.sourceProfile && typeof payload.sourceProfile === 'object' ? payload.sourceProfile : {}
  const sourceName = String(payload.source || profile.provider || 'LIVE rainfall feed')
  const lastObservation = payload.lastObservation || profile.lastObservation || payload.lastUpdated || payload.generatedAt
  if (!lastObservation) throw new Error('LIVE API: missing observation timestamp')
  const observedAt = new Date(lastObservation)
  if (Number.isNaN(observedAt.getTime())) throw new Error('LIVE API: unparseable observation timestamp')
  if (Date.now() - observedAt.getTime() > staleMs) throw new Error('LIVE API: data is stale')

  const dataQuality = toNumber(profile.dataQuality ?? payload.dataQuality, 80)
  const radarCoverage = toNumber(profile.radarCoverage ?? payload.radarCoverage, 80)
  const stationCoverage = toNumber(profile.stationCoverage ?? payload.stationCoverage, 80)

  return {
    area: payload.area || 'Live rainfall feed',
    mode: 'LIVE',
    source: sourceName,
    sourceProfile: {
      provider: sourceName,
      lastObservation,
      dataQuality,
      radarCoverage,
      stationCoverage,
      observationWindow: profile.observationWindow || payload.observationWindow || 'Live feed'
    },
    observations,
    forecast,
    dataSource: {
      provider: sourceName,
      mode: 'LIVE',
      source: sourceName,
      connection: 'connected',
      isLive: true,
      lastObservation,
      dataQuality,
      radarCoverage,
      stationCoverage,
      observationWindow: profile.observationWindow || payload.observationWindow || 'Live feed',
      fetchedAt: new Date().toISOString(),
      notice: 'Live rainfall feed consumed from the configured API.'
    }
  }
}

let liveState = {
  data: null,
  fetchedAt: 0,
  failureReason: null,
  inFlight: false
}

function buildLiveUrl(regionId) {
  const separator = apiUrl.includes('?') ? '&' : '?'
  return `${apiUrl}${separator}region=${encodeURIComponent(regionId)}`
}

async function fetchLivePayload(regionId) {
  if (!apiUrl) throw new Error('VITE_RAINFALL_API_URL is not configured')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), apiTimeoutMs)
  try {
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`
    const response = await fetch(buildLiveUrl(regionId), { method: 'GET', headers, signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText || ''}`.trim())
    const payload = await response.json()
    return normalizeRainfallPayload(payload, apiUrl)
  } catch (error) {
    if (error && error.name === 'AbortError') throw new Error(`request timed out after ${apiTimeoutMs}ms`, { cause: error })
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Attempts to load LIVE rainfall data for a region. On any failure the live state
 * records a reason and returns null; callers then use the region-specific DEMO data.
 */
export function refreshLiveRainfall(regionId = DEFAULT_REGION_ID) {
  if (!liveEnabled || liveState.inFlight) return Promise.resolve(liveState.data)
  liveState.inFlight = true
  return fetchLivePayload(regionId)
    .then((data) => {
      liveState.data = data
      liveState.fetchedAt = Date.now()
      liveState.failureReason = null
      return data
    })
    .catch((error) => {
      liveState.data = null
      liveState.fetchedAt = 0
      liveState.failureReason = `LIVE ${error && error.message ? error.message : String(error)}`
      return null
    })
    .finally(() => {
      liveState.inFlight = false
    })
}

function isLiveFresh() {
  return Boolean(liveState.data && liveState.fetchedAt && Date.now() - liveState.fetchedAt <= staleMs)
}

function fallbackStatus(regionId) {
  const status = getRainfallDataSource(regionId)
  return {
    ...status,
    mode: 'DEMO',
    source: 'Simulated Data',
    connection: 'fallback',
    isLive: false,
    fallbackReason: liveState.failureReason
      || (liveState.data && !isLiveFresh() ? 'LIVE data is stale'
        : (apiUrl ? 'LIVE data not yet available' : 'VITE_RAINFALL_API_URL not configured'))
  }
}

const LIVE_PROVIDER = {
  id: 'LIVE',
  mode: 'LIVE',
  description: 'Consumes a real-time rainfall/radar API when explicitly enabled (VITE_RAINFALL_PROVIDER=LIVE). Falls back to the region-specific DEMO dataset on any failure.',
  getRainfallInput(regionId) {
    if (isLiveFresh()) {
      return { ...liveState.data, dataSource: { ...liveState.data.dataSource, mode: 'LIVE' } }
    }
    const demo = getRainfallInput(regionId)
    return { ...demo, dataSource: fallbackStatus(regionId) }
  },
  getRainfallSourceStatus(regionId) {
    if (isLiveFresh()) return liveState.data.dataSource
    return fallbackStatus(regionId)
  }
}

const PROVIDERS = {
  DEMO: DEMO_PROVIDER,
  LIVE: LIVE_PROVIDER
}

/**
 * Rainfall provider dispatcher.
 *
 * Returns a region-bound provider exposing:
 *   getRainfallData()          -> normalized rainfall input ({ observations, forecast, ...metadata })
 *   getRainfallSourceStatus()  -> source metadata (mode, source, fallbackReason, lastObservation, ...)
 *
 * Mode selection is global via VITE_RAINFALL_PROVIDER (default DEMO). LIVE only
 * issues HTTP requests when explicitly enabled, and falls back to the DEMO
 * dataset for the selected region whenever live data is unavailable.
 */
export function getRainfallProvider(regionId = DEFAULT_REGION_ID) {
  const provider = PROVIDERS[configuredProvider] || DEMO_PROVIDER
  return {
    id: provider.id,
    mode: provider.mode,
    description: provider.description,
    getRainfallData: () => provider.getRainfallInput(regionId),
    getRainfallSourceStatus: () => provider.getRainfallSourceStatus(regionId)
  }
}

// Warm the live feed in the background only when LIVE mode is explicitly enabled.
if (liveEnabled) {
  refreshLiveRainfall()
}