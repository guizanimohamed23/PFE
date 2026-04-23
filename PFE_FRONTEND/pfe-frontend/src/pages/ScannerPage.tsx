import { useMemo, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { createScan } from '../api/scanApi'
import { HttpError } from '../api/httpClient'
import type { ScanMode, ScanResponse, TargetProfile } from '../types/scan'

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

function groupBySeverity(results: ScanResponse['results']): Array<{ severity: string; items: ScanResponse['results'] }> {
  const severityOrder = ['Critical', 'High', 'Medium', 'Low', 'Unknown']
  const groups = new Map<string, ScanResponse['results']>()

  for (const result of results) {
    const severity = result.severity || 'Unknown'
    const bucket = groups.get(severity) ?? []
    bucket.push(result)
    groups.set(severity, bucket)
  }

  const entries = Array.from(groups.entries()).map(([severity, items]) => ({ severity, items }))
  return entries.sort((a, b) => {
    const aIndex = severityOrder.indexOf(a.severity)
    const bIndex = severityOrder.indexOf(b.severity)
    return (aIndex === -1 ? severityOrder.length : aIndex) - (bIndex === -1 ? severityOrder.length : bIndex)
  })
}

function ScanSummary({ scan }: { scan: ScanResponse }) {
  return (
    <div className="rounded-md border border-border bg-secondary p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Scan ID:</span> #{scan.id}
        </p>
        <p>
          <span className="text-muted-foreground">Target:</span> {scan.targetUrl || 'N/A'}
        </p>
        <p>
          <span className="text-muted-foreground">Created:</span> {formatDateTime(scan.createdAt)}
        </p>
        <p>
          <span className="text-muted-foreground">Matched Findings:</span> {scan.scanMeta.matchedFindings}
        </p>
      </div>
    </div>
  )
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
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-base">🎯 Target Profile</h3>
        <span className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase ${riskCls}`}>
          {profile.risk_level} risk
        </span>
      </div>

      {/* Identity row */}
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

      {/* Attack surface + confidence scores */}
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
            <span className="text-xs font-semibold">{(confidencePct).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${confidencePct}%` }} />
          </div>
        </div>
      </div>

      {/* Technologies */}
      {profile.technologies.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Detected Technologies</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.technologies.map((tech) => (
              <span key={tech} className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary font-mono">
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Open ports + services */}
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

      {/* Security Headers */}
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
            {headerEntries.length > 8 && (
              <p className="text-xs text-muted-foreground">+{headerEntries.length - 8} more headers</p>
            )}
          </div>
        </div>
      )}

      {/* SSL Info */}
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

      {/* Subdomains */}
      {profile.subdomains.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Subdomains ({profile.subdomains.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.subdomains.slice(0, 10).map((sub) => (
              <span key={sub} className="rounded border border-border bg-background/60 px-2 py-0.5 text-xs font-mono">{sub}</span>
            ))}
            {profile.subdomains.length > 10 && (
              <span className="text-xs text-muted-foreground">+{profile.subdomains.length - 10} more</span>
            )}
          </div>
        </div>
      )}

      {/* Discovered endpoints */}
      {profile.endpoints.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Discovered Endpoints ({profile.endpoints.length})</p>
          <div className="max-h-32 overflow-y-auto space-y-0.5 rounded border border-border bg-background/60 p-2">
            {profile.endpoints.slice(0, 30).map((ep) => (
              <p key={ep} className="font-mono text-xs text-foreground/70 truncate">{ep}</p>
            ))}
            {profile.endpoints.length > 30 && (
              <p className="text-xs text-muted-foreground">+{profile.endpoints.length - 30} more endpoints</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DiagnosticCard({ scan }: { scan: ScanResponse }) {
  const scanner = scan.scanMeta.scanner
  const normalization = scan.scanMeta.normalization

  return (
    <div className="rounded-md border border-border bg-secondary p-3 text-sm">
      <h3 className="font-semibold">Pipeline Diagnostics</h3>
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
        <p className="mt-2 text-xs text-muted-foreground">
          Tools Used: {scanner.toolsUsed.join(', ')}
        </p>
      ) : null}
      {scanner.skippedTools && scanner.skippedTools.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Skipped Tools: {scanner.skippedTools.join(', ')}
        </p>
      ) : null}
      {scan.scanMeta.scannerOutcome ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Scanner Outcome: {scan.scanMeta.scannerOutcome}
        </p>
      ) : null}
    </div>
  )
}

