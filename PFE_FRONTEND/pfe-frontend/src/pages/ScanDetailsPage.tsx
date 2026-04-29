import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { getScanById } from '../api/scanApi'

// Mock metadata for demonstration
const mockMetadata = {
  target: {
    ip: "34.149.87.120",
    status: "200 OK",
    response_time: "412ms",
    content_length: "62KB",
    type: "SPA"
  },
  tech_stack: {
    frontend: "Angular",
    backend: "Node.js",
    server: "Nginx",
    libraries: ["RxJS", "Zone.js", "Express"]
  },
  security_headers: [
    { name: "Content-Security-Policy", state: "missing" },
    { name: "Strict-Transport-Security", state: "missing" },
    { name: "X-Frame-Options", state: "missing" },
    { name: "X-Content-Type-Options", state: "present" },
    { name: "Referrer-Policy", state: "missing" }
  ],
  network: {
    open_ports: [
      { port: 80, service: "http" },
      { port: 443, service: "https" },
      { port: 8080, service: "http-proxy" }
    ],
    endpoints: ["/login", "/rest/user/login", "/api/products", "/search?q=", "/admin"]
  },
  scan_profile: {
    mode: "comprehensive",
    auth: "false",
    complexity: "high",
    surface_score: 8.2
  },
  tools: ["nuclei", "sqlmap", "nikto", "dalfox", "ffuf"]
}

type TabType = 'intel' | 'findings'

