import { getRegionConfig } from '../data/regions/index.js'
import defaultDrainageNetwork from '../data/drainageNetwork.json' with { type: 'json' }


/**
 * JalDrishti Directed Drainage Network & Hydraulic Propagation Service
 *
 * Models municipal stormwater conveyance as a directed graph (nodes: manholes/inlets/junctions/outfalls,
 * edges: pipes/channels directed source -> target).
 * Supports multi-region drainage networks (Mumbai, Delhi, Chennai).
 */

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export function getDrainageNetwork(regionId) {
  if (regionId) {
    const config = getRegionConfig(regionId)
    return config.drainageNetwork || defaultDrainageNetwork
  }
  return defaultDrainageNetwork
}

/**
 * Builds an explicit directed graph representation from network data.
 *
 * @param {Object} network Drainage network data containing nodes and edges
 * @returns {Object} Graph representation with adjacency lists and topological structure
 */
export function buildDrainageGraph(network = defaultDrainageNetwork) {
  const nodeMap = new Map()
  const inEdges = new Map()
  const outEdges = new Map()

  const safeNetwork = (network && network.nodes && network.edges) ? network : defaultDrainageNetwork

  safeNetwork.nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node })
    inEdges.set(node.id, [])
    outEdges.set(node.id, [])
  })

  safeNetwork.edges.forEach((edge) => {
    if (outEdges.has(edge.source)) {
      outEdges.get(edge.source).push(edge)
    }
    if (inEdges.has(edge.target)) {
      inEdges.get(edge.target).push(edge)
    }
  })

  // Topological ordering of nodes from inlets to outfall
  const inDegree = new Map()
  safeNetwork.nodes.forEach((node) => {
    inDegree.set(node.id, inEdges.get(node.id)?.length || 0)
  })

  const queue = []
  safeNetwork.nodes.forEach((node) => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id)
    }
  })

  const topologicalOrder = []
  const tempInDegree = new Map(inDegree)

  while (queue.length > 0) {
    const currentId = queue.shift()
    topologicalOrder.push(currentId)

    const outgoing = outEdges.get(currentId) || []
    outgoing.forEach((edge) => {
      const nextId = edge.target
      const currentDegree = tempInDegree.get(nextId) - 1
      tempInDegree.set(nextId, currentDegree)
      if (currentDegree === 0) {
        queue.push(nextId)
      }
    })
  }

  // Fallback if cycles exist
  if (topologicalOrder.length < safeNetwork.nodes.length) {
    safeNetwork.nodes.forEach((node) => {
      if (!topologicalOrder.includes(node.id)) {
        topologicalOrder.push(node.id)
      }
    })
  }

  return {
    nodes: safeNetwork.nodes,
    edges: safeNetwork.edges,
    nodeMap,
    inEdges,
    outEdges,
    topologicalOrder
  }
}

export function calculateNetworkUtilization(node) {
  if (!node || !node.capacity) return 0
  return Number((node.currentLoad / node.capacity).toFixed(2))
}

/**
 * Executes directed hydraulic flow propagation across the drainage graph.
 *
 * @param {number} rainfallIntensity Rainfall intensity in mm/hr
 * @param {number|Object} runoffDemand Average runoff demand or map of node-specific demands
 * @param {Object|string} networkOrRegion Specific network object or regionId
 * @returns {Object} Full hydraulic network state including node/edge loads, surcharge, and backflow
 */
