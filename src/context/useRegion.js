import { useContext } from 'react'
import { RegionContext } from './RegionContextInstance'
import { DEFAULT_REGION_ID, getRegionConfig, REGION_LIST } from '../data/regions'

export function useRegion() {
  const context = useContext(RegionContext)
  if (!context) {
    const def = getRegionConfig(DEFAULT_REGION_ID)
    return {
      selectedRegion: DEFAULT_REGION_ID,
      setSelectedRegion: () => {},
      currentRegion: def,
      regions: REGION_LIST,
      isDemoMode: true,
      selectedHorizon: 'NOW',
      setSelectedHorizon: () => {},
      selectedStreetId: def?.primaryFocusStreet || '',
      setSelectedStreetId: () => {},
      setIncidentContext: () => {},
    }
  }
  return context
}

export default useRegion
