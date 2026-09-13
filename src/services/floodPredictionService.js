import { getFloodForecast, getFloodPrediction } from './floodEngine'

export function getNowcastImpact(time = 'NOW', regionId = 'mumbai') {
  const prediction = getFloodPrediction(time, regionId)
  const forecast = getFloodForecast(regionId)
  const highRiskRoads = prediction.streets.filter((street) => street.risk === 'HIGH' || street.risk === 'CRITICAL').length
  const criticalRoads = prediction.streets.filter((street) => street.risk === 'CRITICAL').length
  const expectedPeak = forecast.reduce((peak, point) => point.highestWaterDepth > peak.highestWaterDepth ? point : peak, forecast[0])
  return {
    ...prediction,
    highRiskRoads,
    criticalRoads,
    expectedPeakTime: expectedPeak.time,
    criticalStatus: criticalRoads > 0 ? 'CRITICAL' : highRiskRoads > 0 ? 'WATCH' : 'STABLE',
  }
}

export function getForecastImpact(regionId = 'mumbai') {
  const forecast = getFloodForecast(regionId)
  return forecast.map((point) => getNowcastImpact(point.time, regionId))
}

