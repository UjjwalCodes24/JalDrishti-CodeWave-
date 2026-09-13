import { getRegionConfig } from '../data/regions/index.js'
import defaultTerrain from '../data/terrain.json' with { type: 'json' }


/**
 * JalDrishti Terrain & Surface Runoff Service
 *
 * Implements simplified hydrological catchment runoff and DEM accumulation potential.
 * Supports multi-region terrain datasets (Mumbai, Delhi, Chennai).
 */

export function getTerrainZones(regionId) {
  if (regionId) {
    const config = getRegionConfig(regionId)
    return config.terrain || defaultTerrain.zones
  }
  return defaultTerrain.zones
}

/**
 * Calculates the topographic accumulation factor based on DEM elevation and slope.
 * Lower elevation basins with flatter slopes exhibit higher tendency for water accumulation.
 *
 * @param {Object} zone Terrain zone object
 * @returns {number} Normalized accumulation factor [0.1, 1.0]
 */
export function calculateAccumulationPotential(zone) {
  if (!zone) return 0.5
  // Elevation factor: zones below 10m have high vulnerability; zones > 20m drain naturally
  const elevationFactor = Math.max(0.15, 1 - (zone.elevation || 10) / 22)
  // Slope factor: flatter slopes (< 2%) retain water; steeper slopes (> 8%) accelerate drainage
  const slopeFactor = Math.max(0.2, 1 - (zone.slope || 2) / 10)
  const baseline = zone.accumulationPotential ?? 0.5

  const combined = (baseline * 0.55) + (elevationFactor * 0.30) + (slopeFactor * 0.15)
  return Number(Math.min(1, Math.max(0.1, combined)).toFixed(3))
}

/**
 * Computes deterministic surface runoff demand for a given rainfall intensity and terrain zone.
 * Follows the Rational Method concept: Q = C * I * A_factor
 *
 * @param {number} rainfallIntensity Rainfall intensity in mm/hr
 * @param {Object} zone Terrain zone
 * @param {number} imperviousFactor Baseline imperviousness of urban catchment (default 0.78)
 * @returns {Object} Intermediate and final runoff metrics
 */
export function calculateRunoffDemand(rainfallIntensity, zone, imperviousFactor = 0.78) {
  const intensity = Math.max(0, rainfallIntensity || 0)
  const terrainPotential = calculateAccumulationPotential(zone)
  // Runoff coefficient scales slightly with saturation / accumulation potential
  const runoffCoefficient = Number(Math.min(0.96, imperviousFactor + (terrainPotential * 0.12)).toFixed(3))
  const runoffVolume = Number((intensity * runoffCoefficient * (1 + terrainPotential * 0.45)).toFixed(2))

  return {
    rainfallIntensity: intensity,
    runoffCoefficient,
    terrainPotential,
    runoffVolume
  }
}

/**
 * Returns surface runoff volume (backward-compatible helper).
 */
export function calculateSurfaceRunoff(rainfallIntensity, zone, imperviousFactor = 0.78) {
  return calculateRunoffDemand(rainfallIntensity, zone, imperviousFactor).runoffVolume
}
