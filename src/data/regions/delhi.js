/**
 * Delhi NCR - Demonstration Region Configuration
 * Prototype scenario representing low-lying underpasses, Yamuna floodplain runoff, and trunk drainage stress.
 */
export const delhiRegion = {
  id: 'delhi',
  name: 'Delhi NCR',
  shortName: 'Delhi',
  state: 'Delhi',
  kicker: 'URBAN FLOOD MONITORING',
  subtitle: 'Monitor rainfall, drainage conditions and flood risk across Delhi NCR.',
  center: [28.6139, 77.2090],
  zoom: 11,
  primaryFocusStreet: 'ST-DEL-01',
  defaultOrigin: 'Minto Bridge',
  defaultDestination: 'AIIMS',
  geocodeSuffix: 'New Delhi, Delhi, India',
  crisisCorridors: [
    { label: 'Minto Bridge ➔ AIIMS', origin: 'Minto Bridge', destination: 'AIIMS' },
    { label: 'Dhaula Kuan ➔ AIIMS', origin: 'Dhaula Kuan', destination: 'AIIMS' },
    { label: 'ITO ➔ India Gate', origin: 'ITO Junction', destination: 'India Gate' },
    { label: 'Sarai Kale Khan ➔ Ashram', origin: 'Sarai Kale Khan', destination: 'Ashram' },
  ],
  wardCoordinates: {
    'W-DEL-01': [28.6328, 77.2197],
    'W-DEL-02': [28.6675, 77.2285],
    'W-DEL-03': [28.6289, 77.2482],
    'W-DEL-04': [28.5135, 77.2882],
    'W-DEL-05': [28.5983, 77.1878]
  },
  wards: [
    { id: 'W-DEL-01', name: 'Ward 12', area: 'Central Delhi / Connaught & Minto', risk: 85, rainfall: 58, drainage: 36, status: 'Critical' },
    { id: 'W-DEL-02', name: 'Ward 04', area: 'North Delhi / Kashmere Gate & ISBT', risk: 74, rainfall: 50, drainage: 48, status: 'High' },
    { id: 'W-DEL-03', name: 'Ward 19', area: 'East Delhi / ITO & Vikas Marg', risk: 68, rainfall: 44, drainage: 54, status: 'High' },
    { id: 'W-DEL-04', name: 'Ward 28', area: 'South Delhi / Pul Prahladpur', risk: 58, rainfall: 38, drainage: 62, status: 'Moderate' },
    { id: 'W-DEL-05', name: 'Ward 01', area: 'New Delhi / Chanakyapuri Ridge', risk: 18, rainfall: 16, drainage: 90, status: 'Low' }
  ],
  streets: [
    { id: 'ST-DEL-01', name: 'Minto Bridge Underpass', latitude: 28.6392, longitude: 77.2246, terrainZone: 'T-DEL-01', drainageNode: 'MH-MNT-01', currentWaterDepth: 9, predictedWaterDepth: 0 },
    { id: 'ST-DEL-02', name: 'ITO Junction / Vikas Marg', latitude: 28.6295, longitude: 77.2473, terrainZone: 'T-DEL-02', drainageNode: 'MH-ITO-01', currentWaterDepth: 7, predictedWaterDepth: 0 },
    { id: 'ST-DEL-03', name: 'Pul Prahladpur Underpass', latitude: 28.5135, longitude: 77.2882, terrainZone: 'T-DEL-01', drainageNode: 'MH-PUL-01', currentWaterDepth: 5, predictedWaterDepth: 0 },
    { id: 'ST-DEL-04', name: 'Kashmere Gate ISBT Ring Road', latitude: 28.6678, longitude: 77.2291, terrainZone: 'T-DEL-03', drainageNode: 'J-YAM-01', currentWaterDepth: 4, predictedWaterDepth: 0 },
    { id: 'ST-DEL-05', name: 'AIIMS Ring Road Flyover', latitude: 28.5672, longitude: 77.2100, terrainZone: 'T-DEL-04', drainageNode: 'OUT-YAM-01', currentWaterDepth: 1, predictedWaterDepth: 0 },
    { id: 'ST-DEL-06', name: 'Dhaula Kuan Underpass', latitude: 28.5956, longitude: 77.1613, terrainZone: 'T-DEL-03', drainageNode: 'MH-ITO-01', currentWaterDepth: 6, predictedWaterDepth: 0 },
    { id: 'ST-DEL-07', name: 'Moolchand Flyover Sump', latitude: 28.5674, longitude: 77.2345, terrainZone: 'T-DEL-01', drainageNode: 'MH-PUL-01', currentWaterDepth: 8, predictedWaterDepth: 0 },
    { id: 'ST-DEL-08', name: 'Zakhira Flyover', latitude: 28.6665, longitude: 77.1668, terrainZone: 'T-DEL-03', drainageNode: 'J-YAM-01', currentWaterDepth: 5, predictedWaterDepth: 0 }
  ],
  terrain: [
    { id: 'T-DEL-01', name: 'Minto Railway Sump Depression', latitude: 28.6392, longitude: 77.2246, elevation: 3.5, slope: 0.6, flowDirection: 'east', terrainType: 'low-lying', accumulationPotential: 0.94 },
    { id: 'T-DEL-02', name: 'ITO Yamuna Lowland', latitude: 28.6295, longitude: 77.2473, elevation: 5.2, slope: 1.0, flowDirection: 'east', terrainType: 'low-lying', accumulationPotential: 0.86 },
    { id: 'T-DEL-03', name: 'Kashmere Gate Floodplain Transition', latitude: 28.6678, longitude: 77.2291, elevation: 8.4, slope: 2.1, flowDirection: 'south', terrainType: 'moderate', accumulationPotential: 0.58 },
    { id: 'T-DEL-04', name: 'South Delhi Shoulder', latitude: 28.5672, longitude: 77.2100, elevation: 14.8, slope: 4.2, flowDirection: 'north', terrainType: 'moderate', accumulationPotential: 0.32 },
    { id: 'T-DEL-05', name: 'Delhi Ridge High Ground', latitude: 28.5983, longitude: 77.1878, elevation: 22.5, slope: 6.8, flowDirection: 'northeast', terrainType: 'higher', accumulationPotential: 0.16 }
  ],
  drainageNetwork: {
    area: 'Central Delhi and Yamuna Outfall demonstration zone',
    nodes: [
      { id: 'MH-MNT-01', name: 'Minto Sump Inlet', lat: 28.6392, lng: 77.2246, type: 'drainage inlet', capacity: 54, currentLoad: 38, status: 'watch' },
      { id: 'MH-ITO-01', name: 'ITO Trunk Manhole', lat: 28.6295, lng: 77.2473, type: 'manhole', capacity: 48, currentLoad: 37, status: 'watch' },
      { id: 'MH-PUL-01', name: 'Pul Prahladpur Sump', lat: 28.5135, lng: 77.2882, type: 'drainage inlet', capacity: 50, currentLoad: 35, status: 'normal' },
      { id: 'J-YAM-01', name: 'Barapullah Trunk Junction', lat: 28.5855, lng: 77.2510, type: 'junction', capacity: 76, currentLoad: 50, status: 'normal' },
      { id: 'OUT-YAM-01', name: 'Yamuna River Outfall', lat: 28.6010, lng: 77.2620, type: 'junction', capacity: 96, currentLoad: 56, status: 'normal' }
    ],
    edges: [
      { id: 'P-MNT-01', source: 'MH-MNT-01', target: 'J-YAM-01', length: 950, diameter: 1.2, hydraulicCapacity: 42, currentFlow: 34, blocked: true },
      { id: 'P-ITO-01', source: 'MH-ITO-01', target: 'J-YAM-01', length: 720, diameter: 1.1, hydraulicCapacity: 46, currentFlow: 36, blocked: false },
      { id: 'P-PUL-01', source: 'MH-PUL-01', target: 'J-YAM-01', length: 1200, diameter: 1.3, hydraulicCapacity: 52, currentFlow: 32, blocked: false },
      { id: 'C-YAM-01', source: 'J-YAM-01', target: 'OUT-YAM-01', length: 1420, diameter: 1.8, hydraulicCapacity: 88, currentFlow: 46, blocked: false }
    ]
  },
  rainfall: {
    area: 'Delhi NCR demonstration zone',
    mode: 'DEMO MODE',
    source: 'SIMULATED DATA',
    sourceProfile: {
      provider: 'IMD / Delhi Doppler Radar (Simulated)',
      connection: 'fallback',
      lastObservation: '2026-09-06T14:20:00+05:30',
      dataQuality: 82,
      radarCoverage: 70,
      stationCoverage: 48,
      observationWindow: 'Last 60 minutes'
    },
    observations: [
      { time: '-60 MIN', intensity: 26, quality: 76 },
      { time: '-30 MIN', intensity: 32, quality: 78 },
      { time: 'NOW', intensity: 38, quality: 82 }
    ],
    forecast: [
      { time: 'NOW', offsetMinutes: 0, intensity: 38, accumulated: 0, confidence: 88 },
      { time: '+30 MIN', offsetMinutes: 30, intensity: 48, accumulated: 19, confidence: 85 },
      { time: '+60 MIN', offsetMinutes: 60, intensity: 66, accumulated: 47, confidence: 82 },
      { time: '+90 MIN', offsetMinutes: 90, intensity: 78, accumulated: 84, confidence: 79 },
      { time: '+120 MIN', offsetMinutes: 120, intensity: 52, accumulated: 114, confidence: 75 },
      { time: '+180 MIN', offsetMinutes: 180, intensity: 28, accumulated: 148, confidence: 71 }
    ]
  },
  roadNetwork: {
    area: 'Delhi NCR Road Network',
    nodes: [
      { id: 'MINTO', name: 'Minto Bridge', latitude: 28.6392, longitude: 77.2246, elevation: 3.5, terrainType: 'low-lying' },
      { id: 'DHAULA_KUAN', name: 'Dhaula Kuan', latitude: 28.5956, longitude: 77.1613, elevation: 8.8, terrainType: 'moderate' },
      { id: 'ITO', name: 'ITO Junction', latitude: 28.6295, longitude: 77.2473, elevation: 5.2, terrainType: 'low-lying' },
      { id: 'INDIA_GATE', name: 'India Gate', latitude: 28.6129, longitude: 77.2295, elevation: 11.2, terrainType: 'moderate' },
      { id: 'CONNAUGHT', name: 'Connaught Place', latitude: 28.6328, longitude: 77.2197, elevation: 9.8, terrainType: 'moderate' },
      { id: 'AIIMS', name: 'AIIMS', latitude: 28.5672, longitude: 77.2100, elevation: 14.8, terrainType: 'moderate' },
      { id: 'SARAI_KALE_KHAN', name: 'Sarai Kale Khan', latitude: 28.5889, longitude: 77.2578, elevation: 6.4, terrainType: 'low-lying' },
      { id: 'ASHRAM', name: 'Ashram', latitude: 28.5726, longitude: 77.2585, elevation: 7.1, terrainType: 'moderate' },
      { id: 'MOOLCHAND', name: 'Moolchand', latitude: 28.5674, longitude: 77.2345, elevation: 9.4, terrainType: 'low-lying' },
      { id: 'ZAKHIRA', name: 'Zakhira', latitude: 28.6665, longitude: 77.1668, elevation: 8.1, terrainType: 'moderate' },
      { id: 'KASHMERE_GATE', name: 'Kashmere Gate', latitude: 28.6678, longitude: 77.2291, elevation: 8.4, terrainType: 'moderate' },
      { id: 'LAJPAT_NAGAR', name: 'Lajpat Nagar', latitude: 28.5700, longitude: 77.2430, elevation: 12.0, terrainType: 'moderate' }
    ],
    edges: [
      { id: 'R-DEL-01', from: 'MINTO', to: 'CONNAUGHT', source: 'MINTO', target: 'CONNAUGHT', name: 'Deen Dayal Upadhyaya Marg', distance: 1.4, baseTimeMin: 4, travelTime: 4, floodStreetId: 'ST-DEL-01', floodFactor: 0.35, baseDepth: 8 },
      { id: 'R-DEL-02', from: 'CONNAUGHT', to: 'ITO', source: 'CONNAUGHT', target: 'ITO', name: 'Barakhamba Road Link', distance: 2.2, baseTimeMin: 6, travelTime: 6, floodStreetId: 'ST-DEL-02', floodFactor: 0.18, baseDepth: 4 },
      { id: 'R-DEL-03', from: 'ITO', to: 'INDIA_GATE', source: 'ITO', target: 'INDIA_GATE', name: 'Tilak Marg / India Gate Approach', distance: 2.4, baseTimeMin: 7, travelTime: 7, floodStreetId: 'ST-DEL-02', floodFactor: 0.12, baseDepth: 3 },
      { id: 'R-DEL-04', from: 'CONNAUGHT', to: 'INDIA_GATE', source: 'CONNAUGHT', target: 'INDIA_GATE', name: 'Rajpath Demonstration Corridor', distance: 2.1, baseTimeMin: 6, travelTime: 6, floodStreetId: 'ST-DEL-05', floodFactor: 0.04, baseDepth: 1 },
      { id: 'R-DEL-05', from: 'CONNAUGHT', to: 'AIIMS', source: 'CONNAUGHT', target: 'AIIMS', name: 'Aurobindo Marg Safe Corridor', distance: 7.2, baseTimeMin: 16, travelTime: 16, floodStreetId: 'ST-DEL-05', floodFactor: 0.05, baseDepth: 1 },
      { id: 'R-DEL-06', from: 'MINTO', to: 'ITO', source: 'MINTO', target: 'ITO', name: 'Mahatma Gandhi Road Underpass', distance: 2.8, baseTimeMin: 8, travelTime: 8, floodStreetId: 'ST-DEL-01', floodFactor: 0.42, baseDepth: 9 },
      { id: 'R-DEL-07', from: 'ITO', to: 'MOOLCHAND', source: 'ITO', target: 'MOOLCHAND', name: 'Mathura Road / Ring Road', distance: 5.6, baseTimeMin: 13, travelTime: 13, floodStreetId: 'ST-DEL-07', floodFactor: 0.28, baseDepth: 6 },
      { id: 'R-DEL-08', from: 'MOOLCHAND', to: 'AIIMS', source: 'MOOLCHAND', target: 'AIIMS', name: 'Inner Ring Road AIIMS Approach', distance: 2.6, baseTimeMin: 8, travelTime: 8, floodStreetId: 'ST-DEL-07', floodFactor: 0.22, baseDepth: 5 },
      { id: 'R-DEL-09', from: 'DHAULA_KUAN', to: 'AIIMS', source: 'DHAULA_KUAN', target: 'AIIMS', name: 'Ring Road West to AIIMS', distance: 6.4, baseTimeMin: 14, travelTime: 14, floodStreetId: 'ST-DEL-05', floodFactor: 0.06, baseDepth: 2 },
      { id: 'R-DEL-10', from: 'DHAULA_KUAN', to: 'CONNAUGHT', source: 'DHAULA_KUAN', target: 'CONNAUGHT', name: 'SP Marg / Ridge Road', distance: 5.8, baseTimeMin: 13, travelTime: 13, floodStreetId: 'ST-DEL-06', floodFactor: 0.16, baseDepth: 4 },
      { id: 'R-DEL-11', from: 'SARAI_KALE_KHAN', to: 'ASHRAM', source: 'SARAI_KALE_KHAN', target: 'ASHRAM', name: 'Ring Road East / Ashram Link', distance: 2.1, baseTimeMin: 6, travelTime: 6, floodStreetId: 'ST-DEL-02', floodFactor: 0.2, baseDepth: 5 },
      { id: 'R-DEL-12', from: 'SARAI_KALE_KHAN', to: 'ITO', source: 'SARAI_KALE_KHAN', target: 'ITO', name: 'Vikas Marg Connector', distance: 3.4, baseTimeMin: 9, travelTime: 9, floodStreetId: 'ST-DEL-02', floodFactor: 0.24, baseDepth: 6 },
      { id: 'R-DEL-13', from: 'ASHRAM', to: 'MOOLCHAND', source: 'ASHRAM', target: 'MOOLCHAND', name: 'Lala Lajpat Rai Road', distance: 2.8, baseTimeMin: 8, travelTime: 8, floodStreetId: 'ST-DEL-07', floodFactor: 0.18, baseDepth: 4 },
      { id: 'R-DEL-14', from: 'ZAKHIRA', to: 'DHAULA_KUAN', source: 'ZAKHIRA', target: 'DHAULA_KUAN', name: 'Ring Road North-West', distance: 8.2, baseTimeMin: 18, travelTime: 18, floodStreetId: 'ST-DEL-08', floodFactor: 0.2, baseDepth: 5 },
      { id: 'R-DEL-15', from: 'ZAKHIRA', to: 'KASHMERE_GATE', source: 'ZAKHIRA', target: 'KASHMERE_GATE', name: 'Boulevard Road Link', distance: 6.1, baseTimeMin: 14, travelTime: 14, floodStreetId: 'ST-DEL-04', floodFactor: 0.14, baseDepth: 3 },
      { id: 'R-DEL-16', from: 'KASHMERE_GATE', to: 'MINTO', source: 'KASHMERE_GATE', target: 'MINTO', name: 'Netaji Subhash Marg', distance: 4.6, baseTimeMin: 11, travelTime: 11, floodStreetId: 'ST-DEL-04', floodFactor: 0.16, baseDepth: 4 },
      { id: 'R-DEL-17', from: 'LAJPAT_NAGAR', to: 'AIIMS', source: 'LAJPAT_NAGAR', target: 'AIIMS', name: 'South Ring Road', distance: 3.8, baseTimeMin: 8, travelTime: 8, floodStreetId: 'ST-DEL-05', floodFactor: 0.05, baseDepth: 1 },
      { id: 'R-DEL-18', from: 'ITO', to: 'LAJPAT_NAGAR', source: 'ITO', target: 'LAJPAT_NAGAR', name: 'Mathura Road Corridor', distance: 6.5, baseTimeMin: 14, travelTime: 14, floodStreetId: 'ST-DEL-02', floodFactor: 0.2, baseDepth: 5 }
    ]
  },
  emergencyResponse: {
    area: 'Delhi NCR Response Grid',
    teamLocations: [
      { id: 'T-DEL-ALPHA', name: 'Delhi Central Dewatering Unit', latitude: 28.6360, longitude: 77.2220, assignment: 'Minto Underpass', status: 'AVAILABLE' },
      { id: 'T-DEL-BRAVO', name: 'ITO Traffic Diversion Team', latitude: 28.6280, longitude: 77.2450, assignment: 'ITO Junction', status: 'AVAILABLE' },
      { id: 'T-DEL-CHARLIE', name: 'South Delhi Quick Response', latitude: 28.5650, longitude: 77.2120, assignment: 'Ring Road AIIMS', status: 'AVAILABLE' }
    ],
    resources: [
      { id: 'PUMP-DEL-01', type: 'Heavy Dewatering Pumps', available: 5, status: 'AVAILABLE', assignment: 'Minto & Pul Prahladpur' },
      { id: 'TRAF-DEL-02', type: 'Traffic Diversion Units', available: 8, status: 'AVAILABLE', assignment: 'Central Arterials' },
      { id: 'RESCUE-DEL-03', type: 'Quick Response Rescue Vans', available: 4, status: 'AVAILABLE', assignment: 'Staged for Dispatch' }
    ]
  },
  floodPredictions: {
    mode: 'DEMO MODE',
    source: 'SIMULATED DATA',
    riskThresholds: { moderate: 10, high: 25, critical: 45 }
  },
  dataSources: [
    { name: 'IMD Delhi Rainfall', status: 'Demo data', statusType: 'demo', detail: 'Rainfall observations' },
    { name: 'Delhi Doppler Radar', status: 'Simulation', statusType: 'sim', detail: 'Radar precipitation input' },
    { name: 'DEM Terrain Grid', status: 'Loaded', statusType: 'loaded', detail: '3 m DEM elevation' },
    { name: 'Trunk Drainage Network', status: 'Loaded', statusType: 'loaded', detail: 'Barapullah & Najafgarh nodes' },
    { name: 'AI Nowcast', status: 'Available', statusType: 'avail', detail: '0–3 hour forecast' },
    { name: 'Safe Routes', status: 'Available', statusType: 'avail', detail: 'Delhi arterial corridors' },
  ],
  priorityActions: {
    'ST-DEL-01': { action: 'Close underpass · Deploy sump pumps', reason: 'Critical water accumulation in Minto railway depression.' },
    'ST-DEL-02': { action: 'Activate traffic diversion', reason: 'High predicted runoff near Yamuna floodplain approach.' },
    'ST-DEL-03': { action: 'Prepare emergency pumps', reason: 'High surcharge risk in Pul Prahladpur underpass.' },
    'ST-DEL-04': { action: 'Monitor traffic flow', reason: 'Moderate accumulation on Kashmere Gate ring road.' },
    'ST-DEL-05': { action: 'Keep open with caution', reason: 'Elevated flyover corridor with active discharge.' }
  }
}

export default delhiRegion
