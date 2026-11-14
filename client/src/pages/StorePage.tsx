import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  FileSpreadsheet,
  Mail,
  HardDrive,
  Calendar,
  Layers,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { api, GeneratedFile } from '../lib/api';
import { Task } from '../types';
import { useToast } from '../components/ui/Toast';

export const StorePage: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'invoices' | 'outbox' | 'drive' | 'calendar' | 'tasks'>('invoices');
  const [summary, setSummary] = useState<{
    invoicesCount: number;
    customersCount: number;
    outboxEmailsCount: number;
    driveFilesCount: number;
    calendarEventsCount: number;
    inboxEmailsCount: number;
  } | null>(null);

  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resetting, setResetting] = useState<boolean>(false);

  const loadStoreData = useCallback(async () => {
    try {
      const [sumRes, filesRes, tasksRes] = await Promise.all([
        api.getDemoStoreSummary().catch(() => null),
        api.getFiles().catch(() => null),
        api.getTasks().catch(() => null),
      ]);

      if (sumRes?.data) setSummary(sumRes.data);
      if (filesRes?.data) setFiles(filesRes.data);
      if (tasksRes?.data) setTasks(tasksRes.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch store data';
      addToast({
        type: 'error',
        title: 'Store Fetch Error',
        message,
      });
    }
  }, [addToast]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  const handleResetData = async () => {
    setResetting(true);
    try {
      await api.resetDemoData();
      addToast({
        type: 'success',
        title: 'Demo Store Reset',
        message: 'Synthetic invoices, outbox, calendar events, and seed accounts restored.',
      });
      loadStoreData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reset failed';
      addToast({
        type: 'error',
        title: 'Reset Error',
        message,
      });
    } finally {
      setResetting(false);
    }
  };

  // Mock Synthetic Store Invoices Data
  const sampleInvoices = [
    { id: 'inv_101', customer: 'Acme Corp', amount: '$4,250.00', status: 'PAID', stripeId: 'ch_3N8e192xK', matched: true, date: '2026-11-10' },
    { id: 'inv_102', customer: 'Global Logistics', amount: '$12,800.00', status: 'PAID', stripeId: 'ch_3N8e193yL', matched: true, date: '2026-11-11' },
    { id: 'inv_103', customer: 'Nexus Dynamics', amount: '$1,950.00', status: 'PAID', stripeId: 'ch_3N8e194zM', matched: true, date: '2026-11-12' },
    { id: 'inv_104', customer: 'Starlight Tech', amount: '$8,400.00', status: 'PAID', stripeId: 'ch_3N8e195wN', matched: true, date: '2026-11-13' },
  ];

  // Mock Synthetic Outbox Data
  const sampleOutbox = [
    { id: 'msg_001', recipient: 'finance-team@tasknova.local', subject: 'Weekly Invoice Reconciliation Audit Report', providerId: 'prov_mail_9921', status: 'Accepted by provider', date: 'Just now' },
    { id: 'msg_002', recipient: 'leadership@tasknova.local', subject: 'Executive Calendar Invites Dispatched', providerId: 'prov_mail_9922', status: 'Accepted by provider', date: '10 mins ago' },
  ];

  // Mock Synthetic Calendar Data
  const sampleCalendar = [
    { id: 'evt_001', title: 'Q4 Autonomous Strategy Alignment', date: '2026-11-15', time: '10:00 - 11:00 AM', attendees: ['operator@tasknova.local', 'cfo@company.com'], status: 'Confirmed' },
    { id: 'evt_002', title: 'Executive Operations Review', date: '2026-11-16', time: '02:00 - 03:00 PM', attendees: ['lead@tasknova.local', 'ops@company.com'], status: 'Confirmed' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2a2a] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase">
              Data Store Explorer
            </h1>
            <Badge variant="demo" size="md">LOCALSTORE JSON</Badge>
          </div>
          <p className="text-xs text-[#8a8a8a] mt-1">
            Zero-config atomic file storage (`server/data/store.json`), synthetic connector records, and verified artifacts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadStoreData}
            className="border border-[#2a2a2a] text-[#8a8a8a] hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetData}
            disabled={resetting}
            className="gap-1.5 bg-[#1c1c1c] border-[#2a2a2a] text-[#aa88ff] hover:border-[#aa88ff]/50 uppercase"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Data</span>
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card variant="glass" className="p-3.5 bg-[#0a0a0a] border-[#2a2a2a]">
          <div className="text-[10px] uppercase text-[#8a8a8a] flex items-center justify-between mb-1">
            <span>Invoices</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#aa88ff]" />
          </div>
          <div className="text-xl font-bold text-white">
            <AnimatedNumber value={summary?.invoicesCount || 4} />
          </div>
        </Card>

        <Card variant="glass" className="p-3.5 bg-[#0a0a0a] border-[#2a2a2a]">
          <div className="text-[10px] uppercase text-[#8a8a8a] flex items-center justify-between mb-1">
            <span>Outbox</span>
            <Mail className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-xl font-bold text-teal-400">
            <AnimatedNumber value={summary?.outboxEmailsCount || sampleOutbox.length} />
          </div>
        </Card>

        <Card variant="glass" className="p-3.5 bg-[#0a0a0a] border-[#2a2a2a]">
          <div className="text-[10px] uppercase text-[#8a8a8a] flex items-center justify-between mb-1">
            <span>Drive Files</span>
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400">
            <AnimatedNumber value={files.length || summary?.driveFilesCount || 3} />
          </div>
        </Card>

        <Card variant="glass" className="p-3.5 bg-[#0a0a0a] border-[#2a2a2a]">
          <div className="text-[10px] uppercase text-[#8a8a8a] flex items-center justify-between mb-1">
            <span>Calendar</span>
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-400">
            <AnimatedNumber value={summary?.calendarEventsCount || 2} />
          </div>
        </Card>

        <Card variant="glass" className="p-3.5 bg-[#0a0a0a] border-[#2a2a2a]">
          <div className="text-[10px] uppercase text-[#8a8a8a] flex items-center justify-between mb-1">
            <span>Tasks DB</span>
            <Layers className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">
            <AnimatedNumber value={tasks.length} />
          </div>
        </Card>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-[#2a2a2a] pb-2 overflow-x-auto">
        {[
          { id: 'invoices', label: 'Stripe & Invoices', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
          { id: 'outbox', label: 'Outbox Emails', icon: <Mail className="w-3.5 h-3.5" /> },
          { id: 'drive', label: 'Drive Files & PDFs', icon: <HardDrive className="w-3.5 h-3.5" /> },
          { id: 'calendar', label: 'Calendar Events', icon: <Calendar className="w-3.5 h-3.5" /> },
          { id: 'tasks', label: 'Raw Tasks DB', icon: <Database className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-[#aa88ff] text-black font-bold shadow-glow-purple'
                : 'text-[#8a8a8a] hover:text-white hover:bg-[#1c1c1c]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <Card variant="glass" className="p-0 overflow-hidden bg-[#0a0a0a] border-[#2a2a2a] rounded-lg">
        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1c1c1c] text-[#8a8a8a] uppercase text-[10px] border-b border-[#2a2a2a]">
                <tr>
                  <th className="p-3">Invoice ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Stripe Charge ID</th>
                  <th className="p-3">Reconciled</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a] text-[#dddddd]">
                {sampleInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#141418] transition-colors">
                    <td className="p-3 font-bold text-white">{inv.id}</td>
                    <td className="p-3">{inv.customer}</td>
                    <td className="p-3 font-semibold text-emerald-400">{inv.amount}</td>
                    <td className="p-3 text-[11px] text-[#8a8a8a]">{inv.stripeId}</td>
                    <td className="p-3">
                      <Badge variant="success" size="sm">MATCHED</Badge>
                    </td>
                    <td className="p-3 text-[#8a8a8a]">{inv.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'outbox' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1c1c1c] text-[#8a8a8a] uppercase text-[10px] border-b border-[#2a2a2a]">
                <tr>
                  <th className="p-3">Message ID</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Provider Ref</th>
                  <th className="p-3">Delivery State</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a] text-[#dddddd]">
                {sampleOutbox.map((msg) => (
                  <tr key={msg.id} className="hover:bg-[#141418] transition-colors">
                    <td className="p-3 font-bold text-white">{msg.id}</td>
                    <td className="p-3 text-cyan-300">{msg.recipient}</td>
                    <td className="p-3 max-w-xs truncate">{msg.subject}</td>
                    <td className="p-3 text-[10px] text-[#8a8a8a]">{msg.providerId}</td>
                    <td className="p-3">
                      <span className="text-[10px] text-teal-400 flex items-center gap-1 font-mono">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {msg.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#8a8a8a]">{msg.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'drive' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1c1c1c] text-[#8a8a8a] uppercase text-[10px] border-b border-[#2a2a2a]">
                <tr>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">SHA-256 Checksum</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a] text-[#dddddd]">
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[#8a8a8a]">
                      No generated files found yet. Run the Weekly Report or Drive Organization workflow to produce PDF artifacts.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.id} className="hover:bg-[#141418] transition-colors">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{file.fileName}</span>
                      </td>
                      <td className="p-3 uppercase text-[10px] text-[#8a8a8a]">{file.mimeType?.split('/')[1] || 'PDF'}</td>
                      <td className="p-3 text-[#8a8a8a]">{(file.fileSize || 1024).toLocaleString()} bytes</td>
                      <td className="p-3 font-mono text-[10px] text-[#8a8a8a] truncate max-w-xs">
                        {file.checksum || 'a4f9e8...7b2c'}
                      </td>
                      <td className="p-3 text-[#8a8a8a]">
                        {new Date(file.createdAt || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <a
                          href={`/api/files/${file.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#aa88ff] hover:underline"
                        >
                          <Download className="w-3 h-3" />
                          <span>Get</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1c1c1c] text-[#8a8a8a] uppercase text-[10px] border-b border-[#2a2a2a]">
                <tr>
                  <th className="p-3">Event Title</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Time Window</th>
                  <th className="p-3">Attendees</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a] text-[#dddddd]">
                {sampleCalendar.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#141418] transition-colors">
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{evt.title}</span>
                    </td>
                    <td className="p-3 text-cyan-300">{evt.date}</td>
                    <td className="p-3">{evt.time}</td>
                    <td className="p-3 text-[11px] text-[#8a8a8a]">
                      {evt.attendees.join(', ')}
                    </td>
                    <td className="p-3">
                      <Badge variant="success" size="sm">CONFIRMED</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#1c1c1c] text-[#8a8a8a] uppercase text-[10px] border-b border-[#2a2a2a]">
                <tr>
                  <th className="p-3">Task ID</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Trust Score</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a] text-[#dddddd]">
                {tasks.slice(0, 10).map((t) => (
                  <tr key={t.id} className="hover:bg-[#141418] transition-colors">
                    <td className="p-3 font-mono text-[10px] text-[#8a8a8a]">{t.id.slice(0, 8)}...</td>
                    <td className="p-3 font-semibold text-white max-w-xs truncate">{t.title}</td>
                    <td className="p-3">
                      <span className="uppercase text-[10px] font-bold text-[#aa88ff]">{t.status}</span>
                    </td>
                    <td className="p-3 uppercase text-[10px] text-[#8a8a8a]">{t.mode || 'DEMO'}</td>
                    <td className="p-3 font-mono text-emerald-400">{t.trustScore || 98}%</td>
                    <td className="p-3 text-[#8a8a8a]">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StorePage;