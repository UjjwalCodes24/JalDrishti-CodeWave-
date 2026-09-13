import { getRainfallObservations, getRainfallForecast, getRainfallSourceStatus } from './rainfallService'
import { DEFAULT_REGION_ID } from './regionService.js'

export function getForecast(regionId) {
  return getRainfallForecast(regionId)
}

export function getPeakForecast(series = getForecast()) {
  return series.reduce((peak, point) => point.intensity > peak.intensity ? point : peak, series[0])
}

export function getPeakForecastIntensity(series = getForecast()) {
  return getPeakForecast(series).intensity
}

export function getPeakForecastTime(series = getForecast()) {
  return getPeakForecast(series).time
}

function minutesFromLabel(time) {
  if (time === 'NOW') return 0
  const match = /^([+-])\s*(\d+)\s*MIN.*$/i.exec(String(time))
  if (!match) return null
  const sign = match[1] === '-' ? -1 : 1
  return sign * Number(match[2])
}

function linearSlope(points) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  const numerator = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0)
  const denominator = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0)
  return denominator === 0 ? 0 : numerator / denominator
}

export function getRainfallTrend(regionId = DEFAULT_REGION_ID) {
  const observations = getRainfallObservations(regionId).filter((obs) => minutesFromLabel(obs.time) !== null && obs.intensity > 0)
  if (observations.length < 2) {
    return { trendRate: 0, trendLabel: 'Steady', recentAverage: observations[0]?.intensity || 0, samples: observations.length }
  }
  const points = observations.map((obs) => ({ x: minutesFromLabel(obs.time), y: obs.intensity }))
  const trendRate = Number((linearSlope(points) * 60).toFixed(2))
  const recentAverage = Math.round(observations.reduce((sum, obs) => sum + obs.intensity, 0) / observations.length)
  const label = trendRate > 4 ? 'Rising' : trendRate < -4 ? 'Falling' : 'Steady'
  return { trendRate, trendLabel: label, recentAverage, samples: observations.length }
}

export function getForecastDirection(series = getForecast(), regionId = DEFAULT_REGION_ID) {
  const trend = getRainfallTrend(regionId)
  if (trend.samples >= 2 && Math.abs(trend.trendRate) >= 4) {
    return trend.trendRate > 0 ? 'Increasing' : 'Easing'
  }
  const first = series[0]?.intensity ?? 0
  const peak = getPeakForecast(series).intensity
  if (peak === first) return 'Steady'
  return peak > first ? 'Increasing' : 'Easing'
}

export function getForecastConfidence(point, dataSource, trendRate = 0) {
  const horizonPenalty = Math.min(18, Math.max(0, (point.offsetMinutes || 0)) / 12)
  const quality = ((dataSource?.dataQuality ?? 70) * 0.45) + ((dataSource?.radarCoverage ?? 70) * 0.35) + ((dataSource?.stationCoverage ?? 70) * 0.2)
  const trendUncertainty = Math.min(10, Math.abs(trendRate || 0) * 2)
  return Math.round(Math.max(5, Math.min(99, (point.confidence * 0.6) + quality * 0.4 - horizonPenalty - trendUncertainty)))
}

export function getNowcastSummary(regionId = DEFAULT_REGION_ID) {
  const forecast = getForecast(regionId)
  const source = getRainfallSourceStatus(regionId)
  const trend = getRainfallTrend(regionId)
  const peak = getPeakForecast(forecast)
  const perPointConfidence = forecast.map((point) => getForecastConfidence(point, source, trend.trendRate))
  const confidence = Math.round(perPointConfidence.reduce((sum, value) => sum + value, 0) / perPointConfidence.length)
  return {
    mode: source.mode || 'DEMO MODE · SIMULATED DATA',
    source: source.provider || source.source,
    trend: trend.trendLabel,
    trendRate: trend.trendRate,
    recentAverageIntensity: trend.recentAverage,
    peakIntensity: peak.intensity,
    peakTime: peak.time,
    peakAccumulated: peak.accumulated,
    direction: getForecastDirection(forecast, regionId),
    confidence,
    uncertainty: Math.max(1, 100 - confidence),
    basedOn: { observations: trend.samples, forecastPoints: forecast.length }
  }
}