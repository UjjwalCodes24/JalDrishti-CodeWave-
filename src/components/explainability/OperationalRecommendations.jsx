export default function OperationalRecommendations({ factors, street }) {
  const recommendations = []
  if (street.waterDepth >= 30) recommendations.push('Restrict vehicle access and activate emergency response planning.')
  if (factors.some((factor) => factor.id === 'drainage' || factor.id === 'blockage')) recommendations.push('Deploy drainage maintenance teams to overloaded nodes and inspect blocked edges.')
  if (factors[0]?.id === 'rainfall' || factors[0]?.id === 'runoff') recommendations.push('Prepare traffic restrictions before the predicted rainfall peak.')
  if (factors.some((factor) => factor.id === 'backflow' && factor.normalized >= .7)) recommendations.push('Inspect and clear the affected drainage junction immediately.')
  return <div className="recommendation-list">{recommendations.slice(0, 3).map((recommendation, index) => <div key={recommendation}><span>0{index + 1}</span><strong>{recommendation}</strong></div>)}</div>
}
