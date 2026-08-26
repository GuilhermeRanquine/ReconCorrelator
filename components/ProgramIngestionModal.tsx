'use client';

import React, { useState } from 'react';
import { TargetProject, BugBountyPlatform } from '@/types/recon';
import { 
  X, 
  Link as LinkIcon, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  DollarSign, 
  Globe, 
  Cpu, 
  Plus, 
  Trash2,
  Lock,
  ArrowRight
} from 'lucide-react';

interface ProgramIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProgramCreated: (target: TargetProject) => void;
}

export function ProgramIngestionModal({
  isOpen,
  onClose,
  onProgramCreated,
}: ProgramIngestionModalProps) {
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [programUrl, setProgramUrl] = useState('');
  const [rawPolicyText, setRawPolicyText] = useState('');
  const [targetNameHint, setTargetNameHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Parsed target preview state
  const [parsedProject, setParsedProject] = useState<TargetProject | null>(null);

  if (!isOpen) return null;

  const handleAnalyzeProgram = async () => {
    if (!programUrl.trim() && !rawPolicyText.trim()) {
      setErrorMsg('Por favor, informe a URL do programa ou cole o texto do briefing.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/recon/parse-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programUrl: programUrl.trim() || undefined,
          rawPolicyText: rawPolicyText.trim() || undefined,
          targetNameHint: targetNameHint.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao analisar o programa.');
      }

      setParsedProject(data.targetProject);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão com o analisador de programas.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndActivate = () => {
    if (parsedProject) {
      onProgramCreated(parsedProject);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center text-emerald-300">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">Ingestor de Programas Reais de Bug Bounty</h3>
              <p className="text-[11px] text-emerald-400/90">Extração de escopo, regras e Safe Harbor com IA Gemini 3.7</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {!parsedProject ? (
            <div className="space-y-4">
              {/* Mode Toggle */}
              <div className="flex border border-zinc-800 rounded-xl bg-zinc-900/60 p-1 text-xs">
                <button
                  onClick={() => setInputMode('url')}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer font-bold ${
                    inputMode === 'url'
                      ? 'bg-emerald-600 text-black shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Por Link de Programa (H1, Bugcrowd, URL)</span>
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer font-bold ${
                    inputMode === 'text'
                      ? 'bg-emerald-600 text-black shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Colar Briefing / Política de Escopo</span>
                </button>
              </div>

              {inputMode === 'url' ? (
                <div className="space-y-3">
                  <label className="text-xs text-zinc-300 font-semibold block">
                    URL do Programa de Bug Bounty ou Domínio Alvo:
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="Ex: https://hackerone.com/uber ou https://bugcrowd.com/tesla ou https://site.com/security.txt"
                      value={programUrl}
                      onChange={(e) => setProgramUrl(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Insira qualquer link da HackerOne, Bugcrowd, Intigriti, YesWeHack, ou a URL principal da empresa.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-300 font-semibold">
                      Texto do Escopo, Regras e Wildcards do Programa:
                    </label>
                    <span className="text-[10px] text-zinc-500">Markdown ou texto simples</span>
                  </div>
                  <textarea
                    rows={7}
                    placeholder="Cole aqui o briefing completo do programa (ex: In-scope: *.empresa.com, api.empresa.com. Out-of-scope: test.empresa.com, rate limits, bounties: Critical $5000...)"
                    value={rawPolicyText}
                    onChange={(e) => setRawPolicyText(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              )}

              {/* Optional Name Hint */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Nome da Empresa / Programa (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: Uber Technologies, Nubank, Shopify..."
                  value={targetNameHint}
                  onChange={(e) => setTargetNameHint(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleAnalyzeProgram}
                  disabled={loading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-900/40 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analisando e Extraindo Escopo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Processar Programa com IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Parsed Summary Preview */
            <div className="space-y-4 font-mono">
              <div className="bg-emerald-950/30 border border-emerald-800/80 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Programa Extraído com Sucesso!</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                  {parsedProject.policy?.platform || 'Custom'}
                </span>
              </div>

              {/* Target Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                  <span className="text-zinc-500 text-[10px] font-bold tracking-wider block">NOME DO PROGRAMA</span>
                  <input
                    type="text"
                    value={parsedProject.name}
                    onChange={(e) => setParsedProject({ ...parsedProject, name: e.target.value })}
                    className="w-full bg-black/60 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-zinc-100 font-bold text-sm focus:outline-none transition-colors"
                  />
                </div>
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                  <span className="text-zinc-500 text-[10px] font-bold tracking-wider block">DOMÍNIO PRINCIPAL</span>
                  <input
                    type="text"
                    value={parsedProject.domain}
                    onChange={(e) => setParsedProject({ ...parsedProject, domain: e.target.value })}
                    className="w-full bg-black/60 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-emerald-400 font-bold text-sm focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* In-Scope & Out-of-Scope Badges */}
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>In-Scope Extraído ({parsedProject.inScope.length}):</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-black border border-zinc-800 rounded-xl">
                    {parsedProject.inScope.map((item, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {parsedProject.outOfScope.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-red-400 block mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-4 h-4" />
                      <span>Out-of-Scope / Exclusões ({parsedProject.outOfScope.length}):</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-black border border-zinc-800 rounded-xl">
                      {parsedProject.outOfScope.map((item, idx) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Policy, Rules & Editable Headers */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resumo das Regras & Safe Harbor</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    parsedProject.policy?.safeHarbor ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {parsedProject.policy?.safeHarbor ? 'SAFE HARBOR CONFIRMADO' : 'AVISO PADRÃO'}
                  </span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  {parsedProject.policy?.policySummary}
                </p>

                {/* Interactive / Editable Headers */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cyan-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Headers de Teste & Identificação do Pesquisador (Customizável):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentHeaders = parsedProject.policy?.requiredHeaders || [];
                        const updated = [
                          ...currentHeaders,
                          { key: 'X-Bug-Bounty', value: 'seu_username_hackerone', description: 'Header customizado' }
                        ];
                        setParsedProject({
                          ...parsedProject,
                          policy: {
                            ...parsedProject.policy,
                            platform: parsedProject.policy?.platform || 'custom',
                            policySummary: parsedProject.policy?.policySummary || '',
                            safeHarbor: parsedProject.policy?.safeHarbor ?? true,
                            prohibitedVulns: parsedProject.policy?.prohibitedVulns || [],
                            targetArchitecture: parsedProject.policy?.targetArchitecture || 'cloud_native',
                            bountyTiers: parsedProject.policy?.bountyTiers || [],
                            extractedAt: parsedProject.policy?.extractedAt || new Date().toISOString(),
                            requiredHeaders: updated,
                          }
                        });
                      }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar Header</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-zinc-400">
                    Edite o valor do header abaixo para colocar seu <strong>usuário real da plataforma</strong> (ex: seu username na HackerOne ou Bugcrowd). Ele será injetado automaticamente em todos os comandos cURL, Httpx e Nuclei.
                  </p>

                  <div className="space-y-2">
                    {(parsedProject.policy?.requiredHeaders && parsedProject.policy.requiredHeaders.length > 0 
                      ? parsedProject.policy.requiredHeaders 
                      : [{ key: 'X-Bug-Bounty', value: 'HackerOne-Username', description: 'Header de identificação' }]
                    ).map((hdr, hIdx) => (
                      <div key={hIdx} className="flex items-center gap-2 bg-black border border-cyan-950/80 rounded-lg p-1.5">
                        <div className="flex-1 flex items-center gap-1">
                          <input
                            type="text"
                            value={hdr.key}
                            onChange={(e) => {
                              const headers = [...(parsedProject.policy?.requiredHeaders || [{ key: 'X-Bug-Bounty', value: 'HackerOne-Username' }])];
                              headers[hIdx] = { ...headers[hIdx], key: e.target.value };
                              setParsedProject({
                                ...parsedProject,
                                policy: {
                                  ...parsedProject.policy!,
                                  requiredHeaders: headers,
                                }
                              });
                            }}
                            placeholder="Header (ex: X-Bug-Bounty)"
                            className="w-1/3 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 font-semibold"
                          />
                          <span className="text-zinc-600 font-bold">:</span>
                          <input
                            type="text"
                            value={hdr.value}
                            onChange={(e) => {
                              const headers = [...(parsedProject.policy?.requiredHeaders || [{ key: 'X-Bug-Bounty', value: 'HackerOne-Username' }])];
                              headers[hIdx] = { ...headers[hIdx], value: e.target.value };
                              setParsedProject({
                                ...parsedProject,
                                policy: {
                                  ...parsedProject.policy!,
                                  requiredHeaders: headers,
                                }
                              });
                            }}
                            placeholder="Valor / Seu Username (ex: w0rmingstar)"
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const headers = (parsedProject.policy?.requiredHeaders || []).filter((_, i) => i !== hIdx);
                            setParsedProject({
                              ...parsedProject,
                              policy: {
                                ...parsedProject.policy!,
                                requiredHeaders: headers,
                              }
                            });
                          }}
                          className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                          title="Remover este header"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-zinc-900/90 border-t border-zinc-800 p-3.5 flex justify-between items-center">
          {parsedProject ? (
            <>
              <button
                onClick={() => setParsedProject(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Voltar e Reanalisar
              </button>
              <button
                onClick={handleConfirmAndActivate}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg hover:shadow-emerald-900/40 cursor-pointer"
              >
                <span>Ativar Programa & Gerar Playbook</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