export default function ScanDetailsPage() {
  const { scanId: id } = useParams()
  const scanIdNum = Number(id)
  const [activeTab, setActiveTab] = useState<TabType>('intel')
  
  const { data: scan, isLoading } = useQuery({
    queryKey: ['scan', id],
    queryFn: () => getScanById(scanIdNum),
    enabled: !isNaN(scanIdNum), 
  })

  if (isNaN(scanIdNum)) return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center p-10">
      <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-xl text-center max-w-md">
        <h2 className="text-red-500 font-black uppercase mb-4 tracking-widest">Invalid Session ID</h2>
        <p className="text-slate-400 text-sm">The session ID "{id}" is not a valid identifier. Please return to history and try again.</p>
        <Link to="/scans" className="mt-6 inline-block text-xs font-bold text-primary underline">Return to Scan History</Link>
      </div>
    </div>
  )

  if (isLoading) return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-primary tracking-[0.4em] uppercase animate-pulse">Decrypting Audit Data</p>
      </div>
    </div>
  )

  if (!scan) return <div className="p-20 text-center text-red-500">Scan not found.</div>

  return (
    <div className="min-h-screen bg-[#0B0F14] text-slate-200 font-sans pb-20 selection:bg-primary/20">
      <div className="dot-grid fixed inset-0 opacity-10 pointer-events-none" />

      {/* ── Executive Audit HUD ── */}
      <header className="sticky top-0 z-50 bg-[#0B0F14]/90 backdrop-blur-xl border-b border-white/5 px-10 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-6">
              <Link to="/scans" className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white no-print">←</Link>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-lg font-black text-white uppercase tracking-tight">Security Audit Report</h1>
                  <span className="text-[10px] font-mono text-primary px-2 py-0.5 bg-primary/5 border border-primary/20 rounded">#{scan.id}</span>
                </div>
                <p className="text-xs text-slate-500 font-mono">{scan.targetUrl}</p>
              </div>
            </div>
            
            <div className="flex gap-6 items-center no-print">
              <button 
                onClick={() => window.print()}
                className="px-5 py-2 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center gap-2"
              >
                <span>⎙</span> Export PDF
              </button>
              <div className="h-10 w-px bg-white/10" />
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Surface Score</p>
                <p className="text-2xl font-black text-primary tracking-tighter">{mockMetadata.scan_profile.surface_score}<span className="text-xs opacity-40 ml-1">/10</span></p>
              </div>
            </div>
          </div>

          {/* ── Tab Navigation ── */}
          <nav className="flex gap-8 border-b border-white/5 no-print">
            <button 
              onClick={() => setActiveTab('intel')}
              className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${
                activeTab === 'intel' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Target Intelligence
              {activeTab === 'intel' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
            </button>
            <button 
              onClick={() => setActiveTab('findings')}
              className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${
                activeTab === 'findings' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Vulnerability Audit
              <span className="ml-2 px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded-full text-[9px] border border-red-500/20">{scan.scanMeta.matchedFindings}</span>
              {activeTab === 'findings' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-10 mt-12 relative z-10">
        
        {/* ── Tab 1: Target Intelligence ── */}
        {activeTab === 'intel' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-12 gap-8">
              
              {/* Environment Profile */}
              <div className="col-span-7 space-y-8">
                <section className="bg-white/2 border border-white/5 rounded-xl p-8">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full" /> Environment Fingerprint
                  </h3>
                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <p className="text-[10px] text-slate-500 uppercase font-black">Tech Stack</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Frontend</span>
                          <span className="text-white font-bold">{mockMetadata.tech_stack.frontend}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Backend</span>
                          <span className="text-white font-bold">{mockMetadata.tech_stack.backend}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Server</span>
                          <span className="text-white font-bold">{mockMetadata.tech_stack.server}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] text-slate-500 uppercase font-black">Network Stats</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Resolved IP</span>
                          <span className="text-white font-mono">{mockMetadata.target.ip}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Status</span>
                          <span className="text-emerald-400 font-bold">{mockMetadata.target.status}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Latency</span>
                          <span className="text-white">{mockMetadata.target.response_time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white/2 border border-white/5 rounded-xl p-8">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Security Headers
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {mockMetadata.security_headers.map(h => (
                      <div key={h.name} className="flex justify-between items-center p-3 bg-black/20 border border-white/5 rounded-lg">
                        <span className="text-xs text-slate-400">{h.name}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                          h.state === 'present' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 'border-red-500/30 text-red-500 bg-red-500/5'
                        }`}>{h.state}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Recon Sidebar */}
              <div className="col-span-5 space-y-8">
                <section className="bg-white/2 border border-white/5 rounded-xl p-8">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-6">Open Ports</h3>
                  <div className="flex flex-wrap gap-3">
                    {mockMetadata.network.open_ports.map(p => (
                      <div key={p.port} className="flex-1 min-w-[80px] p-4 bg-[#11141d] border border-white/10 rounded-lg text-center">
                        <p className="text-lg font-black text-primary mb-1">{p.port}</p>
                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">{p.service}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white/2 border border-white/5 rounded-xl p-8">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-6">Attack Surface Map</h3>
                  <div className="space-y-2">
                    {mockMetadata.network.endpoints.map(ep => (
                      <div key={ep} className="text-[10px] font-mono text-slate-500 p-3 bg-black/40 border border-white/5 rounded hover:text-primary transition-colors cursor-default">
                        {ep}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Vulnerability Audit ── */}
        {activeTab === 'findings' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center px-4">
              <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">System Findings</h2>
              <p className="text-xs text-slate-600 italic">Total of {scan.scanMeta.matchedFindings} vulnerabilities detected.</p>
            </div>
            
            <div className="grid gap-6">
              {scan.results.map(item => (
                <article key={item.id} className="bg-white/2 border border-white/5 rounded-xl overflow-hidden group hover:border-primary/20 transition-all duration-300">
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            item.severity === 'Critical' ? 'border-red-500/40 text-red-500 bg-red-500/5' : 'border-orange-500/40 text-orange-500 bg-orange-500/5'
                          }`}>
                            {item.severity}
                          </span>
                          <span className="text-[10px] font-mono text-primary font-black tracking-widest uppercase opacity-60">{item.vulnerability?.cveId || 'THREAT-SIG'}</span>
                        </div>
                        <h4 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{item.title}</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Impact Score</p>
                        <p className="text-xl font-black text-white tracking-tighter">7.5 <span className="text-[10px] opacity-40 font-normal">CVSS</span></p>
                      </div>
                    </div>

                    <div className="bg-black/60 p-6 rounded-lg border border-white/5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Evidence & Reproduction</p>
                      <pre className="text-[12px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap selection:bg-primary/40">{item.evidence}</pre>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ── Professional Footer ── */}
      <footer className="max-w-6xl mx-auto px-10 mt-20 pt-10 border-t border-white/5 flex justify-between items-center opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
        <div className="flex gap-10">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Orchestration</p>
            <div className="flex gap-2">
              {mockMetadata.tools.map(tool => (
                <span key={tool} className="text-[9px] font-black uppercase">{tool}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Report Date</p>
            <p className="text-[10px] font-mono text-white">29 APR 2026</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-primary tracking-widest uppercase italic">HexStrike Intelligence</p>
        </div>
      </footer>
    </div>
  )
}
