import mumbaiRegion from './mumbai.js'
import delhiRegion from './delhi.js'
import chennaiRegion from './chennai.js'


export const REGIONS = {
  mumbai: mumbaiRegion,
  delhi: delhiRegion,
  chennai: chennaiRegion
}

export const REGION_LIST = [
  { id: 'mumbai', name: 'Mumbai Metropolitan Area', shortName: 'Mumbai', state: 'Maharashtra', isDefault: true },
  { id: 'delhi', name: 'Delhi NCR', shortName: 'Delhi', state: 'Delhi', isDefault: false },
  { id: 'chennai', name: 'Chennai Metropolitan Area', shortName: 'Chennai', state: 'Tamil Nadu', isDefault: false }
]

/**
 * Stable region IDs (aliases for the canonical lowercase slugs).
 * Consumers should prefer these constants over raw strings.
 */
export const REGION_IDS = {
  DELHI_NCR: 'delhi',
  DELHI: 'delhi',
  MUMBAI_MM: 'mumbai',
  MUMBAI: 'mumbai',
  CHENNAI_MM: 'chennai',
  CHENNAI: 'chennai',
}

export const DEFAULT_REGION_ID = 'mumbai'

// Neutral India-centric fallback used only when a region config omits its center.
export const NEUTRAL_MAP_CENTER = [20.5937, 78.9629]

const REGION_ALIASES = {
  mumbai: 'mumbai',
  'mumbai metropolitan area': 'mumbai',
  'mumbai mm': 'mumbai',
  'mumbai_mm': 'mumbai',
  mmr: 'mumbai',
  delhi: 'delhi',
  'delhi ncr': 'delhi',
  'delhi_ncr': 'delhi',
  'new delhi': 'delhi',
  ncr: 'delhi',
  chennai: 'chennai',
  'chennai metropolitan area': 'chennai',
  'chennai mm': 'chennai',
  'chennai_mm': 'chennai',
}

export function resolveRegionId(regionId = DEFAULT_REGION_ID) {
  if (regionId && typeof regionId === 'object') {
    return resolveRegionId(regionId.id || regionId.name || DEFAULT_REGION_ID)
  }

  const raw = String(regionId || DEFAULT_REGION_ID).trim().toLowerCase()
  if (REGIONS[raw]) return raw
  if (REGION_ALIASES[raw]) return REGION_ALIASES[raw]

  const listed = REGION_LIST.find(
    (region) => region.name.toLowerCase() === raw || region.shortName.toLowerCase() === raw,
  )
  return listed?.id || DEFAULT_REGION_ID
}

export function getRegionConfig(regionId = DEFAULT_REGION_ID) {
  return REGIONS[resolveRegionId(regionId)] || REGIONS[DEFAULT_REGION_ID]
}

export function getAllRegions() {
  return REGION_LIST
}

export { mumbaiRegion, delhiRegion, chennaiRegion }
