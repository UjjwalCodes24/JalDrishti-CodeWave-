import { getRainfallSourceStatus } from '../../services/rainfallService'

export default function ConfidencePanel({ factors, regionId }) {
  const source = getRainfallSourceStatus(regionId)
  const quality = {
    'Rainfall input quality': source.dataQuality,
    'Terrain data coverage': 91,
    'Drainage network coverage': 84,
    'Model input completeness': Math.min(95, 70 + factors.length * 3)
  }

  return (
    <div className="xai-confidence">
      {Object.entries(quality).map(([label, value]) => (
        <div className="xai-quality" key={label}>
          <div>
            <span>{label}</span>
            <b>{value}%</b>
          </div>
          <i><em style={{ width: `${value}%` }} /></i>
        </div>
      ))}
      <p>Input quality indicators describe prototype data completeness and coverage; they are not prediction accuracy metrics.</p>
    </div>
  )
}
