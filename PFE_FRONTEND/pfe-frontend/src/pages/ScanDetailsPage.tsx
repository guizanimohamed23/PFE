import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { getScanById } from '../api/scanApi'

// Mock metadata for demonstration if not provided by API
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

export default function ScanDetailsPage() {
  const { scanId: id } = useParams()
  const scanIdNum = Number(id)
  
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

      {/* ── Top Audit HUD ── */}
      <header className="sticky top-0 z-50 bg-[#0B0F14]/80 backdrop-blur-xl border-b border-white/5 px-10 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
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
          
          <div className="flex gap-8 items-center">
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()}
                className="px-5 py-2 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-2"
              >
                <span>⎙</span> Export PDF Report
              </button>
            </div>
            <div className="text-center border-r border-white/10 pr-8">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Attack Surface</p>
              <p className="text-2xl font-black text-primary tracking-tighter">{mockMetadata.scan_profile.surface_score}<span className="text-xs opacity-40 ml-1">/10</span></p>
            </div>
            <div className="flex gap-4">
              <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-center min-w-[80px]">
                <p className="text-[9px] font-bold text-red-500 uppercase">High</p>
                <p className="text-lg font-black text-white">{scan.scanMeta.matchedFindings}</p>
              </div>
              <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-center min-w-[80px]">
                <p className="text-[9px] font-bold text-orange-500 uppercase">Medium</p>
                <p className="text-lg font-black text-white">1</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-10 mt-10 grid grid-cols-12 gap-8 relative z-10">
        
        {/* ── Left Column: Target Profile ── */}
        <div className="col-span-4 space-y-8">
          
          {/* Target Intel */}
          <section className="bg-card/40 border border-white/5 rounded-xl p-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Target Intelligence</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[11px] text-slate-500">Resolved IP</span>
                <span className="text-[11px] font-mono text-white">{mockMetadata.target.ip}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[11px] text-slate-500">Status Code</span>
                <span className="text-[11px] font-bold text-emerald-400">{mockMetadata.target.status}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[11px] text-slate-500">Latency</span>
                <span className="text-[11px] text-white">{mockMetadata.target.response_time}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[11px] text-slate-500">App Type</span>
                <span className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-bold uppercase">{mockMetadata.target.type}</span>
              </div>
            </div>
          </section>

          {/* Technology Stack */}
          <section className="bg-card/40 border border-white/5 rounded-xl p-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Technology Stack</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/2 border border-white/5 rounded-lg">
                <p className="text-[9px] text-slate-500 uppercase mb-1">Frontend</p>
                <p className="text-xs font-bold text-white">{mockMetadata.tech_stack.frontend}</p>
              </div>
              <div className="p-3 bg-white/2 border border-white/5 rounded-lg">
                <p className="text-[9px] text-slate-500 uppercase mb-1">Backend</p>
                <p className="text-xs font-bold text-white">{mockMetadata.tech_stack.backend}</p>
              </div>
              <div className="p-3 bg-white/2 border border-white/5 rounded-lg col-span-2">
                <p className="text-[9px] text-slate-500 uppercase mb-2">Active Libraries</p>
                <div className="flex flex-wrap gap-2">
                  {mockMetadata.tech_stack.libraries.map(lib => (
                    <span key={lib} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded text-slate-400">{lib}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Security Headers */}
          <section className="bg-card/40 border border-white/5 rounded-xl p-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Security Headers</h3>
            <div className="space-y-3">
              {mockMetadata.security_headers.map(header => (
                <div key={header.name} className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 truncate mr-4">{header.name}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                    header.state === 'present' ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/5' : 'border-red-500/40 text-red-500 bg-red-500/5'
                  }`}>
                    {header.state}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right Column: Scan Findings ── */}
        <div className="col-span-8 space-y-8">
          
          {/* Recon Section */}
          <div className="grid grid-cols-2 gap-8">
            <section className="bg-card/40 border border-white/5 rounded-xl p-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Open Ports</h3>
              <div className="flex flex-wrap gap-3">
                {mockMetadata.network.open_ports.map(p => (
                  <div key={p.port} className="flex flex-col items-center p-3 bg-[#11141d] border border-white/5 rounded-lg min-w-[70px]">
                    <span className="text-sm font-black text-primary">{p.port}</span>
                    <span className="text-[9px] text-slate-500 uppercase">{p.service}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="bg-card/40 border border-white/5 rounded-xl p-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Endpoints Map</h3>
              <div className="space-y-2">
                {mockMetadata.network.endpoints.map(ep => (
                  <div key={ep} className="text-[10px] font-mono text-slate-400 p-2 bg-white/2 border border-white/5 rounded truncate">
                    {ep}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Vulnerability Feed */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-2">Vulnerability Findings</h3>
            {scan.results.map(item => (
              <article key={item.id} className="bg-card/60 border border-white/5 rounded-xl overflow-hidden group hover:border-primary/30 transition-all duration-300">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          item.severity === 'Critical' ? 'border-red-500/40 text-red-500 bg-red-500/5' : 'border-orange-500/40 text-orange-500 bg-orange-500/5'
                        }`}>
                          {item.severity}
                        </span>
                        <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase">{item.vulnerability?.cveId || 'THREAT-SIG'}</span>
                      </div>
                      <h4 className="text-base font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{item.title}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Engine</p>
                      <p className="text-[11px] font-mono text-slate-300 uppercase">{item.vulnerability?.type || 'CORE'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="p-3 bg-white/2 border border-white/5 rounded-lg">
                      <p className="text-[9px] text-slate-500 uppercase mb-1">Attack Vector</p>
                      <p className="text-xs text-slate-300 font-mono">/rest/products?id=1</p>
                    </div>
                    <div className="p-3 bg-white/2 border border-white/5 rounded-lg">
                      <p className="text-[9px] text-slate-500 uppercase mb-1">Impact Type</p>
                      <p className="text-xs text-slate-300 uppercase font-bold">{item.vulnerability?.type || 'Confidentiality'}</p>
                    </div>
                  </div>

                  {item.evidence && (
                    <div className="bg-black/60 p-5 rounded-lg border border-white/10">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Evidence Trace</span>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500/20" />
                          <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                          <div className="w-2 h-2 rounded-full bg-green-500/20" />
                        </div>
                      </div>
                      <pre className="text-[11px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">{item.evidence}</pre>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Tools Footer */}
          <div className="pt-8 border-t border-white/5 flex items-center justify-between">
            <div className="flex gap-4 items-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Orchestration Nodes</p>
              <div className="flex gap-2">
                {mockMetadata.tools.map(tool => (
                  <span key={tool} className="text-[9px] px-2 py-1 bg-white/5 border border-white/5 rounded uppercase font-bold text-slate-500">{tool}</span>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-600 font-mono italic">Report generated via HexStrike Intelligent Decision Engine</p>
          </div>
        </div>
      </main>
    </div>
  )
}
