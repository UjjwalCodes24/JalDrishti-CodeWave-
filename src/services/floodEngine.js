import { getRegionConfig, DEFAULT_REGION_ID, resolveRegionId } from '../data/regions/index.js'
import defaultRainfall from '../data/rainfall.json' with { type: 'json' }
import { calculateAccumulationPotential, calculateRunoffDemand, calculateSurfaceRunoff } from './terrainService.js'
import { calculateDrainageStatus } from './drainageService.js'
import { getRainfallProvider } from './rainfallProvider.js'


/**
 * JalDrishti Coupled Hydrological & Hydraulic Flood Engine
 *
 * Generic multi-region flood engine that processes:
 * 1. 0–3h IMD/Radar Rainfall Nowcast
 * 2. Catchment Surface Runoff (Rational Method)
 * 3. DEM Topographic Accumulation (Elevation & Slope)
 * 4. Directed Stormwater Drainage Network (Graph Propagation)
 * 5. Hydraulic Capacity & Pipe Blockage
 * 6. Hydraulic Surcharge & Backflow
 * 7. Surface Water Accumulation (Mass Balance)
 * 8. Street-Level Flood Depth & Risk Classification
 */

export const MODEL_METADATA = {
  name: 'JalDrishti Coupled Flood Model',
  version: '0.2-prototype',
  mode: 'deterministic demonstration',
  supportedRegions: ['mumbai', 'delhi', 'chennai'],
  pipeline: [
    'Rainfall Nowcast (0–3h IMD/Radar input)',
    'Surface Runoff (Impervious catchment runoff coefficient)',
    'Terrain / DEM (Topographic elevation & accumulation potential)',
    'Directed Drainage Graph (Topological flow propagation)',
    'Hydraulic Capacity & Pipe Blockage (Effective capacity & utilization)',
    'Hydraulic Surcharge & Backflow (Head loss & reverse pressure)',
    'Surface Water Accumulation (Mass balance water depth)',
    'Street-Level Risk Classification (Actionable operational tiers)'
  ],
  assumptions: [
    '1D directed stormwater conveyance with junction mass-balance',
    'Impervious urban catchment runoff ratio C ~ 0.78–0.90',
    'Blockage modeled as 58% effective cross-sectional reduction',
    'Surcharge and backflow driven by downstream hydraulic gradient deficit'
  ]
}

export const forecastTimes = defaultRainfall.forecast.map((point) => point.time)

export function calculateRunoff(rainfallIntensity, zone) {
  return calculateSurfaceRunoff(rainfallIntensity, zone)
}

export function calculateDrainageLoad(runoffVolume, rainfallIntensity) {
  return Number((runoffVolume * 0.20 + rainfallIntensity * 0.34).toFixed(2))
}

export function calculateSurcharge(drainageStatus) {
  return Number((drainageStatus.surchargeRisk * 100).toFixed(1))
}

export function calculateBackflowRisk(drainageStatus) {
  return Number((drainageStatus.backflowProbability * 100).toFixed(1))
}

export function calculateWaterDepth(runoffVolume, zone, drainageStatus) {
  const terrainPotential = calculateAccumulationPotential(zone)
  const drainagePenalty = 1 + (drainageStatus.surchargeRisk * 1.55) + (drainageStatus.backflowProbability * 0.65)
  return Number(Math.max(0, runoffVolume * terrainPotential * 0.66 * drainagePenalty).toFixed(1))
}

export function calculateFloodRisk(depth, riskThresholds = { critical: 45, high: 25, moderate: 10 }) {
  if (depth >= riskThresholds.critical) return 'CRITICAL'
  if (depth >= riskThresholds.high) return 'HIGH'
  if (depth >= riskThresholds.moderate) return 'MODERATE'
  return 'LOW'
}

// In-memory cache for regional forecasts to avoid recomputing on every render
const regionForecastCache = new Map()

/**
 * Runs the coupled flood engine generically for any given region.
 *
 * @param {string|Object} regionOrId Region ID or region configuration object
 * @returns {Array} List of forecast horizon predictions
 */
