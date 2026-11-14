import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, Sparkles } from 'lucide-react';
import { Button } from './Button';
import { GlassPanel } from './GlassPanel';
import { Badge } from './Badge';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TASKNOVA ErrorBoundary] Caught UI error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <GlassPanel
            intensity="strong"
            className="max-w-lg w-full p-8 text-center border-rose-500/30 shadow-2xl relative overflow-hidden"
          >
            {/* Ambient error glow */}
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-glow-red">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <Badge variant="demo" size="md" className="mb-3 text-rose-300 border-rose-500/40">
              RUNTIME RECOVERY ENGAGED
            </Badge>

            <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">
              An Unexpected Exception Occurred
            </h1>

            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              TASKNOVA self-healing boundaries caught an unhandled interface exception. Your underlying state, tasks, and cryptographic ledgers remain completely safe.
            </p>

            {this.state.error && (
              <div className="p-3 mb-6 rounded-xl bg-slate-950/80 border border-white/5 font-mono text-[11px] text-rose-300 text-left overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={this.handleReset}
                className="w-full sm:w-auto gap-2 text-xs font-semibold bg-gradient-to-r from-rose-600 to-amber-600"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Application</span>
              </Button>

              <Button
                variant="glass"
                size="md"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto gap-2 text-xs text-slate-300"
              >
                <Home className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </Button>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Fault-Tolerant Spatial Architecture • Zero Data Loss</span>
            </div>
          </GlassPanel>
        </div>
      );
    }

    return this.props.children;
  }
}
