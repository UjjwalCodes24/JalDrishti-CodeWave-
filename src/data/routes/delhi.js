import delhiRegion from '../regions/delhi.js'

/** Delhi NCR demonstration corridors — prototype, not live flood warnings. */
export const delhiRoutes = {
  regionId: delhiRegion.id,
  regionName: delhiRegion.name,
  shortName: delhiRegion.shortName,
  center: delhiRegion.center,
  zoom: delhiRegion.zoom,
  geocodeSuffix: delhiRegion.geocodeSuffix,
  defaultOrigin: delhiRegion.defaultOrigin,
  defaultDestination: delhiRegion.defaultDestination,
  crisisCorridors: delhiRegion.crisisCorridors,
  roadNetwork: delhiRegion.roadNetwork,
}

export default delhiRoutes
