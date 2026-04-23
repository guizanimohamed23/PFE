import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getScanById } from '../api/scanApi'
import type { ScanResponse, TargetProfile } from '../types/scan'

function formatDateTime(value: string): string {
  if (!value) {
    return 'N/A'
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

function stateBadgeClass(state: ScanResponse['scanState']): string {
  if (state === 'completed') {
    return 'border-severity-low/40 bg-severity-low/15 text-severity-low'
  }

  if (state === 'scanner_unusable') {
    return 'border-severity-medium/40 bg-severity-medium/15 text-severity-medium'
  }

  return 'border-destructive/40 bg-destructive/15 text-destructive'
}

function riskColor(level: string): string {
  const l = level.toLowerCase()
  if (l === 'critical') return 'text-red-400 border-red-500/40 bg-red-500/10'
  if (l === 'high') return 'text-orange-400 border-orange-500/40 bg-orange-500/10'
  if (l === 'medium') return 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10'
  if (l === 'low') return 'text-green-400 border-green-500/40 bg-green-500/10'
  return 'text-muted-foreground border-border bg-secondary'
}

function scoreBar(score: number): string {
  const pct = Math.min(100, Math.max(0, score * 10))
  if (pct >= 80) return 'bg-red-500'
  if (pct >= 50) return 'bg-orange-400'
  if (pct >= 30) return 'bg-yellow-400'
  return 'bg-green-500'
}

function TargetProfileCard({ profile }: { profile: TargetProfile }) {
  const riskCls = riskColor(profile.risk_level)
  const attackPct = Math.min(100, Math.max(0, profile.attack_surface_score * 10))
  const confidencePct = Math.min(100, Math.max(0, profile.confidence_score * 100))
  const headerEntries = Object.entries(profile.security_headers)
  const sslEntries = Object.entries(profile.ssl_info)
  const serviceEntries = Object.entries(profile.services)

  return (
    <div className="rounded-md border border-border bg-secondary p-4 text-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-base">🎯 Target Profile</h3>
        <span className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase ${riskCls}`}>
          {profile.risk_level} risk
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Target Type</p>
          <p className="font-mono text-xs bg-background/60 rounded px-2 py-1">{profile.target_type}</p>
        </div>
        {profile.ip_addresses.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">IP Addresses</p>
            <p className="font-mono text-xs bg-background/60 rounded px-2 py-1">{profile.ip_addresses.join(', ')}</p>
          </div>
        )}
        {profile.cms_type && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">CMS</p>
            <p className="font-mono text-xs bg-background/60 rounded px-2 py-1">{profile.cms_type}</p>
          </div>
        )}
        {profile.cloud_provider && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Cloud Provider</p>
            <p className="font-mono text-xs bg-background/60 rounded px-2 py-1">{profile.cloud_provider}</p>
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Attack Surface Score</p>
            <span className="text-xs font-semibold">{profile.attack_surface_score.toFixed(1)} / 10</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div className={`h-full rounded-full transition-all ${scoreBar(profile.attack_surface_score)}`} style={{ width: `${attackPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Confidence Score</p>
            <span className="text-xs font-semibold">{confidencePct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${confidencePct}%` }} />
          </div>
        </div>
      </div>
      {profile.technologies.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Detected Technologies</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.technologies.map((tech) => (
              <span key={tech} className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary font-mono">{tech}</span>
            ))}
          </div>
        </div>
      )}
      {profile.open_ports.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Open Ports / Services</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.open_ports.map((port) => (
              <span key={port} className="rounded border border-border bg-background/60 px-2 py-0.5 text-xs font-mono">
                {port}{serviceEntries.find(([k]) => k === String(port)) ? ` (${serviceEntries.find(([k]) => k === String(port))![1]})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
      {headerEntries.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Security Headers</p>
          <div className="space-y-1">
            {headerEntries.slice(0, 8).map(([key, val]) => (
              <div key={key} className="flex gap-2 text-xs font-mono">
                <span className="text-muted-foreground shrink-0">{key}:</span>
                <span className="truncate text-foreground/80">{String(val)}</span>
              </div>
            ))}
            {headerEntries.length > 8 && <p className="text-xs text-muted-foreground">+{headerEntries.length - 8} more headers</p>}
          </div>
        </div>
      )}
      {sslEntries.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">SSL / TLS Info</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {sslEntries.slice(0, 6).map(([key, val]) => (
              <div key={key} className="flex gap-2 text-xs font-mono">
                <span className="text-muted-foreground shrink-0">{key}:</span>
                <span className="truncate">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {profile.subdomains.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Subdomains ({profile.subdomains.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.subdomains.slice(0, 10).map((sub) => (
              <span key={sub} className="rounded border border-border bg-background/60 px-2 py-0.5 text-xs font-mono">{sub}</span>
            ))}
            {profile.subdomains.length > 10 && <span className="text-xs text-muted-foreground">+{profile.subdomains.length - 10} more</span>}
          </div>
        </div>
      )}
      {profile.endpoints.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Discovered Endpoints ({profile.endpoints.length})</p>
          <div className="max-h-32 overflow-y-auto space-y-0.5 rounded border border-border bg-background/60 p-2">
            {profile.endpoints.slice(0, 30).map((ep) => (
              <p key={ep} className="font-mono text-xs text-foreground/70 truncate">{ep}</p>
            ))}
            {profile.endpoints.length > 30 && <p className="text-xs text-muted-foreground">+{profile.endpoints.length - 30} more endpoints</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function DiagnosticsPanel({ scan }: { scan: ScanResponse }) {
  const scanner = scan.scanMeta.scanner
  const normalization = scan.scanMeta.normalization

  return (
    <div className="rounded-md border border-border bg-secondary p-3 text-sm">
      <h2 className="font-semibold">Pipeline Diagnostics</h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <p>Raw Tool Findings: {normalization?.rawToolFindings ?? 0}</p>
        <p>Raw Generic Findings: {normalization?.rawGenericFindings ?? 0}</p>
        <p>After Dedup: {normalization?.dedupedFindings ?? 0}</p>
        <p>After Filter: {normalization?.filteredFindings ?? 0}</p>
        <p>Dropped Findings: {normalization?.droppedFindings ?? 0}</p>
        <p>New Vulns Created: {scan.scanMeta.newVulnerabilitiesCreated ?? 0}</p>
      </div>
      <div className="mt-3 grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-2">
        <p>Matched Existing: {scan.scanMeta.matchedExistingFindings ?? 0}</p>
        <p>Tools Inspected: {scanner.toolsInspected}</p>
      </div>
      {scanner.toolsUsed && scanner.toolsUsed.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Tools Used: {scanner.toolsUsed.join(', ')}</p>
      ) : null}
      {scanner.skippedTools && scanner.skippedTools.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Skipped Tools: {scanner.skippedTools.join(', ')}</p>
      ) : null}
      {scan.scanMeta.scannerOutcome ? (
        <p className="mt-2 text-xs text-muted-foreground">Scanner Outcome: {scan.scanMeta.scannerOutcome}</p>
      ) : null}
    </div>
  )
}

export default function ScanDetailsPage() {
  const params = useParams<{ scanId: string }>()
  const scanId = Number.parseInt(params.scanId ?? '', 10)

  const scanQuery = useQuery({
    queryKey: ['scan-details', scanId],
    queryFn: () => getScanById(scanId),
    enabled: Number.isFinite(scanId),
  })

  const unmatchedRows = useMemo(() => scanQuery.data?.unmatchedFindings ?? [], [scanQuery.data])

  if (!Number.isFinite(scanId)) {
    return (
      <main className="grid-bg flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-5 text-sm text-destructive">
          Invalid scan id.
        </div>
      </main>
    )
  }

  return (
    <main className="grid-bg min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <header className="rounded-lg border border-border bg-card/95 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">Scan Details #{scanId}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Full findings, unmatched findings, and scanner diagnostics.</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Link to="/scans" className="rounded border border-border px-3 py-1.5 text-muted-foreground hover:border-primary hover:text-primary">
                Back to History
              </Link>
              <Link to="/scanner" className="rounded border border-border px-3 py-1.5 text-muted-foreground hover:border-primary hover:text-primary">
                New Scan
              </Link>
            </div>
          </div>
        </header>

        {scanQuery.isLoading && (
          <section className="rounded-lg border border-border bg-card/90 p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-1/4 rounded bg-secondary" />
              <div className="h-24 rounded bg-secondary" />
              <div className="h-24 rounded bg-secondary" />
            </div>
          </section>
        )}

        {scanQuery.isError && (
          <section className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
            <p className="text-destructive">Unable to load scan details.</p>
            <button
              type="button"
              onClick={() => scanQuery.refetch()}
              className="mt-2 rounded border border-destructive/60 px-3 py-1.5 text-xs text-destructive"
            >
              Retry
            </button>
          </section>
        )}

        {scanQuery.data && (
          <section className="space-y-4 rounded-lg border border-border bg-card/90 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${stateBadgeClass(scanQuery.data.scanState)}`}>
                {scanQuery.data.scanState}
              </span>
              <span className="text-sm text-muted-foreground">{scanQuery.data.targetUrl || 'N/A'}</span>
              <span className="text-sm text-muted-foreground">{formatDateTime(scanQuery.data.createdAt)}</span>
            </div>

            <div className="rounded-md border border-border bg-secondary p-3 text-sm">
              <h2 className="font-semibold">Scanner Diagnostics</h2>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <p>Total Findings: {scanQuery.data.scanMeta.totalFindings}</p>
                <p>Matched Findings: {scanQuery.data.scanMeta.matchedFindings}</p>
                <p>Unmatched Findings: {scanQuery.data.scanMeta.unmatchedFindings}</p>
                <p>Tools Inspected: {scanQuery.data.scanMeta.scanner.toolsInspected}</p>
                <p>All Tools Failed: {scanQuery.data.scanMeta.scanner.allToolsFailed ? 'Yes' : 'No'}</p>
                <p>Empty Tool Output: {scanQuery.data.scanMeta.scanner.emptyToolOutput ? 'Yes' : 'No'}</p>
              </div>
              {scanQuery.data.scanMeta.scanner.unusableReasons.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {scanQuery.data.scanMeta.scanner.unusableReasons.map((reason, index) => (
                    <li key={`${reason}-${index}`}>- {reason}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <DiagnosticsPanel scan={scanQuery.data} />

            {scanQuery.data.targetProfile && (
              <TargetProfileCard profile={scanQuery.data.targetProfile} />
            )}

            <div className="space-y-2">
              <h2 className="font-semibold">Results</h2>
              {scanQuery.data.results.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matched results in this scan.</p>
              ) : (
                scanQuery.data.results.map((result) => (
                  <article key={result.id} className="rounded-md border border-border bg-secondary p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{result.title}</p>
                      <span className="rounded border border-border px-2 py-0.5 text-xs">{result.severity}</span>
                    </div>
                    {result.description ? <p className="mt-1 text-muted-foreground">{result.description}</p> : null}
                    {result.vulnerability?.cveId ? (
                      <p className="mt-2 font-mono text-xs text-primary">{result.vulnerability.cveId}</p>
                    ) : null}
                    {result.evidence ? (
                      <pre className="mt-2 overflow-x-auto rounded border border-border bg-background/70 p-2 text-xs text-muted-foreground">
                        {result.evidence}
                      </pre>
                    ) : null}
                  </article>
                ))
              )}
            </div>

            <div className="space-y-2">
              <h2 className="font-semibold">Unmatched Findings</h2>
              {unmatchedRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No unmatched findings.</p>
              ) : (
                unmatchedRows.map((item) => (
                  <article key={item.id} className="rounded-md border border-border bg-secondary p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{item.title}</p>
                      <span className="rounded border border-border px-2 py-0.5 text-xs">{item.severity}</span>
                    </div>
                    {item.evidence ? (
                      <pre className="mt-2 overflow-x-auto rounded border border-border bg-background/70 p-2 text-xs text-muted-foreground">
                        {item.evidence}
                      </pre>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
