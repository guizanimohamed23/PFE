import { http } from './httpClient'
import type {
  ScanProfile,
  ScanMeta,
  ScanResponse,
  ScanResult,
  ScannerDiagnostics,
  ScanState,
  UnmatchedFinding,
} from '../types/scan'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function toNumberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toBooleanValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeState(value: unknown): ScanState {
  if (value === 'completed' || value === 'scanner_unusable' || value === 'failed') {
    return value
  }

  return 'failed'
}

function toEvidenceText(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    const parts = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    return parts.join('\n')
  }

  if (isRecord(value)) {
    return JSON.stringify(value)
  }

  return ''
}

function normalizeDiagnostics(input: unknown): ScannerDiagnostics {
  if (!isRecord(input)) {
    return {
      totalVulnerabilities: null,
      toolsInspected: 0,
      toolsUsed: [],
      skippedTools: [],
      successfulTools: 0,
      failedTools: 0,
      timedOutTools: 0,
      warningReasons: [],
      allToolsFailed: false,
      emptyToolOutput: false,
      unusableReasons: [],
      usedFallbackProfile: false,
      profile: undefined,
    }
  }

  return {
    totalVulnerabilities:
      typeof input.totalVulnerabilities === 'number' && Number.isFinite(input.totalVulnerabilities)
        ? input.totalVulnerabilities
        : null,
    toolsInspected: toNumberValue(input.toolsInspected),
    toolsUsed: Array.isArray(input.toolsUsed)
      ? input.toolsUsed.filter((item): item is string => typeof item === 'string')
      : [],
    skippedTools: Array.isArray(input.skippedTools)
      ? input.skippedTools.filter((item): item is string => typeof item === 'string')
      : [],
    successfulTools: toNumberValue(input.successfulTools),
    failedTools: toNumberValue(input.failedTools),
    timedOutTools: toNumberValue(input.timedOutTools),
    warningReasons: Array.isArray(input.warningReasons)
      ? input.warningReasons.filter((item): item is string => typeof item === 'string')
      : [],
    allToolsFailed: toBooleanValue(input.allToolsFailed),
    emptyToolOutput: toBooleanValue(input.emptyToolOutput),
    unusableReasons: Array.isArray(input.unusableReasons)
      ? input.unusableReasons.filter((item): item is string => typeof item === 'string')
      : [],
    usedFallbackProfile: toBooleanValue(input.usedFallbackProfile),
    profile: isRecord(input.profile)
      ? {
        objective: toStringValue(input.profile.objective) || undefined,
        maxTools: toNumberValue(input.profile.maxTools) || undefined,
        timeout: toNumberValue(input.profile.timeout) || undefined,
      }
      : undefined,
  }
}

function normalizeMeta(input: unknown): ScanMeta {
  if (!isRecord(input)) {
    return {
      totalFindings: 0,
      matchedFindings: 0,
      unmatchedFindings: 0,
      newVulnerabilitiesCreated: 0,
      matchedExistingFindings: 0,
      scannerOutcome: undefined,
      scanner: normalizeDiagnostics(null),
      normalization: {
        rawToolFindings: 0,
        rawGenericFindings: 0,
        rawTotalFindings: 0,
        dedupedFindings: 0,
        filteredFindings: 0,
        droppedFindings: 0,
      },
    }
  }

  const normalization = isRecord(input.normalization)
    ? {
      rawToolFindings: toNumberValue(input.normalization.rawToolFindings),
      rawGenericFindings: toNumberValue(input.normalization.rawGenericFindings),
      rawTotalFindings: toNumberValue(input.normalization.rawTotalFindings),
      dedupedFindings: toNumberValue(input.normalization.dedupedFindings),
      filteredFindings: toNumberValue(input.normalization.filteredFindings),
      droppedFindings: toNumberValue(input.normalization.droppedFindings),
    }
    : {
      rawToolFindings: 0,
      rawGenericFindings: 0,
      rawTotalFindings: 0,
      dedupedFindings: 0,
      filteredFindings: 0,
      droppedFindings: 0,
    }

  return {
    totalFindings: toNumberValue(input.totalFindings),
    matchedFindings: toNumberValue(input.matchedFindings),
    unmatchedFindings: toNumberValue(input.unmatchedFindings),
    newVulnerabilitiesCreated: toNumberValue(input.newVulnerabilitiesCreated),
    matchedExistingFindings: toNumberValue(input.matchedExistingFindings),
    scannerOutcome: toStringValue(input.scannerOutcome) || undefined,
    scanner: normalizeDiagnostics(input.scanner),
    normalization,
  }
}

