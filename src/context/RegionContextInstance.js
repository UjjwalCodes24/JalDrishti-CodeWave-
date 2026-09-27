import { createContext } from 'react'
import { DEFAULT_REGION_ID, getRegionConfig, REGION_LIST } from '../data/regions'

export const RegionContext = createContext({
  selectedRegion: DEFAULT_REGION_ID,
  setSelectedRegion: () => {},
  currentRegion: getRegionConfig(DEFAULT_REGION_ID),
  regions: REGION_LIST,
  isDemoMode: true,
  selectedHorizon: 'NOW',
  setSelectedHorizon: () => {},
  selectedStreetId: '',
  setSelectedStreetId: () => {},
  setIncidentContext: () => {},
})

export default RegionContext
