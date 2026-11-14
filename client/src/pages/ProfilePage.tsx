import React, { useState } from 'react';
import { User, Shield, Save, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      await api.updateProfile({ fullName });
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your name has been updated successfully.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      addToast({
        type: 'error',
        title: 'Update Error',
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Operator Profile</h1>
            <Badge variant="demo" size="md">AUTHENTICATED</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage your credentials, operator role, and personal preferences.
          </p>
        </div>

        <Button variant="danger" size="sm" onClick={() => logout()} className="gap-2">
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card variant="glass" className="p-6 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-teal-500 to-purple-500 p-1 shadow-glow-cyan">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-teal-400">
              <User className="w-10 h-10" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{user?.fullName || 'Operator'}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
          </div>
          <Badge variant="demo" size="sm" className="uppercase font-mono">
            ROLE: {user?.role || 'user'}
          </Badge>
        </Card>

        {/* Edit Details */}
        <Card variant="default" className="md:col-span-2 p-6 space-y-6">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-400" />
            <span>Account Details</span>
          </h3>

          <form onSubmit={handleUpdate} className="space-y-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your Name"
              required
            />

            <Input
              label="Email Address"
              value={user?.email || ''}
              disabled
              helperText="Email cannot be changed directly."
            />

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>JWT session authenticated. User isolation policy active.</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="md" isLoading={saving} className="gap-2">
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
