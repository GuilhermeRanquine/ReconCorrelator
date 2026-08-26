'use client';

import React, { useState } from 'react';
import { TargetProject, CorrelatedAsset } from '@/types/recon';
import { ReconParsers } from '@/lib/parsers/reconParsers';
import { ReconCorrelator } from '@/lib/parsers/correlator';
import { ScopeGuard } from '@/lib/parsers/scopeGuard';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Database,
  Terminal,
  Code
} from 'lucide-react';

interface DataIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: TargetProject;
  onIngestSuccess: (assets: CorrelatedAsset[]) => void;
}

export function DataIngestionModal({
  isOpen,
  onClose,
  target,
  onIngestSuccess,
}: DataIngestionModalProps) {
  const [activeTab, setActiveTab] = useState<'subfinder' | 'httpx' | 'nmap' | 'nuclei' | 'json'>('subfinder');
  const [rawText, setRawText] = useState('');
  const [parseResult, setParseResult] = useState<{ count: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleProcessRaw = () => {
    if (!rawText.trim()) return;

    const guard = new ScopeGuard(target.inScope, target.outOfScope, target.rules);

    if (activeTab === 'subfinder') {
      const { subdomains, errors } = ReconParsers.parseSubfinder(rawText);
      const res = ReconCorrelator.correlate({
        subdomains,
        rootDomain: target.domain,
        scopeGuard: guard,
      });
      setParseResult({ count: res.assets.length, errors });
      if (res.assets.length > 0) {
        onIngestSuccess(res.assets);
      }
    } else if (activeTab === 'httpx') {
      const { entries, errors } = ReconParsers.parseHttpx(rawText);
      const res = ReconCorrelator.correlate({
        httpx: entries,
        rootDomain: target.domain,
        scopeGuard: guard,
      });
      setParseResult({ count: res.assets.length, errors });
      if (res.assets.length > 0) {
        onIngestSuccess(res.assets);
      }
    } else if (activeTab === 'nmap') {
      const { hosts, errors } = ReconParsers.parseNmap(rawText);
      const res = ReconCorrelator.correlate({
        nmap: hosts,
        rootDomain: target.domain,
        scopeGuard: guard,
      });
      setParseResult({ count: res.assets.length, errors });
      if (res.assets.length > 0) {
        onIngestSuccess(res.assets);
      }
    } else if (activeTab === 'nuclei') {
      const { vulns, errors } = ReconParsers.parseNuclei(rawText);
      const res = ReconCorrelator.correlate({
        nuclei: vulns,
        rootDomain: target.domain,
        scopeGuard: guard,
      });
      setParseResult({ count: res.assets.length, errors });
      if (res.assets.length > 0) {
        onIngestSuccess(res.assets);
      }
    } else if (activeTab === 'json') {
      try {
        const parsed = JSON.parse(rawText);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const subdomainsList = list.map((item: any) => typeof item === 'string' ? item : item.subdomain || item.host || item.url || item.ip).filter(Boolean);
        const res = ReconCorrelator.correlate({
          subdomains: subdomainsList,
          rootDomain: target.domain,
          scopeGuard: guard,
        });
        setParseResult({ count: res.assets.length, errors: [] });
        if (res.assets.length > 0) {
          onIngestSuccess(res.assets);
        }
      } catch (err: any) {
        setParseResult({ count: 0, errors: [`JSON Inválido: ${err.message}`] });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-zinc-900/90 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">Ingestão de Dados Reais & Parsers CLI</h3>
              <p className="text-[11px] text-zinc-400">Alvo Ativo: <strong className="text-emerald-400">{target.domain}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 text-xs">
          <button
            onClick={() => { setActiveTab('subfinder'); setParseResult(null); }}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'subfinder'
                ? 'border-cyan-500 text-cyan-400 bg-zinc-900 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Subfinder
          </button>
          <button
            onClick={() => { setActiveTab('httpx'); setParseResult(null); }}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'httpx'
                ? 'border-cyan-500 text-cyan-400 bg-zinc-900 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            HTTPX
          </button>
          <button
            onClick={() => { setActiveTab('nmap'); setParseResult(null); }}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'nmap'
                ? 'border-amber-500 text-amber-400 bg-zinc-900 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Naabu / Nmap
          </button>
          <button
            onClick={() => { setActiveTab('nuclei'); setParseResult(null); }}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'nuclei'
                ? 'border-red-500 text-red-400 bg-zinc-900 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Nuclei
          </button>
          <button
            onClick={() => { setActiveTab('json'); setParseResult(null); }}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'json'
                ? 'border-purple-500 text-purple-400 bg-zinc-900 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            JSON Puro
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-xs">
                Cole o output bruto gerado no seu terminal real:
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {activeTab === 'subfinder' ? '{"host":"..."} ou subdomínios linha a linha' :
                 activeTab === 'httpx' ? 'JSON Lines do httpx -json' :
                 activeTab === 'nuclei' ? 'JSON Lines do nuclei -json-export' :
                 activeTab === 'nmap' ? 'Output texto ou XML do nmap/naabu' :
                 'Array de objetos JSON'}
              </span>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Cole aqui o output da ferramenta para ${target.domain}...`}
              rows={9}
              className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-zinc-700 resize-none"
            />

            {parseResult && (
              <div className={`p-3 rounded-lg border text-xs ${
                parseResult.errors.length === 0 ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-amber-950/60 border-amber-800 text-amber-300'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Processado: {parseResult.count} ativo(s) correlacionados para {target.domain}!</span>
                </div>
                {parseResult.errors.length > 0 && (
                  <div className="mt-1 text-[11px] text-amber-400">
                    {parseResult.errors.slice(0, 3).map((e, idx) => (
                      <div key={idx}>• {e}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-zinc-300 transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={handleProcessRaw}
                disabled={!rawText.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-black font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-md"
              >
                Processar e Ingerir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
