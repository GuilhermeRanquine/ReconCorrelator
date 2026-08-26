'use client';

import React, { useState, useEffect } from 'react';
import { TargetProject } from '@/types/recon';
import { ThemeSelector } from '@/components/ThemeSelector';
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
  ArrowRightLeft,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Settings,
  Building2,
  SlidersHorizontal,
  ChevronDown
} from '@/lib/icons';

export type ReconTab = 'dashboard' | 'terminal' | 'flowchart' | 'workbench' | 'graph' | 'assets' | 'pipeline' | 'tdd' | 'drive';

interface HeaderProps {
  currentProject: TargetProject | null;
  projects: TargetProject[];
  currentUser?: { id: string; username: string; role: string } | null;
  onLogout?: () => void;
  onOpenSettings?: () => void;
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
  currentUser,
  onLogout,
  onOpenSettings,
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
  researcherHandle = 'ranquine',
}: HeaderProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Dynamic Scroll Listener for Header Shrinking
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 45) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopyAccessCode = () => {
    if (currentProject?.accessCode) {
      navigator.clipboard.writeText(currentProject.accessCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const operatorName = currentUser?.username || researcherHandle;

  return (
    <header className="sticky top-0 z-40 font-mono transition-all duration-300 ease-in-out">
      {/* ======================================================== */}
      {/* 🔻 STATE A: COMPACT SHRUNK HEADER ON SCROLL (iOS FLOATING PILL) */}
      {/* ======================================================== */}
      {isScrolled ? (
        <div className="pt-2 px-3 sm:px-4 w-full">
          <div className="w-full bg-zinc-950/85 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl px-3.5 py-1.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Left: Compact Operator Badge & Active Target */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-white/10 text-xs shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white tracking-wide">@{operatorName}</span>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase">[{currentUser?.role || 'Admin'}]</span>
              </div>

              {currentProject && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-zinc-300 font-bold max-w-[140px] truncate">{currentProject.name}</span>
                </div>
              )}
            </div>

            {/* Middle: Compact Segmented Navigation */}
            <nav className="flex items-center gap-1 text-xs overflow-x-auto py-0.5">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-zinc-800 text-emerald-400 font-bold shadow-sm ring-1 ring-emerald-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('terminal')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'terminal'
                    ? 'bg-emerald-950/90 text-emerald-300 font-bold shadow-sm ring-1 ring-emerald-500/60'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Terminal</span>
              </button>

              <button
                onClick={() => setActiveTab('flowchart')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'flowchart'
                    ? 'bg-zinc-800 text-emerald-300 font-bold shadow-sm ring-1 ring-emerald-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Playbook</span>
              </button>

              <button
                onClick={() => setActiveTab('workbench')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'workbench'
                    ? 'bg-zinc-800 text-cyan-300 font-bold shadow-sm ring-1 ring-cyan-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Live</span>
              </button>

              <button
                onClick={() => setActiveTab('graph')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'graph'
                    ? 'bg-zinc-800 text-purple-300 font-bold shadow-sm ring-1 ring-purple-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Grafo</span>
              </button>

              <button
                onClick={() => setActiveTab('assets')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'assets'
                    ? 'bg-zinc-800 text-amber-300 font-bold shadow-sm ring-1 ring-amber-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Ativos ({totalAssets})</span>
              </button>

              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'pipeline'
                    ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm ring-1 ring-zinc-700'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Pipeline</span>
              </button>

              <button
                onClick={() => setActiveTab('drive')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'drive'
                    ? 'bg-blue-950/80 border border-blue-500/60 text-blue-300 font-bold shadow-sm'
                    : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Vault 5TB</span>
              </button>
            </nav>

            {/* Right: Quick Stats, Theme Switcher & Settings/Logout */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Threat Dots */}
              <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Hosts Vivos" />
                <span className="text-zinc-300 text-[11px] font-bold mr-1">{aliveCount}</span>
                {vulnCount > 0 && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-1" title="Vulnerabilidades" />
                    <span className="text-rose-400 text-[11px] font-bold">{vulnCount}</span>
                  </>
                )}
                {takeoverCount > 0 && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse ml-1" title="Takeover Risk" />
                    <span className="text-purple-300 text-[11px] font-bold">{takeoverCount}</span>
                  </>
                )}
              </div>

              {/* Theme Switcher */}
              <ThemeSelector />

              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                  title="Configurações"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 🔼 STATE B: EXPANDED FULL HEADER AT TOP OF PAGE */
        /* ======================================================== */
        <div className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-2xl shadow-xl">
          {/* Top Bar: Operator Badge, Squad Status, Theme Selector & Actions */}
          <div className="w-full px-3 sm:px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-emerald-400 shadow-md">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-100 tracking-wide">
                      @{operatorName}
                    </span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-bold">
                      RECON NEXUS v4.0
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans">Enterprise Threat Intelligence & Cryptographic Vault (5TB)</p>
                </div>
              </div>

              {/* Squad Status Pills */}
              <div className="hidden lg:flex items-center pl-3 border-l border-zinc-800 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <strong className="text-red-400">RED:</strong> RedTeam
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <strong className="text-cyan-400">BLUE:</strong> Correlator
                </div>
                <button 
                  onClick={onOpenTdd}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
                  title="Abrir Centro de Testes TDD"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <strong className="text-emerald-400">TDD:</strong> 100%
                </button>
              </div>
            </div>

            {/* Target Selector, Access Code, Theme Switcher & User Profile */}
            <div className="flex items-center gap-2">
              {/* Multi-Theme Engine Selector */}
              <ThemeSelector />

              {currentProject ? (
                <>
                  {/* Active Access Code Badge */}
                  <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-amber-800/80 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 shadow-inner">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] text-amber-500 uppercase font-bold hidden sm:inline">Código:</span>
                    <span className="font-bold tracking-wider">{currentProject.accessCode}</span>
                    <button
                      onClick={handleCopyAccessCode}
                      className="ml-0.5 text-zinc-400 hover:text-amber-200 transition-colors cursor-pointer"
                      title="Copiar Código de Acesso Único"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Target Indicator */}
                  <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                    <span className="text-zinc-400 text-[10px] font-bold hidden sm:inline">ALVO:</span>
                    <span className="text-emerald-400 font-bold max-w-[120px] truncate" title={currentProject.domain}>
                      {currentProject.domain}
                    </span>
                    <button
                      onClick={onOpenProjectManager}
                      className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-lg transition-colors cursor-pointer ml-1"
                      title="Gerenciar Empresas e Chaves"
                    >
                      Empresas
                    </button>
                  </div>

                  {/* Lock / Switch Button */}
                  <button
                    onClick={onLockBounty}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-950/50 hover:bg-red-900/60 border border-red-800/80 rounded-xl text-red-300 text-xs transition-colors cursor-pointer shadow-sm active:scale-[0.98]"
                    title="Bloquear sessão e trocar de empresa"
                  >
                    <Lock className="w-3.5 h-3.5 text-red-400" />
                    <span className="hidden sm:inline">Bloquear</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={onOpenProjectManager}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer active:scale-[0.98]"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Selecionar Empresa</span>
                </button>
              )}

              <button
                onClick={onOpenProgramIngestion}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-bold rounded-xl text-xs transition-all shadow-lg cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nova Empresa</span>
              </button>

              {/* User Settings & Logout */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
                {currentUser && onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 transition-colors cursor-pointer"
                    title="Configurações da Conta"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-zinc-200 hidden md:inline">{currentUser.username}</span>
                    <Settings className="w-3 h-3 text-zinc-400 ml-0.5" />
                  </button>
                )}

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 hover:border-red-700 text-red-300 hover:text-red-200 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                    title="Sair do Sistema"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sair</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Navigation Tabs & Metric Strip */}
          <div className="w-full px-3 sm:px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-4">
            <nav className="flex items-center gap-1 text-xs overflow-x-auto py-0.5">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm ring-1 ring-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Power BI Dashboard
              </button>

              <button
                onClick={() => setActiveTab('terminal')}
                className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
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
                className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'flowchart'
                    ? 'bg-zinc-800 text-emerald-300 font-bold shadow-sm ring-1 ring-emerald-500/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                Fluxograma & Playbook
              </button>

              <button
                onClick={() => setActiveTab('workbench')}
                className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'workbench'
                    ? 'bg-zinc-800 text-cyan-300 font-bold shadow-sm ring-1 ring-cyan-500/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Workbench Ao Vivo
              </button>

              <button
                onClick={() => setActiveTab('graph')}
                className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'graph'
                    ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm ring-1 ring-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                Grafo Interativo
              </button>

              <button
                onClick={() => setActiveTab('assets')}
                className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'assets'
                    ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm ring-1 ring-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Ativos ({totalAssets})
              </button>

              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'pipeline'
                    ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm ring-1 ring-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                Orquestrador CLI
              </button>

              <button
                onClick={() => setActiveTab('drive')}
                className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'drive'
                    ? 'bg-blue-950/80 border border-blue-500/70 text-blue-300 font-bold shadow-sm'
                    : 'text-blue-400 hover:text-blue-300 hover:bg-blue-950/30'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                <span>Google Drive (5TB)</span>
              </button>
            </nav>

            {/* Quick Metrics & Actions */}
            <div className="flex items-center gap-2 text-xs">
              <div className="px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-zinc-300">
                <span className="text-zinc-500">Vivos:</span> <strong className="text-emerald-400">{aliveCount}</strong>/{totalAssets}
              </div>

              <div className="px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-zinc-300">
                <span className="text-zinc-500">Vulns:</span> <strong className={vulnCount > 0 ? 'text-red-400' : 'text-zinc-300'}>{vulnCount}</strong>
              </div>

              {takeoverCount > 0 && (
                <div className="px-3 py-1.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 animate-pulse">
                  <span>Takeovers:</span> <strong>{takeoverCount}</strong>
                </div>
              )}

              <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
                <button
                  onClick={onOpenScope}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 rounded-xl text-amber-300 text-xs transition-colors cursor-pointer active:scale-[0.98]"
                  title="Regras de Escopo"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Escopo</span>
                </button>

                <button
                  onClick={onOpenAiTriage}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-700/60 rounded-xl text-purple-200 text-xs transition-colors cursor-pointer active:scale-[0.98]"
                  title="AI Triage"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Triage</span>
                </button>

                <button
                  onClick={onOpenIngestion}
                  className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-200 text-xs transition-colors cursor-pointer active:scale-[0.98]"
                  title="Ingerir dados de ferramentas"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Importar RAW</span>
                </button>

                <button
                  onClick={onOpenExport}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 transition-colors cursor-pointer active:scale-[0.98]"
                  title="Exportar Relatório e Superfície"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
