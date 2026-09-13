import { calculateDrainageStatus, getDrainageNetwork } from './drainageService.js'
import { calculateSurfaceRunoff } from './terrainService.js'
import { calculateWaterDepth, getFloodPrediction } from './floodEngine.js'


const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const percent = (value) => Math.round(value * 100)

function getLocationDrainage(street, prediction) {
  const baseNetwork = getDrainageNetwork(prediction.regionId || 'mumbai')
  const node = prediction.drainage.nodes.find((item) => item.id === street.drainageNode)
  const relatedEdges = prediction.drainage.edges.filter((edge) => edge.source === street.drainageNode || edge.target === street.drainageNode)
  const blockedEdges = relatedEdges.filter((edge) => baseNetwork.edges.find((base) => base.id === edge.id)?.blocked)
  return { node, relatedEdges, blockedEdges }
}

export function normalizeRiskFactors(street, prediction) {
  const drainage = getLocationDrainage(street, prediction)
  const values = {
    rainfall: clamp(prediction.intensity / 80),
    runoff: clamp(street.runoffVolume / Math.max(prediction.intensity * 1.15, 1)),
    elevation: clamp(1 - street.terrain.elevation / 20),
    accumulation: clamp(street.terrain.accumulationPotential),
    drainage: clamp(drainage.node?.utilization || prediction.drainage.utilization),
    blockage: clamp((drainage.blockedEdges.length / Math.max(drainage.relatedEdges.length, 1)) + (prediction.drainage.overloadedEdges.length / Math.max(prediction.drainage.edges.length, 1)) * 0.6),
    backflow: clamp(prediction.drainage.backflowProbability),
  }
  return values
}

export function calculateFactorContributions(street, prediction) {
  const values = normalizeRiskFactors(street, prediction)
  const definitions = [
    { id: 'rainfall', label: 'Rainfall intensity', icon: '🌧', value: `${prediction.intensity} mm/hr`, weight: 1.15 },
    { id: 'runoff', label: 'Surface runoff', icon: '🏙', value: `${Math.round(values.runoff * 100)}% response`, weight: 1 },
    { id: 'elevation', label: 'Low elevation', icon: '⛰', value: `${street.terrain.elevation} m`, weight: .8 },
    { id: 'accumulation', label: 'Slope / accumulation', icon: '📐', value: `${Math.round(values.accumulation * 100)}% potential`, weight: .85 },
    { id: 'drainage', label: 'Drainage utilization', icon: '🚇', value: `${Math.round(values.drainage * 100)}% utilization`, weight: 1.2 },
    { id: 'blockage', label: 'Blockage / overload', icon: '⚠', value: `${getLocationDrainage(street, prediction).blockedEdges.length} blocked local edges`, weight: 1 },
    { id: 'backflow', label: 'Backflow risk', icon: '🌊', value: `${percent(values.backflow)} probability`, weight: .95 },
  ]
  const total = definitions.reduce((sum, factor) => sum + values[factor.id] * factor.weight, 0) || 1
  const calculated = definitions.map((factor) => ({ ...factor, normalized: values[factor.id], contribution: Math.round(values[factor.id] * factor.weight / total * 100) })).sort((a, b) => b.contribution - a.contribution)
  const correction = 100 - calculated.reduce((sum, factor) => sum + factor.contribution, 0)
  return calculated.map((factor, index) => {
    const contribution = index === 0 ? factor.contribution + correction : factor.contribution
    const impact = contribution >= 22 ? 'CRITICAL IMPACT' : contribution >= 14 ? 'HIGH IMPACT' : contribution >= 8 ? 'MODERATE IMPACT' : 'LOW IMPACT'
    return { ...factor, contribution, impact }
  })
}

