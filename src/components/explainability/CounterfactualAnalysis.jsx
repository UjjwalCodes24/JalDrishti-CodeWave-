export default function CounterfactualAnalysis({ counterfactuals }) {
  return <div className="counterfactual-list">{counterfactuals.map((scenario) => <div className="counterfactual" key={scenario.label}><div><strong>{scenario.label}</strong><span>{scenario.detail}</span></div><div className="counterfactual-depth"><b>{scenario.from} cm</b><i>→</i><strong>{scenario.to} cm</strong></div></div>)}</div>
}
