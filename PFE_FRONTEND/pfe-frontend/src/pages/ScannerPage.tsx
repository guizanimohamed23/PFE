import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { createScan } from '../api/scanApi'
import { HttpError } from '../api/httpClient'
import type { ScanMode, ScanResponse } from '../types/scan'

function formatDateTime(value: string): string {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
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
    onError: (err) => setRequestError(err instanceof HttpError ? err.message : 'Scan request failed.'),
  })

  // Mock metadata extraction from findings or profile
  const targetMetadata = useMemo(() => {
    if (!latestScan) return null;
    return {
      ip: "34.149.87.120", // This would ideally come from latestScan.targetProfile
      tech: ["Java/Tomcat", "Apache", "JSP"],
      headers: [
        { name: "CSP", status: "missing" },
        { name: "HSTS", status: "missing" },
        { name: "X-Frame", status: "missing" },
        { name: "X-Content", status: "present" }
      ],
      ports: [80, 443]
    };
  }, [latestScan]);

  return (
    <div className="min-h-screen bg-[#0B0F14] p-10 font-sans text-slate-200 relative overflow-hidden">
      <div className="dot-grid fixed inset-0 opacity-10 pointer-events-none" />
      
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        
        {/* ── Scanner Control Center ── */}
        <section className="bg-[#11141d]/80 border border-white/5 p-8 rounded-xl shadow-2xl backdrop-blur-md">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">Security Scanner</h1>
              <p className="text-sm text-slate-500 font-medium">Project automated red-team assessments against target infrastructure.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/" className="px-5 py-2 bg-white/5 border border-white/10 rounded text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all">Attack Paths</Link>
              <Link to="/scans" className="px-5 py-2 bg-white/5 border border-white/10 rounded text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all">Scan History</Link>
            </div>
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); createScanMutation.mutate({ url: targetUrl, mode: scanMode }) }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Configuration</label>
              <div className="flex gap-4">
                <input
                  type="url"
                  placeholder="https://target-endpoint.com"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 p-4 rounded-lg text-sm text-primary font-mono outline-none focus:border-primary/40 transition-all"
                  required
                />
                <button
                  type="submit"
                  disabled={createScanMutation.isPending}
                  className="px-10 py-4 bg-primary text-primary-foreground font-black text-xs rounded-lg uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,255,0.2)] disabled:opacity-50 disabled:scale-100"
                >
                  {createScanMutation.isPending ? 'Initializing...' : 'Start Scan'}
                </button>
              </div>
            </div>
          </form>
        </section>

        {requestError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg font-black uppercase tracking-widest animate-pulse">
            [!] CRITICAL_ERROR: {requestError}
          </div>
        )}

        {/* ── Scan Results Architecture ── */}
        {latestScan && (
          <section className="bg-[#11141d]/60 border border-white/5 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-top-6 duration-700">
            
            {/* Header HUD */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Scan_Session_Report</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-widest ${
                  latestScan.scanState === 'completed' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5' : 'border-orange-500/40 text-orange-400 bg-orange-500/5'
                }`}>
                  {latestScan.scanState}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Session_ID</span>
                <span className="text-sm font-mono text-primary font-bold">#{latestScan.id}</span>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-0">
              
              {/* ── Left Side: Target Intelligence ── */}
              <div className="lg:col-span-4 border-r border-white/5 p-8 space-y-10">
                
                {/* Meta Stats */}
                <section>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Target_Profile</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs text-slate-500">IP_Address</span>
                      <span className="text-xs font-mono text-white">{targetMetadata?.ip}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs text-slate-500">Response_Time</span>
                      <span className="text-xs text-emerald-400 font-bold">412ms</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-xs text-slate-500">Tech_Stack</span>
                      <div className="flex gap-2">
                        {targetMetadata?.tech.map(t => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-slate-400 font-bold">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Security Headers */}
                <section>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Security_Headers</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {targetMetadata?.headers.map(h => (
                      <div key={h.name} className={`p-3 border rounded flex flex-col gap-1 transition-all ${
                        h.status === 'present' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
                      }`}>
                        <span className="text-[10px] font-bold text-white tracking-tight">{h.name}</span>
                        <span className={`text-[8px] font-black uppercase ${h.status === 'present' ? 'text-emerald-500' : 'text-red-500'}`}>{h.status}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Network Nodes */}
                <section>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Network_Nodes</h3>
                  <div className="flex gap-3">
                    {targetMetadata?.ports.map(p => (
                      <div key={p} className="p-3 bg-white/2 border border-white/5 rounded-lg text-center min-w-[60px]">
                        <p className="text-sm font-black text-primary">{p}</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase">TCP_OPEN</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* ── Right Side: Vulnerability Findings ── */}
              <div className="lg:col-span-8 p-8 space-y-8 bg-black/10">
                
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-6 mb-10">
                  <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Total_Findings</p>
                    <p className="text-xl font-black text-white">{latestScan.scanMeta.totalFindings}</p>
                  </div>
                  <div className="p-4 bg-white/2 border border-white/5 rounded-lg border-l-4 border-red-500/40">
                    <p className="text-[9px] font-black text-red-500 uppercase mb-1">Critical_Threats</p>
                    <p className="text-xl font-black text-white">{latestScan.scanMeta.matchedFindings}</p>
                  </div>
                  <div className="p-4 bg-white/2 border border-white/5 rounded-lg">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Unmatched</p>
                    <p className="text-xl font-black text-white">{latestScan.scanMeta.unmatchedFindings}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {latestScan.results.map(item => (
                    <article key={item.id} className="group">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                          item.severity === 'Critical' ? 'border-red-500/40 text-red-500 bg-red-500/5' : 
                          item.severity === 'high' ? 'border-orange-500/40 text-orange-500 bg-orange-500/5' :
                          'border-white/10 text-slate-500'
                        }`}>
                          {item.severity}
                        </span>
                        <span className="text-[10px] font-mono text-primary/40 font-bold tracking-widest">{item.vulnerability?.cveId || 'THREAT_SIG'}</span>
                      </div>
                      
                      <div className="p-5 bg-white/2 border border-white/5 rounded-lg group-hover:border-primary/20 transition-all">
                        <h4 className="text-sm font-black text-white mb-4 uppercase tracking-tight leading-snug group-hover:text-primary transition-colors">{item.title}</h4>
                        {item.evidence && (
                          <div className="bg-black/60 p-4 rounded-lg border border-white/5">
                            <pre className="text-[11px] text-slate-500 font-mono leading-relaxed whitespace-pre-wrap">{item.evidence}</pre>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                  {latestScan.results.length === 0 && (
                    <div className="py-20 text-center">
                      <p className="text-sm text-slate-600 font-black uppercase tracking-widest italic opacity-40">Zero_Threats_Detected</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Session Action */}
            <div className="p-8 border-t border-white/5 bg-[#11141d]/40 flex justify-between items-center">
              <p className="text-[10px] text-slate-600 font-mono italic">Audit session complete. Intelligence stream closed.</p>
              <Link to={`/scans/${latestScan.id}`} className="px-6 py-2 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded hover:bg-primary hover:text-primary-foreground transition-all">Open Full Intelligence Report</Link>
            </div>

          </section>
        )}
      </div>
    </div>
  )
}
