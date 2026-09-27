import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_REGION_ID, getRegionConfig, REGION_LIST, resolveRegionId } from '../data/regions'
import { RegionContext } from './RegionContextInstance'

const STORAGE_KEY = 'jaldrishti_selected_region'
const STORAGE_HORIZON_KEY = 'jaldrishti_selected_horizon'
const STORAGE_STREET_KEY = 'jaldrishti_selected_street'

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

  const [selectedHorizon, setSelectedHorizonState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HORIZON_KEY)
      if (saved) return saved
    } catch {
      // Ignore
    }
    return 'NOW'
  })

  const [selectedStreetId, setSelectedStreetIdState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STREET_KEY)
      if (saved) return saved
    } catch {
      // Ignore
    }
    const initialConfig = getRegionConfig(selectedRegion)
    return initialConfig?.primaryFocusStreet || initialConfig?.streets?.[0]?.id || ''
  })

  const currentRegion = useMemo(() => {
    return getRegionConfig(selectedRegion)
  }, [selectedRegion])

  // Ensure selected street belongs to current region, otherwise reset to region's primary street (Section 13)
  const effectiveStreetId = useMemo(() => {
    const streets = currentRegion?.streets || []
    if (selectedStreetId && streets.some((s) => s.id === selectedStreetId)) {
      return selectedStreetId
    }
    return currentRegion?.primaryFocusStreet || streets[0]?.id || ''
  }, [currentRegion, selectedStreetId])

  const setSelectedRegion = (regionId) => {
    const validId = resolveRegionId(regionId)
    setSelectedRegionState(validId)
    const newConfig = getRegionConfig(validId)
    const nextStreet = newConfig?.primaryFocusStreet || newConfig?.streets?.[0]?.id || ''
    setSelectedStreetIdState(nextStreet)
    try {
      localStorage.setItem(STORAGE_KEY, validId)
      localStorage.setItem(STORAGE_STREET_KEY, nextStreet)
    } catch {
      // Ignore storage errors
    }
  }

  const setSelectedHorizon = (horizon) => {
    const validHorizon = horizon || 'NOW'
    setSelectedHorizonState(validHorizon)
    try {
      localStorage.setItem(STORAGE_HORIZON_KEY, validHorizon)
    } catch {
      // Ignore
    }
  }

  const setSelectedStreetId = (streetId) => {
    setSelectedStreetIdState(streetId || '')
    try {
      if (streetId) {
        localStorage.setItem(STORAGE_STREET_KEY, streetId)
      } else {
        localStorage.removeItem(STORAGE_STREET_KEY)
      }
    } catch {
      // Ignore
    }
  }

  const setIncidentContext = ({ region, streetId, horizon }) => {
    if (region) setSelectedRegion(region)
    if (streetId) setSelectedStreetId(streetId)
    if (horizon) setSelectedHorizon(horizon)
  }

  // Sync document attribute for regional theming/testing
  useEffect(() => {
    document.documentElement.setAttribute('data-region', selectedRegion)
  }, [selectedRegion])

  const contextValue = useMemo(
    () => ({
      selectedRegion,
      setSelectedRegion,
      currentRegion,
      regions: REGION_LIST,
      isDemoMode: true,
      selectedHorizon,
      setSelectedHorizon,
      selectedStreetId: effectiveStreetId,
      setSelectedStreetId,
      setIncidentContext,
    }),
    [selectedRegion, currentRegion, selectedHorizon, effectiveStreetId]
  )

  return <RegionContext.Provider value={contextValue}>{children}</RegionContext.Provider>
}

export default RegionProvider
