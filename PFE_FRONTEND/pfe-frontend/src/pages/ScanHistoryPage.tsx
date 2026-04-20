import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getScans } from '../api/scanApi'
import { useAuth } from '../context/AuthContext'

function formatDateTime(value: string): string {
  if (!value) {
    return 'N/A'
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

function stateBadgeClass(state: string): string {
  if (state === 'completed') {
    return 'border-severity-low/40 bg-severity-low/15 text-severity-low'
  }

  if (state === 'scanner_unusable') {
    return 'border-severity-medium/40 bg-severity-medium/15 text-severity-medium'
  }

  return 'border-destructive/40 bg-destructive/15 text-destructive'
}

export default function ScanHistoryPage() {
  const { user } = useAuth()

  const scansQuery = useQuery({
    queryKey: ['scans-history'],
    queryFn: () => getScans(1, 50),
    enabled: !user?.isGuest,
  })

  if (user?.isGuest) {
    return (
      <main className="grid-bg min-h-screen bg-background p-4 text-foreground">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <header className="rounded-lg border border-border bg-card/95 p-4">
            <h1 className="text-lg font-semibold">Scan History</h1>
          </header>
          <section className="rounded-lg border border-border bg-card/90 p-10 text-center">
            <p className="text-base font-medium text-foreground">Access restricted</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Scan history is only available to registered users.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/login"
                className="rounded border border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Sign Up
              </Link>
            </div>
          </section>
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
              <h1 className="text-lg font-semibold">Scan History</h1>
              <p className="mt-1 text-sm text-muted-foreground">Review previous scans and open full details.</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Link to="/scanner" className="rounded border border-border px-3 py-1.5 text-muted-foreground hover:border-primary hover:text-primary">
                New Scan
              </Link>
              <Link to="/" className="rounded border border-border px-3 py-1.5 text-muted-foreground hover:border-primary hover:text-primary">
                Attack Paths
              </Link>
            </div>
          </div>
        </header>

        {scansQuery.isLoading && (
          <section className="rounded-lg border border-border bg-card/90 p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-1/4 rounded bg-secondary" />
              <div className="h-16 rounded bg-secondary" />
              <div className="h-16 rounded bg-secondary" />
            </div>
          </section>
        )}

        {scansQuery.isError && (
          <section className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
            <p className="text-destructive">Unable to load scan history.</p>
            <button
              type="button"
              onClick={() => scansQuery.refetch()}
              className="mt-2 rounded border border-destructive/60 px-3 py-1.5 text-xs text-destructive"
            >
              Retry
            </button>
          </section>
        )}

        {!scansQuery.isLoading && !scansQuery.isError && (scansQuery.data?.length ?? 0) === 0 && (
          <section className="rounded-lg border border-border bg-card/90 p-6 text-center text-muted-foreground">
            No scans found yet. Start one from the scanner page.
          </section>
        )}

        {!scansQuery.isLoading && !scansQuery.isError && (scansQuery.data?.length ?? 0) > 0 && (
          <section className="overflow-hidden rounded-lg border border-border bg-card/90">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-secondary text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Scan</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Matched</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scansQuery.data?.map((scan) => (
                    <tr key={scan.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs text-primary">#{scan.id}</td>
                      <td className="px-4 py-3">{scan.targetUrl || 'N/A'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(scan.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded border px-2 py-0.5 text-xs font-medium ${stateBadgeClass(scan.scanState)}`}>
                          {scan.scanState}
                        </span>
                      </td>
                      <td className="px-4 py-3">{scan.scanMeta.matchedFindings}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/scans/${scan.id}`}
                          className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
