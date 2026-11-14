import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Home, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Badge } from '../components/ui/Badge';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <GlassPanel
        intensity="strong"
        className="max-w-md w-full p-8 text-center border-slate-700/60 shadow-2xl relative overflow-hidden"
      >
        {/* Ambient background glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-brand-purple/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-brand-cyan/20 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-900/80 border border-brand-purple/30 flex items-center justify-center text-brand-purple-light shadow-glow-purple"
        >
          <Compass className="w-8 h-8 animate-spin-slow" />
        </motion.div>

        <Badge variant="demo" size="md" className="mb-3">
          404 — ROUTE UNKNOWN
        </Badge>

        <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">
          Lost in Spatial Coordinate Space
        </h1>

        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          The requested path does not exist in the TASKNOVA execution mesh. Check the URL or return to the operations command center.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto gap-2 text-xs font-semibold"
          >
            <Home className="w-4 h-4" />
            <span>Operations Dashboard</span>
          </Button>

          <Button
            variant="glass"
            size="md"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto gap-2 text-xs text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
          <span>TASKNOVA Spatial Mesh v1.0 • Zero-Key Guaranteed</span>
        </div>
      </GlassPanel>
    </div>
  );
};

export default NotFoundPage;
