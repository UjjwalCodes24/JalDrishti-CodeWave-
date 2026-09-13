import wards from '../wards.json' with { type: 'json' }
import streets from '../streets.json' with { type: 'json' }
import terrain from '../terrain.json' with { type: 'json' }
import drainageNetwork from '../drainageNetwork.json' with { type: 'json' }
import rainfall from '../rainfall.json' with { type: 'json' }
import roadNetwork from '../roadNetwork.json' with { type: 'json' }
import emergencyResponse from '../emergencyResponse.json' with { type: 'json' }
import floodPredictions from '../floodPredictions.json' with { type: 'json' }


/**
 * Mumbai Metropolitan Area - Demonstration Region Configuration
 * Preserves 100% of existing baseline datasets and hotspots.
 */
export const mumbaiRegion = {
  id: 'mumbai',
  name: 'Mumbai Metropolitan Area',
  shortName: 'Mumbai',
  state: 'Maharashtra',
  kicker: 'URBAN FLOOD MONITORING',
  subtitle: 'Monitor rainfall, drainage conditions and flood risk across Mumbai.',
  center: [19.076, 72.8777],
  zoom: 11,
  primaryFocusStreet: 'ST-KUR-01',
  defaultOrigin: 'Kurla Station',
  defaultDestination: 'Sion Hospital',
  geocodeSuffix: 'Mumbai, Maharashtra, India',
  crisisCorridors: [
    { label: 'Kurla ➔ Sion Hospital', origin: 'Kurla Station', destination: 'Sion Hospital' },
    { label: 'Andheri ➔ BKC', origin: 'Andheri East', destination: 'Bandra Kurla Complex' },
    { label: 'Dharavi ➔ Airport', origin: 'Dharavi Junction', destination: 'Mumbai Airport' },
    { label: 'BKC ➔ Bandra West', origin: 'Bandra Kurla Complex', destination: 'Bandra West' },
  ],
  wardCoordinates: {
    W23: [19.0728, 72.8826],
    W14: [19.0466, 72.8631],
    W08: [19.1197, 72.8468],
    W31: [19.0178, 72.8294],
    W05: [18.9067, 72.8147]
  },
  wards,
  streets: streets.streets,
  terrain: terrain.zones,
  drainageNetwork,
  rainfall,
  roadNetwork,
  emergencyResponse,
  floodPredictions,
  dataSources: [
    { name: 'IMD Rainfall', status: 'Demo data', statusType: 'demo', detail: 'Rainfall observations' },
    { name: 'Doppler Weather Radar', status: 'Simulation', statusType: 'sim', detail: 'Radar rainfall input' },
    { name: 'Digital Elevation Model', status: 'Loaded', statusType: 'loaded', detail: '3 m terrain data' },
    { name: 'Drainage Network', status: 'Loaded', statusType: 'loaded', detail: '12 monitored nodes' },
    { name: 'AI Nowcast', status: 'Available', statusType: 'avail', detail: '0–3 hour forecast' },
    { name: 'Safe Routes', status: 'Available', statusType: 'avail', detail: '10 monitored links' },
  ],
  priorityActions: {
    'ST-KUR-01': { action: 'Restrict traffic · Deploy pumps', reason: 'Predicted depth in low-lying Mithi basin exceeding drainage capacity.' },
    'ST-KUR-02': { action: 'Prepare emergency response', reason: 'High predicted water depth and blocked culvert backflow.' },
    'ST-MIT-01': { action: 'Stage emergency response', reason: 'High runoff accumulation near Mithi junction.' },
    'ST-SAK-01': { action: 'Monitor traffic flow', reason: 'Moderate accumulation on arterial link.' },
    'ST-BKC-01': { action: 'Monitor continuously', reason: 'Higher elevation connector maintaining passable flow.' },
  }
}

export default mumbaiRegion
