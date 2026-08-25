'use client';

import React, { useState } from 'react';
import { TargetProject, CorrelatedAsset } from '@/types/recon';
import { ReconParsers } from '@/lib/parsers/reconParsers';
import { ReconCorrelator } from '@/lib/parsers/correlator';
import { ScopeGuard } from '@/lib/parsers/scopeGuard';
import { SAMPLE_ASSETS, SAMPLE_PROJECTS } from '@/lib/sampleData';
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
  const [activeTab, setActiveTab] = useState<'sample' | 'subfinder' | 'httpx' | 'nmap' | 'nuclei'>('sample');
  const [rawText, setRawText] = useState('');
  const [parseResult, setParseResult] = useState<{ count: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const handleLoadSample = (sampleKey: 'acme' | 'cloud') => {
    onIngestSuccess(SAMPLE_ASSETS);
    onClose();
  };

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
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-zinc-900/90 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-zinc-100 text-sm">Ingestão de Dados & Parsers de Ferramentas CLI</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 text-xs">
          <button
            onClick={() => setActiveTab('sample')}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'sample'
                ? 'border-emerald-500 text-emerald-400 bg-zinc-900 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Campanhas Demo (1-Click)
          </button>
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
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {activeTab === 'sample' ? (
            <div className="space-y-3">
              <p className="text-zinc-400 text-xs">
                Carregue um conjunto pré-configurado de resultados de reconhecimento com subdomínios, IPs, portas,
                tecnologias, falhas do Spring Boot, Jenkins desprotegido e Takeover de Subdomínio:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleLoadSample('acme')}
                  className="text-left p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-emerald-500/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400">
                      Acme Financial Systems
                    </span>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    7 ativos vivos, 4 vulnerabilidades (Spring Actuator, Jenkins, CNAME Takeover, Swagger Leak) e infra AWS.
                  </p>
                  <span className="text-[10px] text-emerald-400 font-bold mt-3 block">
                    Carregar Campanha ➔
                  </span>
                </button>

                <button
                  onClick={() => handleLoadSample('cloud')}
                  className="text-left p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-cyan-500/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-zinc-100 group-hover:text-cyan-400">
                      CyberGrid Cloud Tech
                    </span>
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Infraestrutura de microsserviços Kubernetes com endpoints Cloudflare e métricas Prometheus.
                  </p>
                  <span className="text-[10px] text-cyan-400 font-bold mt-3 block">
                    Carregar Campanha ➔
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs">
                  Cole o output bruto (JSON, JSON Lines ou formato padrão da ferramenta):
                </span>
                <span className="text-[10px] text-zinc-500">
                  Formato esperado: {activeTab === 'subfinder' ? '{"host":"..."}' : activeTab === 'httpx' ? '{"url":"...","tech":[]}' : activeTab === 'nuclei' ? '{"template-id":"..."}' : 'Nmap / Naabu text/json'}
                </span>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Exemplo:\n${
                  activeTab === 'subfinder' ? '{"host":"api.target.com","source":"virustotal"}\n{"host":"auth.target.com","source":"shodan"}' :
                  activeTab === 'httpx' ? '{"url":"https://api.target.com","status_code":200,"title":"API v1","tech":["Nginx","React"]}' :
                  activeTab === 'nuclei' ? '{"template-id":"springboot-actuator","info":{"severity":"high","name":"Spring Actuator"},"matched-at":"https://api.target.com"}' :
                  'Nmap scan report for api.target.com (1.2.3.4)\n80/tcp open http\n443/tcp open https'
                }`}
                rows={8}
                className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-zinc-700 resize-none"
              />

              {parseResult && (
                <div className={`p-3 rounded-lg border text-xs ${
                  parseResult.errors.length === 0 ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-amber-950/60 border-amber-800 text-amber-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Processado com sucesso: {parseResult.count} ativo(s) correlacionados!</span>
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
                  Cancelar
                </button>
                <button
                  onClick={handleProcessRaw}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Processar e Ingerir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
