export default function CausalFloodChain({ street, prediction }) {
  const drainage = prediction.drainage.nodes.find((node) => node.id === street.drainageNode)
  const runoff = Math.min(99, Math.round(street.runoffVolume / Math.max(prediction.intensity * 1.15, 1) * 100))
  const stages = [['RAIN FALL', `${prediction.intensity} mm/hr`], ['RUNOFF', `${runoff}% response`], ['TERRAIN / DEM', `${street.terrain.elevation} m · ${Math.round(street.terrain.accumulationPotential * 100)}% potential`], ['DRAINAGE UTILIZATION', `${Math.round((drainage?.utilization || prediction.drainage.utilization) * 100)}%`], ['BACKFLOW RISK', `${Math.round(prediction.drainage.backflowProbability * 100)}%`], ['PREDICTED DEPTH', `${street.waterDepth} cm`]]
  return <div className="causal-chain">{stages.map(([label, value], index) => <div className="causal-stage" key={label}><span>{label}</span><strong>{value}</strong>{index < stages.length - 1 && <i>↓</i>}</div>)}</div>
}
