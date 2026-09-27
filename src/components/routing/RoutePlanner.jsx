import { useState } from 'react'
import { Panel } from '../ui'
import { reverseGeocodeCoordinates } from '../../services/googleMapsRoutingService'

const REGION_LANDMARK_SUGGESTIONS = {
  delhi: [
    'Connaught Place',
    'AIIMS New Delhi',
    'Indira Gandhi Airport (DEL)',
    'ITO Junction',
    'Kashmiri Gate ISBT',
  ],
  mumbai: [
    'Mumbai Airport (BOM)',
    'Bandra Kurla Complex (BKC)',
    'Dadar TT Circle',
    'Bail Bazar Junction',
    'Marine Drive',
  ],
  chennai: [
    'Chennai Central (MAS)',
    'Marina Beach',
    'Chennai International Airport (MAA)',
    'T. Nagar',
    'Guindy Industrial Estate',
  ],
}

export default function RoutePlanner({
  locations = [],
  origin,
  destination,
  originCoords = null,
  isCurrentLocationActive = false,
  onOriginChange,
  onDestinationChange,
  onPresetSelect,
  onCalculate,
  loading,
  googleMapsAvailable,
  corridors = [],
  originPlaceholder = 'Enter starting location',
  destinationPlaceholder = 'Enter destination',
  regionName = 'the selected region',
  regionId = 'delhi',
}) {
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoStatus, setGeoStatus] = useState(null)
  const [geoError, setGeoError] = useState(null)

  const handleUseCurrentLocation = () => {
    setGeoError(null)
    setGeoStatus(null)

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Enter your starting point manually.')
      return
    }

    setGeoLoading(true)
    setGeoStatus('Requesting browser geolocation…')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false)
        const lat = Number(position.coords.latitude.toFixed(5))
        const lng = Number(position.coords.longitude.toFixed(5))
        const coords = { lat, lng }

        const friendlyLabel = `Current Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`
        setGeoStatus(`Location acquired: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`)
        if (onOriginChange) {
          onOriginChange(friendlyLabel, coords)
        }
      },
      (error) => {
        setGeoLoading(false)
        setGeoStatus(null)
        if (error.code === 1 /* PERMISSION_DENIED */) {
          setGeoError('Location access was not granted. Enter your starting point manually.')
        } else if (error.code === 2 /* POSITION_UNAVAILABLE */) {
          setGeoError('GPS position unavailable. Enter your starting point manually.')
        } else if (error.code === 3 /* TIMEOUT */) {
          setGeoError('Location request timed out. Enter your starting point manually.')
        } else {
          setGeoError('Current location is unavailable. Please select your starting point again.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    )
  }

  const handleClearLocation = () => {
    setGeoStatus(null)
    setGeoError(null)
    if (onOriginChange) {
      onOriginChange('', null)
    }
  }

  const handlePreset = (preset) => {
    setGeoStatus(null)
    setGeoError(null)
    if (onPresetSelect) {
      onPresetSelect(preset)
    } else {
      if (onOriginChange) onOriginChange(preset.origin, null)
      if (onDestinationChange) onDestinationChange(preset.destination, null)
      if (onCalculate) {
        setTimeout(() => onCalculate(preset.origin, preset.destination), 50)
      }
    }
  }

  const landmarkSuggestions = REGION_LANDMARK_SUGGESTIONS[regionId] || []

  return (
    <Panel className="route-planner" style={{ padding: '20px' }}>
      <div className="panel-heading" style={{ marginBottom: '16px' }}>
        <div>
          <span className="eyebrow" style={{ letterSpacing: '0.05em' }}>MUNICIPAL TRANSPORT & EVACUATION</span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0', color: '#0F233A' }}>
            FLOOD-SAFE ROUTING
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
            Dynamic Origin → Destination routing evaluated against predicted street-level flood depth and drainage surcharge.
          </p>
        </div>
        <div className="planner-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={() => onCalculate()}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              background: '#0F233A',
              color: '#FFFFFF',
              borderRadius: '4px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'EVALUATING FLOOD RISK…' : 'FIND FLOOD-SAFE ROUTE'}
          </button>
        </div>
      </div>

      {/* ── User Input: Origin & Destination Grid ── */}
      <div
        className="route-inputs-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
          padding: '16px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '6px',
        }}
      >
        {/* Origin Column */}
        <div className="input-group-col" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Starting point
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={loading || geoLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#0F233A',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                cursor: geoLoading ? 'wait' : 'pointer',
              }}
              title="Request browser GPS coordinates (explicit one-time request)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="22" y1="12" x2="18" y2="12" />
                <line x1="6" y1="12" x2="2" y2="12" />
                <line x1="12" y1="6" x2="12" y2="2" />
                <line x1="12" y1="22" x2="12" y2="18" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>{geoLoading ? 'Acquiring GPS…' : 'Use my current location'}</span>
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              list="jaldrishti-locations"
              value={origin}
              onChange={(e) => {
                setGeoStatus(null)
                setGeoError(null)
                onOriginChange(e.target.value, null)
              }}
              placeholder={originPlaceholder}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '13px',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                background: originCoords ? '#F0FDF4' : '#FFFFFF',
                color: '#1E293B',
                boxSizing: 'border-box',
              }}
            />
            {originCoords && (
              <button
                type="button"
                onClick={handleClearLocation}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title="Clear GPS coordinates and enter text"
              >
                Clear
              </button>
            )}
          </div>

          {/* Location Status or Error */}
          {(geoStatus || (isCurrentLocationActive && originCoords && typeof originCoords.lat === 'number' && typeof originCoords.lng === 'number')) && (
            <div style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
              <strong>
                {geoStatus || (originCoords && typeof originCoords.lat === 'number' ? `Location acquired: ${originCoords.lat.toFixed(4)}° N, ${originCoords.lng.toFixed(4)}° E` : '')}
              </strong>
            </div>
          )}
          {geoError && (
            <div style={{ fontSize: '11px', color: '#DC2626', background: '#FEF2F2', padding: '5px 8px', borderRadius: '4px', border: '1px solid #FECACA', marginTop: '2px' }}>
              {geoError}
            </div>
          )}
        </div>

        {/* Destination Column */}
        <div className="input-group-col" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Destination
          </label>
          <div style={{ position: 'relative' }}>
            <input
              list="jaldrishti-locations"
              value={destination}
              onChange={(e) => onDestinationChange(e.target.value, null)}
              placeholder={destinationPlaceholder}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '13px',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                background: '#FFFFFF',
                color: '#1E293B',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Quick Destination Suggestions */}
          {landmarkSuggestions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>QUICK:</span>
              {landmarkSuggestions.map((place) => (
                <button
                  key={place}
                  type="button"
                  onClick={() => onDestinationChange(place, null)}
                  style={{
                    background: destination === place ? '#0F233A' : '#FFFFFF',
                    color: destination === place ? '#FFFFFF' : '#334155',
                    border: '1px solid #CBD5E1',
                    borderRadius: '3px',
                    padding: '1px 6px',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  {place}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Datalist of Known Regional Road Nodes */}
      <datalist id="jaldrishti-locations">
        {locations.map((location) => (
          <option key={location.id || location.name} value={location.name} />
        ))}
      </datalist>

      {/* ── Crisis Corridors / Quick Preset Bar ── */}
      {corridors.length > 0 && (
        <div className="route-preset-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span className="preset-label" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em' }}>
            TESTED CRISIS CORRIDORS:
          </span>
          <div className="preset-chips" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {corridors.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`preset-chip ${origin === preset.origin && destination === preset.destination ? 'active' : ''}`}
                onClick={() => handlePreset(preset)}
                disabled={loading}
                style={{
                  padding: '4px 9px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: '1px solid #CBD5E1',
                  background: origin === preset.origin && destination === preset.destination ? '#0F233A' : '#FFFFFF',
                  color: origin === preset.origin && destination === preset.destination ? '#FFFFFF' : '#334155',
                  cursor: 'pointer',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Status & Privacy Footer ── */}
      <div
        className="route-planner-footer"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          paddingTop: '12px',
          borderTop: '1px solid #E2E8F0',
          fontSize: '11px',
          color: '#64748B',
        }}
      >
        <span
          className={`routing-engine-badge ${googleMapsAvailable ? 'google-active' : 'sim-active'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            color: '#1E293B',
          }}
        >
          <span
            className="status-dot"
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: googleMapsAvailable ? '#059669' : '#D97706',
            }}
          />
          {googleMapsAvailable ? 'Google Maps Routing Active' : 'JalDrishti Demonstration Route'}
        </span>
        <span style={{ fontSize: '11px', color: '#64748B' }}>
          Location privacy: Browser geolocation runs only upon clicking &lsquo;Use my current location&rsquo;. Continuous tracking is never enabled; coordinates are never saved.
        </span>
      </div>
    </Panel>
  )
}
