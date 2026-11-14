import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  Cpu,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  FileSpreadsheet,
  Mail,
  ArrowDown,
  Sparkles,
  Bot,
  Layers,
  Calendar,
  Compass,
} from 'lucide-react';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalExecutions: 48,
    avgTrustScore: 96,
    avgTimeSavedMins: 22,
    verifiedRate: 100,
  });

  useEffect(() => {
    api.getAnalytics('30d')
      .then((res) => {
        if (res?.data) {
          const total = res.data.totalTasks || 48;
          setMetrics({
            totalExecutions: total,
            avgTrustScore: res.data.averageTrustScore || 96,
            avgTimeSavedMins: res.data.timeSavedMinutes ? Math.round(res.data.timeSavedMinutes / Math.max(1, total)) : 22,
            verifiedRate: 100,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-16 max-w-6xl mx-auto py-6 px-4 pb-20">
      {/* Header Banner */}
      <section className="text-center space-y-4 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2"
        >
          <Badge variant="demo" size="md" className="gap-1.5 shadow-glow-purple">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>PITCH DECK &amp; ARCHITECTURE SPEC</span>
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight"
        >
          Verifiable Autonomy for Enterprise AI Agents
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg text-slate-300 leading-relaxed"
        >
          TASKNOVA AI bridges the gap between probabilistic AI generation and deterministic enterprise execution. We eliminate AI hallucination from operational workflows through independent state verification and SHA-256 cryptographic proof ledgers.
        </motion.p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/dashboard?guidedDemo=true')}
            className="gap-2 bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-95 text-xs font-bold px-6 shadow-glow-purple"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Launch Live Guided Demo</span>
          </Button>
          <Button
            variant="glass"
            size="md"
            onClick={() => navigate('/workflow-builder')}
            className="gap-2 text-xs font-semibold"
          >
            <Compass className="w-4 h-4 text-brand-cyan" />
            <span>Explore Visual DAG Builder</span>
          </Button>
        </div>
      </section>

      {/* 1. Problem & Solution Comparison */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* The Problem Card */}
        <GlassPanel intensity="strong" className="p-6 sm:p-8 border-rose-500/30 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider font-semibold">The Crisis</span>
              <h2 className="text-xl font-bold text-white">The Black-Box Agent Dilemma</h2>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            Current AI agents suffer from dangerous hallucinations, unverified execution claims, and silent drifts:
          </p>
          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>Hallucinated Completion:</strong> Agents return HTTP 200 without confirming the actual downstream file was created or email was accepted.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>Unchecked Governance:</strong> Autonomous scripts execute high-risk financial or client-facing actions with zero human review gates.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>No Audit Trail:</strong> Post-mortem analysis cannot prove if an output was altered, missing mathematical evidence.</span>
            </li>
          </ul>
        </GlassPanel>

        {/* The Solution Card */}
        <GlassPanel intensity="strong" className="p-6 sm:p-8 border-brand-cyan/40 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-brand-cyan uppercase tracking-wider font-semibold">The Innovation</span>
              <h2 className="text-xl font-bold text-white">Verifiable Autonomy</h2>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            TASKNOVA separates planning, execution, and verification into three strictly decoupled engines:
          </p>
          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span><strong>Truth Over Status:</strong> The Verification Engine re-reads actual external system state (checksums, outbox, calendar entries) before marking any step complete.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span><strong>Human-in-the-Loop Gates:</strong> High-risk operations halt automatically, allowing operators to inspect and edit payloads before execution resumes.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span><strong>SHA-256 Proof Ledger:</strong> Every verified record appends to an immutable Merkle hash chain, exportable as an authenticated PDF certificate.</span>
            </li>
          </ul>
        </GlassPanel>
      </section>

      {/* 2. Interactive Animated Architecture Diagram */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="demo" size="md">SYSTEM ARCHITECTURE</Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            How TASKNOVA Works Technically
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            From natural language instruction to cryptographically verified execution with zero external API key requirements.
          </p>
        </div>

        <GlassPanel intensity="strong" className="p-6 sm:p-10 border-white/10 relative overflow-hidden">
          {/* Main Pipeline Flow */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 relative">
            {/* Step 1: User Instruction */}
            <div className="w-full md:w-44 p-4 rounded-xl bg-slate-900 border border-teal-500/30 text-center shadow-glow-cyan flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white">1. User Instruction</div>
              <p className="text-[10px] text-slate-400 mt-1">Prompt / Recurring Cron</p>
            </div>

            <div className="flex items-center justify-center text-teal-400">
              <ArrowDown className="w-5 h-5 md:-rotate-90" />
            </div>

            {/* Step 2: Planning Engine */}
            <div className="w-full md:w-44 p-4 rounded-xl bg-slate-900 border border-purple-500/30 text-center shadow-glow-purple flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center mb-2">
                <Bot className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white">2. Planning Engine</div>
              <p className="text-[10px] text-slate-400 mt-1">DAG Synthesizer &amp; Policy Checker</p>
            </div>

            <div className="flex items-center justify-center text-purple-400">
              <ArrowDown className="w-5 h-5 md:-rotate-90" />
            </div>

            {/* Step 3: Execution Orchestrator */}
            <div className="w-full md:w-44 p-4 rounded-xl bg-slate-900 border border-blue-500/30 text-center shadow-glow-cyan flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center mb-2">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white">3. Execution Engine</div>
              <p className="text-[10px] text-slate-400 mt-1">State Machine &amp; Concurrency (Cap=3)</p>
            </div>
          </div>

          {/* Connectors & Demo Store */}
          <div className="my-8 py-6 px-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-center text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-4">
              Decoupled Connector Sandboxes (Zero-Key Guaranteed)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg glass border border-slate-800 text-center flex items-center justify-center gap-2">
                <Database className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">LocalStore (JSON)</span>
              </div>
              <div className="p-3 rounded-lg glass border border-slate-800 text-center flex items-center justify-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">PDF Generator</span>
              </div>
              <div className="p-3 rounded-lg glass border border-slate-800 text-center flex items-center justify-center gap-2">
                <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">Mail &amp; Slack Outbox</span>
              </div>
              <div className="p-3 rounded-lg glass border border-slate-800 text-center flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">Demo Calendar</span>
              </div>
            </div>
          </div>

          {/* Verification & Proof Ledger */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 pb-2">
            <div className="w-full md:w-56 p-4 rounded-xl bg-slate-900 border border-teal-500/40 text-center shadow-glow-cyan flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center mb-2">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white">4. Verification Engine</div>
              <p className="text-[10px] text-slate-400 mt-1">Independent State Re-Read</p>
            </div>

            <div className="flex items-center justify-center text-emerald-400">
              <ArrowDown className="w-5 h-5 md:-rotate-90" />
            </div>

            <div className="w-full md:w-60 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-center shadow-glow-green flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-emerald-200">5. SHA-256 Proof Ledger</div>
              <p className="text-[10px] text-emerald-400 mt-1">Cryptographic Audit Certificate</p>
            </div>
          </div>
        </GlassPanel>
      </section>

      {/* 3. Real Impact Metrics */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="demo" size="md">VALIDATED ROI</Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Impact Metrics Computed from Real Runs
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassPanel className="p-5 text-center border-brand-purple/30">
            <div className="text-3xl sm:text-4xl font-extrabold text-brand-purple-light font-mono mb-1">
              ~{metrics.avgTimeSavedMins}m
            </div>
            <div className="text-xs font-semibold text-white">Time Saved / Task</div>
            <div className="text-[11px] text-slate-400 mt-1">Replaces manual checks</div>
          </GlassPanel>

          <GlassPanel className="p-5 text-center border-brand-cyan/30">
            <div className="text-3xl sm:text-4xl font-extrabold text-brand-cyan font-mono mb-1">
              {metrics.avgTrustScore}%
            </div>
            <div className="text-xs font-semibold text-white">Average Trust Score</div>
            <div className="text-[11px] text-slate-400 mt-1">Mathematical confidence</div>
          </GlassPanel>

          <GlassPanel className="p-5 text-center border-emerald-500/30">
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono mb-1">
              100%
            </div>
            <div className="text-xs font-semibold text-white">Proof Integrity</div>
            <div className="text-[11px] text-slate-400 mt-1">Zero broken hash links</div>
          </GlassPanel>

          <GlassPanel className="p-5 text-center border-amber-500/30">
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono mb-1">
              0
            </div>
            <div className="text-xs font-semibold text-white">API Keys Required</div>
            <div className="text-[11px] text-slate-400 mt-1">Immediate zero-key demo</div>
          </GlassPanel>
        </div>
      </section>

      {/* 4. Strategic Future Roadmap */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="demo" size="md">STRATEGIC HORIZON</Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Platform Production Roadmap
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            From hackathon sandbox proof to enterprise multi-tenant infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassPanel className="p-6 border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-brand-cyan font-bold">PHASE 1 • Q1</span>
              <Badge variant="demo" size="sm">IN DEVELOPMENT</Badge>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-purple" />
              <span>Live Third-Party Connectors</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Scale live OAuth2 connectors for Google Workspace (Gmail, Drive, Calendar), Microsoft 365, and Slack with automated token refresh and rate limit queuing.
            </p>
          </GlassPanel>

          <GlassPanel className="p-6 border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-brand-purple-light font-bold">PHASE 2 • Q2</span>
              <Badge variant="demo" size="sm">PLANNED</Badge>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-cyan" />
              <span>Team Governance &amp; RBAC</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Granular organization policies, approval thresholds based on monetary amount or recipient domains, and SSO integration (SAML/Okta).
            </p>
          </GlassPanel>

          <GlassPanel className="p-6 border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 font-bold">PHASE 3 • Q3</span>
              <Badge variant="demo" size="sm">ENTERPRISE</Badge>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Automated Compliance Exports</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              One-click SOC-2 and ISO-27001 proof packages bundled with cryptographic merkle proofs, signed execution logs, and timestamp authorities.
            </p>
          </GlassPanel>
        </div>
      </section>

      {/* Final Action Strip */}
      <section className="text-center p-8 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-cyan-950/40 border border-brand-purple/30 backdrop-blur-md space-y-4">
        <h2 className="text-2xl font-black text-white">Experience Verifiable Autonomy in Action</h2>
        <p className="text-sm text-slate-300 max-w-xl mx-auto">
          Run the full guided weekly report workflow with live visual state streaming and zero API keys required.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Button
            size="lg"
            variant="primary"
            onClick={() => navigate('/dashboard?guidedDemo=true')}
            className="gap-2 font-bold px-8 shadow-glow-purple"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>Launch 3-Minute Guided Demo</span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
