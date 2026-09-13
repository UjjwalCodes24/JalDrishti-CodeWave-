import { useMemo, useState } from 'react'
import { PageHeader, Panel } from '../components/ui'
import { useRegion } from '../context/useRegion'
import LocationSelector from '../components/explainability/LocationSelector'
import RiskSummary from '../components/explainability/RiskSummary'
import FactorContributionChart from '../components/explainability/FactorContributionChart'
import CausalFloodChain from '../components/explainability/CausalFloodChain'
import CounterfactualAnalysis from '../components/explainability/CounterfactualAnalysis'
import ConfidencePanel from '../components/explainability/ConfidencePanel'
import OperationalRecommendations from '../components/explainability/OperationalRecommendations'
import { getExplainabilityData } from '../services/explainabilityService'
import { getFloodForecast } from '../services/floodEngine'

function ExplainableAIPage() {
  const { selectedRegion, currentRegion } = useRegion()
  const forecast = useMemo(() => getFloodForecast(selectedRegion), [selectedRegion])
  const locations = useMemo(() => forecast[0]?.streets || [], [forecast])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedTime, setSelectedTime] = useState('NOW')

  const activeLocationId = locations.some((l) => l.id === selectedLocation)
    ? selectedLocation
    : locations[0]?.id || ''

  const analysis = useMemo(() => {
    return getExplainabilityData(activeLocationId, selectedTime, selectedRegion)
  }, [activeLocationId, selectedTime, selectedRegion])

  const contributionTotal = analysis.factors.reduce((sum, factor) => sum + factor.contribution, 0)

  return (
    <>
      <PageHeader
        eyebrow="MODEL TRANSPARENCY"
        title="WHY WILL IT FLOOD?"
        description={`Transparent analysis of the environmental and drainage factors driving flood predictions in ${currentRegion?.name || 'the selected region'}.`}
        action={<span className="prototype-label">DEMO MODE · EXPLAINABLE FLOOD MODEL</span>}
      />
      <Panel className="xai-selector-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Explain a model output</span>
            <h2>Choose a location and forecast horizon</h2>
            <p className="muted">Every value below is recalculated from the coupled flood engine.</p>
          </div>
          <span className="xai-total">Factors total · {contributionTotal}%</span>
        </div>
        <LocationSelector
          locations={locations}
          selectedLocation={activeLocationId}
          selectedTime={selectedTime}
          onLocationChange={setSelectedLocation}
          onTimeChange={setSelectedTime}
        />
      </Panel>

      <RiskSummary
        street={analysis.street}
        prediction={analysis.prediction}
        explanation={analysis.explanation}
        operationalExplanation={analysis.operationalExplanation}
      />
      <div className="xai-main-grid">
        <Panel className="xai-factors-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">RISK FACTOR CONTRIBUTION</span>
              <h2>What is driving the flood risk?</h2>
              <p className="muted">Normalized contribution scores from selected model inputs.</p>
            </div>
            <strong className="xai-score">{analysis.street.waterDepth}<small> cm</small></strong>
          </div>
          <FactorContributionChart factors={analysis.factors} />
        </Panel>
        <Panel className="xai-confidence-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PREDICTION CONFIDENCE</span>
              <h2>Input quality</h2>
            </div>
            <span className="prototype-label">DEMO / SIMULATED INPUT</span>
          </div>
          <ConfidencePanel factors={analysis.factors} regionId={selectedRegion} />
        </Panel>
      </div>
      <Panel className="xai-chain-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">CAUSAL FLOOD CHAIN · {analysis.prediction.time}</span>
            <h2>How the location reaches its predicted depth</h2>
          </div>
          <span className="muted">Cause → effect from model inputs</span>
        </div>
        <CausalFloodChain street={analysis.street} prediction={analysis.prediction} />
      </Panel>
      <div className="xai-main-grid">
        <Panel className="xai-counterfactual-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">COUNTERFACTUAL ANALYSIS</span>
              <h2>What would reduce the flood risk?</h2>
              <p className="muted">Simplified scenarios re-run the existing runoff, drainage and depth calculations.</p>
            </div>
          </div>
          <CounterfactualAnalysis counterfactuals={analysis.counterfactuals} />
        </Panel>
        <Panel className="xai-recommendation-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">OPERATIONAL RESPONSE</span>
              <h2>What should happen next?</h2>
            </div>
          </div>
          <OperationalRecommendations factors={analysis.factors} street={analysis.street} />
        </Panel>
      </div>
    </>
  )
}

export default ExplainableAIPage

