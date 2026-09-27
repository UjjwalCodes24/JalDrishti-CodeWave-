import { useMemo } from 'react'
import { useRegion } from '../context/useRegion'
import { MODEL_METADATA, getFloodForecast } from '../services/floodEngine'
import { getRainfallDataSource } from '../services/dataSourceService'
import { PageHeader, Panel } from '../components/ui'

function StatusIndicator({ status, label }) {
  const colors = {
    operational: { bg: '#ecfdf5', color: '#15803d', dot: '#22c55e' },
    demo: { bg: '#fffbeb', color: '#92400e', dot: '#f59e0b' },
    loaded: { bg: '#ecfdf5', color: '#15803d', dot: '#22c55e' },
    available: { bg: '#eff6ff', color: '#1e40af', dot: '#3b82f6' },
    simulation: { bg: '#fffbeb', color: '#92400e', dot: '#f59e0b' },
  }
  const c = colors[status] || colors.demo
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '4px', background: c.bg, color: c.color, fontSize: '11px', fontWeight: 600 }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.dot }} />
      {label}
    </span>
  )
}

function DataModelStatusPage() {
  const { selectedRegion, currentRegion } = useRegion()
  const rainfallSource = getRainfallDataSource(selectedRegion)
  const forecast = useMemo(() => getFloodForecast(selectedRegion), [selectedRegion])
  const horizonMin = 0
  const horizonMax = forecast.length > 0 ? forecast[forecast.length - 1].offsetMinutes : 180
  const hasGoogleKey = Boolean(import.meta?.env?.VITE_GOOGLE_MAPS_API_KEY)

  const systemModules = [
    {
      name: 'RAINFALL INPUT',
      status: 'demo',
      statusLabel: 'Demonstration / simulated input',
      description: 'Simulated rainfall telemetry calibrated for urban monsoon stress conditions.',
      details: [
        { label: 'Provider', value: 'Demonstration / simulated input' },
        { label: 'Mode', value: rainfallSource.mode || 'Historical / Stress Simulation' },
        { label: 'Coverage', value: rainfallSource.radarCoverage || 'Regional Urban Extent' },
      ],
    },
    {
      name: 'TERRAIN',
      status: 'loaded',
      statusLabel: 'Terrain-derived spatial characteristics',
      description: 'Terrain-derived spatial characteristics including elevation, slope, and surface accumulation potential for each modelled street.',
      details: [
        { label: 'Zones', value: `${currentRegion?.terrain?.length || 0} terrain zones` },
        { label: 'Type', value: 'Elevation + slope-based accumulation' },
        { label: 'Resolution', value: 'Street-level aggregated' },
      ],
    },
    {
      name: 'DRAINAGE',
      status: 'loaded',
      statusLabel: 'Directed drainage graph',
      description: 'Directed stormwater drainage network graph with node capacities, edge flows, blockage modelling, surcharge and backflow propagation.',
      details: [
        { label: 'Nodes', value: `${currentRegion?.drainageNetwork?.nodes?.length || 0} junction nodes` },
        { label: 'Edges', value: `${currentRegion?.drainageNetwork?.edges?.length || 0} pipe segments` },
        { label: 'Blockage model', value: '58% effective cross-section reduction' },
      ],
    },
    {
      name: 'FLOOD MODEL',
      status: 'operational',
      statusLabel: 'Deterministic coupled model',
      description: `${MODEL_METADATA.name} (${MODEL_METADATA.version}) — coupled hydrological and hydraulic model computing street-level flood depth from rainfall, terrain runoff, and drainage capacity.`,
      details: [
        { label: 'Version', value: MODEL_METADATA.version },
        { label: 'Mode', value: 'Deterministic coupled model' },
        { label: 'Streets modelled', value: `${currentRegion?.streets?.length || 0} streets` },
      ],
    },
    {
      name: 'FORECAST HORIZON',
      status: 'operational',
      statusLabel: `${horizonMin}–${horizonMax} minutes`,
      description: `Predictive flood depth computed at discrete intervals spanning ${horizonMin} to ${horizonMax} minutes.`,
      details: [
        { label: 'Horizons', value: `${forecast.length} time steps` },
        { label: 'Range', value: `${horizonMin}–${horizonMax} minutes` },
        { label: 'Resolution', value: '30-minute intervals' },
      ],
    },
    {
      name: 'ROUTING',
      status: hasGoogleKey ? 'available' : 'simulation',
      statusLabel: 'Google Maps + JalDrishti flood exposure evaluation',
      description: 'Google Maps road network routing evaluated against JalDrishti flood depth, impassable segments, and surcharge exposure.',
      details: [
        { label: 'Road nodes', value: `${currentRegion?.roadNetwork?.nodes?.length || 0} nodes` },
        { label: 'Road links', value: `${currentRegion?.roadNetwork?.edges?.length || 0} links` },
        { label: 'Provider', value: hasGoogleKey ? 'Google Maps (API connected)' : 'JalDrishti Fallback Route Service' },
      ],
    },
    {
      name: 'VALIDATION',
      status: 'loaded',
      statusLabel: 'Prototype sanity checks',
      description: 'Physical bounding constraints, mass balance consistency, and spatial continuity checks applied across all time steps.',
      details: [
        { label: 'Integrity', value: 'Prototype sanity checks active' },
        { label: 'Constraints', value: 'Non-negative depth & flow limits' },
      ],
    },
    {
      name: 'REGION',
      status: 'loaded',
      statusLabel: currentRegion?.name || selectedRegion,
      description: `Active regional configuration for ${currentRegion?.name || selectedRegion}, governing rainfall profile, terrain zones, drainage network, and crisis corridors.`,
      details: [
        { label: 'Region', value: currentRegion?.name || selectedRegion },
        { label: 'State', value: currentRegion?.state || '—' },
        { label: 'Wards', value: `${currentRegion?.wards?.length || 0} wards` },
      ],
    },
    {
      name: 'MODEL STATUS',
      status: 'operational',
      statusLabel: 'Operational / Prototype',
      description: 'System is running in operational decision-support demonstration mode. Hydrological coupling and routing evaluation active.',
      details: [
        { label: 'Classification', value: 'Operational / Prototype' },
        { label: 'Evaluation', value: 'Automated coupled risk' },
        { label: 'Status', value: 'Active' },
      ],
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="SYSTEM TRANSPARENCY"
        title="Data & Model Status"
        description={`Technical architecture, data provenance, and component status for ${currentRegion?.name || 'the selected region'}.`}
        action={<StatusIndicator status="demo" label="PROTOTYPE / DEMONSTRATION" />}
      />

      {/* ── System Status Strip (Section 16) ── */}
      <div className="jd-system-status-strip">
        <div className="jd-status-strip-cell">
          <span className="jd-strip-label">SYSTEM STATUS</span>
          <span className="jd-strip-val ok">Operational (Prototype)</span>
        </div>
        <div className="jd-status-strip-cell">
          <span className="jd-strip-label">DATA INPUT</span>
          <span className="jd-strip-val demo">Available · Demonstration Data</span>
        </div>
        <div className="jd-status-strip-cell">
          <span className="jd-strip-label">FLOOD MODEL</span>
          <span className="jd-strip-val ok">Ready</span>
        </div>
        <div className="jd-status-strip-cell">
          <span className="jd-strip-label">MAP SERVICES</span>
          <span className="jd-strip-val ok">Available (Leaflet GIS)</span>
        </div>
        <div className="jd-status-strip-cell">
          <span className="jd-strip-label">ROUTING</span>
          <span className="jd-strip-val">{hasGoogleKey ? 'Available (Google Maps)' : 'Available (Fallback Routing)'}</span>
        </div>
      </div>

      {/* Pipeline overview */}
      <Panel style={{ marginBottom: '16px' }}>
        <div className="panel-heading" style={{ marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">FLOOD INTELLIGENCE PIPELINE</span>
            <h2 style={{ margin: '4px 0 0' }}>Model Processing Chain</h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>How JalDrishti converts rainfall into flood-impact intelligence.</p>
          </div>
        </div>
        <div className="jd-pipeline">
          {MODEL_METADATA.pipeline.map((step, i) => (
            <div key={i} className="jd-pipeline-step">
              <div className="jd-pipeline-step-num">{i + 1}</div>
              <div className="jd-pipeline-step-label">{step}</div>
              {i < MODEL_METADATA.pipeline.length - 1 && <div className="jd-pipeline-arrow">↓</div>}
            </div>
          ))}
        </div>
      </Panel>

      {/* Module status grid */}
      <div className="jd-status-grid">
        {systemModules.map((mod) => (
          <Panel key={mod.name} className="jd-status-module">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{mod.name}</h3>
              <StatusIndicator status={mod.status} label={mod.statusLabel} />
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>{mod.description}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {mod.details.map((d) => (
                <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>{d.label}</span>
                  <span style={{ color: '#1e293b', fontWeight: 600 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      {/* Model assumptions */}
      <Panel style={{ marginTop: '16px' }}>
        <div className="panel-heading" style={{ marginBottom: '12px' }}>
          <div>
            <span className="eyebrow">MODEL ASSUMPTIONS</span>
            <h2 style={{ margin: '4px 0 0' }}>Technical Basis</h2>
          </div>
        </div>
        <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {MODEL_METADATA.assumptions.map((a, i) => (
            <li key={i} style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>{a}</li>
          ))}
        </ul>
      </Panel>

      {/* Disclaimer */}
      <div className="jd-disclaimer" style={{ marginTop: '20px', padding: '12px 16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
        <strong style={{ color: '#475569' }}>JalDrishti</strong> — Urban Flood Intelligence & Decision Support System · Prototype / Demonstration System · Model outputs are intended for decision support and require operational verification before field deployment.
      </div>
    </>
  )
}

export default DataModelStatusPage
