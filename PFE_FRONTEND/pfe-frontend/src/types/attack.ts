export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'

export interface Vulnerability {
  id: number
  cveId: string
  title: string
  description: string
  severity: Severity
  cvssScore: number
}

export interface AiGenerateRequest {
  vulnerabilityId: number
  language: string
  stepCount: number
}

export interface AttackStep {
  step_id: number
  title: string
  description: string
  mitre_technique: string
  severity: Severity
  next_steps: number[]
}

export interface AttackGraphNodeData extends Record<string, unknown> {
  stepNumber: number
  title: string
  description: string
  techniqueId: string
  severity: Severity
}

export interface AttackGraphNode {
  id: string
  data: AttackGraphNodeData
  position?: {
    x: number
    y: number
  }
}

export interface AttackGraphEdge {
  id: string
  source: string
  target: string
  animated?: boolean
}

export interface AiGenerateResponse {
  vulnerabilityId: number
  scenario: string
  steps: AttackStep[]
  recommendations: string[]
  graph?: {
    nodes?: AttackGraphNode[]
    edges?: AttackGraphEdge[]
  }
  aiRaw?: unknown
}

export interface AiRiskRequest {
  scanId: number
  language: string
}

export interface AiRiskAssessment {
  riskScore: number
  businessImpact: string
  prioritizedRemediation: string[]
  complianceImplications: {
    OWASP: string[]
    PCI_DSS: string[]
  }
}

export interface AiRiskResponse {
  scanId: number
  assessment: AiRiskAssessment
}
