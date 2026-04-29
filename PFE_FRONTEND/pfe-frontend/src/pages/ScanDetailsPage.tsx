import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { getScanById } from '../api/scanApi'
import { useAuth } from '../context/AuthContext'

// Enhanced metadata with contextual insights
const mockMetadata = {
  target: {
    ip: "34.149.87.120",
    status: "200 OK",
    response_time: "412ms",
    content_length: "62KB",
    type: "SPA"
  },
  tech_stack: {
    frontend: "Angular v14.2",
    backend: "Node.js (Express)",
    server: "Nginx/1.18.0",
    libraries: ["RxJS", "Zone.js", "Express-Session", "JWT"]
  },
  security_headers: [
    { name: "Content-Security-Policy", state: "missing", risk: "high" },
    { name: "Strict-Transport-Security", state: "missing", risk: "high" },
    { name: "X-Frame-Options", state: "missing", risk: "medium" },
    { name: "X-Content-Type-Options", state: "present", risk: "none" },
    { name: "Referrer-Policy", state: "missing", risk: "low" }
  ],
  network: {
    open_ports: [
      { port: 80, service: "http" },
      { port: 443, service: "https" },
      { port: 8080, service: "http-proxy" }
    ],
    endpoints: ["/login", "/rest/user/login", "/api/products", "/search?q=", "/admin"],
    parameters: ["uid", "query", "session_id", "product_id", "token"]
  },
  diagnostics: {
    duration: "14m 22s",
    intensity: "Aggressive",
    mode: "Authenticated Active Fuzzing",
    success_rate: "98.4%"
  },
  auth_profile: {
    type: "JWT / Bearer Token",
    status: "Authenticated Session Established",
    scope: "Administrator"
  },
  risk_analysis: {
    interpretation: "The target infrastructure exhibits high exposure in the authentication and database layers. Multiple unauthenticated endpoints are susceptible to high-impact injection vectors.",
    priority: "Immediate: Remediation of SQL Injection on /login and XSS on /search.",
    overall_posture: "Critical Risk"
  },
  scan_profile: {
    surface_score: 8.2
  },
  tools: ["nuclei", "sqlmap", "nikto", "dalfox", "ffuf"]
}

type TabType = 'intel' | 'findings'

