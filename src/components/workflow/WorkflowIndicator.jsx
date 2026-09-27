import { Link } from 'react-router-dom'
import { useRegion } from '../../context/useRegion'

const WORKFLOW_STAGES = [
  { id: 'PREDICT', step: '01', name: 'PREDICT', label: 'Flood Nowcast', path: '/nowcast' },
  { id: 'IDENTIFY', step: '02', name: 'IDENTIFY', label: 'Risk Map', path: '/risk-map' },
  { id: 'EXPLAIN', step: '03', name: 'EXPLAIN', label: 'Risk Analysis', path: '/explainable-ai' },
  { id: 'ASSESS', step: '04', name: 'ASSESS', label: 'Interventions', path: '/explainable-ai' },
  { id: 'RESPOND', step: '05', name: 'RESPOND', label: 'Emergency Response', path: '/emergency-response' },
  { id: 'ROUTE', step: '06', name: 'ROUTE', label: 'Safe Routes', path: '/safe-routes' },
]

export default function WorkflowIndicator({ currentStage = 'PREDICT', className = '' }) {
  const { selectedStreetId, selectedHorizon } = useRegion()

  return (
    <div className={`jd-workflow-banner ${className}`}>
      <span className="jd-workflow-kicker">FLOOD INTELLIGENCE WORKFLOW</span>
      <div className="jd-workflow-stages" role="navigation" aria-label="Operational flood workflow">
        {WORKFLOW_STAGES.map((stage) => {
          const isActive = currentStage === stage.id
          const queryParams = new URLSearchParams()
          if (selectedStreetId) queryParams.set('street', selectedStreetId)
          if (selectedHorizon && selectedHorizon !== 'NOW') queryParams.set('horizon', selectedHorizon)
          const targetUrl = queryParams.toString() ? `${stage.path}?${queryParams.toString()}` : stage.path

          return (
            <Link
              key={stage.id}
              to={targetUrl}
              className={`jd-workflow-stage-pill ${isActive ? 'active' : ''}`}
              title={`${stage.step} ${stage.name} — ${stage.label}`}
            >
              <span className="stage-num">{stage.step}</span>
              <span className="stage-name">{stage.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
