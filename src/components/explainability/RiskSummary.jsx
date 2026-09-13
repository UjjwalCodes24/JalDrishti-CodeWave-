import { RiskBadge } from '../ui'

export default function RiskSummary({ street, prediction, explanation, operationalExplanation }) {
  return <div className="xai-summary"><div><span className="eyebrow">SELECTED LOCATION · {street.terrain.name}</span><h2>{street.name}</h2><p className="xai-explanation">{explanation}</p><div className="xai-action"><span>RECOMMENDED OPERATIONAL ACTION</span><strong>{operationalExplanation}</strong></div></div><div className="xai-summary-stats"><div><span>PREDICTED FLOOD RISK</span><RiskBadge level={street.risk} /></div><div><span>PREDICTED WATER DEPTH</span><strong>{street.waterDepth} cm</strong></div><div><span>FORECAST HORIZON</span><strong>{prediction.time}</strong></div></div></div>
}