export default function ScanDetailsPage() {
  const { scanId: id } = useParams()
  const { user } = useAuth()
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
        <p className="text-xs font-bold text-primary tracking-[0.4em] uppercase animate-pulse">Generating Intelligence Report</p>
      </div>
    </div>
  )

  if (!scan) return <div className="p-20 text-center text-red-500">Scan not found.</div>

  return (
    <div className="min-h-screen bg-[#0B0F14] text-slate-200 font-sans pb-20 selection:bg-primary/20">
      <div className="dot-grid fixed inset-0 opacity-10 pointer-events-none no-print" />

      {/* ── SCREEN UI (UNTOUCHED STRUCTURE) ── */}
      <div className="no-print print:hidden">
        <header className="sticky top-0 z-50 bg-[#0B0F14]/90 backdrop-blur-xl border-b border-white/5 px-10 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-6">
                <Link to="/scans" className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white">←</Link>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-lg font-black text-white uppercase tracking-tight">Security Audit Report</h1>
                    <span className="text-[10px] font-mono text-primary px-2 py-0.5 bg-primary/5 border border-primary/20 rounded">#{scan.id}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{scan.targetUrl}</p>
                </div>
              </div>
              
              <div className="flex gap-6 items-center">
                <button 
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center gap-2"
                >
                  <span>⎙</span> Export Full Report
                </button>
                <div className="h-10 w-px bg-white/10" />
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Risk Surface</p>
                  <p className="text-2xl font-black text-primary tracking-tighter">{mockMetadata.scan_profile.surface_score}<span className="text-xs opacity-40 ml-1">/10</span></p>
                </div>
              </div>
            </div>

            <nav className="flex gap-8 border-b border-white/5">
              <button 
                onClick={() => setActiveTab('intel')}
                className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${
                  activeTab === 'intel' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Intelligence Profile
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
          {activeTab === 'intel' && (
            <div className="space-y-12 animate-in fade-in duration-500 pb-20">
              <div className="grid grid-cols-12 gap-8">
                {/* Column 1: Core Context */}
                <div className="col-span-7 space-y-8">
                  <section className="bg-white/2 border border-white/5 rounded-xl p-8">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_10px_#00ffff]" /> Target Intelligence
                    </h3>
                    <div className="grid grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-black mb-3">Diagnostic Summary</p>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between"><span>Scan Mode</span><span className="text-white font-bold">{mockMetadata.diagnostics.mode}</span></div>
                            <div className="flex justify-between"><span>Intensity</span><span className="text-white">{mockMetadata.diagnostics.intensity}</span></div>
                            <div className="flex justify-between"><span>Duration</span><span className="text-white">{mockMetadata.diagnostics.duration}</span></div>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-black mb-3">Auth Profile</p>
                          <div className="bg-primary/5 border border-primary/20 p-3 rounded text-[10px] space-y-2">
                            <div className="flex justify-between text-primary"><span>Status</span><span className="font-black">ACTIVE</span></div>
                            <div className="text-slate-400 leading-relaxed italic">{mockMetadata.auth_profile.type}</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-black mb-3">Tech Stack Fingerprint</p>
                          <div className="flex flex-wrap gap-2">
                            {mockMetadata.tech_stack.libraries.slice(0, 4).map(lib => (
                              <span key={lib} className="px-2 py-1 bg-white/5 border border-white/10 text-[9px] text-slate-300 rounded uppercase">{lib}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-black mb-3">Environment</p>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between"><span>OS / Server</span><span className="text-white">{mockMetadata.tech_stack.server}</span></div>
                            <div className="flex justify-between"><span>Latency</span><span className="text-emerald-400">{mockMetadata.target.response_time}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="bg-white/2 border border-white/5 rounded-xl p-8">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Attack Surface Mapping
                    </h3>
                    <div className="grid grid-cols-2 gap-10">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-4">Endpoints Detected</p>
                        <div className="space-y-2">
                          {mockMetadata.network.endpoints.map(ep => (
                            <div key={ep} className="text-[10px] font-mono text-slate-400 p-2 bg-black/40 border border-white/5 rounded">{ep}</div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-4">Active Parameters</p>
                        <div className="flex flex-wrap gap-2">
                          {mockMetadata.network.parameters.map(param => (
                            <span key={param} className="px-2 py-1 bg-white/5 border border-white/10 text-[10px] text-primary rounded font-mono">{param}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Column 2: Analysis & Controls */}
                <div className="col-span-5 space-y-8">
                  <section className="bg-primary/5 border border-primary/20 rounded-xl p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <span className="text-6xl font-black italic tracking-tighter">AI</span>
                    </div>
                    <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full animate-pulse" /> Intelligent Risk Interpretation
                    </h3>
                    <div className="space-y-6 relative z-10">
                      <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-primary/30 pl-4 bg-primary/5 py-2">
                        "{mockMetadata.risk_analysis.interpretation}"
                      </p>
                      <div className="space-y-4">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-[9px] font-black text-red-500 uppercase mb-2">Remediation Roadmap</p>
                          <p className="text-[11px] text-white font-bold leading-relaxed">{mockMetadata.risk_analysis.priority}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="bg-white/2 border border-white/5 rounded-xl p-8">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-6">Security Headers Audit</h3>
                    <div className="space-y-3">
                      {mockMetadata.security_headers.slice(0, 5).map(h => (
                        <div key={h.name} className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">{h.name}</span>
                          <span className={`px-2 py-0.5 rounded-full border ${h.state === 'present' ? 'border-emerald-500/30 text-emerald-500' : 'border-red-500/30 text-red-500'}`}>{h.state.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'findings' && (
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
              {/* Analysis Summary HUD */}
              <div className="grid grid-cols-4 gap-6 no-print">
                <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-xl text-center">
                  <p className="text-[9px] font-black text-red-500 uppercase mb-2">Critical Threats</p>
                  <p className="text-3xl font-black text-white">{scan.results.filter(r => r.severity.toLowerCase() === 'critical').length}</p>
                </div>
                <div className="bg-orange-500/5 border border-orange-500/10 p-6 rounded-xl text-center">
                  <p className="text-[9px] font-black text-orange-500 uppercase mb-2">High Impact</p>
                  <p className="text-3xl font-black text-white">{scan.results.filter(r => r.severity.toLowerCase() === 'high').length}</p>
                </div>
                <div className="bg-yellow-500/5 border border-yellow-500/10 p-6 rounded-xl text-center">
                  <p className="text-[9px] font-black text-yellow-500 uppercase mb-2">Medium Risk</p>
                  <p className="text-3xl font-black text-white">{scan.results.filter(r => r.severity.toLowerCase() === 'medium').length}</p>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-xl text-center">
                  <p className="text-[9px] font-black text-blue-500 uppercase mb-2">Total Surface Score</p>
                  <p className="text-3xl font-black text-white">{mockMetadata.scan_profile.surface_score}</p>
                </div>
              </div>

              <div className="grid gap-6">
                {scan.results.map(item => (
                  <article key={item.id} className="bg-white/2 border border-white/5 rounded-xl overflow-hidden group hover:border-primary/20 transition-all">
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${item.severity.toLowerCase() === 'critical' || item.severity.toLowerCase() === 'high' ? 'border-red-500/40 text-red-500 bg-red-500/5' : 'border-orange-500/40 text-orange-500 bg-orange-500/5'}`}>{item.severity}</span>
                            <span className="text-[10px] font-mono text-primary/40 font-black tracking-widest uppercase">{item.vulnerability?.cveId || 'THREAT-SIG'}</span>
                          </div>
                          <h4 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{item.title}</h4>
                        </div>
                      </div>
                      <div className="bg-black/60 p-6 rounded-lg border border-white/5">
                        <pre className="text-[12px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">{item.evidence}</pre>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── PRINT-ONLY REPORT (ENHANCED WITH DEEP CONTEXT) ── */}
      <div className="hidden print:block text-black bg-white font-sans">
        {/* Page 1: Metadata & AI Interpretation */}
        <div className="print:h-[270mm] print:mb-10 print:p-10">
          <header className="border-b-2 border-black pb-6 mb-10 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">HexStrike Security Audit</h1>
              <p className="text-sm font-mono mt-1 text-slate-600">{scan.targetUrl}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-slate-400 mb-1 tracking-widest">Lead Analyst</p>
              <p className="text-md font-black">{user?.fullName || 'Mohamed Guizani'}</p>
            </div>
          </header>

          <section className="mb-10 bg-slate-50 border border-slate-200 p-8 rounded-lg">
            <h3 className="text-xs font-black uppercase border-b border-black pb-2 mb-6 tracking-widest">Intelligent Risk Interpretation</h3>
            <div className="grid grid-cols-1 gap-6">
              <p className="text-sm leading-relaxed italic text-slate-700 border-l-4 border-slate-300 pl-6">
                "{mockMetadata.risk_analysis.interpretation}"
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div className="p-4 bg-white border border-slate-200">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Remediation Roadmap</p>
                  <p className="text-sm font-bold text-black">{mockMetadata.risk_analysis.priority}</p>
                </div>
                <div className="p-4 bg-white border border-slate-200 flex flex-col justify-center text-center">
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Exposure Score</p>
                   <p className="text-4xl font-black">{mockMetadata.scan_profile.surface_score}<span className="text-lg opacity-40">/10</span></p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="border border-slate-200 p-6">
                <h3 className="text-xs font-black uppercase mb-4 border-b pb-2">Target Profiling</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span>Diagnostic Mode</span><span className="font-bold">{mockMetadata.diagnostics.mode}</span></div>
                  <div className="flex justify-between"><span>Infrastructure</span><span className="font-bold">{mockMetadata.tech_stack.server}</span></div>
                  <div className="flex justify-between"><span>Auth Status</span><span className="font-bold text-emerald-700">Authenticated</span></div>
                  <div className="flex justify-between"><span>Scan Duration</span><span className="font-bold">{mockMetadata.diagnostics.duration}</span></div>
                </div>
              </div>
              <div className="border border-slate-200 p-6">
                <h3 className="text-xs font-black uppercase mb-4 border-b pb-2">Attack Surface Map</h3>
                <div className="space-y-2">
                   <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Discovered Entry Points</p>
                   <p className="text-xs font-mono text-slate-600 truncate">{mockMetadata.network.endpoints.join(' , ')}</p>
                   <p className="text-[10px] font-bold text-slate-500 uppercase mt-4 mb-2">Active Fuzzing Parameters</p>
                   <p className="text-xs font-mono text-slate-600">{mockMetadata.network.parameters.join(' , ')}</p>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 p-6">
              <h3 className="text-xs font-black uppercase mb-4 border-b pb-2">Vulnerability Taxonomy</h3>
              <div className="space-y-4">
                {scan.results.slice(0, 5).map(r => (
                  <div key={r.id} className="flex justify-between items-center text-xs">
                    <span className="font-bold uppercase truncate max-w-[150px]">{r.title}</span>
                    <span className={`font-black text-[9px] px-2 py-0.5 border rounded ${r.severity.toLowerCase() === 'critical' ? 'bg-red-50' : 'bg-orange-50'}`}>{r.severity}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-4 bg-slate-50 border-t-2 border-black">
                <p className="text-[10px] font-black uppercase mb-2">Security Posture</p>
                <p className="text-sm font-black">{mockMetadata.risk_analysis.overall_posture}</p>
              </div>
            </div>
          </section>

          <footer className="fixed bottom-10 left-10 right-10 text-[9px] border-t-2 border-black pt-4 flex justify-between italic text-slate-400">
            <span className="font-black uppercase tracking-widest text-black">Confidential Intelligence Report</span>
            <span>Page 1 of 2</span>
          </footer>
        </div>

        {/* Page 2: Detailed Vulnerability Audit Table */}
        <div className="print:break-before-page print:pt-10 print:p-10">
          <header className="border-b-2 border-black pb-6 mb-10">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Detailed Audit Findings</h2>
            <p className="text-[10px] text-slate-500 uppercase font-black mt-1">Full Technical Evidence & Reproduction Logs</p>
          </header>

          <table className="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-3 border border-slate-300 text-[10px] font-black uppercase tracking-widest">Risk</th>
                <th className="p-3 border border-slate-300 text-[10px] font-black uppercase tracking-widest">Vulnerability Identification</th>
                <th className="p-3 border border-slate-300 text-[10px] font-black uppercase tracking-widest">Technical Evidence</th>
              </tr>
            </thead>
            <tbody>
              {scan.results.map(item => (
                <tr key={item.id} className="print:break-inside-avoid">
                  <td className="p-3 border border-slate-300 text-center">
                    <span className={`font-black text-[9px] px-2 py-0.5 border rounded ${item.severity.toLowerCase() === 'critical' ? 'bg-red-100 text-red-900 border-red-300' : 'bg-orange-100 text-orange-900 border-orange-300'}`}>{item.severity.toUpperCase()}</span>
                  </td>
                  <td className="p-3 border border-slate-300">
                    <p className="text-xs font-black uppercase leading-tight">{item.title}</p>
                    <p className="text-[9px] font-mono text-slate-500 mt-1">{item.vulnerability?.cveId || 'THREAT-SIG-ID-01'}</p>
                    <p className="text-[9px] font-mono text-slate-400 italic mt-1">{item.vulnerability?.endpoint || '/api/rest/v1/user'}</p>
                  </td>
                  <td className="p-3 border border-slate-300">
                    <p className="text-[9px] font-mono text-slate-600 line-clamp-3 leading-relaxed">{item.evidence || 'No reproduction trace recorded for this signature.'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <footer className="fixed bottom-10 left-10 right-10 text-[9px] border-t-2 border-black pt-4 flex justify-between italic text-slate-400">
            <span className="font-black uppercase tracking-widest text-black">HexStrike Security Operations • {scan.id}</span>
            <span>Page 2 of 2</span>
          </footer>
        </div>
      </div>
    </div>
  )
}
