import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Sliders,
  Shield,
  Lock,
  Database,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Key,
  Save,
  Plus,
} from 'lucide-react';

import { Policy } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'policies' | 'security' | 'data'>('profile');

  // Profile State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Appearance State
  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem('tasknova_reduced_motion') === 'true';
  });
  const [accentColor, setAccentColor] = useState('teal');

  // Policies State
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyType, setNewPolicyType] = useState('require_approval');

  // Delete Account Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Health / Environment State
  const [healthStatus, setHealthStatus] = useState<{ mode: string; ai: string }>({
    mode: 'demo',
    ai: 'template',
  });

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setAvatarUrl(user.avatarUrl || '');
    }

    api.getHealth()
      .then((res) => {
        if (res?.data) {
          setHealthStatus({
            mode: res.data.mode || 'demo',
            ai: res.data.ai || 'template',
          });
        }
      })
      .catch(() => {});
  }, [user]);

  const fetchPolicies = useCallback(async () => {
    setLoadingPolicies(true);
    try {
      const res = await api.getPolicies();
      if (res?.data) {
        setPolicies(res.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch policies';
      addToast({
        type: 'error',
        title: 'Error Loading Policies',
        message,
      });
    } finally {
      setLoadingPolicies(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (activeTab === 'policies') {
      fetchPolicies();
    }
  }, [activeTab, fetchPolicies]);

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateProfile({ fullName, avatarUrl });
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your operator details have been updated.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      addToast({
        type: 'error',
        title: 'Save Failed',
        message,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Toggle Reduced Motion
  const handleToggleReducedMotion = (val: boolean) => {
    setReducedMotion(val);
    localStorage.setItem('tasknova_reduced_motion', String(val));
    if (val) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    addToast({
      type: 'info',
      title: val ? 'Reduced Motion Enabled' : 'Standard Motion Enabled',
      message: val ? '3D Brain visualizer pauses rotation and complex animations.' : 'Standard spatial transitions restored.',
    });
  };

  // Toggle Policy
  const handleTogglePolicy = async (policy: Policy) => {
    try {
      const updated = await api.updatePolicy(policy.id, { isActive: !policy.isActive });
      addToast({
        type: 'info',
        title: updated.data.isActive ? 'Policy Enabled' : 'Policy Suspended',
        message: `Security rule "${policy.name}" updated.`,
      });
      fetchPolicies();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update policy';
      addToast({
        type: 'error',
        title: 'Update Failed',
        message,
      });
    }
  };

  // Delete Policy
  const handleDeletePolicy = async (id: string) => {
    try {
      await api.deletePolicy(id);
      addToast({
        type: 'info',
        title: 'Policy Removed',
        message: 'The custom rule has been deleted.',
      });
      fetchPolicies();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete policy';
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message,
      });
    }
  };

  // Create Policy
  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim()) return;

    try {
      await api.createPolicy({
        name: newPolicyName.trim(),
        ruleType: newPolicyType,
        ruleConfig: { requiresApproval: true },
        isActive: true,
      });

      addToast({
        type: 'success',
        title: 'Policy Enforced',
        message: `Rule "${newPolicyName}" registered in planning safety engine.`,
      });

      setPolicyModalOpen(false);
      setNewPolicyName('');
      fetchPolicies();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create policy';
      addToast({
        type: 'error',
        title: 'Policy Creation Failed',
        message,
      });
    }
  };

  // Export User Data
  const handleExportData = async () => {
    try {
      const blob = await api.exportUserData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasknova_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Data Exported (JSON)',
        message: 'Your isolated execution history and proofs have been downloaded.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export data';
      addToast({
        type: 'error',
        title: 'Export Failed',
        message,
      });
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      await api.deleteUserAccount();
      addToast({
        type: 'info',
        title: 'Account Deleted',
        message: 'All isolated profile records, tasks, and proofs have been purged.',
      });
      logout();
      navigate('/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      addToast({
        type: 'error',
        title: 'Deletion Failed',
        message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Settings &amp; Security</h1>
            <Badge variant="demo" size="md">ZERO-KEY ACTIVE</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Operator preferences, permission policies, cryptographic security, and data governance.
          </p>
        </div>
      </div>

      {/* Main Tabs Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Navigation Tabs */}
        <div className="space-y-1.5 md:col-span-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile &amp; Identity</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'appearance'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Appearance &amp; Motion</span>
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'policies'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Permissions &amp; Policies</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'security'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Security &amp; Tokens</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'data'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Data Management</span>
          </button>
        </div>

        {/* Right Tab Content Panels */}
        <div className="md:col-span-3">
          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <GlassPanel className="p-6 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-white tracking-tight">Operator Profile</h3>
                <p className="text-xs text-slate-400">Manage display credentials and cryptographic signer identity</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address (Account ID)
                  </label>
                  <Input value={user?.email || 'demo@tasknova.local'} disabled className="bg-slate-950/60 text-slate-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name / Operator Display
                  </label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Avatar Image URL
                  </label>
                  <Input
                    placeholder="https://images.unsplash.com/..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button variant="primary" type="submit" disabled={savingProfile}>
                    <Save className="w-4 h-4 mr-1.5" />
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          )}

          {/* TAB 2: Appearance & Motion */}
          {activeTab === 'appearance' && (
            <GlassPanel className="p-6 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-white tracking-tight">Appearance &amp; Accessibility</h3>
                <p className="text-xs text-slate-400">Configure spatial 3D engine and motion preferences (Rule 9)</p>
              </div>

              <div className="space-y-6 max-w-lg">
                {/* Reduced Motion Toggle */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                        prefers-reduced-motion
                      </h4>
                      <p className="text-xs text-slate-400">
                        Disables rotating rings and particle simulations in the 3D AI Brain; enables 2D fallback.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reducedMotion}
                        onChange={(e) => handleToggleReducedMotion(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                    </label>
                  </div>
                </div>

                {/* Accent Color Palette */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Interface Theme Accent
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: 'teal', label: 'Teal (Master)', hex: '#14b8a6' },
                      { id: 'purple', label: 'Nebula Purple', hex: '#8b5cf6' },
                      { id: 'cyan', label: 'Cyber Cyan', hex: '#06b6d4' },
                      { id: 'emerald', label: 'Emerald', hex: '#10b981' },
                    ].map((accent) => (
                      <button
                        key={accent.id}
                        type="button"
                        onClick={() => {
                          setAccentColor(accent.id);
                          addToast({
                            type: 'info',
                            title: 'Theme Accent Selected',
                            message: `${accent.label} active across all glass surface highlights.`,
                          });
                        }}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          accentColor === accent.id
                            ? 'border-teal-400 bg-teal-950/30'
                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-full mx-auto mb-1.5 shadow-sm"
                          style={{ backgroundColor: accent.hex }}
                        />
                        <span className="text-[11px] font-medium text-slate-300 block truncate">
                          {accent.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </GlassPanel>
          )}

          {/* TAB 3: Permissions Policy Center */}
          {activeTab === 'policies' && (
            <GlassPanel className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Permissions Policy Center</h3>
                  <p className="text-xs text-slate-400">
                    Active safety policies enforced by the AI planning engine before step execution
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => setPolicyModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New Policy
                </Button>
              </div>

              {loadingPolicies ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : (
                <div className="space-y-3">
                  {policies.map((pol) => (
                    <div
                      key={pol.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-white">{pol.name}</h4>
                          <Badge variant={pol.isActive ? 'success' : 'default'} size="sm">
                            {pol.isActive ? 'ACTIVE' : 'SUSPENDED'}
                          </Badge>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">{pol.ruleType}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {JSON.stringify(pol.ruleConfig)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePolicy(pol)}
                          className="text-xs text-slate-300"
                        >
                          {pol.isActive ? 'Suspend' : 'Enable'}
                        </Button>
                        <button
                          onClick={() => handleDeletePolicy(pol.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete policy"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassPanel>
          )}

          {/* TAB 4: Security & Tokens */}
          {activeTab === 'security' && (
            <GlassPanel className="p-6 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-white tracking-tight">Security &amp; Cryptography</h3>
                <p className="text-xs text-slate-400">Verifiable architecture specifications and encryption posture</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-teal-400 font-semibold">
                    <Lock className="w-4 h-4" />
                    Authentication Layer
                  </div>
                  <p className="text-slate-300">Signed HMAC-SHA256 JWT sessions with bcrypt salted passwords.</p>
                  <p className="font-mono text-[10px] text-slate-500">Token validity: 7 days</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold">
                    <Key className="w-4 h-4" />
                    Token Storage Encryption
                  </div>
                  <p className="text-slate-300">OAuth tokens encrypted with AES-256-GCM authenticated cipher.</p>
                  <p className="font-mono text-[10px] text-slate-500">128-bit authentication tag</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold">
                    <Database className="w-4 h-4" />
                    Persistence Adapter
                  </div>
                  <p className="text-slate-300">
                    {healthStatus.mode === 'live' ? 'Supabase PostgreSQL RLS Store' : 'LocalStore Atomic JSON (Default)'}
                  </p>
                  <p className="font-mono text-[10px] text-slate-500">Zero-Key mode: Active</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Proof Ledger Architecture
                  </div>
                  <p className="text-slate-300">Immutable SHA-256 Merkle chain. Every output verified and signed.</p>
                  <p className="font-mono text-[10px] text-slate-500">Tamper detection: 100% active</p>
                </div>
              </div>
            </GlassPanel>
          )}

          {/* TAB 5: Data Management */}
          {activeTab === 'data' && (
            <GlassPanel className="p-6 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-white tracking-tight">Data Governance &amp; Export</h3>
                <p className="text-xs text-slate-400">Export isolated execution data or permanently purge account</p>
              </div>

              <div className="space-y-6">
                {/* Export Data */}
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Export Complete History</h4>
                    <p className="text-xs text-slate-400 max-w-md">
                      Download all your tasks, execution steps, cryptographic verification records, and schedules in structured JSON format.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-1.5 text-teal-400" />
                    Export JSON
                  </Button>
                </div>

                {/* Danger Zone: Account Deletion */}
                <div className="p-5 rounded-xl bg-red-950/20 border border-red-900/40 space-y-4">
                  <div className="flex items-center gap-2 text-red-400 font-semibold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    Danger Zone
                  </div>
                  <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
                    Permanently delete your account and all associated tasks, steps, proofs, generated files, and notifications. This action cannot be reversed.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setDeleteConfirmText('');
                      setDeleteModalOpen(true);
                    }}
                  >
                    Delete Account &amp; Wipe Data
                  </Button>
                </div>
              </div>
            </GlassPanel>
          )}
        </div>
      </div>

      {/* New Policy Modal */}
      <Modal isOpen={policyModalOpen} onClose={() => setPolicyModalOpen(false)} title="Register Security Policy">
        <form onSubmit={handleCreatePolicy} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Policy Name
            </label>
            <Input
              placeholder="e.g. Disallow Unverified Bulk File Exports"
              value={newPolicyName}
              onChange={(e) => setNewPolicyName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Rule Type
            </label>
            <select
              value={newPolicyType}
              onChange={(e) => setNewPolicyType(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-teal-400"
            >
              <option value="require_approval">Require Human Authorization</option>
              <option value="external_communication">Guard External Communication</option>
              <option value="allowed_connectors">Connector Whitelist Enforcement</option>
              <option value="security">Security &amp; Data Protection</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setPolicyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Enforce Policy
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Account Deletion">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs leading-relaxed">
            Warning: This will permanently purge your profile, {user?.email}, and cascade deletion across all tasks, execution logs, generated PDFs, and immutable proof entries.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Type <span className="text-red-400 font-mono">DELETE</span> to confirm:
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono text-center"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteConfirmText !== 'DELETE' || isDeleting}
              onClick={handleDeleteAccount}
            >
              {isDeleting ? 'Purging...' : 'Permanently Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
