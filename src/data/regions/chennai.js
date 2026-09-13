/**
 * Chennai Metropolitan Area - Demonstration Region Configuration
 * Prototype scenario representing coastal monsoon inundation, marsh basin depressions, and canal backflow.
 */
export const chennaiRegion = {
  id: 'chennai',
  name: 'Chennai Metropolitan Area',
  shortName: 'Chennai',
  state: 'Tamil Nadu',
  kicker: 'URBAN FLOOD MONITORING',
  subtitle: 'Monitor rainfall, drainage conditions and flood risk across Chennai.',
  center: [13.0827, 80.2707],
  zoom: 11,
  primaryFocusStreet: 'ST-CHE-01',
  defaultOrigin: 'Guindy',
  defaultDestination: 'Chennai Airport',
  geocodeSuffix: 'Chennai, Tamil Nadu, India',
  crisisCorridors: [
    { label: 'Guindy ➔ Airport', origin: 'Guindy', destination: 'Chennai Airport' },
    { label: 'Velachery ➔ Guindy', origin: 'Velachery Junction', destination: 'Guindy' },
    { label: 'Adyar ➔ Guindy', origin: 'Adyar', destination: 'Guindy' },
    { label: 'Perungudi ➔ OMR', origin: 'Perungudi', destination: 'OMR' },
  ],
  wardCoordinates: {
    'W-CHE-01': [12.9815, 80.2180],
    'W-CHE-02': [13.0418, 80.2341],
    'W-CHE-03': [12.9654, 80.2461],
    'W-CHE-04': [13.0336, 80.2678],
    'W-CHE-05': [13.1147, 80.2941]
  },
  wards: [
    { id: 'W-CHE-01', name: 'Zone 13', area: 'Velachery / Adyar Marsh Basin', risk: 89, rainfall: 64, drainage: 32, status: 'Critical' },
    { id: 'W-CHE-02', name: 'Zone 10', area: 'Kodambakkam / T. Nagar & Usman Rd', risk: 78, rainfall: 54, drainage: 44, status: 'High' },
    { id: 'W-CHE-03', name: 'Zone 14', area: 'Perungudi / OMR Lowland Link', risk: 71, rainfall: 48, drainage: 50, status: 'High' },
    { id: 'W-CHE-04', name: 'Zone 09', area: 'Mylapore / Alwarpet Canal', risk: 44, rainfall: 32, drainage: 72, status: 'Moderate' },
    { id: 'W-CHE-05', name: 'Zone 05', area: 'Royapuram / North Coastal Strip', risk: 20, rainfall: 15, drainage: 88, status: 'Low' }
  ],
  streets: [
    { id: 'ST-CHE-01', name: 'Velachery Main Road', latitude: 12.9785, longitude: 80.2212, terrainZone: 'T-CHE-01', drainageNode: 'MH-VEL-01', currentWaterDepth: 10, predictedWaterDepth: 0 },
    { id: 'ST-CHE-02', name: 'Mudichur Floodplain Road', latitude: 12.9182, longitude: 80.0821, terrainZone: 'T-CHE-02', drainageNode: 'MH-MUD-01', currentWaterDepth: 8, predictedWaterDepth: 0 },
    { id: 'ST-CHE-03', name: 'Adyar Canal Service Road', latitude: 13.0067, longitude: 80.2570, terrainZone: 'T-CHE-01', drainageNode: 'J-ADY-01', currentWaterDepth: 5, predictedWaterDepth: 0 },
    { id: 'ST-CHE-04', name: 'Usman Road / T. Nagar', latitude: 13.0405, longitude: 80.2337, terrainZone: 'T-CHE-03', drainageNode: 'MH-TNG-01', currentWaterDepth: 4, predictedWaterDepth: 0 },
    { id: 'ST-CHE-05', name: 'Guindy Flyover Corridor', latitude: 13.0067, longitude: 80.2033, terrainZone: 'T-CHE-04', drainageNode: 'OUT-ADY-01', currentWaterDepth: 1, predictedWaterDepth: 0 }
  ],
  terrain: [
    { id: 'T-CHE-01', name: 'Velachery Marsh Basin', latitude: 12.9785, longitude: 80.2212, elevation: 3.2, slope: 0.5, flowDirection: 'east', terrainType: 'low-lying', accumulationPotential: 0.95 },
    { id: 'T-CHE-02', name: 'Mudichur Floodplain Basin', latitude: 12.9182, longitude: 80.0821, elevation: 4.8, slope: 0.8, flowDirection: 'northeast', terrainType: 'low-lying', accumulationPotential: 0.89 },
    { id: 'T-CHE-03', name: 'T. Nagar Urban Plain', latitude: 13.0405, longitude: 80.2337, elevation: 7.8, slope: 1.4, flowDirection: 'east', terrainType: 'moderate', accumulationPotential: 0.56 },
    { id: 'T-CHE-04', name: 'Guindy Elevated Ridge', latitude: 13.0067, longitude: 80.2033, elevation: 15.6, slope: 3.8, flowDirection: 'east', terrainType: 'moderate', accumulationPotential: 0.28 },
    { id: 'T-CHE-05', name: 'St. Thomas Mount High Ground', latitude: 13.0042, longitude: 80.1932, elevation: 28.0, slope: 8.2, flowDirection: 'north', terrainType: 'higher', accumulationPotential: 0.14 }
  ],
  drainageNetwork: {
    area: 'Chennai South and Adyar Basin demonstration zone',
    nodes: [
      { id: 'MH-VEL-01', name: 'Velachery Marsh Storm Inlet', lat: 12.9785, lng: 80.2212, type: 'drainage inlet', capacity: 56, currentLoad: 40, status: 'watch' },
      { id: 'MH-MUD-01', name: 'Mudichur Channel Manhole', lat: 12.9182, lng: 80.0821, type: 'manhole', capacity: 46, currentLoad: 38, status: 'watch' },
      { id: 'MH-TNG-01', name: 'Mambalam Canal Inlet', lat: 13.0405, lng: 80.2337, type: 'drainage inlet', capacity: 60, currentLoad: 36, status: 'normal' },
      { id: 'J-ADY-01', name: 'Adyar / Buckingham Canal Junction', lat: 13.0067, lng: 80.2570, type: 'junction', capacity: 74, currentLoad: 52, status: 'normal' },
      { id: 'OUT-ADY-01', name: 'Adyar Estuary Outfall', lat: 13.0120, lng: 80.2780, type: 'junction', capacity: 94, currentLoad: 58, status: 'normal' }
    ],
    edges: [
      { id: 'P-VEL-01', source: 'MH-VEL-01', target: 'J-ADY-01', length: 1100, diameter: 1.2, hydraulicCapacity: 44, currentFlow: 36, blocked: true },
      { id: 'P-MUD-01', source: 'MH-MUD-01', target: 'J-ADY-01', length: 1350, diameter: 1.1, hydraulicCapacity: 36, currentFlow: 31, blocked: false },
      { id: 'P-TNG-01', source: 'MH-TNG-01', target: 'J-ADY-01', length: 980, diameter: 1.4, hydraulicCapacity: 58, currentFlow: 33, blocked: false },
      { id: 'C-ADY-01', source: 'J-ADY-01', target: 'OUT-ADY-01', length: 1600, diameter: 1.9, hydraulicCapacity: 84, currentFlow: 48, blocked: false }
    ]
  },
  rainfall: {
    area: 'Chennai Metropolitan Area demonstration zone',
    mode: 'DEMO MODE',
    source: 'SIMULATED DATA',
    sourceProfile: {
      provider: 'IMD / Chennai Doppler Radar (Simulated)',
      connection: 'fallback',
      lastObservation: '2026-09-06T14:20:00+05:30',
      dataQuality: 84,
      radarCoverage: 76,
      stationCoverage: 52,
      observationWindow: 'Last 60 minutes'
    },
    observations: [
      { time: '-60 MIN', intensity: 30, quality: 78 },
      { time: '-30 MIN', intensity: 36, quality: 80 },
      { time: 'NOW', intensity: 44, quality: 84 }
    ],
    forecast: [
      { time: 'NOW', offsetMinutes: 0, intensity: 44, accumulated: 0, confidence: 88 },
      { time: '+30 MIN', offsetMinutes: 30, intensity: 58, accumulated: 24, confidence: 85 },
      { time: '+60 MIN', offsetMinutes: 60, intensity: 74, accumulated: 57, confidence: 81 },
      { time: '+90 MIN', offsetMinutes: 90, intensity: 82, accumulated: 95, confidence: 78 },
      { time: '+120 MIN', offsetMinutes: 120, intensity: 62, accumulated: 128, confidence: 74 },
      { time: '+180 MIN', offsetMinutes: 180, intensity: 41, accumulated: 164, confidence: 69 }
    ]
  },
  roadNetwork: {
    area: 'Chennai Metropolitan Area Road Network',
    nodes: [
      { id: 'GUINDY', name: 'Guindy', latitude: 13.0067, longitude: 80.2033, elevation: 15.6, terrainType: 'moderate' },
      { id: 'AIRPORT', name: 'Chennai Airport', latitude: 12.9941, longitude: 80.1709, elevation: 12.4, terrainType: 'moderate' },
      { id: 'T_NAGAR', name: 'T. Nagar', latitude: 13.0418, longitude: 80.2341, elevation: 7.8, terrainType: 'moderate' },
      { id: 'VELACHERY', name: 'Velachery Junction', latitude: 12.9785, longitude: 80.2212, elevation: 3.2, terrainType: 'low-lying' },
      { id: 'ADYAR', name: 'Adyar', latitude: 13.0067, longitude: 80.2570, elevation: 5.0, terrainType: 'low-lying' },
      { id: 'PERUNGUDI', name: 'Perungudi', latitude: 12.9654, longitude: 80.2461, elevation: 4.6, terrainType: 'low-lying' },
      { id: 'OMR', name: 'OMR', latitude: 12.9896, longitude: 80.2489, elevation: 6.2, terrainType: 'moderate' },
      { id: 'TAMBARAM', name: 'Tambaram Gateway', latitude: 12.9249, longitude: 80.1000, elevation: 14.0, terrainType: 'moderate' },
      { id: 'CENTRAL', name: 'Chennai Central', latitude: 13.0827, longitude: 80.2757, elevation: 8.5, terrainType: 'moderate' }
    ],
    edges: [
      { id: 'R-CHE-01', from: 'GUINDY', to: 'AIRPORT', source: 'GUINDY', target: 'AIRPORT', name: 'GST Road / Airport Connector', distance: 4.8, baseTimeMin: 10, travelTime: 10, floodStreetId: 'ST-CHE-05', floodFactor: 0.06, baseDepth: 2 },
      { id: 'R-CHE-02', from: 'T_NAGAR', to: 'GUINDY', source: 'T_NAGAR', target: 'GUINDY', name: 'Anna Salai Arterial', distance: 5.1, baseTimeMin: 11, travelTime: 11, floodStreetId: 'ST-CHE-04', floodFactor: 0.12, baseDepth: 3 },
      { id: 'R-CHE-03', from: 'VELACHERY', to: 'GUINDY', source: 'VELACHERY', target: 'GUINDY', name: 'Inner Ring Road / Velachery Main', distance: 4.2, baseTimeMin: 9, travelTime: 9, floodStreetId: 'ST-CHE-01', floodFactor: 0.28, baseDepth: 6 },
      { id: 'R-CHE-04', from: 'VELACHERY', to: 'ADYAR', source: 'VELACHERY', target: 'ADYAR', name: 'Velachery Bypass to LB Road', distance: 5.8, baseTimeMin: 13, travelTime: 13, floodStreetId: 'ST-CHE-03', floodFactor: 0.32, baseDepth: 8 },
      { id: 'R-CHE-05', from: 'ADYAR', to: 'GUINDY', source: 'ADYAR', target: 'GUINDY', name: 'Sardar Patel Road', distance: 5.4, baseTimeMin: 12, travelTime: 12, floodStreetId: 'ST-CHE-03', floodFactor: 0.18, baseDepth: 4 },
      { id: 'R-CHE-06', from: 'PERUNGUDI', to: 'OMR', source: 'PERUNGUDI', target: 'OMR', name: 'Old Mahabalipuram Road Link', distance: 3.2, baseTimeMin: 8, travelTime: 8, floodStreetId: 'ST-CHE-01', floodFactor: 0.22, baseDepth: 5 },
      { id: 'R-CHE-07', from: 'PERUNGUDI', to: 'VELACHERY', source: 'PERUNGUDI', target: 'VELACHERY', name: 'Velachery–Tambaram Road', distance: 3.6, baseTimeMin: 9, travelTime: 9, floodStreetId: 'ST-CHE-01', floodFactor: 0.3, baseDepth: 7 },
      { id: 'R-CHE-08', from: 'ADYAR', to: 'OMR', source: 'ADYAR', target: 'OMR', name: 'Lattice Bridge Road to OMR', distance: 3.1, baseTimeMin: 8, travelTime: 8, floodStreetId: 'ST-CHE-03', floodFactor: 0.14, baseDepth: 3 },
      { id: 'R-CHE-09', from: 'T_NAGAR', to: 'CENTRAL', source: 'T_NAGAR', target: 'CENTRAL', name: 'Mount Road Highway Link', distance: 6.8, baseTimeMin: 14, travelTime: 14, floodStreetId: 'ST-CHE-04', floodFactor: 0.08, baseDepth: 2 },
      { id: 'R-CHE-10', from: 'TAMBARAM', to: 'GUINDY', source: 'TAMBARAM', target: 'GUINDY', name: 'GST Road Highway', distance: 12.4, baseTimeMin: 22, travelTime: 22, floodStreetId: 'ST-CHE-05', floodFactor: 0.05, baseDepth: 2 },
      { id: 'R-CHE-11', from: 'VELACHERY', to: 'AIRPORT', source: 'VELACHERY', target: 'AIRPORT', name: 'Pallavaram Elevated Connector', distance: 7.6, baseTimeMin: 16, travelTime: 16, floodStreetId: 'ST-CHE-02', floodFactor: 0.1, baseDepth: 3 }
    ]
  },
  emergencyResponse: {
    area: 'Chennai Disaster Response Grid',
    teamLocations: [
      { id: 'T-CHE-ALPHA', name: 'Velachery Emergency Dewatering Squad', latitude: 12.9760, longitude: 80.2190, assignment: 'Velachery Main Road', status: 'AVAILABLE' },
      { id: 'T-CHE-BRAVO', name: 'Adyar Canal Flood Gate Unit', latitude: 13.0040, longitude: 80.2550, assignment: 'Adyar Junction', status: 'AVAILABLE' },
      { id: 'T-CHE-CHARLIE', name: 'Guindy Elevated Logistics Base', latitude: 13.0080, longitude: 80.2010, assignment: 'Guindy Corridor', status: 'AVAILABLE' }
    ],
    resources: [
      { id: 'PUMP-CHE-01', type: 'High-Discharge Dewatering Pumps', available: 6, status: 'AVAILABLE', assignment: 'Velachery & Mudichur' },
      { id: 'BOAT-CHE-02', type: 'Inflatable Rescue Boats', available: 5, status: 'AVAILABLE', assignment: 'Low-lying Floodplains' },
      { id: 'SAND-CHE-03', type: 'Sandbag Deployment Trucks', available: 4, status: 'AVAILABLE', assignment: 'Canal Bank Reinforcement' }
    ]
  },
  floodPredictions: {
    mode: 'DEMO MODE',
    source: 'SIMULATED DATA',
    riskThresholds: { moderate: 10, high: 25, critical: 45 }
  },
  dataSources: [
    { name: 'IMD Chennai Rainfall', status: 'Demo data', statusType: 'demo', detail: 'Rainfall observations' },
    { name: 'Chennai Doppler Radar', status: 'Simulation', statusType: 'sim', detail: 'Radar precipitation input' },
    { name: 'DEM Coastal Terrain Grid', status: 'Loaded', statusType: 'loaded', detail: '3 m DEM elevation' },
    { name: 'Adyar/Buckingham Drainage', status: 'Loaded', statusType: 'loaded', detail: 'Canal network nodes' },
    { name: 'AI Nowcast', status: 'Available', statusType: 'avail', detail: '0–3 hour forecast' },
    { name: 'Safe Routes', status: 'Available', statusType: 'avail', detail: 'Monitored GST & Ring roads' },
  ],
  priorityActions: {
    'ST-CHE-01': { action: 'Restrict traffic · Deploy high-capacity pumps', reason: 'Severe marsh basin accumulation and blocked culvert outflow.' },
    'ST-CHE-02': { action: 'Prepare flood response evacuation', reason: 'High predicted depth in Mudichur riverine lowlands.' },
    'ST-CHE-03': { action: 'Stage canal monitoring unit', reason: 'Rising Adyar canal water levels and backflow risk.' },
    'ST-CHE-04': { action: 'Monitor traffic flow', reason: 'Moderate accumulation on T. Nagar commercial corridor.' },
    'ST-CHE-05': { action: 'Keep open with caution', reason: 'Elevated Guindy flyover maintaining clear transit.' }
  }
}

export default chennaiRegion