export function runFloodEngine(regionOrId = DEFAULT_REGION_ID) {
  const config = typeof regionOrId === 'string'
    ? getRegionConfig(regionOrId)
    : regionOrId || getRegionConfig(DEFAULT_REGION_ID)

  const regionId = config.id || DEFAULT_REGION_ID
  const rainfallData = getRainfallProvider(regionId).getRainfallData() || defaultRainfall
  const streetsData = config.streets || []
  const terrainZones = config.terrain || []
  const drainageNet = config.drainageNetwork
  const riskThresholds = config.floodPredictions?.riskThresholds || { critical: 45, high: 25, moderate: 10 }

  const forecastResult = rainfallData.forecast.map((rainPoint) => {
    // 1. Calculate local runoff for each street zone in the region
    const streetDemands = {}
    streetsData.forEach((street) => {
      const zone = terrainZones.find((item) => item.id === street.terrainZone) || terrainZones[0]
      const demand = calculateRunoffDemand(rainPoint.intensity, zone)
      streetDemands[street.drainageNode] = demand.runoffVolume
    })

    // 2. Propagate flows through the region's directed drainage network graph
    const drainage = calculateDrainageStatus(rainPoint.intensity, streetDemands, drainageNet)

    // 3. Compute coupled street-level predictions
    const streetPredictions = streetsData.map((street) => {
      const zone = terrainZones.find((item) => item.id === street.terrainZone) || terrainZones[0]
      const runoffDemand = calculateRunoffDemand(rainPoint.intensity, zone)
      const connectedNode = drainage.nodes.find((node) => node.id === street.drainageNode)
      const nodeUtilization = connectedNode ? connectedNode.utilization : drainage.utilization

      const depth = calculateWaterDepth(runoffDemand.runoffVolume, zone, drainage)
      const risk = calculateFloodRisk(depth, riskThresholds)
      const surcharge = calculateSurcharge(drainage)
      const backflow = calculateBackflowRisk(drainage)

      const modelTrace = {
        regionId,
        streetId: street.id,
        horizon: rainPoint.time,
        rainfallInput: {
          intensity: rainPoint.intensity,
          accumulated: rainPoint.accumulated,
          confidence: rainPoint.confidence
        },
        terrainFactor: {
          elevation: zone?.elevation,
          slope: zone?.slope,
          accumulationPotential: runoffDemand.terrainPotential
        },
        runoffDemand: {
          coefficient: runoffDemand.runoffCoefficient,
          volume: runoffDemand.runoffVolume
        },
        drainageUtilization: {
          nodeId: street.drainageNode,
          nodeUtilization,
          networkMeanUtilization: drainage.utilization
        },
        overloadedNodes: drainage.overloadedNodes.map((n) => n.id),
        overloadedEdges: drainage.overloadedEdges.map((e) => e.id),
        blockageImpact: {
          blockedPipes: drainage.edges.filter((e) => e.blocked).map((e) => e.id),
          capacityLoss: drainage.blockageImpact
        },
        surchargeRisk: drainage.surchargeRisk,
        backflowRisk: drainage.backflowProbability,
        predictedDepth: depth,
        risk
      }

      return {
        ...street,
        currentWaterDepth: street.currentWaterDepth ?? (rainPoint.offsetMinutes === 0 ? depth : 0),
        waterDepth: depth,
        predictedWaterDepth: depth,
        rainfall: rainPoint.intensity,
        runoffVolume: runoffDemand.runoffVolume,
        drainageLoad: calculateDrainageLoad(runoffDemand.runoffVolume, rainPoint.intensity),
        drainageUtilization: nodeUtilization,
        surcharge,
        backflow,
        risk,
        terrain: zone,
        modelTrace
      }
    })

    const highestWaterDepth = Math.max(...streetPredictions.map((s) => s.waterDepth), 0)
    const criticalStreets = streetPredictions.filter((s) => s.risk === 'CRITICAL').length

    const modelTrace = {
      regionId,
      horizon: rainPoint.time,
      offsetMinutes: rainPoint.offsetMinutes,
      rainfallIntensity: rainPoint.intensity,
      rainfallConfidence: rainPoint.confidence,
      networkUtilization: drainage.utilization,
      overloadedNodeCount: drainage.overloadedNodes.length,
      overloadedEdgeCount: drainage.overloadedEdges.length,
      blockageImpact: drainage.blockageImpact,
      surchargeRisk: drainage.surchargeRisk,
      backflowProbability: drainage.backflowProbability,
      bottlenecks: drainage.bottlenecks,
      highestWaterDepth,
      criticalStreetsCount: criticalStreets
    }

    return {
      ...rainPoint,
      regionId,
      streets: streetPredictions,
      drainage,
      highestWaterDepth,
      criticalStreets,
      modelTrace,
      modelMetadata: MODEL_METADATA
    }
  })

  regionForecastCache.set(regionId, forecastResult)
  return forecastResult
}

// Pre-initialize forecasts for all 3 regions
export const floodForecast = runFloodEngine('mumbai')
runFloodEngine('delhi')
runFloodEngine('chennai')

export function getFloodForecast(regionId = DEFAULT_REGION_ID) {
  const resolved = resolveRegionId(regionId)
  if (!regionForecastCache.has(resolved)) {
    return runFloodEngine(resolved)
  }
  return regionForecastCache.get(resolved)
}

export function getFloodPrediction(time = 'NOW', regionId = DEFAULT_REGION_ID) {
  const forecast = getFloodForecast(regionId)
  return forecast.find((point) => point.time === time) || forecast[0]
}

export function getFloodEngineSummary(time = 'NOW', regionId = DEFAULT_REGION_ID) {
  const forecast = getFloodForecast(regionId)
  const prediction = forecast.find((point) => point.time === time) || forecast[0]
  return {
    rainfall: prediction.intensity,
    peakRainfall: Math.max(...forecast.map((point) => point.intensity)),
    highestWaterDepth: prediction.highestWaterDepth,
    overloadedNodes: prediction.drainage.overloadedNodes.length,
    criticalStreets: prediction.criticalStreets,
    prediction,
    modelMetadata: MODEL_METADATA
  }
}