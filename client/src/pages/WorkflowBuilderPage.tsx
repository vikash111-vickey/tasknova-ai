import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Play,
  CheckCircle2,
  RotateCcw,
  Layers,
  Settings2,
  Trash2,
  Search,
  Plus,
} from 'lucide-react';

import { WorkflowCustomNode, WorkflowNodeData } from '../components/workflow/WorkflowCustomNode';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';

// 3 Default Verified Templates
const TEMPLATES = [
  {
    id: 'executive_summary',
    title: 'Weekly Executive Briefing',
    description: 'Scans Google Drive, generates summary PDF, pauses for review, and dispatches via Gmail.',
    nodes: [
      {
        id: 'node-1',
        type: 'workflowNode',
        position: { x: 250, y: 50 },
        data: { label: 'Manual Operator Trigger', category: 'trigger', risk_level: 'low' },
      },
      {
        id: 'node-2',
        type: 'workflowNode',
        position: { x: 250, y: 170 },
        data: {
          label: 'Scan Google Drive Files',
          category: 'action',
          tool: 'Google Drive',
          action: 'drive.search',
          risk_level: 'low',
        },
      },
      {
        id: 'node-3',
        type: 'workflowNode',
        position: { x: 250, y: 290 },
        data: {
          label: 'Synthesize PDF Summary',
          category: 'action',
          tool: 'Document Engine',
          action: 'reports.generate_summary',
          risk_level: 'low',
        },
      },
      {
        id: 'node-4',
        type: 'workflowNode',
        position: { x: 250, y: 410 },
        data: {
          label: 'Executive Email Dispatch Gate',
          category: 'logic',
          tool: 'Approval Engine',
          action: 'approval.gate',
          requires_approval: true,
          risk_level: 'medium',
        },
      },
      {
        id: 'node-5',
        type: 'workflowNode',
        position: { x: 250, y: 530 },
        data: {
          label: 'Send Email via Gmail',
          category: 'action',
          tool: 'Gmail',
          action: 'email.send',
          requires_approval: true,
          risk_level: 'high',
        },
      },
      {
        id: 'node-6',
        type: 'workflowNode',
        position: { x: 250, y: 650 },
        data: { label: 'Workflow Completed', category: 'end', risk_level: 'low' },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, style: { stroke: '#14b8a6', strokeWidth: 2 } },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, style: { stroke: '#14b8a6', strokeWidth: 2 } },
      { id: 'e3-4', source: 'node-3', target: 'node-4', animated: true, style: { stroke: '#14b8a6', strokeWidth: 2 } },
      { id: 'e4-5', source: 'node-4', target: 'node-5', animated: true, style: { stroke: '#14b8a6', strokeWidth: 2 } },
      { id: 'e5-6', source: 'node-5', target: 'node-6', animated: true, style: { stroke: '#14b8a6', strokeWidth: 2 } },
    ],
  },
  {
    id: 'stripe_reconciliation',
    title: 'Stripe Invoicing & LocalStore Reconciliation',
    description: 'Collects Stripe transactions, audits against store accounts, verifies proofs, and alerts finance.',
    nodes: [
      {
        id: 'node-1',
        type: 'workflowNode',
        position: { x: 250, y: 50 },
        data: { label: 'Scheduled Cron Trigger', category: 'trigger', risk_level: 'low' },
      },
      {
        id: 'node-2',
        type: 'workflowNode',
        position: { x: 250, y: 170 },
        data: {
          label: 'Fetch Stripe Transactions',
          category: 'action',
          tool: 'Stripe Payments',
          action: 'stripe.list_charges',
          risk_level: 'low',
        },
      },
      {
        id: 'node-3',
        type: 'workflowNode',
        position: { x: 250, y: 290 },
        data: {
          label: 'Reconcile Local Invoices',
          category: 'action',
          tool: 'Stripe Payments',
          action: 'stripe.reconcile',
          risk_level: 'low',
        },
      },
      {
        id: 'node-4',
        type: 'workflowNode',
        position: { x: 250, y: 410 },
        data: {
          label: 'Dispatch Audit Notice',
          category: 'action',
          tool: 'Gmail',
          action: 'email.send',
          requires_approval: true,
          risk_level: 'medium',
        },
      },
      {
        id: 'node-5',
        type: 'workflowNode',
        position: { x: 250, y: 530 },
        data: { label: 'Reconciliation Finalized', category: 'end', risk_level: 'low' },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, style: { stroke: '#14b8a6', strokeWidth: 2 } },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, style: { stroke: '#14b8a6', strokeWidth: 2 } },
      { id: 'e3-4', source: 'node-3', target: 'node-4', animated: true, style: { stroke: '#14b8a6', strokeWidth: 2 } },
      { id: 'e4-5', source: 'node-4', target: 'node-5', animated: true, style: { stroke: '#14b8a6', strokeWidth: 2 } },
    ],
  },
];