export function calculateDrainageStatus(rainfallIntensity = 0, runoffDemand = 0, networkOrRegion = null) {
  const intensity = Math.max(0, rainfallIntensity)
  const network = typeof networkOrRegion === 'string'
    ? getDrainageNetwork(networkOrRegion)
    : networkOrRegion || defaultDrainageNetwork

  const graph = buildDrainageGraph(network)
  const nodeFlows = new Map()
  const edgeFlows = new Map()

  // 1. Calculate local surface inflow demand at each node
  graph.nodes.forEach((node) => {
    const localRunoff = typeof runoffDemand === 'object' && runoffDemand !== null
      ? (runoffDemand[node.id] ?? (runoffDemand.default || 0))
      : Number(runoffDemand || 0)

    // Inflow from catchment tributary + direct rainfall on inlet aperture
    const localInflow = Number((node.currentLoad + (intensity * 0.34) + (localRunoff * 0.20)).toFixed(2))
    nodeFlows.set(node.id, {
      baseLoad: node.currentLoad,
      localInflow,
      totalInflow: localInflow,
      surchargeDeficit: 0
    })
  })

  // 2. Propagate flow along directed edges in topological order
  graph.topologicalOrder.forEach((nodeId) => {
    const nodeState = nodeFlows.get(nodeId)
    const outgoing = graph.outEdges.get(nodeId) || []

    if (outgoing.length === 0) {
      // Outfall node: discharges to receiving water body
      return
    }

    const totalOutCapacity = outgoing.reduce((sum, e) => sum + e.hydraulicCapacity, 0) || 1

    outgoing.forEach((edge) => {
      // Effective capacity accounts for physical blockage (58% cross-sectional loss)
      const effectiveCapacity = edge.blocked
        ? Number((edge.hydraulicCapacity * 0.42).toFixed(2))
        : edge.hydraulicCapacity

      const capacityShare = edge.hydraulicCapacity / totalOutCapacity
      const attemptedFlow = Number((edge.currentFlow + (nodeState.totalInflow * capacityShare * 0.62) + (intensity * 0.15)).toFixed(2))

      const conveyedFlow = attemptedFlow
      const utilization = Number((conveyedFlow / effectiveCapacity).toFixed(2))
      const isOverloaded = conveyedFlow >= effectiveCapacity
      const isWatch = !isOverloaded && (utilization >= 0.8)

      edgeFlows.set(edge.id, {
        ...edge,
        effectiveCapacity,
        currentFlow: conveyedFlow,
        utilization,
        status: isOverloaded ? 'overloaded' : isWatch ? 'watch' : 'normal',
        excessFlow: Math.max(0, conveyedFlow - effectiveCapacity)
      })

      const targetState = nodeFlows.get(edge.target)
      if (targetState) {
        targetState.totalInflow = Number((targetState.totalInflow + Math.min(conveyedFlow, effectiveCapacity * 1.25)).toFixed(2))
      }
    })
  })

  // 3. Evaluate Node Status and Surcharge
  const processedNodes = graph.nodes.map((node) => {
    const state = nodeFlows.get(node.id)
    const currentLoad = state ? state.totalInflow : node.currentLoad
    const utilization = Number((currentLoad / node.capacity).toFixed(2))
    const isOverloaded = utilization >= 1.0
    const isWatch = !isOverloaded && utilization >= 0.8

    return {
      ...node,
      currentLoad,
      utilization,
      status: isOverloaded ? 'overloaded' : isWatch ? 'watch' : 'normal'
    }
  })

  const processedEdges = graph.edges.map((edge) => edgeFlows.get(edge.id) || {
    ...edge,
    effectiveCapacity: edge.hydraulicCapacity,
    currentFlow: edge.currentFlow,
    utilization: Number((edge.currentFlow / edge.hydraulicCapacity).toFixed(2)),
    status: 'normal',
    excessFlow: 0
  })

  const overloadedNodes = processedNodes.filter((n) => n.status === 'overloaded')
  const overloadedEdges = processedEdges.filter((e) => e.status === 'overloaded')

  const blockageImpact = processedEdges
    .filter((e) => e.blocked)
    .reduce((sum, e) => sum + (e.hydraulicCapacity - e.effectiveCapacity), 0)

  const meanUtilization = processedNodes.reduce((sum, n) => sum + n.utilization, 0) / processedNodes.length

  const surchargeRisk = clamp(
    (meanUtilization - 0.70) * 1.8 +
    (overloadedEdges.length * 0.12) +
    (blockageImpact / 180)
  )

  const junctionNode = processedNodes.find((n) => n.type === 'junction')
  const junctionOverloaded = junctionNode ? junctionNode.utilization >= 0.95 : false

  const backflowProbability = clamp(
    surchargeRisk * 0.70 +
    (junctionOverloaded ? 0.20 : 0) +
    (overloadedNodes.length > 0 ? 0.14 : 0) +
    (blockageImpact > 0 ? 0.10 : 0)
  )

  const bottlenecks = [
    ...overloadedEdges.map((e) => e.id),
    ...processedEdges.filter((e) => e.blocked).map((e) => `${e.id} (Blocked)`)
  ]

  return {
    nodes: processedNodes,
    edges: processedEdges,
    utilization: Number(meanUtilization.toFixed(2)),
    overloadedNodes,
    overloadedEdges,
    blockageImpact: Number(blockageImpact.toFixed(2)),
    surchargeRisk: Number(surchargeRisk.toFixed(2)),
    backflowProbability: Number(backflowProbability.toFixed(2)),
    bottlenecks,
    graphTopology: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      topologicalOrder: graph.topologicalOrder
    }
  }
}
