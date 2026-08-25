'use client';

import React, { useState } from 'react';
import { TargetProject, CorrelatedAsset, Vulnerability } from '@/types/recon';
import { 
  X, 
  Sparkles, 
  Terminal, 
  ShieldAlert, 
  Copy, 
  Check, 
  Loader2, 
  Cpu, 
  Zap, 
  FileText
} from 'lucide-react';

interface AiTriagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: TargetProject;
  selectedAsset: CorrelatedAsset | null;
  allAssets: CorrelatedAsset[];
}

export function AiTriagerModal({
  isOpen,
  onClose,
  target,
  selectedAsset,
  allAssets,
}: AiTriagerModalProps) {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [contextPrompt, setContextPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentAsset = selectedAsset || allAssets.find(a => a.vulnerabilities.length > 0) || allAssets[0];

  const handleRunTriage = async () => {
    setLoading(true);
    setAnalysisResult(null);

    try {
      const allVulns = allAssets.flatMap(a => a.vulnerabilities);
      const res = await fetch('/api/gemini/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDomain: target.domain,
          asset: currentAsset,
          allVulns,
          contextPrompt,
        }),
      });

      const data = await res.json();
      if (data.analysis) {
        setAnalysisResult(data.analysis);
      } else if (data.fallbackAnalysis) {
        setAnalysisResult(data.fallbackAnalysis);
      }
    } catch (err: any) {
      setAnalysisResult(`**[ALPHA Offline Analysis]**:\n- Alvo analisado: ${currentAsset?.subdomain}\n- Chaining sugerido: Aproveitar endpoints Spring Boot /actuator/env para extrair chaves e pivotar na infraestrutura AWS.`);
    } finally {
      setLoading(false);
    }
  };

  const copyAnalysis = () => {
    if (analysisResult) {
      navigator.clipboard.writeText(analysisResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-purple-950/40 border-b border-purple-900/60 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-900/50 border border-purple-700/60 flex items-center justify-center text-purple-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-purple-100 text-sm">ALPHA AI Threat Intelligence & Red Team Triager</h3>
              <p className="text-[11px] text-purple-300/80">Análise de encadeamento de exploits & draft de report para Bug Bounty</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Target Info */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-zinc-500 text-[10px] block">ALVO SELECIONADO:</span>
              <strong className="text-zinc-200">{currentAsset ? currentAsset.subdomain : target.domain}</strong>
            </div>
            <div>
              <span className="text-zinc-500 text-[10px] block">PORTAS:</span>
              <span className="text-amber-300">{currentAsset?.ports.map(p => p.port).join(', ') || 'N/A'}</span>
            </div>
            <div>
              <span className="text-zinc-500 text-[10px] block">VULNERABILIDADES:</span>
              <span className="text-red-400 font-bold">{currentAsset?.vulnerabilities.length || 0}</span>
            </div>
          </div>

          {/* Context Input */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 text-xs font-semibold">Instruções de Exploração (Opcional):</label>
            <input
              type="text"
              placeholder="Ex: Focar em obtenção de RCE via Spring Boot ou demonstrar Account Takeover no Keycloak"
              value={contextPrompt}
              onChange={(e) => setContextPrompt(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          {!analysisResult && !loading && (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 text-center space-y-3">
              <Zap className="w-8 h-8 text-purple-400 mx-auto" />
              <h4 className="text-zinc-200 font-bold text-sm">Disparar Triagem de Ameaças</h4>
              <p className="text-zinc-400 text-xs max-w-md mx-auto leading-relaxed">
                O modelo analisará a correlação completa (portas, servidores web, CVEs e headers) para sugerir a cadeia de exploração mais provável e gerar um relatório profissional.
              </p>
              <button
                onClick={handleRunTriage}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-all shadow-lg hover:shadow-purple-900/50 cursor-pointer"
              >
                Gerar Análise com ALPHA AI
              </button>
            </div>
          )}

          {loading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
              <p className="text-zinc-300 text-xs font-bold">ALPHA está correlacionando vetores de ataque e sintetizando a PoC...</p>
              <p className="text-zinc-500 text-[11px]">Avaliando templates Nuclei, portas abertas e CVEs conhecidas.</p>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Relatório de Triagem Técnica (ALPHA Output)</span>
                </span>
                <button
                  onClick={copyAnalysis}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Markdown'}</span>
                </button>
              </div>

              <div className="bg-black border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap max-h-96 overflow-y-auto">
                {analysisResult}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-zinc-900/90 border-t border-zinc-800 p-3.5 flex justify-between items-center">
          <button
            onClick={() => { setAnalysisResult(null); handleRunTriage(); }}
            className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            Regenerar Análise
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