// Available Node Palette Items
const PALETTE_ITEMS = [
  { label: 'Manual Trigger', category: 'trigger', tool: 'Trigger', action: 'trigger.manual', risk_level: 'low' },
  { label: 'Scheduled Cron Trigger', category: 'trigger', tool: 'Trigger', action: 'trigger.cron', risk_level: 'low' },
  { label: 'Gmail Send Email', category: 'action', tool: 'Gmail', action: 'email.send', requires_approval: true, risk_level: 'high' },
  { label: 'Gmail Search Inbox', category: 'action', tool: 'Gmail', action: 'email.search', risk_level: 'low' },
  { label: 'Google Drive Upload', category: 'action', tool: 'Google Drive', action: 'drive.upload', risk_level: 'medium' },
  { label: 'Google Calendar Event', category: 'action', tool: 'Google Calendar', action: 'calendar.create_event', requires_approval: true, risk_level: 'medium' },
  { label: 'Document PDF Synthesis', category: 'action', tool: 'Document Engine', action: 'reports.generate_summary', risk_level: 'low' },
  { label: 'Web HTTP Fetch', category: 'action', tool: 'Web Tools', action: 'web.http_request', risk_level: 'medium' },
  { label: 'Stripe Reconcile', category: 'action', tool: 'Stripe Payments', action: 'stripe.reconcile', risk_level: 'low' },
  { label: 'Human Approval Gate', category: 'logic', tool: 'Approval Engine', action: 'approval.gate', requires_approval: true, risk_level: 'medium' },
  { label: 'Workflow Terminus', category: 'end', tool: 'Platform Engine', action: 'task.complete', risk_level: 'low' },
];

