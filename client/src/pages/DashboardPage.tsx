import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { AIBrain } from '../components/brain/AIBrain';
import { BrainState } from '../components/brain/AIBrainTypes';
import { PlanPreviewModal, PlanData } from '../components/planning/PlanPreviewModal';
import { ClarificationForm } from '../components/planning/ClarificationForm';
import { AIConfigModal } from '../components/planning/AIConfigModal';
import { api, Task, Integration, AnalyticsData } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts';
import {
  Sparkles,
  Send,
  Loader2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Bot,
  Activity,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Radio,
  Sliders,
  Mail,
  HardDrive,
  Calendar,
  FileText,
  CreditCard,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  {
    title: 'Weekly Financial Audit & Report',
    tag: 'Demo 1',
    prompt: 'Generate weekly sales report and send summary email to team',
    description: 'Reconciles Stripe charges with database accounts, generates verified PDF report, and pauses for email dispatch authorization.',
    estTime: '<45s',
  },
  {
    title: 'Executive Meeting Scheduling & Invites',
    tag: 'Demo 2',
    prompt: 'Schedule sync meeting with Alex and Jordan for tomorrow morning and send calendar invites',
    description: 'Reconciles participant calendars, reserves time slot in Demo Calendar, and dispatches verified email invitations.',
    estTime: '<30s',
  },
  {
    title: 'Drive Document Organization & Synthesis',
    tag: 'Demo 3',
    prompt: 'Search Google Drive for customer contracts, generate executive PDF summary, and archive report',
    description: 'Scans Google Drive, synthesizes executive multi-page summary, and archives verified report back to Drive.',
    estTime: '<35s',
  },
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [brainState, setBrainState] = useState<BrainState>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string>('Template planner');

  // Guided demo presenter strip state
  const [guidedDemoActive, setGuidedDemoActive] = useState(false);
  const [guidedStage, setGuidedStage] = useState<number>(1);
  const [guidedElapsedSeconds, setGuidedElapsedSeconds] = useState(0);
  const [resettingDemo, setResettingDemo] = useState(false);

  // Chaos Mode state
  const [chaosModeEnabled, setChaosModeEnabled] = useState(false);
  const [selectedFault, setSelectedFault] = useState<
    'network_timeout' | 'auth_expiry' | 'verification_mismatch' | 'provider_503'
  >('network_timeout');
  const [selectedTarget, setSelectedTarget] = useState<'drive' | 'gmail' | 'stripe'>('drive');

  // Planning workflow state
  const [clarificationData, setClarificationData] = useState<{
    missing_information: string[];
    clarifying_questions: string[];
  } | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<PlanData | null>(null);
  const [planTaskId, setPlanTaskId] = useState<string | null>(null);
  const [plannerUsed, setPlannerUsed] = useState<'gemini' | 'openai' | 'template'>('template');
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAIConfigModalOpen, setIsAIConfigModalOpen] = useState(false);

  // Real backend metrics
  const [tasks, setTasks] = useState<Task[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    pendingTasks: 0,
    successRate: 100,
    totalVerifications: 0,
    recentTasks: [],
    timeSavedMinutes: 0,
    averageTrustScore: 100,
  });

  // Mobile panels toggle
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const loadData = () => {
    // 1. Tasks
    api.getTasks()
      .then((res) => {
        if (res.success && res.data) {
          setTasks(res.data);
        }
      })
      .catch(() => {});

    // 2. Analytics
    api.getAnalytics()
      .then((res) => {
        if (res.success && res.data) {
          const completed = res.data.completedTasks || 0;
          setAnalytics({
            ...res.data,
            timeSavedMinutes: completed * 22,
            averageTrustScore: completed > 0 ? 98 : 100,
          });
        }
      })
      .catch(() => {});

    // 3. Integrations
    api.getIntegrations()
      .then((res) => {
        if (res.success && res.data) {
          setIntegrations(res.data);
        }
      })
      .catch(() => {});

    // 4. Health
    api.getHealth()
      .then((res) => {
        if (res.success && res.data) {
          setAiProvider(res.data.ai === 'gemini' ? 'Gemini' : 'Template planner');
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
    const queryPrompt = searchParams.get('prompt');
    if (queryPrompt && !prompt) {
      setPrompt(queryPrompt);
    }
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, [searchParams]);

  // Compute live active executions & pending approvals
  const activeTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.status === 'RUNNING' ||
        t.status === 'executing' ||
        t.status === 'PLANNING' ||
        t.status === 'RECOVERY_IN_PROGRESS' ||
        t.status === 'VERIFYING'
    );
  }, [tasks]);

  const awaitingApprovalTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'AWAITING_APPROVAL');
  }, [tasks]);

  // Guided demo timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (guidedDemoActive) {
      timer = setInterval(() => {
        setGuidedElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      setGuidedElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [guidedDemoActive]);

  // Auto-launch guided demo when arriving with ?guidedDemo=true
  useEffect(() => {
    if (searchParams.get('guidedDemo') === 'true' && !guidedDemoActive) {
      handleLaunchGuidedDemo();
    }
  }, [searchParams]);

  // Reset Demo Data action
  const handleResetDemoData = async () => {
    setResettingDemo(true);
    try {
      await api.resetDemoData();
      addToast({
        type: 'success',
        title: 'Demo State Restored',
        message: 'Mock store database, Drive files, and outboxes have been reset to initial seed state.',
      });
      loadData();
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

  // Mini Chart Data
  const chartData = useMemo(() => {
    return [
      { name: 'Mon', tasks: 3, verified: 3 },
      { name: 'Tue', tasks: 5, verified: 5 },
      { name: 'Wed', tasks: 4, verified: 4 },
      { name: 'Thu', tasks: 8, verified: 7 },
      { name: 'Fri', tasks: 6, verified: 6 },
      { name: 'Sat', tasks: 9, verified: 9 },
      { name: 'Sun', tasks: tasks.length || 7, verified: analytics.completedTasks || 7 },
    ];
  }, [tasks.length, analytics.completedTasks]);

  // Start Planning Flow
  const handleStartPlanning = async (textToPlan?: string, clarifications?: Record<string, string>) => {
    const text = (textToPlan || prompt).trim();
    if (!text) return;

    setError(null);
    setLoading(true);
    setBrainState('thinking');

    try {
      // If chaos mode is active, inject the selected fault before creating the task
      if (chaosModeEnabled) {
        await api.injectChaos({
          faultType: selectedFault,
          target: selectedTarget,
          occurrences: 1,
        });
      }

      // Step 1: Understand
      if (!clarifications) {
        const understandRes = await api.understand(text);
        if (!understandRes.success) {
          throw new Error(understandRes.message || 'Failed to analyze instruction');
        }

        const analysis = understandRes.data;
        if (!analysis.can_proceed && analysis.clarifying_questions?.length > 0) {
          setBrainState('idle');
          setClarificationData({
            missing_information: analysis.missing_information || [],
            clarifying_questions: analysis.clarifying_questions || [],
          });
          setLoading(false);
          return;
        }
      }

      // Step 2: Generate Plan
      setBrainState('planning');
      const planRes = await api.generatePlan(text, clarifications);
      if (!planRes.success) {
        throw new Error(planRes.message || 'Failed to generate execution plan');
      }

      setGeneratedPlan(planRes.data.plan as PlanData);
      setPlanTaskId(planRes.data.task.id);
      setPlannerUsed(planRes.data.planner_used || 'template');
      setFallbackUsed(Boolean(planRes.data.fallback_used));
      setIsPlanModalOpen(true);
      setClarificationData(null);
      setBrainState('idle');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Planning failed. Please try again.';
      setError(msg);
      setBrainState('failed');
      setTimeout(() => setBrainState('idle'), 3500);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanApproved = async () => {
    setIsPlanModalOpen(false);
    if (planTaskId) {
      // Trigger execution and navigate to spatial workspace
      try {
        await api.runExecution(planTaskId);
      } catch (err) {
        console.error('Failed to trigger execution:', err);
      }
      navigate(`/tasks/${planTaskId}/execute${guidedDemoActive ? '?guidedDemo=true' : ''}`);
    }
  };

  // Launch Guided Demo
  const handleLaunchGuidedDemo = () => {
    const demoInstruction = 'Generate weekly sales report and send summary email to team';
    setPrompt(demoInstruction);
    setGuidedDemoActive(true);
    setGuidedStage(1);
    // Inject chaos fault for the demo to showcase resilience
    setChaosModeEnabled(true);
    setSelectedFault('network_timeout');
    setSelectedTarget('drive');
    handleStartPlanning(demoInstruction);
  };

  const getConnectorIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'gmail':
      case 'email':
        return <Mail className="w-4 h-4 text-rose-400" />;
      case 'drive':
        return <HardDrive className="w-4 h-4 text-amber-400" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'document':
      case 'documents':
      case 'reports':
        return <FileText className="w-4 h-4 text-brand-cyan" />;
      case 'stripe':
        return <CreditCard className="w-4 h-4 text-purple-400" />;
      case 'store':
        return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      default:
        return <Radio className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Header & Presenter Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Spatial Operations Center</span>
              <Badge variant="demo" size="md">DEMO</Badge>
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Welcome back, {user?.fullName || 'Operator'}. Autonomous multi-step orchestrator with independent verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Active Planner Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-900/80 border border-white/10 text-xs">
            <Bot className="w-4 h-4 text-brand-cyan" />
            <span className="text-slate-400">Active Planner:</span>
            <span className="font-semibold text-brand-purple-light">{aiProvider}</span>
          </div>

          {/* Reset Demo Data Button */}
          <Button
            variant="glass"
            size="sm"
            onClick={handleResetDemoData}
            disabled={resettingDemo}
            className="gap-2 text-xs border-slate-700 hover:border-slate-500 font-semibold text-slate-300"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-brand-cyan ${resettingDemo ? 'animate-spin' : ''}`} />
            <span>{resettingDemo ? 'Resetting...' : 'Reset Demo Data'}</span>
          </Button>

          {/* Guided Demo Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleLaunchGuidedDemo}
            className="gap-2 text-xs bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-95 font-semibold shadow-lg shadow-purple-900/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Launch Guided Demo (Weekly Report)</span>
          </Button>
        </div>
      </div>

      {/* Guided Demo Presenter Strip */}
      {guidedDemoActive && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/70 via-slate-900/80 to-cyan-950/70 border border-brand-purple/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-semibold text-brand-purple-light">
              <Zap className="w-4 h-4 text-brand-cyan animate-pulse" />
              <span>Presenter Strip (Weekly Report):</span>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/10 font-mono text-[11px] text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>0:{guidedElapsedSeconds.toString().padStart(2, '0')} / ~0:45s</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] overflow-x-auto">
            <span className={`px-2 py-0.5 rounded ${guidedStage >= 1 ? 'bg-brand-purple text-white font-bold' : 'text-slate-500'}`}>
              1. Plan Synthesis
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${guidedStage >= 2 ? 'bg-brand-cyan text-slate-950 font-bold' : 'text-slate-500'}`}>
              2. DAG Execution
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${guidedStage >= 3 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-500'}`}>
              3. Chaos Recovery
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${guidedStage >= 4 ? 'bg-rose-500 text-white font-bold' : 'text-slate-500'}`}>
              4. Email Authorization
            </span>
            <span className="text-slate-600">→</span>
            <span className={`px-2 py-0.5 rounded ${guidedStage >= 5 ? 'bg-emerald-500 text-white font-bold' : 'text-slate-500'}`}>
              5. Proof Verification
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
            <button
              type="button"
              onClick={() => setGuidedDemoActive(false)}
              className="text-[11px] text-slate-400 hover:text-white underline ml-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards with Animated Counting */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Tasks */}
        <Card variant="glass" className="p-3.5 space-y-1 bg-[#0a0a0a] border-[#2a2a2a] hover:border-[#aa88ff]/40 transition-all duration-300">
          <div className="text-[10px] uppercase font-mono font-semibold text-[#8a8a8a] flex items-center justify-between">
            <span>Total Tasks</span>
            <Layers className="w-3.5 h-3.5 text-[#aa88ff]" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            <AnimatedNumber value={analytics.totalTasks || tasks.length} />
          </div>
          <div className="text-[10px] font-mono text-[#8a8a8a]">Autonomous DAGs</div>
        </Card>

        {/* Completed */}
        <Card variant="glass" className="p-3.5 space-y-1 bg-[#0a0a0a] border-[#2a2a2a] hover:border-emerald-500/40 transition-all duration-300">
          <div className="text-[10px] uppercase font-mono font-semibold text-emerald-400 flex items-center justify-between">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            <AnimatedNumber value={analytics.completedTasks} />
          </div>
          <div className="text-[10px] font-mono text-[#8a8a8a]">100% Audited</div>
        </Card>

        {/* In Progress */}
        <Card variant="glass" className="p-3.5 space-y-1 bg-[#0a0a0a] border-[#2a2a2a] hover:border-[#aa88ff]/40 transition-all duration-300">
          <div className="text-[10px] uppercase font-mono font-semibold text-[#aa88ff] flex items-center justify-between">
            <span>In Progress</span>
            <Activity className="w-3.5 h-3.5 text-[#aa88ff]" />
          </div>
          <div className="text-2xl font-black text-[#aa88ff] font-mono">
            <AnimatedNumber value={activeTasks.length} />
          </div>
          <div className="text-[10px] font-mono text-[#8a8a8a]">Active Orbits</div>
        </Card>

        {/* Needs Attention */}
        <Card variant="glass" className="p-3.5 space-y-1 bg-[#0a0a0a] border-[#2a2a2a] hover:border-amber-500/40 transition-all duration-300">
          <div className="text-[10px] uppercase font-mono font-semibold text-amber-400 flex items-center justify-between">
            <span>Needs Attention</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            <AnimatedNumber value={awaitingApprovalTasks.length} />
          </div>
          <div className="text-[10px] font-mono text-[#8a8a8a]">Approvals Gate</div>
        </Card>

        {/* Time Saved */}
        <Card variant="glass" className="p-3.5 space-y-1 bg-[#0a0a0a] border-[#2a2a2a] hover:border-[#aa88ff]/40 transition-all duration-300">
          <div className="text-[10px] uppercase font-mono font-semibold text-[#8a8a8a] flex items-center justify-between">
            <span>Time Saved</span>
            <Clock className="w-3.5 h-3.5 text-[#aa88ff]" />
          </div>
          <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
            <AnimatedNumber value={analytics.timeSavedMinutes || 45} />
            <span className="text-xs text-[#8a8a8a]">m</span>
          </div>
          <div className="text-[10px] font-mono text-[#8a8a8a]">Operator Hours</div>
        </Card>

        {/* Trust Score Average */}
        <Card variant="glass" className="p-3.5 space-y-1 bg-[#0a0a0a] border-[#2a2a2a] hover:border-emerald-500/40 transition-all duration-300">
          <div className="text-[10px] uppercase font-mono font-semibold text-emerald-400 flex items-center justify-between">
            <span>Trust Score</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono flex items-baseline gap-1">
            <AnimatedNumber value={analytics.averageTrustScore || 98} />
            <span className="text-xs text-[#8a8a8a]">%</span>
          </div>
          <div className="text-[10px] font-mono text-[#8a8a8a]">Cryptographic</div>
        </Card>
      </div>

      {/* Main Spatial Center & Floating Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Mobile Accordion Toggles */}
        <div className="lg:hidden flex items-center justify-between gap-2 col-span-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMobileLeftOpen(!mobileLeftOpen)}
            className="flex-1 justify-between text-xs"
          >
            <span>Recent & Active Tasks ({tasks.length})</span>
            {mobileLeftOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMobileRightOpen(!mobileRightOpen)}
            className="flex-1 justify-between text-xs"
          >
            <span>Connected Apps ({integrations.length})</span>
            {mobileRightOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* LEFT FLOATING GLASS PANEL: Recent tasks, active workflows, history */}
        <div className={`lg:col-span-3 space-y-4 ${mobileLeftOpen ? 'block' : 'hidden lg:block'}`}>
          <Card variant="glass" className="p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-purple" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Active Workflows & History
                </h3>
              </div>
              <Badge variant="demo" size="sm">LIVE</Badge>
            </div>

            {/* Active Running Workflows */}
            {activeTasks.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-semibold text-brand-cyan tracking-wider block">
                  Active Orbit Execution
                </span>
                {activeTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tasks/${t.id}/execute`)}
                    className="p-3 rounded-xl bg-cyan-950/40 border border-brand-cyan/40 glow-cyan cursor-pointer transition-all hover:scale-[1.02] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white truncate max-w-[150px]">
                        {t.title}
                      </span>
                      <Badge variant="info" size="sm" className="font-mono text-[9px] animate-pulse">
                        {t.status}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                      <span>ID: {t.id.slice(0, 8)}...</span>
                      <span className="text-brand-cyan flex items-center gap-1 font-semibold">
                        Workspace <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Tasks List */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                Recent Tasks ({tasks.length})
              </span>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {tasks.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tasks/${t.id}/execute`)}
                    className="p-2.5 rounded-lg bg-surface-950/60 border border-white/5 hover:border-white/15 cursor-pointer transition-all text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {t.title}
                      </span>
                      <Badge
                        variant={
                          t.status === 'COMPLETED' || t.status === 'completed'
                            ? 'success'
                            : t.status === 'AWAITING_APPROVAL'
                            ? 'warning'
                            : t.status === 'FAILED'
                            ? 'error'
                            : 'default'
                        }
                        size="sm"
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{new Date(t.createdAt).toLocaleTimeString()}</span>
                      {t.trustScore !== undefined && (
                        <span className="text-emerald-400 font-bold">
                          {t.trustScore}% Score
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    No task history recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Mini Activity Chart */}
            <div className="pt-2 border-t border-white/5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-2">
                7-Day Verification Velocity
              </span>
              <div className="h-20 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="verified"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#purpleGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>

        {/* CENTER SPATIAL STAGE: Large AIBrain, Command Input, Example Chips, Chaos Picker */}
        <div className="lg:col-span-6 space-y-6">
          <Card variant="glass" className="relative p-6 sm:p-8 overflow-hidden shadow-2xl border-white/15">
            {/* 3D Brain Centerpiece (Large, Lazy-loaded with pointer-events-none so it NEVER blocks inputs!) */}
            <div className="flex flex-col items-center justify-center relative mb-4">
              <div className="h-56 sm:h-64 w-full flex items-center justify-center">
                <AIBrain state={brainState} size={250} />
              </div>

              {/* Status Pill beneath Brain */}
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-900/90 border border-white/10 text-xs font-mono backdrop-blur-md">
                <span
                  className={`w-2 h-2 rounded-full ${
                    brainState === 'thinking' ? 'bg-brand-purple animate-ping' :
                    brainState === 'planning' ? 'bg-brand-cyan animate-pulse' :
                    brainState === 'executing' ? 'bg-emerald-400 animate-pulse' :
                    brainState === 'recovering' ? 'bg-amber-400 animate-bounce' :
                    brainState === 'failed' ? 'bg-rose-500' : 'bg-slate-500'
                  }`}
                />
                <span className="text-slate-400">Cognitive State:</span>
                <span className="font-bold text-white capitalize">{brainState}</span>
              </div>
            </div>

            {/* Command Input Area (Z-Index guarantees it is NEVER blocked by 3D canvas) */}
            <div className="relative z-10 space-y-3">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={handleTextareaInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleStartPlanning();
                    }
                  }}
                  placeholder="Ask TASKNOVA to plan and orchestrate... (e.g. Generate weekly sales report and send summary email to team)"
                  rows={3}
                  disabled={loading}
                  className="w-full bg-surface-950/90 border border-white/15 rounded-2xl px-5 py-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/50 glow-purple transition-all resize-none shadow-2xl"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAIConfigModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111116] border border-[#2a2a2a] hover:border-[#aa88ff] text-[11px] font-mono text-[#aa88ff] transition-all cursor-pointer shadow-sm hover:shadow-glow-purple"
                      title="Connect Gemini or OpenAI API Key"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#aa88ff]" />
                      <span>Model: <strong className="text-white uppercase">{aiProvider}</strong></span>
                    </button>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-surface-800 border border-white/10 text-[10px]">Ctrl+Enter</kbd>
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    disabled={loading || !prompt.trim()}
                    onClick={() => handleStartPlanning()}
                    className="gap-2 bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-90 font-semibold shadow-lg shadow-purple-900/30"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{brainState === 'thinking' ? 'Analyzing...' : 'Synthesizing DAG...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Generate & Review Plan</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Suggested Prompt Chips */}
            <div className="mt-6 pt-5 border-t border-white/10 relative z-10">
              <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider block mb-2.5">
                Pre-Audited Demo Scenarios:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {SUGGESTED_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(item.prompt);
                      handleStartPlanning(item.prompt);
                    }}
                    disabled={loading}
                    className="text-left p-2.5 rounded-xl bg-surface-900/60 hover:bg-surface-800/80 border border-white/5 hover:border-brand-purple/40 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white group-hover:text-brand-purple-light transition-colors">
                          {item.title}
                        </span>
                        <Badge variant="info" size="sm">{item.tag}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-brand-purple-light font-medium group-hover:translate-x-0.5 transition-transform">
                      <span>Run Scenario</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chaos Mode Toggle & Fault Picker (Demo Mode Only) */}
            <div className="mt-5 pt-4 border-t border-white/10 relative z-10 bg-surface-950/40 p-3 rounded-xl border border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Chaos Recovery Simulation</span>
                      <Badge variant="demo" size="sm">DEMO ONLY</Badge>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Inject deterministic server faults to demonstrate autonomous backoff & recovery.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChaosModeEnabled(!chaosModeEnabled)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      chaosModeEnabled
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                        : 'bg-surface-800 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {chaosModeEnabled ? 'CHAOS ACTIVE' : 'Enable Chaos Fault'}
                  </button>
                </div>
              </div>

              {chaosModeEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 animate-in fade-in duration-150">
                  <div>
                    <label className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">
                      Fault Category:
                    </label>
                    <select
                      value={selectedFault}
                      onChange={(e) => setSelectedFault(e.target.value as any)}
                      className="w-full bg-surface-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="network_timeout">Network Timeout (Socket Hanging)</option>
                      <option value="auth_expiry">Auth Token Expired (OAuth Refresh)</option>
                      <option value="provider_503">Provider 503 (Downtime Backoff)</option>
                      <option value="verification_mismatch">Verification Mismatch (State Divergence)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">
                      Target Connector:
                    </label>
                    <select
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value as any)}
                      className="w-full bg-surface-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="drive">Google Drive (File Storage)</option>
                      <option value="gmail">Gmail (Mail Server Provider)</option>
                      <option value="stripe">Stripe (Invoicing & Charges)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT FLOATING GLASS PANEL: Connected Applications & Verification Activity */}
        <div className={`lg:col-span-3 space-y-4 ${mobileRightOpen ? 'block' : 'hidden lg:block'}`}>
          <Card variant="glass" className="p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-brand-cyan" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Connected Applications
                </h3>
              </div>
              <Badge variant="demo" size="sm">ZERO-KEY</Badge>
            </div>

            <div className="space-y-2">
              {integrations.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-950/60 border border-white/5 hover:border-white/15 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-surface-900 border border-white/5 flex items-center justify-center shrink-0">
                      {getConnectorIcon(app.type)}
                    </div>
                    <div>
                      <div className="font-semibold text-white leading-tight">
                        {app.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {app.isLive ? 'Live API' : 'Demo Sandbox'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">READY</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Verification Activity Stream */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Verification Activity
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {analytics.totalVerifications || 12} Audited
                </span>
              </div>

              <div className="space-y-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-purple-950/30 border border-purple-500/20 text-slate-300">
                  <div className="text-[9px] text-brand-purple-light font-bold uppercase">
                    Sha-256 Merkle Ledger
                  </div>
                  <div className="text-[10px] text-white truncate mt-0.5">
                    Incorruptible chain anchor active
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-slate-300">
                  <div className="text-[9px] text-emerald-400 font-bold uppercase">
                    Check-Before-Retry
                  </div>
                  <div className="text-[10px] text-white truncate mt-0.5">
                    Outbox inspection deduplication ready
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* BOTTOM PANEL: Execution Timeline & Recent System Events */}
      <Card variant="glass" className="p-5 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-purple" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Execution Timeline & Activity Ledger
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {tasks.length} Total Task Records Tracked
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tasks.slice(0, 3).map((t) => (
            <div
              key={t.id}
              onClick={() => navigate(`/tasks/${t.id}/execute`)}
              className="p-3.5 rounded-xl bg-surface-950/60 border border-white/5 hover:border-brand-purple/40 cursor-pointer transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <Badge
                  variant={
                    t.status === 'COMPLETED' || t.status === 'completed'
                      ? 'success'
                      : t.status === 'AWAITING_APPROVAL'
                      ? 'warning'
                      : 'info'
                  }
                  size="sm"
                >
                  {t.status}
                </Badge>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(t.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-xs font-semibold text-white truncate">
                {t.title}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                {t.instructions}
              </p>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-brand-purple-light font-medium">
                <span>View Workspace</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="col-span-3 py-6 text-center text-slate-500 text-xs italic">
              No executions logged yet. Start by generating a plan above!
            </div>
          )}
        </div>
      </Card>

      {/* Clarification Form (When AI asks questions) */}
      {clarificationData && (
        <ClarificationForm
          questions={clarificationData.clarifying_questions}
          missingInfo={clarificationData.missing_information}
          onSubmit={(answers) => handleStartPlanning(prompt, answers)}
          onCancel={() => setClarificationData(null)}
          isLoading={loading}
        />
      )}

      {/* Plan Preview & Review Modal */}
      {generatedPlan && (
        <PlanPreviewModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          plan={generatedPlan}
          taskId={planTaskId}
          plannerUsed={plannerUsed}
          fallbackUsed={fallbackUsed}
          onPlanApproved={handlePlanApproved}
          onEditInstruction={(inst) => {
            setIsPlanModalOpen(false);
            setPrompt(inst);
          }}
        />
      )}

      {/* AI Model & API Key Config Modal */}
      <AIConfigModal
        isOpen={isAIConfigModalOpen}
        onClose={() => setIsAIConfigModalOpen(false)}
        onConfigSaved={(p) => setAiProvider(p === 'gemini' ? 'Gemini' : p === 'openai' ? 'OpenAI' : 'Template planner')}
      />
    </div>
  );
};

export default DashboardPage;
