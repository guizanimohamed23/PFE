import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  generateAttackScenario,
  getVulnerabilities,
  normalizeScenarioPayload,
  type NormalizedScenario,
} from './api/attackApi'
import { useAuth } from './context/AuthContext'
import { type AiGenerateRequest, type AttackGraphNodeData, type Severity } from './types/attack'

type AttackNode = Node<AttackGraphNodeData, 'attackStep'>
type AttackEdge = Edge

const severityMap: Record<Severity | string, { label: string; cls: string }> = {
  Critical: { label: 'CRITICAL', cls: 'bg-red-500/10 text-red-500 border-red-500/30' },
  High: { label: 'HIGH', cls: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  Medium: { label: 'MEDIUM', cls: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
  Low: { label: 'LOW', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
}

function AttackStepNode({ data, selected }: NodeProps<AttackNode>) {
  const sev = severityMap[data.severity] || severityMap.Medium
  return (
    <div className={`relative transition-all duration-300 ${selected ? 'scale-105' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2 !border-none" />
      <div className={`bg-[#11141d]/90 backdrop-blur-md border-2 rounded-lg p-5 min-w-[280px] shadow-2xl ${
        selected ? 'border-primary ring-4 ring-primary/10' : 'border-white/5'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Step 0{data.stepNumber}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sev.cls}`}>{sev.label}</span>
        </div>
        <h3 className="text-sm font-bold text-white mb-2 leading-tight uppercase tracking-tight">{data.title}</h3>
        <p className="text-[10px] text-primary/70 font-mono mb-3 uppercase tracking-tighter">MITRE_ID: {data.mitreId || 'T1059'}</p>
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{data.description}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2 !border-none" />
    </div>
  )
}

const nodeTypes = { attackStep: AttackStepNode }

export default function App() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [selectedVulnerabilityId, setSelectedVulnerabilityId] = useState<number | null>(null)
  const [selectedStepNodeId, setSelectedStepNodeId] = useState<string | null>(null)
  const [scenario, setScenario] = useState<NormalizedScenario | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<AttackNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<AttackEdge>([])

  const vulnerabilitiesQuery = useQuery({
    queryKey: ['vulnerabilities'],
    queryFn: getVulnerabilities,
  })

  const generateMutation = useMutation({
    mutationFn: (payload: AiGenerateRequest) => generateAttackScenario(payload),
    onSuccess: (payload) => {
      const normalized = normalizeScenarioPayload(payload)
      const flowNodes = normalized.graph.nodes.map((node, i) => ({
        ...node,
        type: 'attackStep',
        position: node.position ?? { x: 100 + (i % 2) * 350, y: 100 + Math.floor(i / 2) * 250 }
      }))
      setScenario(normalized)
      setNodes(flowNodes)
      setEdges(normalized.graph.edges.map(edge => ({
        ...edge,
        animated: true,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2, opacity: 0.4 },
        markerEnd: { type: 'arrowclosed', color: 'hsl(var(--primary))' }
      })))
    },
  })

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedStepNodeId), [nodes, selectedStepNodeId])

  return (
    <div className="h-screen flex flex-col bg-[#0B0F14] text-foreground font-sans overflow-hidden">
      {/* ── Header ── */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0B0F14] z-50">
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-black text-xs">HX</div>
            <span className="text-sm font-bold tracking-tight uppercase">HexStrike <span className="text-primary/40 italic">CORE</span></span>
          </Link>
          <nav className="flex gap-2">
            {[
              { label: 'Attack Paths', path: '/' },
              { label: 'Scanner', path: '/scanner' },
              { label: 'History', path: '/scans' },
            ].map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded ${
                  location.pathname === item.path ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[11px] font-bold text-white uppercase tracking-tighter">{user?.fullName || 'Mohamed Guizani'}</p>
            <p className="text-[9px] font-mono text-muted-foreground uppercase opacity-60 tracking-widest">Connected_Uplink</p>
          </div>
          <button onClick={logout} className="p-2.5 rounded border border-white/5 bg-white/2 hover:bg-red-500/10 hover:text-red-500 transition-all text-xs">⏻</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        
        {/* ── Left Sidebar (Threat Inventory) ── */}
        <aside className={`transition-all duration-700 ease-in-out border-r border-white/5 bg-[#0D1117] flex flex-col z-20 ${
          selectedVulnerabilityId ? 'w-[340px]' : 'w-full'
        }`}>
          <div className="p-8 pb-4 flex justify-between items-center">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Threat_Inventory</h2>
            {!selectedVulnerabilityId && (
              <span className="text-[9px] font-bold text-primary bg-primary/5 px-2 py-1 rounded border border-primary/20 animate-pulse">Select_Primary_Target</span>
            )}
          </div>
          
          <div className={`flex-1 overflow-y-auto p-8 pt-4 sidebar-scroll transition-all duration-500 ${
            selectedVulnerabilityId ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          }`}>
            {vulnerabilitiesQuery.data?.map(v => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVulnerabilityId(v.id)
                  generateMutation.mutate({ vulnerabilityId: v.id, language: 'en', stepCount: 5 })
                }}
                className={`w-full text-left p-6 rounded-lg border-2 transition-all duration-500 group relative ${
                  selectedVulnerabilityId === v.id 
                  ? 'bg-primary/5 border-primary shadow-[0_0_30px_rgba(0,255,255,0.08)] scale-102 z-10' 
                  : 'bg-white/2 border-white/5 hover:border-white/10 hover:bg-white/4'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-mono text-primary font-black uppercase tracking-widest">{v.cveId || 'THREAT'}</span>
                  <span className="text-[10px] font-black text-muted-foreground tracking-tighter opacity-60">CVSS {v.cvssScore?.toFixed(1) || 'N/A'}</span>
                </div>
                <h3 className="text-[13px] font-black text-white mb-6 uppercase leading-tight group-hover:text-primary transition-colors line-clamp-2">{v.title}</h3>
                <div className="flex justify-between items-end">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                    v.severity === 'Critical' ? 'border-red-500/40 text-red-500 bg-red-500/5' : 'border-primary/40 text-primary bg-primary/5'
                  }`}>
                    {v.severity}
                  </span>
                  {selectedVulnerabilityId === v.id && (
                    <span className="text-[8px] font-black text-primary animate-pulse tracking-tighter">SELECTED</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Center Canvas ── */}
        <section className={`transition-all duration-700 ease-in-out relative bg-[#0B0F14] dot-grid flex flex-col ${
          selectedVulnerabilityId ? 'flex-1 translate-x-0 opacity-100' : 'w-0 translate-x-12 opacity-0'
        }`}>
          {generateMutation.isPending && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F14]/90 backdrop-blur-md">
              <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-6" />
              <span className="text-[10px] font-black text-primary tracking-[0.5em] uppercase animate-pulse">Synthesizing_Attack_Path</span>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, n) => setSelectedStepNodeId(n.id)}
            fitView
            className="flex-1"
          >
            <Background color="#1e293b" gap={25} size={0.5} />
            <Controls className="!bg-[#11141d] !border-white/10 !fill-primary" />
          </ReactFlow>
        </section>

        {/* ── Right Panel (Intelligence Feed) ── */}
        <aside className={`transition-all duration-1000 delay-100 border-l border-white/5 bg-[#0D1117] flex flex-col ${
          selectedVulnerabilityId ? 'w-[380px] translate-x-0 opacity-100' : 'w-0 translate-x-full opacity-0'
        }`}>
          <div className="p-8 space-y-10 overflow-y-auto sidebar-scroll">
            
            {/* ── Tactical Scenario Section ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Tactical Scenario</h3>
              </div>
              <div className="p-5 rounded-lg bg-black/40 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                {!scenario ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-2 w-3/4 bg-white/5 rounded" />
                    <div className="h-2 w-1/2 bg-white/5 rounded" />
                    <p className="text-[9px] font-mono text-primary/40 mt-3">INITIALIZING_SIMULATION...</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-white/80 leading-relaxed font-medium">
                    {scenario.scenario}
                  </p>
                )}
              </div>
            </section>

            {/* ── Node Telemetry Section ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Node Telemetry</h3>
              </div>
              {selectedNode ? (
                <div className="p-6 rounded-lg bg-primary/5 border border-primary/20 space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-primary tracking-widest uppercase">NODE_STEP_{selectedNode.data.stepNumber}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${severityMap[selectedNode.data.severity]?.cls}`}>
                      {selectedNode.data.severity}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-tight leading-snug">{selectedNode.data.title}</h4>
                  <div className="h-px bg-white/5 w-full" />
                  <p className="text-[11px] text-slate-300 leading-relaxed">{selectedNode.data.description}</p>
                </div>
              ) : (
                <div className="p-10 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center opacity-40">
                  <div className="text-xl mb-2 text-muted-foreground">⌬</div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Awaiting_Selection</p>
                </div>
              )}
            </section>

            {/* ── Countermeasures Section ── */}
            <section className="pb-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Countermeasures</h3>
              </div>
              {!scenario ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 w-full bg-white/2 rounded-lg border border-white/5 animate-pulse flex items-center px-4">
                      <div className="h-2 w-full bg-white/5 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {scenario.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-lg border border-white/5 bg-[#11141d] hover:border-primary/20 transition-all group">
                      <span className="text-primary font-black text-[10px] opacity-40 group-hover:opacity-100 italic">0{i+1}</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-bold">{rec}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </aside>
      </main>
    </div>
  )
}
