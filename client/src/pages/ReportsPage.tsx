import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Trash2,
  ExternalLink,
  Search,
  Plus,
  Eye,
  RefreshCw,
  FileCheck,
} from 'lucide-react';

import { GeneratedFile } from '../types';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [files, setFiles] = useState<(GeneratedFile & { taskTitle?: string; taskStatus?: string })[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Preview Modal
  const [previewFile, setPreviewFile] = useState<GeneratedFile | null>(null);

  // New Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportRange, setReportRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [reportType, setReportType] = useState<'summary' | 'audit' | 'performance'>('audit');
  const [generating, setGenerating] = useState(false);

  const fetchReportsAndFiles = useCallback(async () => {
    try {
      const res = await api.getReports();
      if (res?.data) {
        setReports(res.data.reports || []);
        setFiles(res.data.files || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reports';
      addToast({
        type: 'error',
        title: 'Error Loading Reports',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchReportsAndFiles();
  }, [fetchReportsAndFiles]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName.trim()) return;

    setGenerating(true);
    try {
      await api.createReport({
        name: reportName.trim(),
        range: reportRange,
        type: reportType,
      });

      addToast({
        type: 'success',
        title: 'Report Synthesized (DEMO)',
        message: `Audit report "${reportName}" generated and added to library.`,
      });

      setReportModalOpen(false);
      setReportName('');
      fetchReportsAndFiles();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate report';
      addToast({
        type: 'error',
        title: 'Generation Failed',
        message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!window.confirm('Delete this generated file from storage?')) return;
    try {
      await api.deleteFile(id);
      addToast({
        type: 'info',
        title: 'File Deleted',
        message: 'The file payload has been unlinked from storage.',
      });
      fetchReportsAndFiles();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message,
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.fileName.toLowerCase().includes(search.toLowerCase()) ||
      (f.taskTitle && f.taskTitle.toLowerCase().includes(search.toLowerCase())) ||
      f.taskId.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'pdf' && (f.mimeType.includes('pdf') || f.fileName.endsWith('.pdf'))) ||
      (typeFilter === 'json' && (f.mimeType.includes('json') || f.fileName.endsWith('.json')));

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Reports &amp; Artifacts</h1>
            <Badge variant="demo" size="md">PROOF VERIFIED</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Generated executive briefings, PDF Proof Certificates, and exported audit telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchReportsAndFiles} className="text-slate-300">
            <RefreshCw className="w-4 h-4 mr-1 text-teal-400" />
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={() => setReportModalOpen(true)} className="glow-cyan">
            <Plus className="w-4 h-4 mr-1" />
            Generate Audit Report
          </Button>
        </div>
      </div>

      {/* Audit Executive Summaries Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <GlassPanel key={r.id} className="p-5 flex items-start justify-between gap-4 border-teal-500/20 bg-teal-950/10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-white tracking-tight">{r.title}</h3>
                <Badge variant="success" size="sm">READY</Badge>
              </div>
              <p className="text-xs text-slate-300">{r.summary}</p>
              <p className="text-[11px] text-slate-400">Generated: {new Date(r.generatedAt).toLocaleString()}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addToast({
                  type: 'info',
                  title: 'Audit Report Inspected',
                  message: `All audit parameters verified against immutable proof ledger.`,
                })
              }
              className="text-xs text-teal-300 border-teal-500/40"
            >
              Inspect
            </Button>
          </GlassPanel>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <Input
            placeholder="Search files by name or task ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900/60"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {['all', 'pdf', 'json'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium uppercase transition-colors ${
                typeFilter === t
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white glass border border-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Files Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <Card className="p-12 text-center space-y-4 glass">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">No Generated Files Found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Files synthesized during autonomous task execution (such as PDF summaries, Proof Certificates, and exports) will appear here.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 glass">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">File Name</th>
                <th className="py-3.5 px-4">Associated Task</th>
                <th className="py-3.5 px-4">Size</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-100 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-mono truncate max-w-xs">{file.fileName}</span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    <button
                      onClick={() => navigate(`/tasks/${file.taskId}/execute`)}
                      className="hover:text-teal-300 transition-colors flex items-center gap-1 truncate max-w-xs"
                      title="Open Task Workspace"
                    >
                      <span>{file.taskTitle || file.taskId}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </button>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-400">{formatFileSize(file.fileSize)}</td>

                  <td className="py-3.5 px-4 text-slate-400">{new Date(file.createdAt).toLocaleDateString()}</td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewFile(file)}
                        className="text-slate-400 hover:text-white p-1.5"
                        title="Preview File Metadata"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <a
                        href={`/api/files/${file.id}/download`}
                        download={file.fileName}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-teal-500/20 text-slate-300 hover:text-teal-300 transition-colors border border-slate-700/60"
                        title="Download File"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete File"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <Modal isOpen={Boolean(previewFile)} onClose={() => setPreviewFile(null)} title="File Metadata & Inspection">
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">File Name:</span>
                <span className="font-mono text-white font-semibold">{previewFile.fileName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">MIME Type:</span>
                <span className="font-mono text-teal-400">{previewFile.mimeType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">File Size:</span>
                <span className="font-mono text-slate-200">{formatFileSize(previewFile.fileSize)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Task Reference:</span>
                <span className="font-mono text-slate-200">{previewFile.taskId}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <Button variant="ghost" onClick={() => setPreviewFile(null)}>
                Close
              </Button>
              <a
                href={`/api/files/${previewFile.id}/download`}
                download={previewFile.fileName}
                className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-semibold text-xs flex items-center gap-1.5 hover:bg-teal-400 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Attachment
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Generate Report Modal */}
      <Modal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Generate Audit Report">
        <form onSubmit={handleCreateReport} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Report Title
            </label>
            <Input
              placeholder="e.g. Monthly Autonomous Execution Audit"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Time Window
              </label>
              <select
                value={reportRange}
                onChange={(e) => setReportRange(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-teal-400"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Report Scope
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-teal-400"
              >
                <option value="audit">Proof Ledger &amp; Security Audit</option>
                <option value="summary">Executive Summary</option>
                <option value="performance">Latency &amp; Latency Benchmarks</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setReportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={generating}>
              {generating ? 'Generating...' : 'Synthesize Report (DEMO)'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ReportsPage;
