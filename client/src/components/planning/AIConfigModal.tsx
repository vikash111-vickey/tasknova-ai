import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { Sparkles, Key, Cpu, CheckCircle2, Eye, EyeOff, ExternalLink, Bot } from 'lucide-react';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (provider: string) => void;
}

export const AIConfigModal: React.FC<AIConfigModalProps> = ({ isOpen, onClose, onConfigSaved }) => {
  const { addToast } = useToast();
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'template'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-1.5-pro');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentActive, setCurrentActive] = useState<{ provider: string; hasKey: boolean; model: string }>({
    provider: 'template',
    hasKey: false,
    model: 'template-v1',
  });

  useEffect(() => {
    if (isOpen) {
      api.getAiConfig()
        .then((res) => {
          if (res.success && res.data) {
            setCurrentActive(res.data);
            setProvider(res.data.provider);
            if (res.data.model) setModel(res.data.model);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleProviderChange = (p: 'gemini' | 'openai' | 'template') => {
    setProvider(p);
    if (p === 'gemini') {
      setModel('gemini-1.5-pro');
    } else if (p === 'openai') {
      setModel('gpt-4o');
    } else {
      setModel('template-v1');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.updateAiConfig({
        provider,
        apiKey: apiKey.trim() || undefined,
        model: model.trim() || undefined,
      });

      if (res.success) {
        addToast({
          type: 'success',
          title: 'AI Engine Connected',
          message: `Tasknova is now powered by ${provider.toUpperCase()} (${model}).`,
        });
        if (onConfigSaved) onConfigSaved(provider);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect AI model';
      addToast({
        type: 'error',
        title: 'Connection Failed',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="CONNECT AI MODEL & API KEY"
      size="md"
      className="bg-[#0a0a0a] border border-[#2a2a2a] text-[#dddddd] font-mono"
    >
      <div className="space-y-6 text-xs">
        {/* Active Engine Status Pill */}
        <div className="p-3 rounded-md bg-[#111116] border border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#aa88ff]" />
            <span className="text-[#8a8a8a]">Active Engine:</span>
            <span className="font-bold text-white uppercase">{currentActive.provider}</span>
          </div>
          <Badge variant={currentActive.hasKey ? 'success' : 'demo'} size="sm">
            {currentActive.hasKey ? 'API Key Active' : 'Zero-Key Fallback'}
          </Badge>
        </div>

        {/* Provider Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#8a8a8a]">
            Select AI Provider
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleProviderChange('gemini')}
              className={`p-3 rounded-md border text-center transition-all ${
                provider === 'gemini'
                  ? 'bg-[#1c1c1c] border-[#aa88ff] text-white shadow-glow-purple'
                  : 'bg-[#050508] border-[#2a2a2a] text-[#8a8a8a] hover:border-[#3a3a3a]'
              }`}
            >
              <Sparkles className="w-4 h-4 mx-auto mb-1 text-[#aa88ff]" />
              <div className="font-bold text-[11px]">Gemini AI</div>
              <div className="text-[9px] text-[#8a8a8a]">Google DeepMind</div>
            </button>

            <button
              type="button"
              onClick={() => handleProviderChange('openai')}
              className={`p-3 rounded-md border text-center transition-all ${
                provider === 'openai'
                  ? 'bg-[#1c1c1c] border-[#aa88ff] text-white shadow-glow-purple'
                  : 'bg-[#050508] border-[#2a2a2a] text-[#8a8a8a] hover:border-[#3a3a3a]'
              }`}
            >
              <Cpu className="w-4 h-4 mx-auto mb-1 text-[#aa88ff]" />
              <div className="font-bold text-[11px]">OpenAI</div>
              <div className="text-[9px] text-[#8a8a8a]">GPT-4o</div>
            </button>

            <button
              type="button"
              onClick={() => handleProviderChange('template')}
              className={`p-3 rounded-md border text-center transition-all ${
                provider === 'template'
                  ? 'bg-[#1c1c1c] border-[#aa88ff] text-white shadow-glow-purple'
                  : 'bg-[#050508] border-[#2a2a2a] text-[#8a8a8a] hover:border-[#3a3a3a]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
              <div className="font-bold text-[11px]">Deterministic</div>
              <div className="text-[9px] text-[#8a8a8a]">Zero-Key Demo</div>
            </button>
          </div>
        </div>

        {/* API Key Input (if Gemini or OpenAI selected) */}
        {provider !== 'template' ? (
          <div className="space-y-4 pt-2 border-t border-[#2a2a2a]">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#8a8a8a] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#aa88ff]" />
                  <span>{provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}</span>
                </label>
                {provider === 'gemini' ? (
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#aa88ff] hover:underline flex items-center gap-1"
                  >
                    <span>Get Free Gemini Key</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#aa88ff] hover:underline flex items-center gap-1"
                  >
                    <span>Get OpenAI Key</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    currentActive.hasKey
                      ? '•••••••••••••••••••••••••••••••• (Leave blank to keep current)'
                      : provider === 'gemini'
                      ? 'AIzaSy...'
                      : 'sk-proj-...'
                  }
                  className="w-full bg-[#050508] border border-[#2a2a2a] rounded-md px-3 py-2 pr-10 text-white placeholder-[#555] focus:outline-none focus:border-[#aa88ff] text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-[#8a8a8a] hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-[#8a8a8a]">
                Keys are kept securely in server memory and never stored in the client bundle.
              </p>
            </div>

            {/* Model Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8a8a8a]">
                Model Name
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={provider === 'gemini' ? 'gemini-1.5-pro' : 'gpt-4o'}
                className="w-full bg-[#050508] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-[#555] focus:outline-none focus:border-[#aa88ff] text-xs font-mono"
              />
              <div className="flex gap-2 pt-1 text-[10px]">
                {provider === 'gemini' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setModel('gemini-1.5-pro')}
                      className="px-2 py-0.5 rounded bg-[#1c1c1c] text-[#cfcfcf] hover:text-white border border-[#2a2a2a]"
                    >
                      gemini-1.5-pro
                    </button>
                    <button
                      type="button"
                      onClick={() => setModel('gemini-1.5-flash')}
                      className="px-2 py-0.5 rounded bg-[#1c1c1c] text-[#cfcfcf] hover:text-white border border-[#2a2a2a]"
                    >
                      gemini-1.5-flash
                    </button>
                    <button
                      type="button"
                      onClick={() => setModel('gemini-2.0-flash')}
                      className="px-2 py-0.5 rounded bg-[#1c1c1c] text-[#cfcfcf] hover:text-white border border-[#2a2a2a]"
                    >
                      gemini-2.0-flash
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setModel('gpt-4o')}
                      className="px-2 py-0.5 rounded bg-[#1c1c1c] text-[#cfcfcf] hover:text-white border border-[#2a2a2a]"
                    >
                      gpt-4o
                    </button>
                    <button
                      type="button"
                      onClick={() => setModel('gpt-4o-mini')}
                      className="px-2 py-0.5 rounded bg-[#1c1c1c] text-[#cfcfcf] hover:text-white border border-[#2a2a2a]"
                    >
                      gpt-4o-mini
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-md bg-[#050508] border border-[#2a2a2a] space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Deterministic Template Planner Active</span>
            </div>
            <p className="text-[11px] text-[#8a8a8a] leading-relaxed">
              No API key required. Compiles natural language intent into deterministic, validated DAG execution plans locally with zero external API calls.
            </p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={loading}
            className="bg-[#aa88ff] text-black font-bold uppercase shadow-glow-purple px-5"
          >
            {loading ? 'Connecting...' : 'Save & Connect Engine'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AIConfigModal;
