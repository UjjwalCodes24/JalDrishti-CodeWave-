import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_REGION_ID, getRegionConfig, REGION_LIST, resolveRegionId } from '../data/regions'
import { RegionContext } from './RegionContextInstance'

const STORAGE_KEY = 'jaldrishti_selected_region'

export function RegionProvider({ children }) {
  const [selectedRegion, setSelectedRegionState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return resolveRegionId(saved)
      }
    } catch {
      // Ignore localStorage access errors
    }
    return DEFAULT_REGION_ID
  })

  const setSelectedRegion = (regionId) => {
    const validId = resolveRegionId(regionId)
    setSelectedRegionState(validId)
    try {
      localStorage.setItem(STORAGE_KEY, validId)
    } catch {
      // Ignore storage errors
    }
  }

  const currentRegion = useMemo(() => {
    return getRegionConfig(selectedRegion)
  }, [selectedRegion])

  // Sync document attribute for regional theming/testing
  useEffect(() => {
    document.documentElement.setAttribute('data-region', selectedRegion)
  }, [selectedRegion])

  const contextValue = useMemo(() => ({
    selectedRegion,
    setSelectedRegion,
    currentRegion,
    regions: REGION_LIST,
    isDemoMode: true
  }), [selectedRegion, currentRegion])

  return (
    <RegionContext.Provider value={contextValue}>
      {children}
    </RegionContext.Provider>
  )
}

export default RegionProvider


