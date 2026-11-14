import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useTaskSSE } from '../lib/sse';
import { api, TaskStep, Approval, ProofLedgerEntry } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CircularProgress } from '../components/ui/CircularProgress';
import { BrainState } from '../components/brain/AIBrainTypes';
import { InstructionNode } from '../components/execution/nodes/InstructionNode';
import { AIBrainNode } from '../components/execution/nodes/AIBrainNode';
import { StepNode } from '../components/execution/nodes/StepNode';
import { AppConnectorNode } from '../components/execution/nodes/AppConnectorNode';
import { VerificationLayerNode } from '../components/execution/nodes/VerificationLayerNode';
import { CompletedNode } from '../components/execution/nodes/CompletedNode';
import { NodeInspector } from '../components/execution/NodeInspector';
import { ApprovalModal } from '../components/execution/ApprovalModal';
import { CompletionScreen } from '../components/execution/CompletionScreen';

import {
  Play,
  Pause,
  ArrowLeft,
  Activity,
  Layers,
  AlertTriangle,
  RefreshCw,
  Terminal,
  CheckCircle2,
  RotateCcw,
  Zap,
  Clock,
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

const NODE_TYPES = {
  instruction: InstructionNode,
  brain: AIBrainNode,
  step: StepNode,
  app: AppConnectorNode,
  verification: VerificationLayerNode,
  completed: CompletedNode,
};

export const ExecutionWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();

  const isGuidedDemo = searchParams.get('guidedDemo') === 'true';
  const [guidedElapsed, setGuidedElapsed] = useState(0);
  const [resettingDemo, setResettingDemo] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGuidedDemo) {
      timer = setInterval(() => setGuidedElapsed((s) => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isGuidedDemo]);

  const handleResetDemoData = async () => {
    setResettingDemo(true);
    try {
      await api.resetDemoData();
      addToast({
        type: 'success',
        title: 'Demo Environment Reset',
        message: 'Mock store database, Drive files, and outboxes have been reset to initial seed state.',
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      addToast({
        type: 'error',
        title: 'Reset Failed',
        message: err instanceof Error ? err.message : 'Failed to reset demo state',
      });
    } finally {
      setResettingDemo(false);
    }
  };

  const { task, steps, events, files, isRunning, connected, refresh } = useTaskSSE(id || null);

  const [activeTab, setActiveTab] = useState<'graph' | 'completion'>('graph');
  const [selectedStep, setSelectedStep] = useState<TaskStep | null>(null);
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState<ProofLedgerEntry | null>(null);
  const [proofLedger, setProofLedger] = useState<ProofLedgerEntry[]>([]);

  // Approvals
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [activeApproval, setActiveApproval] = useState<Approval | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  // Activity Log Filter & Auto-Scroll
  const [logFilter, setLogFilter] = useState<'all' | 'step' | 'verification' | 'recovery' | 'approval'>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  // Recovery Engine state
  const [recoveryInfo, setRecoveryInfo] = useState<{
    active: boolean;
    operation: string;
    issue: string;
    strategy: string;
    attempt: number;
    status: string;
  } | null>(null);

  // Fetch approvals & proof ledger
  const fetchAuxiliaryData = useCallback(() => {
    if (!id) return;
    api.getApprovals()
      .then((res) => {
        if (res.success && res.data) {
          const taskApprovals = res.data.filter((a) => a.taskId === id);
          setApprovals(taskApprovals);
          const pending = taskApprovals.find((a) => a.status.toLowerCase() === 'pending');
          if (pending && !isApprovalModalOpen) {
            setActiveApproval(pending);
            setIsApprovalModalOpen(true);
          }
        }
      })
      .catch(() => {});

    api.getProofLedger(id)
      .then((res) => {
        if (res.success && res.data) {
          setProofLedger(res.data);
        }
      })
      .catch(() => {});
  }, [id, isApprovalModalOpen]);

  useEffect(() => {
    fetchAuxiliaryData();
  }, [fetchAuxiliaryData, events]);

  // Derive Brain state ONLY from real task status and SSE events
  const brainState: BrainState = useMemo(() => {
    if (!task) return 'idle';
    const s = task.status.toLowerCase();

    if (s === 'recovery_in_progress') return 'recovering';
    if (s === 'verifying') return 'verifying';
    if (s === 'running' || s === 'executing') return 'executing';
    if (s === 'planning') return 'planning';
    if (s === 'created') return 'thinking';
    if (s === 'completed') return 'completed';
    if (s === 'failed') return 'failed';
    if (s === 'awaiting_approval') return 'planning';
    return 'idle';
  }, [task]);

  // Detect recovery events to populate recovery banner
  useEffect(() => {
    const recoveryEvents = events.filter((ev) => ev.type === 'recovery');
    if (recoveryEvents.length > 0) {
      const latest = recoveryEvents[recoveryEvents.length - 1];
      const payload = latest.payload || {};
      setRecoveryInfo({
        active: task?.status === 'RECOVERY_IN_PROGRESS' || payload.status === 'in_progress',
        operation: String(payload.operation || latest.message),
        issue: String(payload.issue || payload.error || 'Network latency threshold exceeded'),
        strategy: String(payload.strategy || 'check_before_retry'),
        attempt: Number(payload.attempt || 1),
        status: String(payload.status || 'Active retry backoff in progress'),
      });
    } else if (task?.status === 'RECOVERY_IN_PROGRESS') {
      setRecoveryInfo({
        active: true,
        operation: 'Autonomous Recovery Engine',
        issue: 'Transient connector fault detected',
        strategy: 'exponential_backoff',
        attempt: 1,
        status: 'Retrying operation',
      });
    } else {
      setRecoveryInfo(null);
    }
  }, [events, task]);

  // If completed, automatically suggest completion view
  useEffect(() => {
    if (task?.status === 'COMPLETED' || task?.status === 'completed') {
      // Allow user to switch back and forth
    }
  }, [task?.status]);

  // Overall circular progress calculation
  const progressPercent = useMemo(() => {
    if (!steps || steps.length === 0) return 0;
    const completed = steps.filter(
      (s) => s.status.toLowerCase() === 'completed' || s.verification_status === 'VERIFIED'
    ).length;
    return Math.round((completed / steps.length) * 100);
  }, [steps]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (logFilter === 'all') return events;
    return events.filter((ev) => {
      if (logFilter === 'step') return ev.type.startsWith('step_');
      if (logFilter === 'verification') return ev.type === 'verification';
      if (logFilter === 'recovery') return ev.type === 'recovery';
      if (logFilter === 'approval') return ev.type === 'approval_required';
      return true;
    });
  }, [events, logFilter]);

  // Auto-scroll activity log
  useEffect(() => {
    if (autoScroll) {
      const el = document.getElementById('activity-log-container');
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [filteredEvents, autoScroll]);

  // Build ReactFlow Nodes and Edges
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    // 1. Instruction Node
    nodes.push({
      id: 'instruction_node',
      type: 'instruction',
      position: { x: 300, y: 20 },
      data: {
        instruction: task?.instructions || 'Analyzing operator instruction...',
        objective: (task?.plan as any)?.objective,
      },
    });

    // 2. Cognitive Brain Node
    nodes.push({
      id: 'brain_node',
      type: 'brain',
      position: { x: 340, y: 160 },
      data: {
        state: brainState,
      },
    });

    // 3. Floating Satellite App Nodes around Brain
    const apps = [
      { id: 'app_stripe', app: 'stripe', label: 'Stripe Payments', x: 80, y: 120 },
      { id: 'app_store', app: 'store', label: 'Internal Store', x: 80, y: 220 },
      { id: 'app_docs', app: 'documents', label: 'Document Engine', x: 600, y: 120 },
      { id: 'app_gmail', app: 'gmail', label: 'Gmail Provider', x: 600, y: 220 },
    ];

    const activeTools = new Set(
      steps
        .filter((s) => s.status.toLowerCase() === 'running')
        .map((s) => s.tool.toLowerCase())
    );

    for (const appItem of apps) {
      nodes.push({
        id: appItem.id,
        type: 'app',
        position: { x: appItem.x, y: appItem.y },
        data: {
          app: appItem.app,
          label: appItem.label,
          isActive: activeTools.has(appItem.app) || activeTools.has(appItem.id.replace('app_', '')),
        },
      });
    }

    // 4. One Node Per Plan Step (in topological vertical chain)
    let currentY = 360;
    const stepNodeIds: string[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepId = step.id;
      stepNodeIds.push(stepId);

      nodes.push({
        id: stepId,
        type: 'step',
        position: { x: 320, y: currentY },
        data: {
          stepId: step.id,
          name: step.name,
          tool: step.tool,
          action: step.action,
          status: step.status,
          verificationStatus: step.verification_status,
          riskLevel: step.risk_level,
          requiresApproval: step.requires_approval,
          isSelected: selectedStep?.id === step.id,
        },
      });

      currentY += 140;
    }

    // 5. Verification Layer Node
    const verifiedCount = steps.filter((s) => s.verification_status === 'VERIFIED').length;
    nodes.push({
      id: 'verification_layer_node',
      type: 'verification',
      position: { x: 320, y: currentY },
      data: {
        verifiedCount,
        totalCount: steps.length,
        trustScore: task?.trustScore !== undefined ? task.trustScore : 100,
        isAllVerified: verifiedCount > 0 && verifiedCount === steps.length,
      },
    });
    currentY += 130;

    // 6. Completed Target Node
    const isCompleted = task?.status === 'COMPLETED' || task?.status === 'completed';
    nodes.push({
      id: 'completed_node',
      type: 'completed',
      position: { x: 360, y: currentY },
      data: {
        isCompleted,
        title: isCompleted ? 'Task Successfully Executed' : 'Awaiting Final Audit',
      },
    });

    return nodes;
  }, [task, steps, brainState, selectedStep]);

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    // Instruction -> Brain
    edges.push({
      id: 'edge_inst_to_brain',
      source: 'instruction_node',
      target: 'brain_node',
      animated: brainState === 'thinking' || brainState === 'planning',
      style: { stroke: '#a855f7', strokeWidth: 2 },
    });

    // Brain -> First Step
    if (steps.length > 0) {
      edges.push({
        id: 'edge_brain_to_step1',
        source: 'brain_node',
        target: steps[0].id,
        animated: steps[0].status.toLowerCase() === 'running',
        className: steps[0].status.toLowerCase() === 'running' ? 'animated-edge' : undefined,
        style: { stroke: '#06b6d4', strokeWidth: 2 },
      });
    }

    // Inter-step edges
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const deps = step.dependencies || [];

      if (deps.length > 0) {
        for (const depId of deps) {
          const isSatisfied = steps.find((s) => s.id === depId)?.verification_status === 'VERIFIED';
          edges.push({
            id: `edge_${depId}_to_${step.id}`,
            source: depId,
            target: step.id,
            animated: isSatisfied,
            className: isSatisfied ? 'animated-edge' : undefined,
            style: {
              stroke: isSatisfied ? '#10b981' : '#64748b',
              strokeWidth: isSatisfied ? 2.5 : 1.5,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isSatisfied ? '#10b981' : '#64748b',
            },
          });
        }
      } else if (i > 0) {
        // Linear fallback connection
        const prevStep = steps[i - 1];
        const isPrevVerified = prevStep.verification_status === 'VERIFIED';
        edges.push({
          id: `edge_${prevStep.id}_to_${step.id}`,
          source: prevStep.id,
          target: step.id,
          animated: isPrevVerified,
          className: isPrevVerified ? 'animated-edge' : undefined,
          style: {
            stroke: isPrevVerified ? '#10b981' : '#64748b',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isPrevVerified ? '#10b981' : '#64748b',
          },
        });
      }
    }

    // Last Step -> Verification Layer
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      const allDone = steps.every(
        (s) => s.status.toLowerCase() === 'completed' || s.verification_status === 'VERIFIED'
      );
      edges.push({
        id: 'edge_last_to_verification',
        source: lastStep.id,
        target: 'verification_layer_node',
        animated: allDone,
        className: allDone ? 'animated-edge' : undefined,
        style: { stroke: allDone ? '#10b981' : '#64748b', strokeWidth: 2 },
      });

      // Verification Layer -> Completed Node
      edges.push({
        id: 'edge_verification_to_completed',
        source: 'verification_layer_node',
        target: 'completed_node',
        animated: task?.status === 'COMPLETED' || task?.status === 'completed',
        style: { stroke: '#10b981', strokeWidth: 2.5 },
      });
    }

    // App Satellite Connectors to Brain (animate ONLY when tool is executing)
    const activeTools = new Set(
      steps
        .filter((s) => s.status.toLowerCase() === 'running')
        .map((s) => s.tool.toLowerCase())
    );

    const appEdges = [
      { id: 'edge_app_stripe', source: 'app_stripe', tool: 'stripe' },
      { id: 'edge_app_store', source: 'app_store', tool: 'store' },
      { id: 'edge_app_docs', source: 'app_docs', tool: 'document' },
      { id: 'edge_app_gmail', source: 'app_gmail', tool: 'email' },
    ];

    for (const ae of appEdges) {
      const isActive = activeTools.has(ae.tool);
      edges.push({
        id: ae.id,
        source: ae.source,
        target: 'brain_node',
        animated: isActive,
        className: isActive ? 'animated-edge' : undefined,
        style: {
          stroke: isActive ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)',
          strokeWidth: isActive ? 2 : 1,
          strokeDasharray: isActive ? undefined : '2 4',
        },
      });
    }

    return edges;
  }, [steps, brainState, task]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes & edges when props update
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Node click handler
  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    if (node.type === 'step') {
      const step = steps.find((s) => s.id === node.id) || null;
      setSelectedStep(step);
      const ledger = proofLedger.find((p) => p.stepId === node.id) || null;
      setSelectedLedgerEntry(ledger);
    }
  };

  const handleStartRun = async () => {
    if (!id) return;
    try {
      await api.runExecution(id);
      refresh();
    } catch (err) {
      console.error('Run failed:', err);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    try {
      await api.cancelExecution(id);
      refresh();
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-purple animate-spin" />
        <div className="text-sm text-slate-400">Loading spatial execution environment...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-12">
      {/* Guided Demo Presenter Strip */}
      {isGuidedDemo && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/70 via-slate-900/80 to-cyan-950/70 border border-brand-purple/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-semibold text-brand-purple-light">
              <Zap className="w-4 h-4 text-brand-cyan animate-pulse" />
              <span>Presenter Strip (Weekly Report):</span>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/10 font-mono text-[11px] text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>0:{guidedElapsed.toString().padStart(2, '0')} / ~0:45s</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] overflow-x-auto">
            <span className="px-2 py-0.5 rounded bg-brand-purple text-white font-bold">
              1. Plan Approved ✓
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${task.status === 'RUNNING' || steps.some((s) => s.status.toLowerCase() === 'completed') ? 'bg-brand-cyan text-slate-950 font-bold' : 'text-slate-500'}`}>
              2. DAG Execution
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${steps.some((s) => s.tool === 'reports' && s.status.toLowerCase() === 'completed') ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-500'}`}>
              3. PDF Summary
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${task.status === 'AWAITING_APPROVAL' || approvals.some((a) => a.status.toLowerCase() === 'approved') ? 'bg-rose-500 text-white font-bold' : 'text-slate-500'}`}>
              4. Email Authorization
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${task.status.toLowerCase() === 'completed' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-500'}`}>
              5. Proof Verified
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="glass"
              size="sm"
              onClick={handleResetDemoData}
              disabled={resettingDemo}
              className="text-[10px] py-1 px-2.5 h-auto text-slate-300 gap-1.5"
            >
              <RotateCcw className={`w-3 h-3 text-brand-cyan ${resettingDemo ? 'animate-spin' : ''}`} />
              <span>Reset State</span>
            </Button>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-900/80 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">
                {task.title || 'Autonomous Execution'}
              </span>
              <Badge variant="demo" size="sm">DEMO</Badge>
              <Badge
                variant={
                  task.status === 'COMPLETED' ? 'success' :
                  task.status === 'RUNNING' ? 'info' :
                  task.status === 'AWAITING_APPROVAL' ? 'warning' :
                  task.status === 'FAILED' ? 'error' : 'default'
                }
                size="sm"
              >
                {task.status}
              </Badge>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Task ID: {task.id.slice(0, 8)}...</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {connected ? 'Live SSE Stream Connected' : 'Reconnecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Pending approval badge button */}
          {approvals.some((a) => a.status.toLowerCase() === 'pending') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const pending = approvals.find((a) => a.status.toLowerCase() === 'pending');
                if (pending) {
                  setActiveApproval(pending);
                  setIsApprovalModalOpen(true);
                }
              }}
              className="gap-2 text-xs font-semibold animate-bounce text-amber-300 border-amber-500/40 bg-amber-500/10"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Review Authorization Required</span>
            </Button>
          )}

          <div className="flex rounded-lg bg-surface-950 p-1 border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('graph')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'graph' ? 'bg-brand-purple text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Spatial Graph
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completion')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'completion' ? 'bg-brand-purple text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Completion & Proof
            </button>
          </div>

          {task.status === 'AWAITING_APPROVAL' || task.status === 'pending' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartRun}
              disabled={isRunning}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 font-semibold"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Execution</span>
            </Button>
          ) : isRunning ? (
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancel}
              className="gap-1.5 text-xs"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Main Workspace Layout */}
      {activeTab === 'graph' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-14rem)] min-h-[640px]">
          {/* Left Column: Instruction, Objective, Plan & Progress */}
          <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto">
            {/* Progress Card */}
            <Card variant="glass" className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                  Workflow Execution
                </span>
                <div className="text-xl font-bold text-white font-mono mt-0.5">
                  {progressPercent}% Complete
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  {steps.filter((s) => s.verification_status === 'VERIFIED').length} of {steps.length} Verified
                </div>
              </div>
              <CircularProgress
                value={progressPercent}
                size={64}
                strokeWidth={6}
                color={progressPercent === 100 ? 'green' : 'purple'}
              />
            </Card>

            {/* Instruction Card */}
            <Card variant="glass" className="p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-purple-light uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5" />
                <span>Original Instruction</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-950/80 border border-white/5 text-xs text-white leading-relaxed">
                {task.instructions}
              </div>
            </Card>

            {/* Plan Steps List */}
            <Card variant="glass" className="p-4 flex-1 flex flex-col overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>Execution DAG Plan</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{steps.length} Steps</span>
              </div>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                {steps.map((st, idx) => (
                  <div
                    key={st.id}
                    onClick={() => {
                      setSelectedStep(st);
                      const ledger = proofLedger.find((p) => p.stepId === st.id) || null;
                      setSelectedLedgerEntry(ledger);
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedStep?.id === st.id
                        ? 'border-brand-purple bg-purple-950/40'
                        : 'border-white/5 bg-surface-950/40 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-slate-400">
                        Step {idx + 1}
                      </span>
                      {st.verification_status === 'VERIFIED' ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>VERIFIED</span>
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-slate-400 uppercase">
                          {st.status}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-white truncate mt-1">
                      {st.name}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Center Column: ReactFlow 2D/3D Hybrid Canvas */}
          <div className="lg:col-span-6 relative rounded-2xl border border-white/10 overflow-hidden bg-surface-950/90 shadow-2xl">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={2}
            >
              <Background color="#1e293b" gap={20} size={1.5} />
              <Controls className="bg-surface-900 border border-white/10 text-white rounded-xl overflow-hidden" />
              <MiniMap
                nodeColor={(n) => {
                  if (n.type === 'instruction') return '#8b5cf6';
                  if (n.type === 'brain') return '#06b6d4';
                  if (n.type === 'completed') return '#10b981';
                  return '#334155';
                }}
                className="bg-surface-900/90 border border-white/10 rounded-xl"
              />
            </ReactFlow>

            {/* Quick status pill in canvas top-right */}
            <div className="absolute top-4 right-4 z-10 pointer-events-none flex items-center gap-2">
              <Badge variant="demo" size="sm">SPATIAL DAG</Badge>
              <div className="px-3 py-1 rounded-full bg-surface-900/90 border border-white/10 backdrop-blur-md text-[11px] font-mono text-slate-300">
                Brain State: <span className="text-brand-cyan font-bold">{brainState.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Activity Log, Verification & Recovery Panel */}
          <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto">
            {/* Recovery Panel (Prominent when active) */}
            {recoveryInfo && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 animate-bounce" />
                    <span>RECOVERY ENGINE ACTIVE</span>
                  </span>
                  <Badge variant="demo" size="sm">DEMO</Badge>
                </div>
                <div className="text-[11px] space-y-1 font-mono">
                  <div><strong>Operation:</strong> {recoveryInfo.operation}</div>
                  <div><strong>Issue:</strong> {recoveryInfo.issue}</div>
                  <div><strong>Strategy:</strong> {recoveryInfo.strategy}</div>
                  <div><strong>Attempt:</strong> {recoveryInfo.attempt} of 3</div>
                  <div className="text-amber-300"><strong>Status:</strong> {recoveryInfo.status}</div>
                </div>
              </div>
            )}

            {/* Live Activity Log */}
            <Card variant="glass" className="p-4 flex-1 flex flex-col overflow-hidden space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Activity className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>Live Activity Stream</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      autoScroll ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-surface-800 text-slate-500'
                    }`}
                  >
                    Auto-scroll
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                {(['all', 'step', 'verification', 'recovery', 'approval'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLogFilter(cat)}
                    className={`px-2 py-1 rounded capitalize font-medium transition-colors ${
                      logFilter === cat
                        ? 'bg-surface-800 text-white border border-white/10'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Log Entries */}
              <div
                id="activity-log-container"
                className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]"
              >
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2 rounded-lg bg-surface-950/70 border border-white/5 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="text-brand-purple-light font-semibold uppercase">
                        {ev.type}
                      </span>
                      <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-200 text-xs leading-relaxed">
                      {ev.message}
                    </div>
                  </div>
                ))}
                {filteredEvents.length === 0 && (
                  <div className="py-8 text-center text-slate-500 italic text-xs">
                    No matching activity events in stream.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* Completion & Proof Screen */
        <CompletionScreen
          task={task}
          steps={steps}
          files={files}
          onReturnDashboard={() => navigate('/dashboard')}
        />
      )}

      {/* Floating Node Inspector */}
      {selectedStep && (
        <NodeInspector
          step={selectedStep}
          ledgerEntry={selectedLedgerEntry}
          onClose={() => setSelectedStep(null)}
          onViewProof={() => setActiveTab('completion')}
        />
      )}

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        approval={activeApproval}
        onActionComplete={() => {
          fetchAuxiliaryData();
          refresh();
        }}
      />
    </div>
  );
};

export default ExecutionWorkspacePage;
