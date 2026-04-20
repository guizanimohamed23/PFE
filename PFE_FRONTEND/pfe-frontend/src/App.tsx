import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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

const severityClasses: Record<Severity, string> = {
  Critical: 'bg-severity-critical/20 text-severity-critical border-severity-critical/40',
  High: 'bg-severity-high/20 text-severity-high border-severity-high/40',
  Medium: 'bg-severity-medium/20 text-severity-medium border-severity-medium/40',
  Low: 'bg-severity-low/20 text-severity-low border-severity-low/40',
}

const severityBorderClasses: Record<Severity, string> = {
  Critical: 'border-l-severity-critical',
  High: 'border-l-severity-high',
  Medium: 'border-l-severity-medium',
  Low: 'border-l-severity-low',
}

function shortText(value: string, maxLength = 75): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}…`
}

function withFallbackPosition(nodes: NormalizedScenario['graph']['nodes']): AttackNode[] {
  return nodes.map((node, index) => ({
    id: node.id,
    type: 'attackStep',
    data: node.data,
    position: node.position ?? {
      x: 80 + (index % 3) * 300,
      y: 80 + Math.floor(index / 3) * 190,
    },
  }))
}

function toFlowEdges(edges: NormalizedScenario['graph']['edges']): AttackEdge[] {
  return edges.map((edge) => ({
    ...edge,
    type: 'smoothstep',
    markerEnd: {
      type: 'arrowclosed',
      color: 'hsl(var(--primary))',
    },
    style: {
      stroke: 'hsl(var(--primary))',
    },
  }))
}

function AttackStepNode({ data, selected }: NodeProps<AttackNode>) {
  return (
    <div
      className={`min-w-64 max-w-72 rounded-md border border-border bg-card p-3 shadow-lg border-l-4 ${severityBorderClasses[data.severity]} ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">STEP {data.stepNumber}</span>
        <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${severityClasses[data.severity]}`}>
          {data.severity}
        </span>
      </div>
      <h3 className="font-mono text-sm text-foreground">{data.title}</h3>
      <p className="mt-1 font-mono text-xs text-primary">MITRE: {data.techniqueId}</p>
      <p className="mt-2 text-xs text-muted-foreground">{shortText(data.description)}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  )
}

const nodeTypes = {
  attackStep: AttackStepNode,
}

export default function App() {
  const { user, logout } = useAuth()
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
      const flowNodes = withFallbackPosition(normalized.graph.nodes)

      setScenario(normalized)
      setNodes(flowNodes)
      setEdges(toFlowEdges(normalized.graph.edges))
      setSelectedStepNodeId(flowNodes[0]?.id ?? null)
    },
  })

  const selectedStep = useMemo(() => {
    if (!scenario || !selectedStepNodeId) {
      return null
    }

    const byStepId = scenario.steps.find((step) => String(step.step_id) === selectedStepNodeId)
    if (byStepId) {
      return {
        stepNumber: byStepId.step_id,
        title: byStepId.title,
        description: byStepId.description,
        techniqueId: byStepId.mitre_technique,
        severity: byStepId.severity,
      }
    }

    const byNode = scenario.graph.nodes.find((node) => node.id === selectedStepNodeId)
    return byNode?.data ?? null
  }, [scenario, selectedStepNodeId])

  const handleGenerate = (vulnerabilityId: number) => {
    setSelectedVulnerabilityId(vulnerabilityId)
    generateMutation.mutate({ vulnerabilityId, language: 'en', stepCount: 5 })
  }

  return (
    <main className="grid-bg min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-12 gap-4 p-4">
        <aside className="col-span-3 rounded-lg border border-border bg-card/95 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">Red Team Attack Paths</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  to="/scanner"
                  className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  Scanner
                </Link>
                <Link
                  to="/scans"
                  className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  Scan History
                </Link>
              </div>
              {user ? (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-muted-foreground">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.isGuest ? (
                    <span className="inline-flex rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      Guest Session
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              Logout
            </button>
          </div>

          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Vulnerabilities</h2>
          {vulnerabilitiesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading vulnerabilities...</p>}

          {vulnerabilitiesQuery.isError && (
            <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <p>Unable to load vulnerabilities.</p>
              <button
                type="button"
                onClick={() => vulnerabilitiesQuery.refetch()}
                className="mt-2 rounded border border-destructive/60 px-2 py-1 text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {!vulnerabilitiesQuery.isLoading && vulnerabilitiesQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No vulnerabilities available.</p>
          )}

          <div className="space-y-2">
            {vulnerabilitiesQuery.data?.map((vulnerability) => (
              <button
                key={vulnerability.id}
                type="button"
                onClick={() => handleGenerate(vulnerability.id)}
                className={`w-full rounded-md border p-3 text-left transition-colors ${
                  selectedVulnerabilityId === vulnerability.id
                    ? 'border-primary bg-primary/10 glow-primary'
                    : 'border-border bg-secondary hover:border-primary/40'
                }`}
              >
                <p className="font-mono text-xs text-primary">{vulnerability.cveId}</p>
                <p className="mt-1 text-sm font-semibold">{vulnerability.title}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className={`rounded border px-2 py-0.5 ${severityClasses[vulnerability.severity]}`}>
                    {vulnerability.severity}
                  </span>
                  <span>CVSS {vulnerability.cvssScore ? vulnerability.cvssScore.toFixed(1) : 'N/A'}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="col-span-6 overflow-hidden rounded-lg border border-border bg-card/80">
          {!selectedVulnerabilityId && (
            <div className="flex h-full min-h-[70vh] items-center justify-center p-6 text-center text-muted-foreground">
              Select a vulnerability to generate an AI attack path.
            </div>
          )}

          {selectedVulnerabilityId && generateMutation.isPending && (
            <div className="flex h-full min-h-[70vh] items-center justify-center">
              <div className="animate-pulse-glow rounded-md border border-primary/40 px-4 py-3 text-sm text-primary">
                Generating attack graph...
              </div>
            </div>
          )}

          {selectedVulnerabilityId && generateMutation.isError && (
            <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-destructive">Failed to generate attack scenario.</p>
              <button
                type="button"
                onClick={() => handleGenerate(selectedVulnerabilityId)}
                className="rounded border border-destructive/60 px-3 py-1.5 text-sm"
              >
                Retry generation
              </button>
            </div>
          )}

          {selectedVulnerabilityId && !generateMutation.isPending && !generateMutation.isError && scenario && (
            <div className="h-[78vh] w-full">
              <ReactFlow<AttackNode, AttackEdge>
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => setSelectedStepNodeId(node.id)}
                fitView
                fitViewOptions={{ padding: 0.25 }}
              >
                <MiniMap
                  pannable
                  zoomable
                  nodeStrokeColor={() => 'hsl(var(--primary))'}
                  nodeColor={() => 'hsl(var(--card))'}
                  maskColor="hsl(220 20% 7% / 0.7)"
                />
                <Controls />
                <Background gap={20} size={1} color="hsl(var(--border))" />
              </ReactFlow>
            </div>
          )}
        </section>

        <aside className="col-span-3 rounded-lg border border-border bg-card/95 p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Scenario</h2>
          <p className="mt-1 text-sm font-semibold">{scenario?.scenario ?? 'No scenario generated yet.'}</p>

          {scenario?.warnings.length ? (
            <div className="mt-3 rounded border border-severity-medium/40 bg-severity-medium/10 p-2 text-xs text-severity-medium">
              {scenario.warnings.join(' ')}
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-muted-foreground">Selected Step</h3>
            {!selectedStep ? (
              <p className="mt-1 text-sm text-muted-foreground">Select a graph node to inspect details.</p>
            ) : (
              <div className="mt-2 rounded-md border border-border bg-secondary p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs text-primary">STEP {selectedStep.stepNumber}</p>
                  <span className={`rounded border px-2 py-0.5 text-xs ${severityClasses[selectedStep.severity]}`}>
                    {selectedStep.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold">{selectedStep.title}</p>
                <p className="mt-1 font-mono text-xs text-primary">MITRE: {selectedStep.techniqueId}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedStep.description}</p>
              </div>
            )}
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-muted-foreground">Recommendations</h3>
            {!scenario?.recommendations?.length ? (
              <p className="mt-1 text-sm text-muted-foreground">Recommendations will appear after generation.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm text-foreground">
                {scenario.recommendations.map((recommendation, index) => (
                  <li key={`${recommendation}-${index}`} className="rounded border border-border bg-secondary p-2">
                    {recommendation}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}
