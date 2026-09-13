import { useContext } from 'react'
import { RegionContext } from './RegionContextInstance'
import { DEFAULT_REGION_ID, getRegionConfig, REGION_LIST } from '../data/regions'


export function useRegion() {
  const context = useContext(RegionContext)
  if (!context) {
    return {
      selectedRegion: DEFAULT_REGION_ID,
      setSelectedRegion: () => {},
      currentRegion: getRegionConfig(DEFAULT_REGION_ID),
      regions: REGION_LIST,
      isDemoMode: true
    }
  }
  return context
}

export default useRegion
