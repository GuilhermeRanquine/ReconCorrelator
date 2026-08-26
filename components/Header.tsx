'use client';

import React, { useState } from 'react';
import { TargetProject } from '@/types/recon';
import { 
  ShieldAlert, 
  Terminal, 
  Cpu, 
  CheckCircle2, 
  Activity, 
  Plus, 
  Download, 
  Sparkles, 
  Database,
  Radio,
  FileCheck,
  GitBranch,
  HardDrive,
  Lock,
  Key,
  Copy,
  Check,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

export type ReconTab = 'dashboard' | 'terminal' | 'flowchart' | 'workbench' | 'graph' | 'assets' | 'pipeline' | 'tdd' | 'drive';

interface HeaderProps {
  currentProject: TargetProject | null;
  projects: TargetProject[];
  onSelectProject: (project: TargetProject) => void;
  onLockBounty: () => void;
  onOpenIngestion: () => void;
  onOpenProgramIngestion: () => void;
  onOpenProjectManager: () => void;
  onOpenScope: () => void;
  onOpenTdd: () => void;
  onOpenAiTriage: () => void;
  onOpenExport: () => void;
  onNewScan: () => void;
  totalAssets: number;
  aliveCount: number;
  vulnCount: number;
  takeoverCount: number;
  activeTab: ReconTab;
  setActiveTab: (tab: ReconTab) => void;
  researcherHandle?: string;
}

export function Header({
  currentProject,
  projects,
  onSelectProject,
  onLockBounty,
  onOpenIngestion,
  onOpenProgramIngestion,
  onOpenProjectManager,
  onOpenScope,
  onOpenTdd,
  onOpenAiTriage,
  onOpenExport,
  onNewScan,
  totalAssets,
  aliveCount,
  vulnCount,
  takeoverCount,
  activeTab,
  setActiveTab,
  researcherHandle = 'w0rmingstar',
}: HeaderProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyAccessCode = () => {
    if (currentProject?.accessCode) {
      navigator.clipboard.writeText(currentProject.accessCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl sticky top-0 z-40 shadow-xl font-mono">
      {/* Top Squad & Target Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-100 tracking-wide">w0rmingstar</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold">
                  RECON CORRELATOR SUITE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Isolamento Estrito por Código Único de Acesso</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center pl-4 border-l border-zinc-800 gap-1.5 text-[11px]">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
              <strong className="text-red-400">ALPHA:</strong> RedTeam
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <strong className="text-cyan-400">BETA:</strong> Async Engine
            </div>
            <button 
              onClick={onOpenTdd}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
              title="Abrir Centro de Testes TDD"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <strong className="text-emerald-400">DELTA:</strong> TDD (100%)
            </button>
          </div>
        </div>

        {/* Target Selector, Access Code & OPSEC Indicator */}
        <div className="flex items-center gap-2">
          {currentProject ? (
            <>
              {/* Active Access Code Badge */}
              <div className="flex items-center gap-1.5 bg-black border border-amber-800/80 rounded-lg px-2.5 py-1 text-xs text-amber-300 shadow-inner">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] text-amber-500 uppercase font-bold">Código:</span>
                <span className="font-bold tracking-wider">{currentProject.accessCode}</span>
                <button
                  onClick={handleCopyAccessCode}
                  className="ml-1 text-zinc-400 hover:text-amber-200 transition-colors cursor-pointer"
                  title="Copiar Código de Acesso Único deste Bounty"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Target Indicator */}
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                <span className="text-zinc-400 text-[10px] font-bold">ALVO:</span>
                <span className="text-emerald-400 font-bold max-w-[130px] truncate" title={currentProject.domain}>
                  {currentProject.domain}
                </span>
                <button
                  onClick={onOpenProjectManager}
                  className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded transition-colors cursor-pointer ml-1"
                  title="Gerenciar Alvos e Chaves"
                >
                  Gerenciar
                </button>
              </div>

              {/* Lock / Switch Button */}
              <button
                onClick={onLockBounty}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/50 hover:bg-red-900/60 border border-red-800/80 rounded-lg text-red-300 text-xs transition-colors cursor-pointer shadow-sm"
                title="Bloquear sessão e trocar de Bug Bounty"
              >
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Bloquear / Trocar</span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenProjectManager}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-lg text-xs transition-all shadow-md cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Desbloquear com Código</span>
            </button>
          )}

          <button
            onClick={onOpenProgramIngestion}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-bold rounded-lg text-xs transition-all shadow-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Bug Bounty</span>
          </button>
        </div>
      </div>

      {/* Main Navigation and Metric Strip (When Unlocked) */}
      {currentProject && (
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-4">
          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 text-xs overflow-x-auto py-0.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm ring-1 ring-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Visão Geral
            </button>

            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'terminal'
                  ? 'bg-emerald-950/80 text-emerald-300 font-bold shadow-sm ring-1 ring-emerald-500/60'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Terminal Linux & Arsenal</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab('flowchart')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'flowchart'
                  ? 'bg-zinc-800 text-emerald-300 font-medium shadow-sm ring-1 ring-emerald-500/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
              Fluxograma & Playbook
            </button>

            <button
              onClick={() => setActiveTab('workbench')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'workbench'
                  ? 'bg-zinc-800 text-cyan-300 font-medium shadow-sm ring-1 ring-cyan-500/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Workbench Ao Vivo
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'graph'
                  ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm ring-1 ring-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              Grafo Interativo
            </button>

            <button
              onClick={() => setActiveTab('assets')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'assets'
                  ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm ring-1 ring-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              Ativos ({totalAssets})
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'pipeline'
                  ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm ring-1 ring-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Orquestrador CLI
            </button>

            <button
              onClick={() => setActiveTab('drive')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'drive'
                  ? 'bg-blue-950/80 border border-blue-500/70 text-blue-300 font-bold shadow-sm'
                  : 'text-blue-400 hover:text-blue-300 hover:bg-blue-950/30'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Drive</span>
            </button>
          </nav>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300">
              <span className="text-zinc-500">Vivos:</span> <strong className="text-emerald-400">{aliveCount}</strong>/{totalAssets}
            </div>

            <div className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300">
              <span className="text-zinc-500">Vulns:</span> <strong className={vulnCount > 0 ? 'text-red-400' : 'text-zinc-300'}>{vulnCount}</strong>
            </div>

            {takeoverCount > 0 && (
              <div className="px-2.5 py-1 bg-red-950/60 border border-red-800/80 rounded-md text-red-300 animate-pulse">
                <span>Takeovers:</span> <strong>{takeoverCount}</strong>
              </div>
            )}

            <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
              <button
                onClick={onOpenScope}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 rounded-md text-amber-300 text-xs transition-colors cursor-pointer"
                title="Regras de Escopo"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Scope</span>
              </button>

              <button
                onClick={onOpenAiTriage}
                className="flex items-center gap-1 px-2.5 py-1 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-700/60 rounded-md text-purple-200 text-xs transition-colors cursor-pointer"
                title="AI Triage"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>AI Triage</span>
              </button>

              <button
                onClick={onOpenIngestion}
                className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-zinc-200 text-xs transition-colors cursor-pointer"
                title="Ingerir dados de ferramentas (Subfinder, Httpx, Nmap, Nuclei)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Importar RAW</span>
              </button>

              <button
                onClick={onOpenExport}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-zinc-300 transition-colors cursor-pointer"
                title="Exportar Relatório e Superfície"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
