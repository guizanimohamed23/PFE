export type ScanState = 'completed' | 'scanner_unusable' | 'failed'
export type ScanMode = 'global' | 'balanced' | 'quick'

export interface ScanProfile {
  mode: ScanMode
}

export interface ScannerProfile {
  objective?: string
  maxTools?: number
  timeout?: number
}

export interface ScannerDiagnostics {
  totalVulnerabilities: number | null
  toolsInspected: number
  toolsUsed?: string[]
  skippedTools?: string[]
  successfulTools?: number
  failedTools?: number
  timedOutTools?: number
  warningReasons?: string[]
  allToolsFailed: boolean
  emptyToolOutput: boolean
  unusableReasons: string[]
  usedFallbackProfile?: boolean
  profile?: ScannerProfile
}

export interface NormalizationDiagnostics {
  rawToolFindings: number
  rawGenericFindings: number
  rawTotalFindings: number
  dedupedFindings: number
  filteredFindings: number
  droppedFindings: number
}

export interface ScanMeta {
  totalFindings: number
  matchedFindings: number
  unmatchedFindings: number
  newVulnerabilitiesCreated?: number
  matchedExistingFindings?: number
  scannerOutcome?: string
  scanner: ScannerDiagnostics
  normalization?: NormalizationDiagnostics
}

export interface ScanVulnerabilityInfo {
  id?: number
  cveId?: string
  title?: string
  severity?: string
}

export interface ScanResult {
  id: string
  title: string
  description: string
  severity: string
  evidence: string
  vulnerability?: ScanVulnerabilityInfo
  raw: Record<string, unknown>
}

export interface UnmatchedFinding {
  id: string
  title: string
  severity: string
  evidence: string
  raw: Record<string, unknown>
}

export interface TargetProfile {
  target: string
  target_type: string
  ip_addresses: string[]
  open_ports: number[]
  services: Record<string, string>
  technologies: string[]
  cms_type: string | null
  cloud_provider: string | null
  security_headers: Record<string, string>
  ssl_info: Record<string, unknown>
  subdomains: string[]
  endpoints: string[]
  attack_surface_score: number
  risk_level: string
  confidence_score: number
}

export interface ScanResponse {
  id: number
  targetUrl: string
  createdAt: string
  scanState: ScanState
  results: ScanResult[]
  scanMeta: ScanMeta
  targetProfile: TargetProfile | null
  unmatchedFindings: UnmatchedFinding[]
  message?: string
  details?: string
}
