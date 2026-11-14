import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Cpu,
  Layers,
  Lock,
  Database,
  Mail,
  Calendar,
  FileText,
  Cloud,
  BarChart,
  Globe,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  FileSpreadsheet,
  ArrowDown,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { GlassPanel } from '../components/ui/GlassPanel';
import { AIBrain } from '../components/brain/AIBrain';
import { BrainState } from '../components/brain/AIBrainTypes';
import { StudyDetailModal, StudyItem } from '../components/studies/StudyDetailModal';

const TOOLS = [
  { name: 'Email', icon: <Mail className="w-4 h-4 text-[#aa88ff]" /> },
  { name: 'Calendar', icon: <Calendar className="w-4 h-4 text-[#aa88ff]" /> },
  { name: 'Documents', icon: <FileText className="w-4 h-4 text-[#aa88ff]" /> },
  { name: 'Cloud storage', icon: <Cloud className="w-4 h-4 text-[#aa88ff]" /> },
  { name: 'Reports', icon: <BarChart className="w-4 h-4 text-[#aa88ff]" /> },
  { name: 'External tools', icon: <Globe className="w-4 h-4 text-[#aa88ff]" /> },
];

const RESEARCH_STUDIES: StudyItem[] = [
  {
    id: 'study-1',
    tag: '01',
    title: 'Autonomous Reconciliation',
    subtitle: 'Stripe · Postgres · Verifier',
    aim: 'Eliminates manual accounting audits by cross-referencing Stripe payment settlements with ledger accounts in real time.',
    objective: 'Achieve 100% verification accuracy, zero false-positives, and automated human-in-the-loop authorization gates.',
    info: 'The DAG planning engine constructs a dependency graph requiring Stripe charge collection, invoice reconciliation, and cryptographic signature verification before dispatching summary reports.',
    task: [
      'stripe.list_charges — Query settled Stripe customer charges',
      'store.match_invoices — Cross-reference local billing records and match IDs',
      'verifier.sign_receipt — Generate SHA-256 state proof hash',
      'approval.request — Pause execution for human email dispatch authorization',
      'email.send — Dispatch verified financial briefing to stakeholders',
    ],
    result: '100% verified status, SHA-256 Merkle proof receipt, downloadable PDF certificate, and 45 minutes saved per audit cycle.',
    actionPrompt: 'Generate weekly sales report and send summary email to team',
    badge: 'ACTIVE DEMO',
  },
  {
    id: 'study-2',
    tag: '02',
    title: 'Executive Multi-Source Briefing',
    subtitle: 'Gmail · Calendar · Drive',
    aim: 'Consolidates disparate inbox threads, scheduled executive meetings, and shared Google Drive documents into an actionable verified briefing.',
    objective: 'Cut daily executive briefing preparation from 60 minutes to under 45 seconds with zero hallucination risk.',
    info: 'Independent data extractors ingest live threads and meeting agendas, compute deterministic digest tokens, and construct a multi-page executive summary.',
    task: [
      'email.get_threads — Extract critical thread updates and action items',
      'calendar.list_events — Consolidate attendee agenda and conference links',
      'drive.summarize — Synthesize updates from shared quarterly documents',
      'reports.generate_summary — Produce structured executive briefing',
    ],
    result: 'Structured executive PDF briefing, verified participant invites, and zero data leakage across multi-tenant boundaries.',
    actionPrompt: 'Search Google Drive for customer contracts, generate executive PDF summary, and archive report',
    badge: 'ACTIVE DEMO',
  },
  {
    id: 'study-3',
    tag: '03',
    title: 'Self-Healing Chaos Recovery',
    subtitle: 'OAuth 401 · 503 Backoff · Check-Before-Retry',
    aim: 'Guarantees autonomous completion even when upstream third-party APIs fail, credentials expire, or network partitions occur.',
    objective: '100% recovery from transient faults with zero duplicated actions (never double-charge or double-email).',
    info: 'Built-in Chaos Engine injects simulated runtime faults. The Recovery Engine inspects downstream state before retrying, applies jittered backoff, and automatically re-authenticates expired tokens.',
    task: [
      'Fault Interception: Detect upstream HTTP 503 or expired OAuth token',
      'Error Classification: Classify root cause (auth, network, rate_limit)',
      'Check-Before-Retry: Probe provider outbox for prior message id',
      'Auto-Heal & Resume: Refresh credentials and resume DAG without restarting completed steps',
    ],
    result: 'Resilient workflow completion, zero duplicate transactions, 100% verified audit log containing every recovery attempt.',
    actionPrompt: 'Schedule sync meeting with Alex and Jordan for tomorrow morning and send calendar invites',
    badge: 'CHAOS RESILIENCE',
  },
  {
    id: 'study-4',
    tag: '04',
    title: 'Cryptographic Merkle Ledger',
    subtitle: 'SHA-256 · Proof Chain · PDF Certificate',
    aim: 'Replaces blind AI trust with mathematical proof by immutably linking every execution step to downstream state verification.',
    objective: 'Provide mathematical non-repudiation and instant detection of record tampering across all automated operations.',
    info: 'Every evidence record stores sha256(previous_hash + canonical_json(record)). If any record is tampered with, the chain breaks at the exact altered block and drops Trust Score to 0.',
    task: [
      'Inspect real state through connector verify() method',
      'Canonicalize JSON evidence payload (strip sensitive tokens)',
      'Compute SHA-256 block hash linked to parent node',
      'Generate certified PDF proof export with embedded Merkle root',
    ],
    result: 'Cryptographic Proof Certificate with tamper verification result, 100/100 Trust Score, and tamper-evident audit ledger.',
    actionPrompt: 'Generate weekly sales report and send summary email to team',
    badge: 'ZERO-TRUST',
  },
];

