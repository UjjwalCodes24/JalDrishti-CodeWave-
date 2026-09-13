import { getRainfallSourceStatus } from '../../services/rainfallService'

export default function ConfidencePanel({ factors, regionId }) {
  const source = getRainfallSourceStatus(regionId)
  const quality = { 'Rainfall input quality': source.dataQuality, 'Terrain data coverage': 91, 'Drainage network coverage': 84, 'Model input completeness': Math.min(95, 70 + factors.length * 3) }
  const overall = Math.round(Object.values(quality).reduce((sum, value) => sum + value, 0) / Object.values(quality).length)
  return <div className="xai-confidence"><div className="xai-confidence-score"><span>DEMO DATA QUALITY</span><strong>{overall}%</strong></div>{Object.entries(quality).map(([label, value]) => <div className="xai-quality" key={label}><div><span>{label}</span><b>{value}%</b></div><i><em style={{ width: `${value}%` }} /></i></div>)}<p>Transparent prototype confidence based on available rainfall, terrain, drainage and model inputs. This is not a trained black-box model confidence score.</p></div>
}
