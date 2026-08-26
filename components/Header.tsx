'use client';

import React from 'react';
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
  FileText,
  Bot
} from 'lucide-react';

export type ReconTab = 'dashboard' | 'terminal' | 'flowchart' | 'workbench' | 'graph' | 'assets' | 'pipeline' | 'tdd' | 'drive' | 'reports';

interface HeaderProps {
  currentProject: TargetProject;
  projects: TargetProject[];
  onSelectProject: (project: TargetProject) => void;
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
  isDbConnected?: boolean;
}

export function Header({
  currentProject,
  projects,
  onSelectProject,
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
  isDbConnected = true,
}: HeaderProps) {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl sticky top-0 z-40 shadow-xl">
      {/* Top Squad & Target Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-zinc-100 tracking-wide">w0rmingstar</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold">
                  HACKERONE PENTEST SUITE
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-cyan-300 border border-zinc-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  CENTRAL DB: CONNECTED
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">Orquestrador de Superfície & Terminal Arsenal</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center pl-4 border-l border-zinc-800 gap-1 text-[11px] font-mono">
            {/* Squad Status Badges */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
              <strong className="text-red-400">ALPHA:</strong> RedTeam
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <strong className="text-cyan-400">BETA:</strong> Async Engine
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              <strong className="text-purple-400">GAMMA:</strong> Dark UI
            </div>
            <button 
              onClick={onOpenTdd}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
              title="Abrir Centro de Testes TDD do DELTA"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <strong className="text-emerald-400">DELTA:</strong> TDD (100%)
            </button>
          </div>
        </div>

        {/* Target Selector & OPSEC Indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenProgramIngestion}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-bold rounded-lg text-xs font-mono transition-all shadow-lg hover:shadow-emerald-950/50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Link BugBounty / Ingestor</span>
          </button>

          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span className="text-zinc-400 text-[10px] font-mono font-bold">ALVO:</span>
            <select
              className="bg-transparent text-emerald-400 font-mono text-xs font-bold focus:outline-none cursor-pointer max-w-[140px] truncate"
              value={currentProject.id}
              onChange={(e) => {
                const found = projects.find(p => p.id === e.target.value);
                if (found) onSelectProject(found);
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-100">
                  {p.domain} {p.isDemo ? '(Demo)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={onOpenProjectManager}
              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ml-1"
              title="Gerenciar, Excluir ou Limpar Projetos"
            >
              Gerenciar
            </button>
          </div>

          <button
            onClick={onOpenScope}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 rounded-md text-amber-300 text-xs font-mono transition-colors cursor-pointer"
            title="Gerenciar Regras de Escopo (In-Scope / Out-of-Scope)"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Scope Guard</span>
          </button>

          <button
            onClick={onOpenAiTriage}
            className="flex items-center gap-1 px-2.5 py-1 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-700/60 rounded-md text-purple-200 text-xs font-mono transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Triage</span>
          </button>
        </div>
      </div>

      {/* Main Navigation and Metric Strip */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 font-mono text-xs overflow-x-auto py-0.5">
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
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-indigo-950/80 text-indigo-300 font-bold shadow-sm ring-1 ring-indigo-500/60'
                : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>Nexus Autônomo & Relatórios</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
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
            onClick={() => setActiveTab('tdd')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'tdd'
                ? 'bg-emerald-950/70 border border-emerald-700/80 text-emerald-300 font-medium'
                : 'text-emerald-400 hover:bg-emerald-950/30'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            TDD Suite
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
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          </button>
        </nav>

        {/* Quick Operational Metrics */}
        <div className="flex items-center gap-2 font-mono text-xs">
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

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
            <button
              onClick={onOpenIngestion}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
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
    </header>
  );
}
