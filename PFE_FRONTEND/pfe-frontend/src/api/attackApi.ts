import {
  type AiGenerateRequest,
  type AiGenerateResponse,
  type AiRiskRequest,
  type AiRiskResponse,
  type AttackGraphEdge,
  type AttackGraphNode,
  type AttackStep,
  type Severity,
  type Vulnerability,
} from '../types/attack'
import { http } from './httpClient'

export function getVulnerabilities(): Promise<Vulnerability[]> {
  return http<Vulnerability[]>('/api/vulnerabilities')
}

export function generateAttackScenario(
  payload: AiGenerateRequest,
): Promise<AiGenerateResponse> {
  return http<AiGenerateResponse>('/api/attacks/ai-generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getAiRiskAssessment(payload: AiRiskRequest): Promise<AiRiskResponse> {
  return http<AiRiskResponse>('/api/attacks/ai-risk', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

const severityValues: Severity[] = ['Critical', 'High', 'Medium', 'Low']

function isSeverity(value: unknown): value is Severity {
  return typeof value === 'string' && severityValues.includes(value as Severity)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function toSeverity(value: unknown): Severity {
  return isSeverity(value) ? value : 'Medium'
}

function normalizeStep(step: unknown): AttackStep | null {
  if (!isRecord(step)) {
    return null
  }

  const stepId = toNumber(step.step_id)
  if (stepId === null) {
    return null
  }

  const nextSteps = Array.isArray(step.next_steps)
    ? step.next_steps
        .map((item) => toNumber(item))
        .filter((item): item is number => item !== null)
    : []

  return {
    step_id: stepId,
    title: toStringValue(step.title, `Step ${stepId}`),
    description: toStringValue(step.description, 'No description provided.'),
    mitre_technique: toStringValue(step.mitre_technique, 'Unknown'),
    severity: toSeverity(step.severity),
    next_steps: nextSteps,
  }
}

function normalizeNode(node: unknown): AttackGraphNode | null {
  if (!isRecord(node) || typeof node.id !== 'string' || !isRecord(node.data)) {
    return null
  }

  const stepNumber = toNumber(node.data.stepNumber)

  return {
    id: node.id,
    data: {
      stepNumber: stepNumber ?? (Number.parseInt(node.id, 10) || 0),
      title: toStringValue(node.data.title, 'Untitled step'),
      description: toStringValue(node.data.description, 'No description provided.'),
      techniqueId: toStringValue(node.data.techniqueId, 'Unknown'),
      severity: toSeverity(node.data.severity),
    },
    position:
      isRecord(node.position) && typeof node.position.x === 'number' && typeof node.position.y === 'number'
        ? { x: node.position.x, y: node.position.y }
        : undefined,
  }
}

function normalizeEdge(edge: unknown): AttackGraphEdge | null {
  if (!isRecord(edge) || typeof edge.id !== 'string') {
    return null
  }

  if (typeof edge.source !== 'string' || typeof edge.target !== 'string') {
    return null
  }

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: typeof edge.animated === 'boolean' ? edge.animated : true,
  }
}

function deriveGraph(steps: AttackStep[]): { nodes: AttackGraphNode[]; edges: AttackGraphEdge[] } {
  const nodes: AttackGraphNode[] = steps.map((step, index) => ({
    id: String(step.step_id),
    data: {
      stepNumber: step.step_id,
      title: step.title,
      description: step.description,
      techniqueId: step.mitre_technique,
      severity: step.severity,
    },
    position: {
      x: 80 + (index % 3) * 290,
      y: 80 + Math.floor(index / 3) * 190,
    },
  }))

  const edges: AttackGraphEdge[] = steps.flatMap((step) =>
    step.next_steps.map((nextStep, edgeIndex) => ({
      id: `e-${step.step_id}-${nextStep}-${edgeIndex}`,
      source: String(step.step_id),
      target: String(nextStep),
      animated: true,
    })),
  )

  return { nodes, edges }
}

export interface NormalizedScenario {
  vulnerabilityId: number
  scenario: string
  steps: AttackStep[]
  recommendations: string[]
  graph: {
    nodes: AttackGraphNode[]
    edges: AttackGraphEdge[]
  }
  aiRaw?: unknown
  warnings: string[]
}

export function normalizeScenarioPayload(input: unknown): NormalizedScenario {
  if (!isRecord(input)) {
    return {
      vulnerabilityId: -1,
      scenario: 'Scenario unavailable',
      steps: [],
      recommendations: [],
      graph: { nodes: [], edges: [] },
      warnings: ['Malformed AI payload received.'],
    }
  }

  const stepsRaw = Array.isArray(input.steps) ? input.steps : []
  const steps = stepsRaw.map(normalizeStep).filter((step): step is AttackStep => step !== null)

  const graphRecord = isRecord(input.graph) ? input.graph : undefined
  const graphNodes = Array.isArray(graphRecord?.nodes)
    ? graphRecord.nodes.map(normalizeNode).filter((node): node is AttackGraphNode => node !== null)
    : []
  const graphEdges = Array.isArray(graphRecord?.edges)
    ? graphRecord.edges.map(normalizeEdge).filter((edge): edge is AttackGraphEdge => edge !== null)
    : []

  const derivedGraph = deriveGraph(steps)
  const nodes = graphNodes.length > 0 ? graphNodes : derivedGraph.nodes
  const edges = graphEdges.length > 0 ? graphEdges : derivedGraph.edges

  const warnings: string[] = []
  if (graphNodes.length === 0 && steps.length > 0) {
    warnings.push('Graph nodes were missing or invalid. Nodes were derived from attack steps.')
  }

  return {
    vulnerabilityId: toNumber(input.vulnerabilityId) ?? -1,
    scenario: toStringValue(input.scenario, 'Generated attack scenario'),
    steps,
    recommendations: Array.isArray(input.recommendations)
      ? input.recommendations.filter((item): item is string => typeof item === 'string')
      : [],
    graph: {
      nodes,
      edges,
    },
    aiRaw: input.aiRaw,
    warnings,
  }
}