const TAG_CHIPS = [
  'All',
  'Verification',
  'Orchestration',
  'Proof Ledger',
  'Fluid Motion',
  'Chaos Engine',
  'DAG Engine',
  'Autonomy',
];

const STEPS = [
  {
    number: '01',
    title: 'Natural Intent',
    description: 'Provide an instruction in plain language. The AI decomposes your goal into verifiable subtasks.',
  },
  {
    number: '02',
    title: 'DAG Planning',
    description: 'Dependencies, approval gates, and verification methods are compiled into a deterministic execution graph.',
  },
  {
    number: '03',
    title: 'Sensory Execution',
    description: 'Tools run asynchronously while the 3D Brain reflects real-time cognitive states and SSE streams progress.',
  },
  {
    number: '04',
    title: 'State Verification',
    description: 'Independent checkers query downstream state to prove actual execution before marking any step complete.',
  },
  {
    number: '05',
    title: 'Cryptographic Ledger',
    description: 'SHA-256 Merkle chain signs immutable evidence receipts and generates verifiable completion certificates.',
  },
];

const FEATURES = [
  {
    icon: <Zap className="w-5 h-5 text-[#aa88ff]" />,
    title: 'Autonomous Orchestration',
    description: 'Multi-tool workflows orchestrated with zero manual glue code. Automatic retries, timeouts, and rollbacks.',
  },
  {
    icon: <Database className="w-5 h-5 text-[#aa88ff]" />,
    title: 'Self-Healing Engine',
    description: 'Autonomous recovery from transient failures, token expiration, rate limits, and network partitions.',
  },
  {
    icon: <Cpu className="w-5 h-5 text-[#aa88ff]" />,
    title: '3D Spatial Intelligence',
    description: 'Real-time sensory visualization of agent cognitive states with automatic lightweight 2D fallback.',
  },
  {
    icon: <Shield className="w-5 h-5 text-[#aa88ff]" />,
    title: 'Verified Proof of Work',
    description: 'Never fake success. The engine strictly requires validated proof before marking any step complete.',
  },
  {
    icon: <Layers className="w-5 h-5 text-[#aa88ff]" />,
    title: 'Live Streaming Updates',
    description: 'Server-Sent Events stream live status, progress meters, and intermediate outputs at 60fps.',
  },
  {
    icon: <Lock className="w-5 h-5 text-[#aa88ff]" />,
    title: 'Enterprise Redaction',
    description: 'Built-in security sanitizers scrub API keys, tokens, and authorization headers from all server logs.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [brainState, setBrainState] = useState<BrainState>('executing');
  const [force2D, setForce2D] = useState<boolean>(false);
  const [activeChip, setActiveChip] = useState<string>('All');
  const [selectedStudy, setSelectedStudy] = useState<StudyItem | null>(null);

  const brainStates: BrainState[] = [
    'idle',
    'thinking',
    'planning',
    'executing',
    'verifying',
    'completed',
    'failed',
  ];

  return (
    <div className="space-y-24 py-6 sm:py-12 select-none">
      {/* Top Tag Chips from Brief */}
      <div className="max-w-5xl mx-auto px-4 flex flex-wrap gap-2 justify-center">
        {TAG_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => setActiveChip(chip)}
            className={`chip-axon ${activeChip === chip ? 'active' : ''}`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <Badge variant="demo" size="md" className="gap-1.5 bg-[#1c1c1c] text-[#aa88ff] border-[#2a2a2a]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Spatial Platform</span>
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-mono font-bold tracking-tight text-white leading-tight uppercase"
        >
          Your instructions.{' '}
          <span className="text-[#aa88ff] shadow-glow-purple">
            Our execution.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xs sm:text-sm font-mono text-[#8a8a8a] max-w-2xl leading-relaxed tracking-wide"
        >
          TASKNOVA transforms goals into verifiable multi-step execution graphs.
          From cloud databases to external APIs, our agents plan, execute, and deliver
          tamper-proof results in real time.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Button
            size="lg"
            variant="primary"
            onClick={() => navigate('/dashboard?guidedDemo=true')}
            className="w-full sm:w-auto gap-2 text-sm px-6 py-3 bg-[#aa88ff] text-black font-bold uppercase shadow-glow-purple hover:bg-[#c4b5fd]"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Launch Guided Demo</span>
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto gap-2 text-sm px-8 py-3 bg-[#1c1c1c] border-[#2a2a2a] text-white hover:border-[#aa88ff]/50 uppercase"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button
            size="lg"
            variant="ghost"
            onClick={() => navigate('/workflows')}
            className="w-full sm:w-auto text-sm px-8 py-3 text-[#8a8a8a] hover:text-white border border-[#2a2a2a] hover:bg-[#1c1c1c] uppercase"
          >
            <span>Explore Workflows</span>
          </Button>
        </motion.div>

        {/* Dev State Switcher Floating Control */}
        <div className="w-full max-w-xl mx-auto pt-4">
          <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Badge variant="demo" size="sm">DEV</Badge>
              <span className="text-[#8a8a8a]">Brain Visualizer State:</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1">
              {brainStates.map((s) => (
                <button
                  key={s}
                  onClick={() => setBrainState(s)}
                  className={`px-2 py-1 rounded text-[10px] font-mono capitalize transition-all ${
                    brainState === s
                      ? 'bg-[#aa88ff] text-black font-bold shadow-sm'
                      : 'bg-[#1c1c1c] text-[#8a8a8a] hover:text-white border border-[#2a2a2a]'
                  }`}
                >
                  {s}
                </button>
              ))}

              <button
                onClick={() => setForce2D(!force2D)}
                className={`ml-2 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                  force2D
                    ? 'bg-[#1c1c1c] text-[#aa88ff] border border-[#aa88ff]/50'
                    : 'bg-[#1c1c1c] text-[#8a8a8a] hover:text-white border border-[#2a2a2a]'
                }`}
                title="Toggle WebGL 3D vs Canvas 2D mode"
              >
                {force2D ? <ToggleRight className="w-3.5 h-3.5 text-[#aa88ff]" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                <span>{force2D ? '2D Fallback' : '3D WebGL'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Central Sensory Sphere with orbiting tool nodes */}
        <div className="relative w-full max-w-3xl h-[420px] sm:h-[480px] flex items-center justify-center mt-6">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Live AIBrain Visualizer */}
            <div className="relative z-10 flex flex-col items-center">
              <AIBrain state={brainState} size={280} force2D={force2D} />
              <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-[#0a0a0a] border border-[#2a2a2a] text-[11px] font-mono text-[#8a8a8a]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#aa88ff] animate-pulse" />
                <span>STATE: <strong className="text-white uppercase">{brainState}</strong></span>
              </div>
            </div>
          </div>

          {/* Floating Orbiting Tool Badges */}
          <div className="absolute inset-0 pointer-events-none hidden sm:block">
            {TOOLS.map((tool, idx) => {
              const angle = (idx / TOOLS.length) * Math.PI * 2;
              const radius = 175;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius * 0.75;

              return (
                <div
                  key={tool.name}
                  className="absolute left-1/2 top-1/2 -ml-16 -mt-5 pointer-events-auto"
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0a0a0a]/90 border border-[#2a2a2a] shadow-lg text-xs font-mono text-[#dddddd] hover:border-[#aa88ff]/50 transition-all duration-300">
                    {tool.icon}
                    <span className="hidden sm:inline uppercase">{tool.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Motion Research & Autonomous Studies Showcase (from Recreation Brief) */}
      <section className="max-w-6xl w-full mx-auto px-4 sm:px-6">
        <div className="mb-6 flex items-center justify-between border-b border-[#2a2a2a] pb-3">
          <div className="flex items-center gap-3">
            <span className="counter-axon text-xs">04</span>
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Autonomous Motion &amp; Execution Studies
              </h2>
              <p className="text-[11px] font-mono text-[#8a8a8a]">
                Real-time GPU fluid and particle rendering logs
              </p>
            </div>
          </div>
          <Badge variant="demo" size="sm">ACTIVE SIMULATION</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 4 Interactive Research Studies */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {RESEARCH_STUDIES.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedStudy(item)}
                  className="card-axon border-[#2a2a2a] pt-3 cursor-pointer group hover:border-[#aa88ff] transition-all duration-300"
                >
                  <div className="h-40 rounded-sm bg-[#06060a] border border-[#2a2a2a] group-hover:border-[#aa88ff]/60 overflow-hidden relative flex flex-col justify-between p-3.5 transition-all">
                    {/* Top Status & Tag */}
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#aa88ff] font-bold tracking-wider">{item.badge}</span>
                      <span className="px-1.5 py-0.5 rounded bg-black/80 border border-[#2a2a2a] text-[#8a8a8a] group-hover:text-white transition-colors">
                        {item.tag}
                      </span>
                    </div>

                    {/* Procedural Visual Simulation Content */}
                    <div className="my-auto space-y-2 py-1">
                      {item.id === 'study-1' && (
                        <div className="space-y-1.5 font-mono text-[10px]">
                          <div className="flex justify-between text-[#8a8a8a]">
                            <span>STRIPE CHG_9812</span>
                            <span className="text-emerald-400 font-bold">$1,450.00 ✓</span>
                          </div>
                          <div className="flex justify-between text-[#8a8a8a]">
                            <span>DB INVOICE_REC</span>
                            <span className="text-emerald-400 font-bold">MATCHED ✓</span>
                          </div>
                          <div className="h-1 w-full bg-[#1c1c1c] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 animate-pulse w-full" />
                          </div>
                          <div className="text-[9px] text-[#aa88ff] truncate">PROVING: sha256_e3b0c442...</div>
                        </div>
                      )}

                      {item.id === 'study-2' && (
                        <div className="space-y-1.5 font-mono text-[10px]">
                          <div className="flex items-center justify-between text-[#cfcfcf]">
                            <span>• Gmail Digest</span>
                            <span className="text-[#aa88ff]">3 threads</span>
                          </div>
                          <div className="flex items-center justify-between text-[#cfcfcf]">
                            <span>• Calendar Sync</span>
                            <span className="text-emerald-400">10:00 AM</span>
                          </div>
                          <div className="flex items-center justify-between text-[#cfcfcf]">
                            <span>• Drive Deck</span>
                            <span className="text-[#8a8a8a]">Q4_Audit.pdf</span>
                          </div>
                          <div className="text-[9px] text-emerald-400">SYNTHESIZED: ExecutiveBrief.pdf</div>
                        </div>
                      )}

                      {item.id === 'study-3' && (
                        <div className="space-y-1.5 font-mono text-[10px]">
                          <div className="flex justify-between items-center text-amber-400">
                            <span>INJECT: OAuth 401</span>
                            <span className="text-[9px] px-1 bg-amber-400/10 border border-amber-400/30 rounded">FAULT</span>
                          </div>
                          <div className="text-[#8a8a8a] text-[9px]">
                            &gt; Refreshing token credentials...
                          </div>
                          <div className="text-[#8a8a8a] text-[9px]">
                            &gt; Checking outbox for duplicate...
                          </div>
                          <div className="text-[9px] text-emerald-400 font-bold">
                            AUTONOMOUSLY RECOVERED (0 Duplicates)
                          </div>
                        </div>
                      )}

                      {item.id === 'study-4' && (
                        <div className="space-y-1.5 font-mono text-[10px]">
                          <div className="flex items-center justify-between text-[#8a8a8a]">
                            <span>BLOCK #04</span>
                            <span className="text-[#aa88ff]">GENESIS &gt; MERKLE</span>
                          </div>
                          <div className="p-1 rounded bg-[#0a0a0f] border border-[#2a2a2a] text-[9px] text-emerald-400 truncate">
                            HASH: 9f86d081884c7d659a2feaa0c55ad0...
                          </div>
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-[#8a8a8a]">INTEGRITY: 100%</span>
                            <span className="text-[#aa88ff] font-bold">PDF EXPORT READY</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Indicator */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-[#8a8a8a] pt-1 border-t border-[#1a1a24]">
                      <span>VERIFIED MODEL</span>
                      <span className="text-[#aa88ff] group-hover:underline flex items-center gap-1">
                        Inspect AIM -&gt;
                      </span>
                    </div>

                    {/* Hover Inspection Overlay */}
                    <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 backdrop-blur-[2px]">
                      <span className="px-3 py-1.5 rounded bg-[#aa88ff] text-black font-mono font-bold text-xs uppercase flex items-center gap-1.5 shadow-glow-purple">
                        <span>Inspect Study &amp; AIM</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 text-xs font-mono">
                    <span className="text-white font-medium group-hover:text-[#aa88ff] transition-colors">
                      {item.title}
                    </span>
                    <span className="text-[#8a8a8a] text-right">{item.subtitle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Text Column from Recreation Brief */}
          <div className="lg:col-span-5 bg-[#0a0a0a]/90 border border-[#2a2a2a] rounded-lg p-6 space-y-6 font-mono text-xs text-[#dddddd]">
            <div>
              <h3 className="text-[#aa88ff] font-bold uppercase tracking-wider mb-2">[info]</h3>
              <p className="text-[#8a8a8a] leading-relaxed">
                Task executions are independently verified against real provider state before sealing cryptographic Merkle receipts.
              </p>
            </div>

            <div>
              <h3 className="text-[#aa88ff] font-bold uppercase tracking-wider mb-2">[aims]</h3>
              <p className="text-[#8a8a8a] leading-relaxed">
                An open logbook of verifiable autonomy research: dependency DAG routing, state reconciliation, and SHA-256 Merkle proofs. Every execution is verified against downstream ground truth before advancing.
              </p>
            </div>

            <div>
              <h3 className="text-[#aa88ff] font-bold uppercase tracking-wider mb-2">[exploring]</h3>
              <ul className="text-[#8a8a8a] space-y-1.5 list-inside">
                <li>• Verifiable State Proofs &amp; Merkle Ledger</li>
                <li>• Continuous GPU Fluid Gaze &amp; Particle Stream</li>
                <li>• Self-Healing Autonomous Fault Recovery</li>
                <li>• Zero-Key Deterministic Offline Fallback</li>
              </ul>
            </div>

            <div className="pt-2 border-t border-[#2a2a2a]">
              <h3 className="text-[#aa88ff] font-bold uppercase tracking-wider mb-2">[connect]</h3>
              <div className="space-y-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="block text-left text-white hover:text-[#aa88ff] underline transition-colors duration-300"
                >
                  Launch Platform -&gt; Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/about')}
                  className="block text-left text-[#8a8a8a] hover:text-white underline transition-colors duration-300"
                >
                  Technical Architecture -&gt; Proof Ledger
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Study Detail Modal */}
        <StudyDetailModal
          study={selectedStudy}
          isOpen={Boolean(selectedStudy)}
          onClose={() => setSelectedStudy(null)}
        />
      </section>

      {/* Technical Architecture Flow Diagram */}
      <section className="max-w-5xl w-full mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-10">
          <Badge variant="demo" size="md">Architecture</Badge>
          <h2 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight uppercase">
            How does it work technically?
          </h2>
          <p className="text-xs font-mono text-[#8a8a8a] max-w-lg mx-auto">
            From raw user prompt to verified completion proof without missing links or hidden mocks.
          </p>
        </div>

        {/* Clean, Non-Clipping Diagram Pipeline */}
        <GlassPanel intensity="strong" className="p-6 sm:p-10 border-[#2a2a2a] bg-[#0a0a0a]/90 overflow-hidden rounded-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 relative">
            {/* Node 1: User Instruction */}
            <div className="w-full md:w-44 p-4 rounded-md bg-[#050508] border border-[#2a2a2a] text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-md bg-[#1c1c1c] text-[#aa88ff] flex items-center justify-center mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono font-bold text-white">User Instruction</div>
              <p className="text-[10px] font-mono text-[#8a8a8a] mt-1">Prompt / Goal</p>
            </div>

            {/* Arrow 1 */}
            <div className="flex items-center justify-center text-[#aa88ff]">
              <ArrowDown className="w-5 h-5 md:-rotate-90" />
            </div>

            {/* Node 2: AI Brain */}
            <div className="w-full md:w-44 p-4 rounded-md bg-[#050508] border border-[#2a2a2a] text-center shadow-glow-purple flex flex-col items-center">
              <div className="w-10 h-10 rounded-md bg-[#1c1c1c] text-[#aa88ff] flex items-center justify-center mb-2">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono font-bold text-white">AI Brain</div>
              <p className="text-[10px] font-mono text-[#8a8a8a] mt-1">Planner (Gemini / Template)</p>
            </div>

            {/* Arrow 2 */}
            <div className="flex items-center justify-center text-[#aa88ff]">
              <ArrowDown className="w-5 h-5 md:-rotate-90" />
            </div>

            {/* Node 3: Task Execution Engine */}
            <div className="w-full md:w-44 p-4 rounded-md bg-[#050508] border border-[#2a2a2a] text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-md bg-[#1c1c1c] text-white flex items-center justify-center mb-2">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono font-bold text-white">Execution Engine</div>
              <p className="text-[10px] font-mono text-[#8a8a8a] mt-1">DAG Step Runner</p>
            </div>
          </div>

          {/* Three Parallel Branches (Data, Reports, Email) */}
          <div className="my-8 py-6 px-4 rounded-md bg-black/60 border border-[#2a2a2a]">
            <div className="text-center text-[10px] font-mono text-[#8a8a8a] uppercase tracking-widest mb-4">
              Connector Action Branches
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-md bg-[#0a0a0a] border border-[#2a2a2a] text-center flex items-center justify-center gap-2">
                <Database className="w-4 h-4 text-[#aa88ff] shrink-0" />
                <span className="text-xs font-mono text-[#dddddd]">1. Data Store</span>
              </div>
              <div className="p-3 rounded-md bg-[#0a0a0a] border border-[#2a2a2a] text-center flex items-center justify-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#aa88ff] shrink-0" />
                <span className="text-xs font-mono text-[#dddddd]">2. Reports</span>
              </div>
              <div className="p-3 rounded-md bg-[#0a0a0a] border border-[#2a2a2a] text-center flex items-center justify-center gap-2">
                <Mail className="w-4 h-4 text-[#aa88ff] shrink-0" />
                <span className="text-xs font-mono text-[#dddddd]">3. Email &amp; Slack</span>
              </div>
            </div>
          </div>

          {/* Verification & Final Proof */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 pb-6">
            {/* Node 5: Verification Engine */}
            <div className="w-full md:w-56 p-4 rounded-md bg-[#050508] border border-[#2a2a2a] text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-md bg-[#1c1c1c] text-[#aa88ff] flex items-center justify-center mb-2">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono font-bold text-white">Verification Engine</div>
              <p className="text-[10px] font-mono text-[#8a8a8a] mt-1">Proof &amp; Output Validation</p>
            </div>

            {/* Connecting Arrow */}
            <div className="flex items-center justify-center text-[#aa88ff]">
              <ArrowDown className="w-5 h-5 md:-rotate-90" />
            </div>

            {/* Node 6: Task Completed + Proof */}
            <div className="w-full md:w-60 p-4 rounded-md bg-[#050508] border border-[#aa88ff]/40 text-center shadow-glow-purple flex flex-col items-center mb-2">
              <div className="w-10 h-10 rounded-md bg-[#1c1c1c] text-[#aa88ff] flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono font-bold text-white">Task Completed + Proof</div>
              <p className="text-[10px] font-mono text-[#aa88ff] mt-1">Tamper-Proof Receipt &amp; SSE Stream</p>
            </div>
          </div>
        </GlassPanel>
      </section>

      {/* Five Animated How-It-Works Steps */}
      <section className="max-w-5xl w-full mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="demo" size="md">Workflow Lifecycle</Badge>
          <h2 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight uppercase">
            How TASKNOVA Works
          </h2>
          <p className="text-xs font-mono text-[#8a8a8a] max-w-lg mx-auto">
            A deterministic pipeline from input understanding to cryptographically signed proof.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STEPS.map((step, idx) => (
            <div
              key={step.number}
              className="p-5 rounded-md bg-[#0a0a0a] border border-[#2a2a2a] relative group hover:border-[#aa88ff]/50 transition-all duration-300"
            >
              <div className="text-2xl font-mono font-bold text-[#8a8a8a] mb-3 group-hover:text-[#aa88ff] transition-colors">
                {step.number}
              </div>
              <h3 className="text-xs font-mono font-bold text-white mb-2 uppercase">{step.title}</h3>
              <p className="text-[11px] font-mono text-[#8a8a8a] leading-relaxed">
                {step.description}
              </p>
              {idx < STEPS.length - 1 && (
                <div className="hidden md:block absolute -right-2 top-1/2 -mt-1 w-4 h-0.5 bg-[#2a2a2a] z-10" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Core Architectural Features */}
      <section className="max-w-5xl w-full mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="demo" size="md">Core Features</Badge>
          <h2 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight uppercase">
            Built for Verifiable Autonomy
          </h2>
          <p className="text-xs font-mono text-[#8a8a8a] max-w-lg mx-auto">
            Every feature is engineered to eliminate hallucination, guarantee execution, and maintain audit trails.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat) => (
            <Card key={feat.title} variant="interactive" className="p-6 space-y-4 bg-[#0a0a0a] border-[#2a2a2a] hover:border-[#aa88ff]/50 rounded-md">
              <div className="p-3 rounded-md bg-[#1c1c1c] w-fit border border-[#2a2a2a]">{feat.icon}</div>
              <h3 className="text-sm font-mono font-bold text-white uppercase">{feat.title}</h3>
              <p className="text-xs font-mono text-[#8a8a8a] leading-relaxed">
                {feat.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="max-w-4xl w-full mx-auto px-4 sm:px-6 pb-12">
        <GlassPanel
          intensity="strong"
          className="p-8 sm:p-12 text-center space-y-6 border-[#2a2a2a] bg-[#0a0a0a] rounded-xl shadow-glow-purple"
        >
          <h2 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight uppercase">
            Ready to experience Verifiable Autonomy?
          </h2>
          <p className="text-xs font-mono text-[#8a8a8a] max-w-xl mx-auto">
            Experience our zero-key demo environment. Run your first workflow, inspect the proof ledger,
            and test autonomous error recovery in under 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/dashboard')}
              className="gap-2 text-xs font-mono px-8 py-3.5 bg-[#aa88ff] text-black font-bold uppercase shadow-glow-purple"
            >
              <span>Launch TASKNOVA</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/about')}
              className="text-xs font-mono px-8 py-3.5 bg-[#1c1c1c] text-white border-[#2a2a2a] hover:border-[#aa88ff]/50 uppercase"
            >
              <span>Explore Architecture &amp; Pitch</span>
            </Button>
          </div>
        </GlassPanel>
      </section>
    </div>
  );
};
export default LandingPage;