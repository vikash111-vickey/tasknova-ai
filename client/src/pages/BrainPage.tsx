import React, { useState } from 'react';
import { Cpu, RotateCcw, Sparkles, Layers } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AIBrain } from '../components/brain/AIBrain';
import { BrainState } from '../components/brain/AIBrainTypes';

export const BrainPage: React.FC = () => {
  const [state, setState] = useState<BrainState>('planning');
  const [force2D, setForce2D] = useState(false);

  const states: Array<{ id: BrainState; label: string; desc: string }> = [
    { id: 'idle', label: 'Idle', desc: 'Calm ambient rotation with cyan-indigo glow' },
    { id: 'thinking', label: 'Thinking', desc: 'High-frequency core pulsing with violet-pink aura' },
    { id: 'planning', label: 'Planning', desc: 'Structured geometric nodes and synchronized orbital rings' },
    { id: 'executing', label: 'Executing', desc: 'High-velocity particle flow and dynamic illumination' },
    { id: 'verifying', label: 'Verifying', desc: 'Focused teal core scanning proof signatures' },
    { id: 'completed', label: 'Completed', desc: 'Emerald green stabilization indicating verified success' },
    { id: 'failed', label: 'Failed', desc: 'Controlled crimson pulse signaling error detection' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">AI Brain Chamber</h1>
            <Badge variant="demo" size="md">SPATIAL 3D</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time neural agent visualization rendered with React Three Fiber (or 2D fallback).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setForce2D(!force2D)}
          className="gap-2 text-xs"
        >
          <Layers className="w-4 h-4 text-teal-400" />
          <span>{force2D ? 'Switch to 3D Canvas' : 'Force 2D Fallback'}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        {/* Visualizer Canvas */}
        <Card
          variant="glass"
          className="lg:col-span-2 min-h-[460px] flex flex-col items-center justify-center p-8 relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Badge variant="demo" size="sm">
              {force2D ? '2D SVG RENDERER' : 'THREE.JS 0.160.0'}
            </Badge>
            <span className="text-xs font-mono text-slate-400 uppercase">State: {state}</span>
          </div>

          <AIBrain state={state} size={360} force2D={force2D} />

          <div className="mt-4 text-center max-w-md">
            <div className="text-sm font-bold text-white capitalize flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>{states.find((s) => s.id === state)?.label} State</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {states.find((s) => s.id === state)?.desc}
            </p>
          </div>
        </Card>

        {/* State Control Panel */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-400" />
            <span>Select Brain State</span>
          </h3>

          <div className="space-y-2">
            {states.map((s) => (
              <button
                key={s.id}
                onClick={() => setState(s.id)}
                className={`w-full p-3.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                  state === s.id
                    ? 'bg-teal-500/15 border-teal-500/40 text-white shadow-glow-cyan'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold capitalize">{s.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{s.desc}</div>
                </div>
                {state === s.id && (
                  <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0 ml-2 animate-ping" />
                )}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState('idle')}
            className="w-full text-xs text-slate-400 hover:text-white gap-2 mt-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Idle</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BrainPage;