export const WorkflowBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [workflowTitle, setWorkflowTitle] = useState('Executive Autonomous Workflow');
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>(TEMPLATES[0].nodes as unknown as Node<WorkflowNodeData>[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(TEMPLATES[0].edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const nodeTypes = useMemo(() => ({ workflowNode: WorkflowCustomNode }), []);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: '#14b8a6', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6' },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);

  // Update selected node properties
  const updateSelectedNode = useCallback(
    (updates: Partial<WorkflowNodeData>) => {
      if (!selectedNodeId) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === selectedNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                ...updates,
              },
            };
          }
          return n;
        })
      );
    },
    [selectedNodeId, setNodes]
  );

  // Delete node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  // Add node from palette
  const addNodeFromPalette = useCallback(
    (item: typeof PALETTE_ITEMS[0]) => {
      const id = `node-${Date.now()}`;
      const newNode: Node<WorkflowNodeData> = {
        id,
        type: 'workflowNode',
        position: { x: 300 + Math.random() * 80, y: 150 + Math.random() * 80 },
        data: {
          label: item.label,
          category: item.category as any,
          tool: item.tool,
          action: item.action,
          requires_approval: item.requires_approval,
          risk_level: item.risk_level as any,
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(id);
      addToast({
        type: 'info',
        title: 'Node Added',
        message: `Added "${item.label}" to the canvas.`,
      });
    },
    [setNodes, addToast]
  );

  // Load Template
  const loadTemplate = useCallback(
    (templateId: string) => {
      const tpl = TEMPLATES.find((t) => t.id === templateId);
      if (!tpl) return;
      setWorkflowTitle(tpl.title);
      setNodes(tpl.nodes as unknown as Node<WorkflowNodeData>[]);
      setEdges(tpl.edges);
      setSelectedNodeId(null);
      addToast({
        type: 'success',
        title: 'Template Loaded',
        message: `Loaded template: "${tpl.title}".`,
      });
    },
    [setNodes, setEdges, addToast]
  );

  // Validate DAG
  const validateDAG = useCallback((): { isValid: boolean; message: string } => {
    if (nodes.length === 0) {
      return { isValid: false, message: 'Workflow canvas is empty. Add nodes from the palette.' };
    }

    const triggerNodes = nodes.filter((n) => n.data.category === 'trigger');
    if (triggerNodes.length === 0) {
      return { isValid: false, message: 'Workflow must have at least one Trigger node to initiate execution.' };
    }
    if (triggerNodes.length > 1) {
      return { isValid: false, message: 'Workflow has multiple Trigger nodes. Please specify a single entry trigger.' };
    }

    const endNodes = nodes.filter((n) => n.data.category === 'end');
    if (endNodes.length === 0) {
      return { isValid: false, message: 'Workflow must have at least one Terminus (End) node.' };
    }

    // Check for cycles using DFS
    const adj = new Map<string, string[]>();
    for (const node of nodes) {
      adj.set(node.id, []);
    }
    for (const edge of edges) {
      if (adj.has(edge.source)) {
        adj.get(edge.source)!.push(edge.target);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (u: string): boolean => {
      visited.add(u);
      recStack.add(u);

      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (!visited.has(v)) {
          if (hasCycle(v)) return true;
        } else if (recStack.has(v)) {
          return true;
        }
      }

      recStack.delete(u);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          return { isValid: false, message: 'Cycle detected in workflow graph! Workflows must be Directed Acyclic Graphs (DAG).' };
        }
      }
    }

    return { isValid: true, message: 'Workflow graph DAG validated successfully. Zero cycles detected.' };
  }, [nodes, edges]);

  const handleValidateClick = () => {
    const res = validateDAG();
    if (res.isValid) {
      addToast({
        type: 'success',
        title: 'DAG Validated',
        message: res.message,
      });
    } else {
      addToast({
        type: 'error',
        title: 'Validation Failed',
        message: res.message,
      });
    }
  };

  // Run Workflow
  const handleRunWorkflow = async () => {
    const validation = validateDAG();
    if (!validation.isValid) {
      addToast({
        type: 'error',
        title: 'Cannot Run Workflow',
        message: validation.message,
      });
      return;
    }

    setIsExecuting(true);
    try {
      // 1. Generate plan instruction
      const instruction = `Custom Visual Workflow: ${workflowTitle}. Steps: ${nodes
        .filter((n) => n.data.category === 'action')
        .map((n) => n.data.label)
        .join(' -> ')}`;

      // 2. Submit to backend planning engine
      const res = await api.generatePlan(instruction);
      if (!res.data?.task?.id) {
        throw new Error('Failed to create execution task from visual workflow');
      }

      const taskId = res.data.task.id;

      // 3. Approve plan and start execution
      await api.approvePlan(taskId);
      await api.runExecution(taskId).catch(() => {});

      addToast({
        type: 'success',
        title: 'Visual Workflow Launched (DEMO)',
        message: `Task "${workflowTitle}" started. Transitioning to live spatial workspace.`,
      });

      // 4. Navigate to Spatial Execution Workspace
      navigate(`/tasks/${taskId}/execute`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to launch visual workflow';
      addToast({
        type: 'error',
        title: 'Execution Error',
        message,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredPalette = PALETTE_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(paletteSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(paletteSearch.toLowerCase()) ||
      item.tool.toLowerCase().includes(paletteSearch.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col relative select-none">
      {/* Top Toolbar */}
      <div className="h-14 glass border-b border-slate-800 px-4 flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <Input
            value={workflowTitle}
            onChange={(e) => setWorkflowTitle(e.target.value)}
            className="h-8 max-w-xs text-sm font-semibold bg-slate-900/60 border-slate-700/80"
          />
          <Badge variant="demo" size="sm">DEMO DAG BUILDER</Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Templates dropdown */}
          <div className="hidden sm:flex items-center gap-1.5 border-r border-slate-800 pr-3 mr-1">
            <span className="text-xs text-slate-400 font-medium">Template:</span>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => loadTemplate(t.id)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition-colors border border-slate-700/50"
              >
                {t.title.split(' ')[0]}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={handleValidateClick} className="text-slate-300">
            <CheckCircle2 className="w-4 h-4 mr-1 text-teal-400" />
            Validate
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNodes([]);
              setEdges([]);
              setSelectedNodeId(null);
            }}
            className="text-slate-400 hover:text-red-400"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Clear
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunWorkflow}
            disabled={isExecuting}
            className="glow-cyan"
          >
            <Play className="w-4 h-4 mr-1 fill-current" />
            {isExecuting ? 'Launching...' : 'Run Workflow'}
          </Button>
        </div>
      </div>

      {/* Main Canvas + Floating Sidebars */}
      <div className="flex-1 relative overflow-hidden">
        {/* Left Floating Palette */}
        <div className="absolute left-4 top-4 bottom-4 w-72 z-10 pointer-events-none">
          <GlassPanel className="h-full flex flex-col p-3 pointer-events-auto shadow-2xl border-slate-800/90 backdrop-blur-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Layers className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Node Palette</h3>
            </div>

            <div className="mt-2.5 mb-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <Input
                placeholder="Search tools or actions..."
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-900/60"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredPalette.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => addNodeFromPalette(item)}
                  className="p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500/50 cursor-pointer transition-all group flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-teal-300 transition-colors">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]">{item.action}</p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 text-center">
              Click node to spawn onto canvas
            </div>
          </GlassPanel>
        </div>

        {/* Right Floating Node Inspector */}
        {selectedNode && (
          <div className="absolute right-4 top-4 bottom-4 w-80 z-10 pointer-events-none">
            <GlassPanel className="h-full flex flex-col p-4 pointer-events-auto shadow-2xl border-slate-800/90 backdrop-blur-xl space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-teal-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Node Properties</h3>
                </div>
                <button
                  onClick={deleteSelectedNode}
                  className="text-slate-400 hover:text-red-400 transition-colors p-1"
                  title="Delete Node"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Step Label</label>
                  <Input
                    value={selectedNode.data.label}
                    onChange={(e) => updateSelectedNode({ label: e.target.value })}
                    className="h-8 text-xs bg-slate-900/60"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Target Action</label>
                  <Input
                    value={selectedNode.data.action || ''}
                    onChange={(e) => updateSelectedNode({ action: e.target.value })}
                    className="h-8 text-xs font-mono bg-slate-900/60"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Connector Tool</label>
                  <Input
                    value={selectedNode.data.tool || ''}
                    onChange={(e) => updateSelectedNode({ tool: e.target.value })}
                    className="h-8 text-xs bg-slate-900/60"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Risk Level</label>
                  <select
                    value={selectedNode.data.risk_level || 'low'}
                    onChange={(e) => updateSelectedNode({ risk_level: e.target.value as any })}
                    className="w-full h-8 px-2.5 rounded-lg bg-slate-900/60 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
                  >
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedNode.data.requires_approval)}
                      onChange={(e) => updateSelectedNode({ requires_approval: e.target.checked })}
                      className="rounded border-slate-700 text-teal-500 focus:ring-teal-400 bg-slate-900"
                    />
                    <span className="text-slate-300 font-medium">Require Operator Approval</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6">
                    If enabled, the execution halts before this step and prompts for cryptographic authorization.
                  </p>
                </div>
              </div>
            </GlassPanel>
          </div>
        )}

        {/* ReactFlow Interactive Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
          className="bg-slate-950"
        >
          <Background color="#1e293b" gap={20} size={1} variant={BackgroundVariant.Dots} />
          <Controls className="glass-strong border border-slate-800 rounded-lg text-slate-300 fill-slate-300" />
          <MiniMap
            nodeColor="#0f766e"
            maskColor="rgba(15, 23, 42, 0.85)"
            className="glass-strong border border-slate-800 rounded-lg hidden md:block"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default WorkflowBuilderPage;
