import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getScanById } from '../api/scanApi'
import type { ScanResponse } from '../types/scan'

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