export default function ScannerPage() {
  const [targetUrl, setTargetUrl] = useState('')
  const [scanMode, setScanMode] = useState<ScanMode>('global')
  const [latestScan, setLatestScan] = useState<ScanResponse | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)

  const createScanMutation = useMutation({
    mutationFn: ({ url, mode }: { url: string; mode: ScanMode }) => createScan(url, { mode }),
    onSuccess: (scan) => {
      setLatestScan(scan)
      setRequestError(null)
    },
    onError: (error) => {
      if (error instanceof HttpError) {
        setRequestError(error.message)
      } else {
        setRequestError('Unable to start scan. Please try again.')
      }
    },
  })

  const severityGroups = useMemo(() => {
    if (!latestScan || latestScan.scanState !== 'completed') {
      return []
    }

    return groupBySeverity(latestScan.results)
  }, [latestScan])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const url = targetUrl.trim()

    if (!url) {
      setRequestError('Target URL is required.')
      return
    }

    setRequestError(null)
    createScanMutation.mutate({ url, mode: scanMode })
  }

  const isPending = createScanMutation.isPending

  return (
    <main className="grid-bg min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <header className="rounded-lg border border-border bg-card/95 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">Security Scanner</h1>
              <p className="mt-1 text-sm text-muted-foreground">Run authenticated scans against a target URL.</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="rounded border border-border px-3 py-1.5 text-muted-foreground hover:border-primary hover:text-primary">
                Attack Paths
              </Link>
              <Link to="/scans" className="rounded border border-border px-3 py-1.5 text-muted-foreground hover:border-primary hover:text-primary">
                Scan History
              </Link>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-4 space-y-3 sm:flex sm:items-end sm:gap-3 sm:space-y-0">
            <div className="flex-1">
              <label htmlFor="targetUrl" className="mb-1 block text-sm text-muted-foreground">
                Target URL
              </label>
              <input
                id="targetUrl"
                type="url"
                placeholder="http://example.com"
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
            <div className="sm:w-52">
              <label htmlFor="scanMode" className="mb-1 block text-sm text-muted-foreground">
                Scan Profile
              </label>
              <select
                id="scanMode"
                value={scanMode}
                onChange={(event) => setScanMode(event.target.value as ScanMode)}
                disabled={isPending}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
              >
                <option value="global">Global (max coverage)</option>
                <option value="balanced">Balanced</option>
                <option value="quick">Quick</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-60 sm:w-auto"
            >
              {isPending ? 'Starting scan...' : 'Start Scan'}
            </button>
          </form>
        </header>

        {isPending && (
          <section className="rounded-lg border border-border bg-card/90 p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-1/3 rounded bg-secondary" />
              <div className="h-3 w-2/3 rounded bg-secondary" />
              <div className="h-20 rounded bg-secondary" />
            </div>
          </section>
        )}

        {requestError && (
          <section className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{requestError}</p>
            <button
              type="button"
              onClick={() => createScanMutation.mutate({ url: targetUrl.trim(), mode: scanMode })}
              disabled={!targetUrl.trim() || isPending}
              className="mt-3 rounded border border-destructive/60 px-3 py-1.5 text-xs disabled:opacity-60"
            >
              Retry
            </button>
          </section>
        )}

        {!latestScan && !isPending && !requestError && (
          <section className="rounded-lg border border-border bg-card/90 p-6 text-center text-muted-foreground">
            Start your first scan to see findings and diagnostics.
          </section>
        )}

        {latestScan && !isPending && (
          <section className="space-y-4 rounded-lg border border-border bg-card/90 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Latest Scan</h2>
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${stateBadgeClass(latestScan.scanState)}`}>
                {latestScan.scanState}
              </span>
            </div>

            <ScanSummary scan={latestScan} />

            {latestScan.targetProfile && (
              <TargetProfileCard profile={latestScan.targetProfile} />
            )}

            {latestScan.scanState === 'completed' && (
              <>
                <div className="rounded-md border border-border bg-secondary p-3 text-sm">
                  <h3 className="font-semibold">Scan Meta</h3>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <p>Total Findings: {latestScan.scanMeta.totalFindings}</p>
                    <p>Matched Findings: {latestScan.scanMeta.matchedFindings}</p>
                    <p>Unmatched Findings: {latestScan.scanMeta.unmatchedFindings}</p>
                  </div>
                  <div className="mt-3 grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-3">
                    <p>Raw Scanner Findings: {latestScan.scanMeta.scanner.totalVulnerabilities ?? 'N/A'}</p>
                    <p>Tools Inspected: {latestScan.scanMeta.scanner.toolsInspected}</p>
                    <p>
                      Tools OK/Failed/Timeout: {latestScan.scanMeta.scanner.successfulTools ?? 0}/
                      {latestScan.scanMeta.scanner.failedTools ?? 0}/{latestScan.scanMeta.scanner.timedOutTools ?? 0}
                    </p>
                  </div>
                  {latestScan.scanMeta.scanner.profile && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Effective profile: {latestScan.scanMeta.scanner.profile.objective || 'n/a'} / maxTools{' '}
                      {latestScan.scanMeta.scanner.profile.maxTools ?? 'n/a'} / timeout{' '}
                      {latestScan.scanMeta.scanner.profile.timeout ?? 'n/a'}ms
                    </p>
                  )}
                </div>

                <DiagnosticCard scan={latestScan} />

                {severityGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No matched findings returned for this scan.</p>
                ) : (
                  <div className="space-y-3">
                    {severityGroups.map((group) => (
                      <div key={group.severity} className="rounded-md border border-border bg-secondary p-3">
                        <h3 className="text-sm font-semibold">{group.severity}</h3>
                        <div className="mt-2 space-y-2">
                          {group.items.map((item) => (
                            <article key={item.id} className="rounded border border-border bg-card p-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold">{item.title}</p>
                                {item.vulnerability?.cveId ? (
                                  <span className="font-mono text-xs text-primary">{item.vulnerability.cveId}</span>
                                ) : null}
                              </div>
                              {item.description ? <p className="mt-1 text-muted-foreground">{item.description}</p> : null}
                              {item.evidence ? (
                                <pre className="mt-2 overflow-x-auto rounded border border-border bg-background/70 p-2 text-xs text-muted-foreground">
                                  {item.evidence}
                                </pre>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {latestScan.scanState === 'scanner_unusable' && (
              <div className="rounded-md border border-severity-medium/40 bg-severity-medium/10 p-3 text-sm">
                <p className="font-semibold text-severity-medium">Scanner ran but produced no usable findings.</p>
                {latestScan.scanMeta.scanner.unusableReasons.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {latestScan.scanMeta.scanner.unusableReasons.map((reason, index) => (
                      <li key={`${reason}-${index}`}>- {reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-muted-foreground">No specific unusable reasons were provided.</p>
                )}
              </div>
            )}

            {latestScan.scanState === 'failed' && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-semibold">Scan failed.</p>
                <p className="mt-1">{latestScan.message || 'The backend returned a failed scan state.'}</p>
                {latestScan.details ? <p className="mt-1 text-xs">{latestScan.details}</p> : null}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
