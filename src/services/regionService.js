import { DEFAULT_REGION_ID, getRegionConfig, REGION_LIST, REGIONS, resolveRegionId } from '../data/regions/index.js'

export { DEFAULT_REGION_ID, getRegionConfig, REGION_LIST, REGIONS, resolveRegionId }

/**
 * Region Service
 *
 * Centralizes resolution of region-specific datasets for the coupled flood engine,
 * rainfall nowcasting, terrain elevation models, and stormwater drainage network.
 */

export function getAvailableRegions() {
  return REGION_LIST
}

export function getActiveRegionConfig(regionId = DEFAULT_REGION_ID) {
  return getRegionConfig(regionId)
}


export function isValidRegion(regionId) {
  return Boolean(REGIONS[regionId?.toLowerCase()])
}

export function getRegionDataset(regionId = DEFAULT_REGION_ID) {
  const config = getRegionConfig(regionId)
  return {
    id: config.id,
    name: config.name,
    shortName: config.shortName,
    center: config.center,
    zoom: config.zoom,
    wards: config.wards,
    streets: config.streets,
    terrain: config.terrain,
    drainageNetwork: config.drainageNetwork,
    rainfall: config.rainfall,
    roadNetwork: config.roadNetwork,
    emergencyResponse: config.emergencyResponse,
    dataSources: config.dataSources,
    priorityActions: config.priorityActions
  }
}
