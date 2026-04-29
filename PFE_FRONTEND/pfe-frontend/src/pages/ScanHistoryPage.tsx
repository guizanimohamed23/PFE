import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getScans } from '../api/scanApi'
import type { ScanResponse } from '../types/scan'

function formatDateTime(value: string): string {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

function stateBadgeClass(state: ScanResponse['scanState']): string {
  if (state === 'completed') return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
  if (state === 'scanner_unusable') return 'border-orange-500/40 text-orange-400 bg-orange-500/10'
  return 'border-destructive/40 text-destructive bg-destructive/10'
}

export default function ScanHistoryPage() {
  const scansQuery = useQuery({
    queryKey: ['scans'],
    queryFn: getScans,
  })

  return (
    <div className="min-h-screen bg-[#0a0c10] p-10 font-sans text-slate-200 relative overflow-hidden">
      <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        <header className="bg-[#11141d]/80 border border-white/5 p-8 rounded-lg flex justify-between items-center backdrop-blur-sm">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Scan History</h1>
            <p className="text-sm text-slate-500">Review previous scans and open full details.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/scanner" className="px-4 py-2 bg-white/5 border border-white/5 rounded text-xs font-semibold text-slate-400 hover:bg-white/10 transition-all">New Scan</Link>
            <Link to="/" className="px-4 py-2 bg-white/5 border border-white/5 rounded text-xs font-semibold text-slate-400 hover:bg-white/10 transition-all">Attack Paths</Link>
          </div>
        </header>

        <section className="bg-[#11141d]/80 border border-white/5 rounded-lg backdrop-blur-sm overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/2">
                  <th className="px-6 py-5">Scan</th>
                  <th className="px-6 py-5">Target</th>
                  <th className="px-6 py-5">Created</th>
                  <th className="px-6 py-5 text-center">State</th>
                  <th className="px-6 py-5 text-center">Matched</th>
                  <th className="px-6 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {scansQuery.isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-xs font-mono text-primary animate-pulse uppercase tracking-widest">Awaiting Data Stream...</td></tr>
                ) : scansQuery.data?.map(scan => (
                  <tr key={scan.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-5 font-mono text-xs text-primary font-bold">#{scan.id}</td>
                    <td className="px-6 py-5 text-sm text-slate-300 max-w-xs truncate">{scan.targetUrl}</td>
                    <td className="px-6 py-5 text-xs text-slate-500">{formatDateTime(scan.createdAt)}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase inline-block min-w-[120px] ${stateBadgeClass(scan.scanState)}`}>
                        {scan.scanState}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-slate-300 text-sm">{scan.scanMeta.matchedFindings}</td>
                    <td className="px-6 py-5 text-right">
                      <Link to={`/scans/${scan.id}`} className="text-xs font-bold text-primary hover:underline uppercase tracking-tighter">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
