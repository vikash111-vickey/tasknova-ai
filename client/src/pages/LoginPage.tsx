import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof LoginSchema>;

export const LoginPage: React.FC = () => {
  const { login, useDemoAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await login(data);
      addToast({
        type: 'success',
        title: 'Welcome Back',
        message: 'Successfully authenticated session.',
      });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      addToast({
        type: 'error',
        title: 'Authentication Failed',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      await useDemoAccount();
      addToast({
        type: 'success',
        title: 'Demo Session Active',
        message: 'Logged in as Demo Operator with LocalStore persistence.',
      });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Demo account login failed';
      addToast({
        type: 'error',
        title: 'Demo Login Error',
        message,
      });
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md p-8 rounded-2xl glass-strong border border-slate-700/80 shadow-2xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 shadow-glow-cyan mx-auto flex items-center justify-center">
            <Activity className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to TASKNOVA</h2>
          <p className="text-xs text-slate-400">
            Access your autonomous spatial workflows and execution engine.
          </p>
        </div>

        {/* Demo Fast Login Button */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-300">Quick Demo Access</span>
              <Badge variant="demo" size="sm">DEMO</Badge>
            </div>
            <p className="text-[11px] text-amber-400/80 mt-0.5">
              One-click access with zero credentials needed.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleDemoLogin}
            isLoading={demoLoading}
            className="shrink-0 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Use Demo Account</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="operator@tasknova.local"
            {...register('email')}
            error={errors.email?.message}
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password?.message}
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            className="w-full gap-2 shadow-md mt-2"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-4">
            Register here
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
