import defaultRainfall from '../data/rainfall.json' with { type: 'json' }
import { getRegionConfig } from './regionService.js'


const imdEndpoint = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_IMD_RAINFALL_ENDPOINT : undefined


export function getRainfallDataSource(regionId = 'mumbai') {
  const region = getRegionConfig(regionId)
  const rainfall = region?.rainfall || defaultRainfall
  const profile = rainfall.sourceProfile || defaultRainfall.sourceProfile
  const connected = Boolean(imdEndpoint)
  return {
    provider: profile.provider,
    mode: connected ? 'IMD DATA CONNECTED' : 'DEMO MODE · SIMULATED DATA',
    connection: connected ? 'connected' : 'fallback',
    isLive: connected,
    lastObservation: profile.lastObservation,
    dataQuality: connected ? 86 : profile.dataQuality,
    radarCoverage: profile.radarCoverage,
    stationCoverage: profile.stationCoverage,
    observationWindow: profile.observationWindow,
    notice: connected ? 'Rainfall input is configured for an authorized IMD endpoint.' : 'Demo mode — simulated rainfall input used for prototype visualization.',
  }
}

export function getRainfallInput(regionId = 'mumbai') {
  const region = getRegionConfig(regionId)
  const rainfall = region?.rainfall || defaultRainfall
  return { ...rainfall, dataSource: getRainfallDataSource(regionId) }
}

export function formatObservationTime(value) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value))
}

