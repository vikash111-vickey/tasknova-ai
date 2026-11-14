import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  HardDrive,
  Calendar,
  FileText,
  CreditCard,
  Globe,
  Plug,
  ShieldAlert,
  CheckCircle2,
  Lock,
  RefreshCw,
  Database,
} from 'lucide-react';

import { IntegrationCatalogItem } from '../types';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

export const ConnectorsPage: React.FC = () => {
  const { addToast } = useToast();

  const [connectors, setConnectors] = useState<IntegrationCatalogItem[]>([]);
  const [demoStoreSummary, setDemoStoreSummary] = useState<{
    invoicesCount: number;
    customersCount: number;
    outboxEmailsCount: number;
    driveFilesCount: number;
    calendarEventsCount: number;
    inboxEmailsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Live OAuth Modal State
  const [oauthModalOpen, setOauthModalOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<IntegrationCatalogItem | null>(null);
  const [oauthChecking, setOauthChecking] = useState(false);
  const [oauthResult, setOauthResult] = useState<{ canConnectLive: boolean; message?: string; authUrl?: string } | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const [catRes, storeRes] = await Promise.all([
        api.getIntegrationCatalog(),
        api.getDemoStoreSummary(),
      ]);

      if (catRes?.data) setConnectors(catRes.data);
      if (storeRes?.data) setDemoStoreSummary(storeRes.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch integrations catalog';
      addToast({
        type: 'error',
        title: 'Error Loading Integrations',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleConnectLiveClick = async (connector: IntegrationCatalogItem) => {
    setSelectedConnector(connector);
    setOauthModalOpen(true);
    setOauthChecking(true);
    setOauthResult(null);

    try {
      const res = await api.requestOAuthUrl(connector.id);
      setOauthResult({
        canConnectLive: res.data.canConnectLive,
        authUrl: res.data.authUrl,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Live connection requires credentials';
      setOauthResult({
        canConnectLive: false,
        message,
      });
    } finally {
      setOauthChecking(false);
    }
  };

  const getConnectorIcon = (id: string) => {
    switch (id) {
      case 'gmail':
        return <Mail className="w-6 h-6 text-purple-400" />;
      case 'drive':
        return <HardDrive className="w-6 h-6 text-blue-400" />;
      case 'calendar':
        return <Calendar className="w-6 h-6 text-amber-400" />;
      case 'document':
        return <FileText className="w-6 h-6 text-teal-400" />;
      case 'web':
        return <Globe className="w-6 h-6 text-cyan-400" />;
      case 'stripe':
        return <CreditCard className="w-6 h-6 text-indigo-400" />;
      default:
        return <Plug className="w-6 h-6 text-teal-400" />;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Integrations Center</h1>
            <Badge variant="demo" size="md">ZERO-KEY DEMO STORE</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Autonomous application connectors. In demo mode, all operations execute safely against the isolated local DemoStore.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={fetchIntegrations} className="text-slate-300">
          <RefreshCw className="w-4 h-4 mr-1 text-teal-400" />
          Refresh Status
        </Button>
      </div>

      {/* DemoStore Status Strip */}
      {demoStoreSummary && (
        <GlassPanel className="p-4 border-teal-500/30 bg-teal-950/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-teal-300 uppercase tracking-wider">Demo Store Active</p>
              <p className="text-xs text-slate-300">Isolated synthetic data store for real zero-key autonomous verification</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
            <span>Invoices: <strong className="text-white">{demoStoreSummary.invoicesCount}</strong></span>
            <span>Customers: <strong className="text-white">{demoStoreSummary.customersCount}</strong></span>
            <span>Outbox: <strong className="text-white">{demoStoreSummary.outboxEmailsCount}</strong></span>
            <span>Drive Files: <strong className="text-white">{demoStoreSummary.driveFilesCount}</strong></span>
            <span>Calendar: <strong className="text-white">{demoStoreSummary.calendarEventsCount}</strong></span>
          </div>
        </GlassPanel>
      )}

      {/* Integrations Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connectors.map((c) => (
            <GlassPanel
              key={c.id}
              className="p-6 flex flex-col justify-between border-slate-800 hover:border-slate-700/80 transition-all group"
            >
              <div className="space-y-4">
                {/* Header: Icon + Name + Category + Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-teal-500/40 transition-colors">
                      {getConnectorIcon(c.id)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-tight">{c.name}</h3>
                      <p className="text-xs text-slate-400">{c.category}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant={c.mode === 'live' ? 'success' : 'demo'} size="sm">
                      {c.mode.toUpperCase()}
                    </Badge>
                    <Badge variant="default" size="sm" className="text-[10px]">
                      {c.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed min-h-[36px]">{c.description}</p>

                {/* Supported Actions */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Supported Actions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {c.actions.map((act) => (
                      <span
                        key={act}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300"
                      >
                        {act}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    addToast({
                      type: 'info',
                      title: `${c.name} Demo Active`,
                      message: `Operating safely in zero-key DEMO mode against the local store.`,
                    })
                  }
                  className="text-xs text-slate-400 hover:text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Demo Ready
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnectLiveClick(c)}
                  className="text-xs text-slate-300 hover:text-white hover:border-teal-500/60"
                >
                  <Lock className="w-3.5 h-3.5 mr-1 text-teal-400" />
                  Connect Live
                </Button>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      {/* Live OAuth Modal */}
      <Modal
        isOpen={oauthModalOpen}
        onClose={() => setOauthModalOpen(false)}
        title={selectedConnector ? `Connect Live: ${selectedConnector.name}` : 'Live Connector Setup'}
      >
        <div className="space-y-4">
          {oauthChecking ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-300">Checking environment credentials for {selectedConnector?.name}...</p>
            </div>
          ) : oauthResult?.canConnectLive ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs">
                Production credentials detected! Click below to initiate secure OAuth 2.0 authorization with AES-256-GCM token storage.
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  if (oauthResult.authUrl) window.location.href = oauthResult.authUrl;
                }}
              >
                Launch OAuth Consent Screen
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  Live connection requires credentials
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In accordance with Rule 4 (Zero-Key by Default), TASKNOVA AI runs completely autonomously without any API keys or credentials.
                </p>
                <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded border border-slate-800/80">
                  Required in .env: {selectedConnector?.liveCredentialsRequired.join(', ') || 'API_KEY'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-teal-950/20 border border-teal-500/30 text-xs text-slate-300">
                <strong className="text-teal-300">Zero-Fake Assurance:</strong> In Demo mode, this connector executes real operations against the local synthetic store and signs cryptographically verifiable proof records.
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="secondary" onClick={() => setOauthModalOpen(false)}>
                  Continue in Demo Mode
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ConnectorsPage;
