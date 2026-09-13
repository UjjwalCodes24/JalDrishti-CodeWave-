import { getRainfallProvider } from './rainfallProvider.js'


export function getRainfallObservations(regionId) {
  return getRainfallProvider(regionId).getRainfallData()?.observations ?? []
}

export function getRainfallForecast(regionId) {
  return getRainfallProvider(regionId).getRainfallData()?.forecast ?? []
}

export function getRainfallSourceStatus(regionId) {
  return getRainfallProvider(regionId).getRainfallSourceStatus() ?? {}
}