export function generateFloodExplanation(street, prediction, factors) {
  const top = factors.slice(0, 3).map((factor) => factor.label.toLowerCase())
  const terrainPhrase = street.terrain.elevation <= 8 ? 'low-lying terrain increases water accumulation' : 'higher terrain reduces surface accumulation'
  const drainagePhrase = prediction.drainage.backflowProbability >= .7 ? 'drainage surcharge also raises the probability of backflow' : 'drainage conditions provide some flow relief'
  return `${street.name} is predicted at ${street.waterDepth} cm for ${prediction.time}. The strongest drivers are ${top[0]}, ${top[1]}, and ${top[2]}; ${terrainPhrase}, while ${drainagePhrase}.`
}

export function generateOperationalExplanation(street, prediction, factors) {
  const top = factors[0]
  if (street.waterDepth >= 30) return 'Restrict vehicle access and activate emergency response planning before the forecast horizon.'
  if (prediction.drainage.backflowProbability >= .7) return 'Inspect and clear the affected drainage junction immediately; prepare for backflow.'
  if (top.id === 'rainfall' || top.id === 'runoff') return 'Prepare traffic restrictions and monitor low-lying approaches before rainfall intensifies.'
  if (top.id === 'drainage' || top.id === 'blockage') return 'Deploy drainage maintenance teams to overloaded nodes and inspect blocked edges.'
  return 'Maintain normal monitoring and review the next forecast horizon for changes.'
}

function simulateDepth(street, intensity, drainageAdjustment = {}, regionId = 'mumbai') {
  const runoff = calculateSurfaceRunoff(intensity, street.terrain)
  const drainage = calculateDrainageStatus(intensity, runoff, regionId)
  const adjustedDrainage = { ...drainage, surchargeRisk: drainage.surchargeRisk * (drainageAdjustment.surcharge ?? 1), backflowProbability: drainage.backflowProbability * (drainageAdjustment.backflow ?? 1) }
  return calculateWaterDepth(runoff, street.terrain, adjustedDrainage)
}

export function simulateRainfallReduction(street, prediction) {
  const depth = simulateDepth(street, prediction.intensity * .7, {}, prediction.regionId)
  return { label: 'Rainfall intensity decreases by 30%', from: street.waterDepth, to: depth, detail: `${prediction.intensity} to ${Number((prediction.intensity * .7).toFixed(1))} mm/hr` }
}

export function simulateDrainageImprovement(street, prediction) {
  const depth = simulateDepth(street, prediction.intensity, { surcharge: .75, backflow: .75 }, prediction.regionId)
  return { label: 'Drainage capacity improves by 25%', from: street.waterDepth, to: depth, detail: 'Reduced surcharge and improved hydraulic headroom' }
}

export function simulateBlockageRemoval(street, prediction) {
  const drainage = getLocationDrainage(street, prediction)
  const depth = simulateDepth(street, prediction.intensity, { surcharge: drainage.blockedEdges.length ? .7 : .9, backflow: drainage.blockedEdges.length ? .55 : .82 }, prediction.regionId)
  const fromBackflow = percent(prediction.drainage.backflowProbability)
  const toBackflow = Math.round(fromBackflow * (drainage.blockedEdges.length ? .55 : .82))
  return { label: drainage.blockedEdges.length ? 'Blocked drainage edge is cleared' : 'Local drainage obstruction is reduced', from: street.waterDepth, to: depth, detail: `Backflow probability ${fromBackflow}% to ${toBackflow}%` }
}

export function getExplainabilityData(streetId, time = 'NOW', regionId = 'mumbai') {
  const prediction = getFloodPrediction(time, regionId)
  const street = (streetId ? prediction.streets.find((item) => item.id === streetId) : null) || prediction.streets[0]
  const factors = calculateFactorContributions(street, prediction)
  return { prediction, street, factors, explanation: generateFloodExplanation(street, prediction, factors), operationalExplanation: generateOperationalExplanation(street, prediction, factors), counterfactuals: [simulateRainfallReduction(street, prediction), simulateDrainageImprovement(street, prediction), simulateBlockageRemoval(street, prediction)] }
}

