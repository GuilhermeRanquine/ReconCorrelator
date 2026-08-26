'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TargetProject, CorrelatedAsset, Vulnerability, ReconFlowStep } from '@/types/recon';
import { Header, ReconTab } from '@/components/Header';
import { AttackGraph } from '@/components/AttackGraph';
import { AssetsTable } from '@/components/AssetsTable';
import { PipelineRunner } from '@/components/PipelineRunner';
import { TddTestCenter } from '@/components/TddTestCenter';
import { ReconFlowchart } from '@/components/ReconFlowchart';
import { LiveReconWorkbench } from '@/components/LiveReconWorkbench';
import { TerminalArsenal } from '@/components/TerminalArsenal';
import { GoogleDriveHub } from '@/components/GoogleDriveHub';
import { ProgramIngestionModal } from '@/components/ProgramIngestionModal';
import { DataIngestionModal } from '@/components/DataIngestionModal';
import { ScopeManagerModal } from '@/components/ScopeManagerModal';
import { AiTriagerModal } from '@/components/AiTriagerModal';
import { ExportModal } from '@/components/ExportModal';
import { ProjectManagerModal } from '@/components/ProjectManagerModal';

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
  AlertTriangle,
  Globe,
  Server,
  Layers,
  ArrowUpRight,
  Flame,
  Zap,
  GitBranch,
  Search,
  Trash2,
  Play,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  HardDrive,
  FolderKanban,
  Check,
  Copy,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();

  // Authentication State
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Projects & Active Bounty State
  const [projects, setProjects] = useState<TargetProject[]>([]);
  const [currentProject, setCurrentProject] = useState<TargetProject | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [accessCodeInput, setAccessCodeInput] = useState<string>('');
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);

  const [assets, setAssets] = useState<CorrelatedAsset[]>([]);
  const [activeTab, setActiveTab] = useState<ReconTab>('dashboard');
  const [isDbSyncing, setIsDbSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'error'>('syncing');

  // Modals
  const [isProgramIngestionOpen, setIsProgramIngestionOpen] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isIngestionOpen, setIsIngestionOpen] = useState(false);
  const [isScopeOpen, setIsScopeOpen] = useState(false);
  const [isAiTriageOpen, setIsAiTriageOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedAssetForAi, setSelectedAssetForAi] = useState<CorrelatedAsset | null>(null);

  // -------------------------------------------------------------
  // 🔐 1. AUTH GUARD & SESSION CHECK
  // -------------------------------------------------------------
  useEffect(() => {
    async function verifySessionAndLoadData() {
      try {
        setIsAuthChecking(true);
        const res = await fetch('/api/auth/session');
        if (!res.ok) {
          router.replace('/login');
          return;
        }

        const data = await res.json();
        if (!data.authenticated || !data.user) {
          router.replace('/login');
          return;
        }

        setCurrentUser(data.user);
        setCsrfToken(data.csrfToken || null);
        await loadProjectsFromDatabase();
      } catch (err) {
        console.error('Auth verification failure:', err);
        router.replace('/login');
      } finally {
        setIsAuthChecking(false);
      }
    }

    verifySessionAndLoadData();
  }, [router]);

  // -------------------------------------------------------------
  // 🚪 2. SECURE LOGOUT HANDLER
  // -------------------------------------------------------------
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUser(null);
      router.replace('/login');
    }
  };

  // -------------------------------------------------------------
  // 📦 3. LOAD PROJECTS & ASSETS FROM DATABASE
  // -------------------------------------------------------------
  const loadProjectsFromDatabase = async () => {
    try {
      setIsDbSyncing(true);
      setDbStatus('syncing');
      const res = await fetch('/api/db/sync');
      if (res.ok) {
        const data = await res.json();
        if (data.projects && data.projects.length > 0) {
          setProjects(data.projects);
          if (!currentProject) {
            const first = data.projects[0];
            setCurrentProject(first);
            setIsUnlocked(false);
            setAssets([]);
          }
        }
        setDbStatus('connected');
      } else {
        setDbStatus('error');
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setDbStatus('error');
    } finally {
      setIsDbSyncing(false);
    }
  };

  const handleUnlockBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;

    setAccessCodeError(null);
    const entered = accessCodeInput.trim().toUpperCase();

    if (entered === currentProject.accessCode.toUpperCase()) {
      setIsUnlocked(true);
      setAccessCodeInput('');
      await syncProjectData(currentProject.id, entered);
    } else {
      setAccessCodeError('Código de Acesso inválido para este programa de Bug Bounty.');
    }
  };

  const syncProjectData = async (targetId: string, accessCode?: string) => {
    try {
      setIsDbSyncing(true);
      const url = new URL('/api/db/sync', window.location.origin);
      url.searchParams.set('targetId', targetId);
      if (accessCode) {
        url.searchParams.set('accessCode', accessCode);
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.assets) {
          setAssets(data.assets);
        }
      }
    } catch (err) {
      console.error('Error syncing project data:', err);
    } finally {
      setIsDbSyncing(false);
    }
  };

  const handleSelectProject = (p: TargetProject) => {
    setCurrentProject(p);
    setIsUnlocked(false);
    setAssets([]);
    setAccessCodeError(null);
    setAccessCodeInput('');
  };

  const handleLockBounty = () => {
    setIsUnlocked(false);
    setAssets([]);
  };

  const handleAssetsDiscovered = async (newAssets: Partial<CorrelatedAsset>[]) => {
    if (!currentProject) return;

    const merged = [...assets];
    newAssets.forEach(newItem => {
      if (!newItem.subdomain) return;
      const idx = merged.findIndex(a => a.subdomain === newItem.subdomain);
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...newItem } as CorrelatedAsset;
      } else {
        merged.push({
          id: newItem.id || `asset-${newItem.subdomain.replace(/[^a-z0-9]/g, '-')}`,
          subdomain: newItem.subdomain,
          rootDomain: currentProject.domain,
          isAlive: newItem.isAlive ?? false,
          cnames: newItem.cnames || [],
          ips: newItem.ips || [],
          ports: newItem.ports || [],
          technologies: newItem.technologies || [],
          vulnerabilities: newItem.vulnerabilities || [],
          discoveredVia: newItem.discoveredVia || 'manual',
          ...newItem,
        } as CorrelatedAsset);
      }
    });

    setAssets(merged);

    try {
      await fetch('/api/recon/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          rootDomain: currentProject.domain,
          assets: merged,
        }),
      });
    } catch (err) {
      console.error('Failed to persist assets to db:', err);
    }
  };

  const handleAddVulnerability = async (vuln: Vulnerability) => {
    const updated = assets.map(a => {
      if (a.subdomain === vuln.matchedAt) {
        return {
          ...a,
          vulnerabilities: [...a.vulnerabilities, vuln],
        };
      }
      return a;
    });
    setAssets(updated);
  };

  const handleOpenAiForAsset = (asset: CorrelatedAsset) => {
    setSelectedAssetForAi(asset);
    setIsAiTriageOpen(true);
  };

  const handleProgramCreated = (newProject: TargetProject) => {
    setProjects(prev => [newProject, ...prev]);
    setCurrentProject(newProject);
    setIsUnlocked(true);
    setAssets([]);
    setIsProgramIngestionOpen(false);
  };

  const handleCreateNewProject = (newProj: TargetProject) => {
    setProjects(prev => [newProj, ...prev]);
    setCurrentProject(newProj);
    setIsUnlocked(true);
    setAssets([]);
    setIsProjectManagerOpen(false);
  };

  const handleDeleteProject = (projectId: string) => {
    const filtered = projects.filter(p => p.id !== projectId);
    setProjects(filtered);
    if (currentProject?.id === projectId) {
      if (filtered.length > 0) {
        setCurrentProject(filtered[0]);
        setIsUnlocked(false);
        setAssets([]);
      } else {
        setCurrentProject(null);
        setAssets([]);
      }
    }
  };

  const handleUpdateScope = (updated: TargetProject) => {
    setCurrentProject(updated);
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    setIsScopeOpen(false);
  };

  const handleIngestSuccess = (importedAssets: CorrelatedAsset[]) => {
    handleAssetsDiscovered(importedAssets);
    setIsIngestionOpen(false);
  };

  const handleExecuteAutomationFromStep = (action: string, step: ReconFlowStep) => {
    setActiveTab('workbench');
  };

  // Metrics
  const totalAssets = assets.length;
  const aliveCount = assets.filter(a => a.isAlive).length;
  const vulnCount = assets.reduce((acc, a) => acc + (a.vulnerabilities?.length || 0), 0);
  const takeoverCount = assets.filter(a => a.takeoverRisk).length;

  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center font-mono text-zinc-400 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
          <span>Verificando credenciais e inicializando Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Header with Navigation & User Session */}
      <Header
        currentProject={currentProject}
        projects={projects}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSelectProject={handleSelectProject}
        onLockBounty={handleLockBounty}
        onOpenIngestion={() => setIsIngestionOpen(true)}
        onOpenProgramIngestion={() => setIsProgramIngestionOpen(true)}
        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
        onOpenScope={() => setIsScopeOpen(true)}
        onOpenTdd={() => setActiveTab('tdd')}
        onOpenAiTriage={() => setIsAiTriageOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onNewScan={() => setActiveTab('workbench')}
        totalAssets={totalAssets}
        aliveCount={aliveCount}
        vulnCount={vulnCount}
        takeoverCount={takeoverCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        researcherHandle={currentUser?.username || 'ranquine'}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {!currentProject ? (
          /* Empty State: No Target Selected */
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center max-w-2xl mx-auto my-12 backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
              <FolderKanban className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">Nenhum Programa Selecionado</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Cadastre um novo programa de Bug Bounty via Briefing/Link de IA ou crie um projeto manualmente para começar a correlacionar ativos.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsProgramIngestionOpen(true)}
                className="py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-bold rounded-xl text-sm flex items-center gap-2 hover:from-emerald-400 hover:to-teal-300 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ingerir Programa com IA Gemini</span>
              </button>
              <button
                onClick={() => setIsProjectManagerOpen(true)}
                className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-sm transition-colors cursor-pointer border border-zinc-700"
              >
                <span>Criar Manualmente</span>
              </button>
            </div>
          </div>
        ) : !isUnlocked ? (
          /* Access Code Shield Lock Gate */
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-8 sm:p-12 text-center max-w-lg mx-auto my-12 backdrop-blur-2xl shadow-2xl relative overflow-hidden font-mono">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500" />
            
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
              <Lock className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-zinc-100 mb-1 font-sans">
              Programa Bloqueado por Segurança
            </h2>
            <p className="text-xs text-zinc-400 mb-6 font-sans">
              Insira o <span className="text-emerald-400 font-mono font-bold">Código Único de Acesso</span> para descriptografar os ativos do programa <strong className="text-zinc-200">{currentProject.name}</strong> ({currentProject.domain}).
            </p>

            <form onSubmit={handleUnlockBounty} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block pl-1">
                  Código de Acesso (Access Code)
                </label>
                <input
                  type="text"
                  value={accessCodeInput}
                  onChange={(e) => {
                    setAccessCodeInput(e.target.value);
                    setAccessCodeError(null);
                  }}
                  placeholder={`Ex: ${currentProject.accessCode}`}
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl py-3 px-4 text-center text-sm font-mono tracking-widest text-emerald-400 placeholder-zinc-700 outline-none uppercase font-bold"
                  autoFocus
                />
              </div>

              {accessCodeError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{accessCodeError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Unlock className="w-4 h-4" />
                <span>Desbloquear e Carregar Ativos</span>
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Código registrado: <code className="text-zinc-400 font-bold">{currentProject.accessCode}</code></span>
              <button
                onClick={() => setIsProjectManagerOpen(true)}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                Trocar Alvo
              </button>
            </div>
          </div>
        ) : (
          /* Active Bounty Unlocked Experience */
          <div className="space-y-6">
            {/* Tab 1: Dashboard Overview */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Bounty Status Banner */}
                <div className="rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/80 via-zinc-950/90 to-zinc-900/60 p-6 backdrop-blur-2xl shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                          Programa Desbloqueado & Ativo
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-zinc-100 tracking-tight flex items-center gap-2">
                        <span>{currentProject.name}</span>
                        <span className="text-xs font-mono text-zinc-400 font-normal px-2.5 py-0.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60">
                          {currentProject.domain}
                        </span>
                      </h2>
                      {currentProject.description && (
                        <p className="text-xs text-zinc-400 max-w-2xl font-sans">
                          {currentProject.description}
                        </p>
                      )}
                    </div>

                    {/* Quick Launch Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('terminal')}
                        className="py-2 px-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer border border-zinc-700"
                      >
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Arsenal Linux</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('workbench')}
                        className="py-2 px-3.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer border border-emerald-500/30"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Live Workbench</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                      <span className="text-[11px] text-zinc-500 uppercase font-mono font-semibold">Total de Ativos</span>
                      <div className="text-2xl font-mono font-bold text-zinc-100">{totalAssets}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                      <span className="text-[11px] text-zinc-500 uppercase font-mono font-semibold">Hosts Ativos</span>
                      <div className="text-2xl font-mono font-bold text-emerald-400">{aliveCount}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                      <span className="text-[11px] text-zinc-500 uppercase font-mono font-semibold">Vulnerabilidades</span>
                      <div className="text-2xl font-mono font-bold text-red-400">{vulnCount}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                      <span className="text-[11px] text-zinc-500 uppercase font-mono font-semibold">Riscos Subdomain</span>
                      <div className="text-2xl font-mono font-bold text-amber-400">{takeoverCount}</div>
                    </div>
                  </div>
                </div>

                {/* Main Graph Preview */}
                <div className="space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-sans">
                        Grafo Interativo de Ataque
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('graph')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Expandir Grafo</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="h-[480px] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
                    <AttackGraph
                      assets={assets}
                      rootDomain={currentProject.domain}
                      onSelectAsset={handleOpenAiForAsset}
                    />
                  </div>
                </div>

                {/* Assets Table Preview */}
                <div className="space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-sans">
                        Tabela de Ativos & Superfície ({assets.length})
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('assets')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Tabela Completa</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <AssetsTable
                    assets={assets}
                    onOpenAiForAsset={handleOpenAiForAsset}
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Attack Graph */}
            {activeTab === 'graph' && (
              <div className="space-y-4">
                <div className="h-[760px] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
                  <AttackGraph
                    assets={assets}
                    rootDomain={currentProject.domain}
                    onSelectAsset={handleOpenAiForAsset}
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Assets Table */}
            {activeTab === 'assets' && (
              <div className="space-y-4">
                <AssetsTable
                  assets={assets}
                  onOpenAiForAsset={handleOpenAiForAsset}
                />
              </div>
            )}

            {/* Tab 4: Terminal Arsenal Red Team */}
            {activeTab === 'terminal' && (
              <div className="space-y-4">
                <TerminalArsenal
                  target={currentProject}
                  assets={assets}
                  onAssetsDiscovered={handleAssetsDiscovered}
                  onAddVulnerability={handleAddVulnerability}
                  onSelectProject={handleSelectProject}
                  onSwitchTab={setActiveTab}
                />
              </div>
            )}

            {/* Tab 5: Live Recon Workbench */}
            {activeTab === 'workbench' && (
              <div className="space-y-4">
                <LiveReconWorkbench
                  target={currentProject}
                  onAssetsDiscovered={handleAssetsDiscovered}
                  onAddVulnerability={handleAddVulnerability}
                />
              </div>
            )}

            {/* Tab 6: Recon Flowchart & Playbook */}
            {activeTab === 'flowchart' && (
              <div className="space-y-4">
                <ReconFlowchart
                  target={currentProject}
                  onExecuteAutomation={handleExecuteAutomationFromStep}
                />
              </div>
            )}

            {/* Tab 7: Pipeline Runner */}
            {activeTab === 'pipeline' && (
              <div className="space-y-4">
                <PipelineRunner
                  target={currentProject}
                  onJobFinished={(discovered) => handleAssetsDiscovered(discovered)}
                />
              </div>
            )}

            {/* Tab 8: Google Drive Vault */}
            {activeTab === 'drive' && (
              <div className="space-y-4">
                <GoogleDriveHub
                  target={currentProject}
                  assets={assets}
                  onImportRawData={(rawText) => {
                    setIsIngestionOpen(true);
                  }}
                />
              </div>
            )}

            {/* Tab 9: TDD Test Center */}
            {activeTab === 'tdd' && (
              <div className="space-y-4">
                <TddTestCenter />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {isProgramIngestionOpen && (
        <ProgramIngestionModal
          isOpen={isProgramIngestionOpen}
          onClose={() => setIsProgramIngestionOpen(false)}
          onProgramCreated={handleProgramCreated}
        />
      )}

      {isProjectManagerOpen && (
        <ProjectManagerModal
          isOpen={isProjectManagerOpen}
          onClose={() => setIsProjectManagerOpen(false)}
          projects={projects}
          currentProject={currentProject}
          onSelectProject={(p) => {
            handleSelectProject(p);
            setIsProjectManagerOpen(false);
          }}
          onCreateNewProject={handleCreateNewProject}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {isIngestionOpen && currentProject && (
        <DataIngestionModal
          isOpen={isIngestionOpen}
          onClose={() => setIsIngestionOpen(false)}
          onIngestSuccess={handleIngestSuccess}
          target={currentProject}
        />
      )}

      {isScopeOpen && currentProject && (
        <ScopeManagerModal
          isOpen={isScopeOpen}
          onClose={() => setIsScopeOpen(false)}
          target={currentProject}
          onUpdateScope={handleUpdateScope}
        />
      )}

      {isAiTriageOpen && currentProject && (
        <AiTriagerModal
          isOpen={isAiTriageOpen}
          onClose={() => setIsAiTriageOpen(false)}
          target={currentProject}
          selectedAsset={selectedAssetForAi}
          allAssets={assets}
        />
      )}

      {isExportOpen && currentProject && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          assets={assets}
          target={currentProject}
        />
      )}
    </div>
  );
}