function normalizeResult(input: unknown, index: number): ScanResult {
  if (!isRecord(input)) {
    return {
      id: `result-${index + 1}`,
      title: `Finding ${index + 1}`,
      description: '',
      severity: 'Unknown',
      evidence: '',
      raw: {},
    }
  }

  const vulnerability = isRecord(input.vulnerability)
    ? {
      id: typeof input.vulnerability.id === 'number' ? input.vulnerability.id : undefined,
      cveId: toStringValue(input.vulnerability.cveId) || undefined,
      title: toStringValue(input.vulnerability.title) || undefined,
      severity: toStringValue(input.vulnerability.severity) || undefined,
    }
    : undefined

  const rawId = input.id
  const resolvedId =
    typeof rawId === 'number' || typeof rawId === 'string'
      ? String(rawId)
      : `result-${index + 1}`

  return {
    id: resolvedId,
    title: toStringValue(input.title, vulnerability?.title ?? `Finding ${index + 1}`),
    description: toStringValue(input.description, vulnerability?.description ?? ''),
    severity: toStringValue(input.severity, vulnerability?.severity ?? 'Unknown'),
    evidence: toEvidenceText(input.evidence ?? input.details ?? input.rawFinding ?? input),
    vulnerability,
    raw: input,
  }
}

function normalizeUnmatchedFinding(input: unknown, index: number): UnmatchedFinding {
  if (!isRecord(input)) {
    return {
      id: `unmatched-${index + 1}`,
      title: `Unmatched finding ${index + 1}`,
      severity: 'Unknown',
      evidence: '',
      raw: {},
    }
  }

  const rawUnmatchedId = input.id
  const resolvedUnmatchedId =
    typeof rawUnmatchedId === 'number' || typeof rawUnmatchedId === 'string'
      ? String(rawUnmatchedId)
      : `unmatched-${index + 1}`

  return {
    id: resolvedUnmatchedId,
    title: toStringValue(input.title, `Unmatched finding ${index + 1}`),
    severity: toStringValue(input.severity, 'Unknown'),
    evidence: toEvidenceText(input.evidence ?? input.details ?? input),
    raw: input,
  }
}

function normalizeTargetProfile(input: unknown): import('../types/scan').TargetProfile | null {
  if (!isRecord(input)) return null
  return {
    target: toStringValue(input.target),
    target_type: toStringValue(input.target_type, 'unknown'),
    ip_addresses: Array.isArray(input.ip_addresses)
      ? input.ip_addresses.filter((item): item is string => typeof item === 'string')
      : [],
    open_ports: Array.isArray(input.open_ports)
      ? input.open_ports.filter((item): item is number => typeof item === 'number')
      : [],
    services: isRecord(input.services) ? (input.services as Record<string, string>) : {},
    technologies: Array.isArray(input.technologies)
      ? input.technologies.filter((item): item is string => typeof item === 'string')
      : [],
    cms_type: typeof input.cms_type === 'string' ? input.cms_type : null,
    cloud_provider: typeof input.cloud_provider === 'string' ? input.cloud_provider : null,
    security_headers: isRecord(input.security_headers) ? (input.security_headers as Record<string, string>) : {},
    ssl_info: isRecord(input.ssl_info) ? (input.ssl_info as Record<string, unknown>) : {},
    subdomains: Array.isArray(input.subdomains)
      ? input.subdomains.filter((item): item is string => typeof item === 'string')
      : [],
    endpoints: Array.isArray(input.endpoints)
      ? input.endpoints.filter((item): item is string => typeof item === 'string')
      : [],
    attack_surface_score: toNumberValue(input.attack_surface_score),
    risk_level: toStringValue(input.risk_level, 'unknown'),
    confidence_score: toNumberValue(input.confidence_score),
  }
}

function normalizeScanResponse(input: unknown): ScanResponse {
  const record = isRecord(input) ? input : {}

  const results = Array.isArray(record.results) ? record.results.map(normalizeResult) : []
  const unmatchedFindings = Array.isArray(record.unmatchedFindings)
    ? record.unmatchedFindings.map(normalizeUnmatchedFinding)
    : []

  return {
    id: toNumberValue(record.id, 0),
    targetUrl: toStringValue(record.targetUrl),
    createdAt: toStringValue(record.createdAt),
    scanState: normalizeState(record.scanState),
    results,
    scanMeta: normalizeMeta(record.scanMeta),
    targetProfile: normalizeTargetProfile(record.targetProfile),
    unmatchedFindings,
    message: toStringValue(record.message) || undefined,
    details: toStringValue(record.details) || undefined,
  }
}

function normalizeScanCollection(input: unknown): ScanResponse[] {
  if (Array.isArray(input)) {
    return input.map(normalizeScanResponse)
  }

  if (isRecord(input)) {
    const candidates = [input.scans, input.data, input.items]
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.map(normalizeScanResponse)
      }
    }
  }

  return []
}

export async function createScan(targetUrl: string, scanProfile?: ScanProfile): Promise<ScanResponse> {
  const payload = await http<unknown>('/api/scans', {
    method: 'POST',
    body: JSON.stringify({ targetUrl, scanProfile }),
  })

  return normalizeScanResponse(payload)
}

export async function getScans(page = 1, limit = 50): Promise<ScanResponse[]> {
  const payload = await http<unknown>(`/api/scans?page=${page}&limit=${limit}`)
  return normalizeScanCollection(payload)
}

export async function getScanById(scanId: number): Promise<ScanResponse> {
  const payload = await http<unknown>(`/api/scans/${scanId}`)
  return normalizeScanResponse(payload)
}
