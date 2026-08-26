'use client';

import React, { useState, useEffect } from 'react';
import { TargetProject } from '@/types/recon';
import { StoredReport } from '@/lib/db';
import { 
  FileText, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert, 
  Terminal, 
  Cpu, 
  Bot, 
  Copy, 
  Check, 
  ExternalLink, 
  Plus, 
  Sparkles, 
  Layers, 
  ChevronRight, 
  Search, 
  Lock, 
  Activity, 
  GitBranch, 
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

interface NexusReportsViewerProps {
  currentProject: TargetProject;
  onSelectProject?: (proj: TargetProject) => void;
}

interface ChatSquadPrompt {
  id: string;
  squad: string;
  name: string;
  role: string;
  color: string;
  icon: any;
  description: string;
  prompt: string;
}

export function NexusReportsViewer({ currentProject, onSelectProject }: NexusReportsViewerProps) {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<StoredReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copiedContent, setCopiedContent] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'reports' | 'orchestrator' | 'squads'>('reports');

  // Fetch reports from backend DB
  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/reports');
      const data = await res.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
        if (data.reports.length > 0 && !selectedReport) {
          setSelectedReport(data.reports[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // Auto-refresh reports every 30 seconds
    const interval = setInterval(fetchReports, 30000);
    return () => clearInterval(interval);
  }, []);

  const SQUAD_PROMPTS: ChatSquadPrompt[] = [
    {
      id: 'squad-red',
      squad: '@ShadowStrike',
      name: 'Red Team & Offensive Recon Lead',
      role: 'Enumeração agressiva, correlação de ativos, exploração de takeovers e triagem de vulnerabilidades em escopo.',
      color: 'border-red-500/40 bg-red-950/20 text-red-400',
      icon: ShieldAlert,
      description: 'Copie este prompt para iniciar um chat dedicado exclusivamente a testes ofensivos e reconhecimento de escopo.',
      prompt: `[CYBER NEXUS ORCHESTRATION - SESSÃO RED TEAM]
Você é o @ShadowStrike, Red Team Lead de Elite do Squad ReconCorrelator.
Alvo Atual: ${currentProject.domain} (${currentProject.name})
Escopo Ativo: ${currentProject.inScope.join(', ')}
Fora de Escopo: ${currentProject.outOfScope.join(', ') || 'Nenhum'}
Regras & Headers: ${currentProject.policy?.requiredHeaders?.[0]?.key || 'X-Bug-Bounty'}: ${currentProject.policy?.requiredHeaders?.[0]?.value || 'w0rmingstar'}

Sua Missão:
1. Analise o último relatório de auditoria disponível na pasta reports/ e correlacione os novos subdomínios descobertos.
2. Identifique vetores de takeover em CNAMEs órfãos, caminhos sensíveis de API e parâmetros vulneráveis.
3. Gere PoCs conceituais rigorosamente dentro das regras de Safe Harbor do programa.
4. Emita o relatório final de vulnerabilidades para aprovação do @CoreGovernance e mitigação pelo @AegisForge.`,
    },
    {
      id: 'squad-blue',
      squad: '@SentinelNexus',
      name: 'Blue Team & Threat Detection Lead',
      role: 'Monitoramento contínuo, regras de WAF/SIEM, telemetria e blindagem perimetral.',
      color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-400',
      icon: Activity,
      description: 'Copie este prompt para iniciar um chat dedicado à detecção de anomalias e regras de defesa.',
      prompt: `[CYBER NEXUS ORCHESTRATION - SESSÃO BLUE TEAM]
Você é o @SentinelNexus, Líder de Defesa & Telemetria do Squad ReconCorrelator.
Alvo Monitorado: ${currentProject.domain}

Sua Missão:
1. Analise os vetores levantados pelo @ShadowStrike no relatório mais recente.
2. Crie regras de WAF (Cloudflare/ModSecurity/AWS WAF) para barrar ataques de reconhecimento abusivo e injeções.
3. Desenvolva assinaturas de monitoramento para alertar sobre novas emissões de certificados TLS suspeitos.
4. Homologue a postura defensiva com o @CoreGovernance.`,
    },
    {
      id: 'squad-devsec',
      squad: '@AegisForge',
      name: 'DevSecOps & Patch Engineering Lead',
      role: 'Correção de código, saneamento de headers, hardening de APIs e automação de CI/CD.',
      color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400',
      icon: Cpu,
      description: 'Copie este prompt para um chat focado na engenharia de patches e correção de falhas.',
      prompt: `[CYBER NEXUS ORCHESTRATION - SESSÃO DEVSECOPS]
Você é o @AegisForge, Chefe de Engenharia DevSecOps do Squad ReconCorrelator.
Alvo de Correção: ${currentProject.domain}

Sua Missão:
1. Inspecione as falhas relatadas em reports/ e desenvolva patches de código defensivo.
2. Configure políticas de CORS restritivas, saneie headers HTTP (HSTS, CSP, X-Frame-Options) e elimine CNAMEs órfãos.
3. Automatize testes TDD de regressão garantindo que nenhuma vulnerabilidade reapareça.
4. Submeta as correções para o Re-teste do @ShadowStrike.`,
    },
    {
      id: 'squad-grc',
      squad: '@CoreGovernance',
      name: 'GRC & Risk Officer',
      role: 'Cálculo de risco CVSS v3.1, conformidade com políticas de Bug Bounty e autorização autônoma de releases.',
      color: 'border-purple-500/40 bg-purple-950/20 text-purple-400',
      icon: ShieldCheck,
      description: 'Copie este prompt para o chat de governança, compliance e aprovação formal.',
      prompt: `[CYBER NEXUS ORCHESTRATION - SESSÃO GRC & AUDITORIA]
Você é o @CoreGovernance, Oficial de Governança, Risco e Conformidade do ReconCorrelator.
Alvo: ${currentProject.domain}

Sua Missão:
1. Audite os relatórios emitidos na pasta reports/ e certifique a conformidade com as regras do programa (${currentProject.platform || 'Bug Bounty'}).
2. Calcule a pontuação CVSS v3.1 e o impacto financeiro/reputacional dos achados.
3. Emita a assinatura digital de autorização autônoma da diretoria (@NexusPrime) sem necessidade de interrupção manual.`,
    }
  ];

  const handleCopyPrompt = (prompt: ChatSquadPrompt) => {
    navigator.clipboard.writeText(prompt.prompt);
    setCopiedPromptId(prompt.id);
    setTimeout(() => setCopiedPromptId(null), 2500);
  };

  const handleCopyReportContent = () => {
    if (!selectedReport) return;
    navigator.clipboard.writeText(selectedReport.content);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  };

  const filteredReports = reports.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Nexus Autonomous Orchestration Banner */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-zinc-900/60 to-zinc-950/90 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold font-mono text-zinc-100 flex items-center gap-2">
                Cyber Nexus 24/7 • Hub Autônomo de Governança & Auditoria
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                  AUTONOMOUS LOOP ACTIVE
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-3xl">
              Este módulo centraliza a leitura em tempo real de todos os relatórios da pasta <code className="text-indigo-300 bg-zinc-900 px-1 py-0.5 rounded">reports/</code> e sincroniza os esquadrões (<span className="text-red-400">@ShadowStrike</span>, <span className="text-cyan-400">@SentinelNexus</span>, <span className="text-emerald-400">@AegisForge</span>, <span className="text-purple-400">@CoreGovernance</span>).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchReports}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
              Sincronizar Relatórios
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800/80">
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Relatórios de Auditoria ({reports.length})
          </button>
          <button
            onClick={() => setActiveSubTab('squads')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'squads'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Criador de Novos Chats & Prompts dos Esquadrões
          </button>
          <button
            onClick={() => setActiveSubTab('orchestrator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'orchestrator'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            Cadeia de Autorização Autônoma
          </button>
        </div>
      </div>

      {/* SUBTAB 1: RELATÓRIOS EMITIDOS */}
      {activeSubTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Reports List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
              <input
                type="text"
                placeholder="Filtrar relatórios..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredReports.map(rep => {
                const isSelected = selectedReport?.id === rep.id;
                return (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-indigo-500/80 bg-indigo-950/40 shadow-lg shadow-indigo-950/50'
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/40 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700">
                        {rep.protocol}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(rep.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1 mb-1.5">
                      {rep.title}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="text-emerald-400 font-mono text-[10px]">{rep.status}</span>
                      <span className="text-zinc-500 text-[10px] font-mono">{rep.fileName}</span>
                    </div>
                  </div>
                );
              })}

              {filteredReports.length === 0 && (
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs font-mono">
                  Nenhum relatório encontrado.
                </div>
              )}
            </div>
          </div>

          {/* Right: Report Content Preview */}
          <div className="lg:col-span-8">
            {selectedReport ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-indigo-400">{selectedReport.protocol}</span>
                      <span className="text-xs text-zinc-500">•</span>
                      <span className="text-xs text-zinc-400 font-mono">{selectedReport.classification}</span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-100">{selectedReport.title}</h3>
                  </div>

                  <button
                    onClick={handleCopyReportContent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-mono transition-all cursor-pointer"
                  >
                    {copiedContent ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                    {copiedContent ? 'Copiado!' : 'Copiar Markdown'}
                  </button>
                </div>

                {/* Sign-off Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
                  {selectedReport.approvals.map((appr, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] font-mono">
                      <span className="text-zinc-500 block text-[10px]">{appr.role}</span>
                      <div className="flex items-center justify-between mt-1">
                        <strong className="text-indigo-300">{appr.handle}</strong>
                        <span className="text-emerald-400 font-bold text-[9px]">✅ {appr.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Document Body */}
                <div className="p-4 rounded-lg bg-zinc-950/90 border border-zinc-800/80 max-h-[500px] overflow-y-auto font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {selectedReport.content}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs font-mono">
                Selecione um relatório na lista lateral para visualizar os detalhes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: CRIADOR DE CHATS & PROMPTS DE ESQUADRÃO */}
      {activeSubTab === 'squads' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <h3 className="text-sm font-bold font-mono text-zinc-100 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Prompts Prontos para Novos Chats Autônomos
            </h3>
            <p className="text-xs text-zinc-400">
              Para rodar operações contínuas e simultâneas, copie os prompts abaixo e cole em novas abas/sessões de chat do seu assistente. Cada esquadrão focará em sua respectiva responsabilidade técnica sem interrupções humanas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SQUAD_PROMPTS.map(sp => {
              const Icon = sp.icon;
              const isCopied = copiedPromptId === sp.id;
              return (
                <div key={sp.id} className={`rounded-xl border p-4 backdrop-blur-sm flex flex-col justify-between ${sp.color}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="font-mono font-bold text-sm">{sp.squad}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-700">
                        {sp.name.split('&')[0]}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">{sp.role}</p>

                    <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] font-mono text-zinc-400 line-clamp-3">
                      {sp.prompt}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-mono">Alvo: {currentProject.domain}</span>
                    <button
                      onClick={() => handleCopyPrompt(sp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs font-mono transition-all cursor-pointer font-semibold shadow-md"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                      {isCopied ? 'Copiado para o Clipboard!' : 'Copiar Prompt do Squad'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: CADEIA DE AUTORIZAÇÃO AUTÔNOMA */}
      {activeSubTab === 'orchestrator' && (
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-6">
          <div>
            <h3 className="text-base font-bold font-mono text-zinc-100 mb-1">
              🏛️ Governança & Cadeia de Autorização Autônoma (Zero-Approval Loop)
            </h3>
            <p className="text-xs text-zinc-400 max-w-3xl">
              As operações no ReconCorrelator são autorizadas pelos líderes de cada squad sem necessidade de confirmações manuais em loops triviais, seguindo a matriz de responsabilidades:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-red-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-red-400">@ShadowStrike</span>
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
              </div>
              <p className="text-xs font-semibold text-zinc-200">Chefe de Red Team</p>
              <p className="text-[11px] text-zinc-400">
                Autoriza varreduras de superfície, correlação de ativos e testes de DNS/Takeover.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-cyan-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400">@SentinelNexus</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              </div>
              <p className="text-xs font-semibold text-zinc-200">Chefe de Blue Team</p>
              <p className="text-[11px] text-zinc-400">
                Homologa regras de WAF e assinaturas de detecção de tráfego anômalo.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-emerald-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400">@AegisForge</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <p className="text-xs font-semibold text-zinc-200">Chefe DevSecOps</p>
              <p className="text-[11px] text-zinc-400">
                Aprova correções no código-fonte, arquitetura de APIs e automações CI/CD.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-purple-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-purple-400">@CoreGovernance</span>
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              </div>
              <p className="text-xs font-semibold text-zinc-200">Chefe de GRC & Diretoria</p>
              <p className="text-[11px] text-zinc-400">
                Valida conformidade com políticas de Safe Harbor e emite o aceite executivo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
