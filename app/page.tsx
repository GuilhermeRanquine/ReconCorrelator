'use client';

import React, { useState, useEffect } from 'react';
import { TargetProject, CorrelatedAsset, Vulnerability, ReconFlowStep } from '@/types/recon';
import { Header, ReconTab } from '@/components/Header';
import { LoginScreen } from '@/components/LoginScreen';
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

export default function ReconCorrelatorApp() {
  // Authentication State
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
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
  // 🔐 1. SESSION VERIFICATION & BOOTSTRAP
  // -------------------------------------------------------------
  useEffect(() => {
    async function checkAuthSession() {
      try {
        setIsAuthChecking(true);
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setIsAuthenticated(true);
            setCurrentUser(data.user);
            setCsrfToken(data.csrfToken || null);
            // Load projects once authenticated
            await loadProjectsFromDatabase();
          } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (err) {
        console.warn('Session verification error:', err);
        setIsAuthenticated(false);
      } finally {
        setIsAuthChecking(false);
      }
    }

    checkAuthSession();
  }, []);

  // -------------------------------------------------------------
  // 📁 2. DATABASE PROJECTS LOADER
  // -------------------------------------------------------------
  const loadProjectsFromDatabase = async () => {
    try {
      setIsDbSyncing(true);
      setDbStatus('syncing');
      const res = await fetch('/api/db/projects');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
        setDbStatus('connected');
      }
    } catch (e) {
      console.warn('Backend DB sync warning:', e);
      setDbStatus('error');
    } finally {
      setIsDbSyncing(false);
    }
  };

  // -------------------------------------------------------------
  // 🔑 3. LOGIN & LOGOUT HANDLERS
  // -------------------------------------------------------------
  const handleLoginSuccess = async (
    user: { id: string; username: string; role: string },
    newCsrfToken?: string
  ) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCsrfToken(newCsrfToken || null);
    await loadProjectsFromDatabase();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentProject(null);
    setIsUnlocked(false);
    setAssets([]);
    setAccessCodeInput('');
  };

  // -------------------------------------------------------------
  // 🔓 4. UNLOCK BOUNTY VIA UNIQUE ACCESS CODE
  // -------------------------------------------------------------
  const handleUnlockWithCode = async (codeToTest?: string) => {
    const rawCode = (codeToTest || accessCodeInput).trim().toUpperCase();
    if (!rawCode) {
      setAccessCodeError('Por favor, informe o Código Único de Acesso.');
      return;
    }

    setAccessCodeError(null);
    setIsDbSyncing(true);

    try {
      // Find matching project in current state or query DB
      let matched = projects.find(p => p.accessCode?.toUpperCase() === rawCode);
      
      if (!matched) {
        const res = await fetch(`/api/db/projects?accessCode=${encodeURIComponent(rawCode)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.project) {
            matched = data.project;
          }
        }
      }

      if (!matched) {
        setAccessCodeError('Código de Acesso incorreto ou não encontrado. Verifique e tente novamente.');
        setIsDbSyncing(false);
        return;
      }

      // Unlock and load strictly that project's assets
      setCurrentProject(matched);
      setIsUnlocked(true);
      setAccessCodeInput('');
      setAccessCodeError(null);

      // Fetch assets strictly for this project
      const assetsRes = await fetch(`/api/db/assets?projectId=${encodeURIComponent(matched.id)}&rootDomain=${encodeURIComponent(matched.domain)}`);
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        if (assetsData.success && Array.isArray(assetsData.assets)) {
          setAssets(assetsData.assets);
        } else {
          setAssets([]);
        }
      } else {
        setAssets([]);
      }
    } catch (err: any) {
      console.error('Error unlocking bounty with code:', err);
      setAccessCodeError('Erro ao validar código no servidor.');
    } finally {
      setIsDbSyncing(false);
    }
  };

  // Lock session and return to access portal
  const handleLockBounty = () => {
    setIsUnlocked(false);
    setCurrentProject(null);
    setAssets([]); // Clean in-memory workspace
    setAccessCodeInput('');
    setAccessCodeError(null);
  };

  // Switch project and load strictly its assets
  const handleSelectProject = async (proj: TargetProject) => {
    setCurrentProject(proj);
    setIsUnlocked(true);
    setAssets([]); // Wipe previous bounty in memory immediately

    try {
      setIsDbSyncing(true);
      const res = await fetch(`/api/db/assets?projectId=${encodeURIComponent(proj.id)}&rootDomain=${encodeURIComponent(proj.domain)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.assets)) {
          setAssets(data.assets);
        }
      }
    } catch (e) {
      console.warn('Error fetching project assets from DB:', e);
    } finally {
      setIsDbSyncing(false);
    }
  };

  // Statistics for active isolated bounty
  const totalAssets = assets.length;
  const aliveCount = assets.filter(a => a.isAlive).length;
  const allVulns = assets.flatMap(a => a.vulnerabilities || []);
  const vulnCount = allVulns.length;
  const criticalVulns = allVulns.filter(v => v.severity === 'critical' || v.severity === 'high').length;
  const takeoverCount = assets.filter(a => a.takeoverRisk).length;
  const totalPorts = assets.reduce((acc, a) => acc + (a.ports ? a.ports.length : 0), 0);

  const handleOpenAiForAsset = (asset: CorrelatedAsset) => {
    setSelectedAssetForAi(asset);
    setIsAiTriageOpen(true);
  };

  const handleIngestSuccess = async (newAssets: CorrelatedAsset[]) => {
    await handleAssetsDiscovered(newAssets);
  };

  const handleUpdateScope = async (updatedTarget: TargetProject) => {
    setCurrentProject(updatedTarget);
    setProjects(prev => prev.map(p => p.id === updatedTarget.id ? updatedTarget : p));
    try {
      await fetch('/api/db/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTarget),
      });
    } catch (e) {
      console.error('Failed to save project scope to DB:', e);
    }
  };

  const handleProgramCreated = async (newProject: TargetProject) => {
    setProjects(prev => [newProject, ...prev.filter(p => p.id !== newProject.id)]);
    setCurrentProject(newProject);
    setIsUnlocked(true);
    setAssets([]); // Clean slate for new target
    setActiveTab('flowchart');

    try {
      await fetch('/api/db/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
    } catch (e) {
      console.error('Failed to create program in DB:', e);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const remaining = projects.filter(p => p.id !== projectId);
    try {
      await fetch(`/api/db/projects?id=${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete project from DB:', e);
    }

    setProjects(remaining);
    if (currentProject?.id === projectId) {
      handleLockBounty();
    }
  };

  const handleCreateNewProject = async (newProj: TargetProject) => {
    setProjects(prev => [newProj, ...prev]);
    setCurrentProject(newProj);
    setIsUnlocked(true);
    setAssets([]);
    setActiveTab('dashboard');

    try {
      await fetch('/api/db/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProj),
      });
    } catch (e) {
      console.error('Failed to save project:', e);
    }
  };

  const handleClearWorkspace = async () => {
    if (!currentProject) return;
    setAssets([]);
    try {
      await fetch(`/api/db/assets?projectId=${encodeURIComponent(currentProject.id)}&rootDomain=${encodeURIComponent(currentProject.domain)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to clear assets in DB:', e);
    }
  };

  // Merge & Persist discovered assets into Backend Database (strictly tagged with projectId)
  const handleAssetsDiscovered = async (newStubs: Partial<CorrelatedAsset>[]) => {
    if (!newStubs || newStubs.length === 0 || !currentProject) return;

    // Optimistic merge in memory
    setAssets(prev => {
      const mergedMap = new Map<string, CorrelatedAsset>();
      for (const a of prev) {
        mergedMap.set(a.subdomain.toLowerCase(), a);
      }

      for (const stub of newStubs) {
        if (!stub.subdomain) continue;
        const key = stub.subdomain.toLowerCase();
        const existing = mergedMap.get(key);

        if (existing) {
          mergedMap.set(key, {
            ...existing,
            projectId: currentProject.id,
            isAlive: stub.isAlive ?? existing.isAlive,
            httpStatus: stub.httpStatus ?? existing.httpStatus,
            httpTitle: stub.httpTitle ?? existing.httpTitle,
            webServer: stub.webServer ?? existing.webServer,
            contentType: stub.contentType ?? existing.contentType,
            contentLength: stub.contentLength ?? existing.contentLength,
            ips: Array.from(new Set([...(existing.ips || []), ...(stub.ips || [])])),
            cnames: Array.from(new Set([...(existing.cnames || []), ...(stub.cnames || [])])),
            ports: [...(existing.ports || []), ...(stub.ports || [])],
            technologies: [...(existing.technologies || []), ...(stub.technologies || [])],
            tags: Array.from(new Set([...(existing.tags || []), ...(stub.tags || [])])),
            takeoverRisk: stub.takeoverRisk ?? existing.takeoverRisk,
            takeoverDetails: stub.takeoverDetails ?? existing.takeoverDetails,
            lastUpdated: new Date().toISOString(),
          });
        } else {
          mergedMap.set(key, {
            id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            projectId: currentProject.id,
            subdomain: stub.subdomain,
            rootDomain: stub.rootDomain || currentProject.domain,
            isAlive: stub.isAlive ?? false,
            httpStatus: stub.httpStatus,
            httpTitle: stub.httpTitle,
            webServer: stub.webServer,
            contentType: stub.contentType,
            contentLength: stub.contentLength,
            cnames: stub.cnames || [],
            ips: stub.ips || [],
            ports: stub.ports || [],
            technologies: stub.technologies || [],
            vulnerabilities: stub.vulnerabilities || [],
            takeoverRisk: stub.takeoverRisk ?? false,
            takeoverDetails: stub.takeoverDetails,
            firstSeen: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            inScope: true,
            tags: stub.tags || ['live-discovery'],
            discoveredVia: stub.discoveredVia || 'manual',
          });
        }
      }
      return Array.from(mergedMap.values());
    });

    // Save directly to Backend Database API
    try {
      setIsDbSyncing(true);
      const res = await fetch('/api/db/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: newStubs,
          rootDomain: currentProject.domain,
          projectId: currentProject.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.assets)) {
          setAssets(data.assets);
        }
      }
    } catch (err) {
      console.error('Database asset persist error:', err);
    } finally {
      setIsDbSyncing(false);
    }
  };

  const handleAddVulnerability = async (vuln: Vulnerability) => {
    if (!currentProject) return;

    setAssets(prev => {
      return prev.map(a => {
        if (a.subdomain === vuln.matchedAt || vuln.matchedAt.includes(a.subdomain)) {
          return {
            ...a,
            vulnerabilities: [vuln, ...(a.vulnerabilities || []).filter(v => v.id !== vuln.id)],
          };
        }
        return a;
      });
    });

    // Persist to DB
    try {
      await fetch('/api/db/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: [
            {
              subdomain: vuln.matchedAt,
              rootDomain: currentProject.domain,
              projectId: currentProject.id,
              vulnerabilities: [vuln],
            },
          ],
          rootDomain: currentProject.domain,
          projectId: currentProject.id,
        }),
      });
    } catch (e) {
      console.error('Failed to persist vulnerability to DB:', e);
    }
  };

  const handleExecuteAutomationFromStep = (action: string, step: ReconFlowStep) => {
    setActiveTab('workbench');
  };

  // -------------------------------------------------------------
  // ⏳ AUTH LOADING SPLASH
  // -------------------------------------------------------------
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-mono text-zinc-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-xs tracking-wider uppercase font-bold text-zinc-300">
          Iniciando Recon Nexus Engine...
        </span>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 🔒 NOT AUTHENTICATED: RENDER LOGIN SCREEN
  // -------------------------------------------------------------
  if (!isAuthenticated || !currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // -------------------------------------------------------------
  // 🖥️ AUTHENTICATED: RENDER DASHBOARD & WORKSPACE
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black cyber-grid-bg relative">
      {/* Top Header with iOS style */}
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
        onOpenAiTriage={() => { setSelectedAssetForAi(null); setIsAiTriageOpen(true); }}
        onOpenExport={() => setIsExportOpen(true)}
        onNewScan={() => setActiveTab('pipeline')}
        totalAssets={totalAssets}
        aliveCount={aliveCount}
        vulnCount={vulnCount}
        takeoverCount={takeoverCount}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Database State & Target Indicator Bar */}
      <div className="max-w-7xl mx-auto px-4 pt-3 pb-1 flex items-center justify-between text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isDbSyncing ? 'bg-amber-400 animate-ping' : dbStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-zinc-300">
            {isDbSyncing ? 'Sincronizando Banco Relacional SQL...' : dbStatus === 'connected' ? 'Banco de Dados SQL Conectado & Isolado' : 'Erro de Conexão com SQL'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {currentProject ? (
            <>
              <span>Alvo Desbloqueado: <strong className="text-emerald-400">{currentProject.domain}</strong></span>
              <span>•</span>
              <span>Ativos Isolados no DB: <strong className="text-cyan-400">{totalAssets}</strong></span>
            </>
          ) : (
            <span className="text-amber-400 flex items-center gap-1 font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Sessão Bloqueada — Insira um Código de Acesso para carregar um Bounty</span>
            </span>
          )}
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* ======================================================== */}
        {/* 🔒 PORTAL DE ACESSO SEGURO AO BOUNTY (QUANDO NÃO DESBLOQUEADO) */}
        {/* ======================================================== */}
        {(!isUnlocked || !currentProject) ? (
          <div className="max-w-3xl mx-auto mt-6 space-y-6 font-mono">
            {projects.length === 0 ? (
              /* State 1: Zero Projects In DB (Pristine Clean Slate) */
              <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-zinc-800/80 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl backdrop-blur-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/40">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                
                <div className="space-y-2 max-w-lg mx-auto">
                  <h2 className="text-xl font-bold text-zinc-100 font-sans">Bem-vindo ao ReconCorrelator, {currentUser.username}</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Sua base de dados SQL está pronta e limpa. Cadastre um novo programa de Bug Bounty através de um link ou cole o briefing para iniciar a análise por IA.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsProgramIngestionOpen(true)}
                    className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98] text-black font-bold rounded-2xl text-xs flex items-center gap-2 cursor-pointer shadow-xl transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Ingerir Novo Bug Bounty (Link / Briefing com IA)</span>
                  </button>

                  <button
                    onClick={() => setIsProjectManagerOpen(true)}
                    className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] border border-zinc-700 text-zinc-200 font-bold rounded-2xl text-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Cadastrar Alvo Manualmente</span>
                  </button>
                </div>
              </div>
            ) : (
              /* State 2: Key Vault / Access Code Portal */
              <div className="bg-zinc-950/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl space-y-0 backdrop-blur-xl">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 border-b border-zinc-800 p-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-black border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-md">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-zinc-100 font-sans">Portal de Acesso Seguro ao Bug Bounty</h2>
                      <p className="text-xs text-zinc-400 font-sans">
                        Digite o código exclusivo para carregar <strong className="text-emerald-400">estritamente</strong> as informações daquele alvo
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-6 space-y-6">
                  <div className="space-y-2.5">
                    <label className="text-xs text-zinc-300 font-bold block">
                      Código Único de Acesso do Bounty (ex: BB-XXXX-XXXX):
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      <div className="relative w-full">
                        <Key className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Digite ou cole o código (ex: BB-A1B2-C3D4)..."
                          value={accessCodeInput}
                          onChange={(e) => {
                            setAccessCodeInput(e.target.value.toUpperCase());
                            setAccessCodeError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUnlockWithCode();
                          }}
                          className="w-full bg-black/80 border border-zinc-800 focus:border-amber-500 text-amber-300 font-mono text-sm uppercase px-4 py-3 pl-10 rounded-2xl focus:outline-none tracking-wider shadow-inner"
                        />
                      </div>
                      <button
                        onClick={() => handleUnlockWithCode()}
                        disabled={!accessCodeInput.trim() || isDbSyncing}
                        className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98] disabled:opacity-40 text-black font-bold rounded-2xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>Desbloquear Alvo</span>
                      </button>
                    </div>

                    {accessCodeError && (
                      <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{accessCodeError}</span>
                      </div>
                    )}
                  </div>

                  {/* Registered Bounties Quick List */}
                  <div className="pt-3 border-t border-zinc-900 space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Bounties Registrados no Banco SQL ({projects.length}):</span>
                      <button
                        onClick={() => setIsProgramIngestionOpen(true)}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Novo Bug Bounty</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto pr-1">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/90 hover:border-zinc-700 transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 transition-colors">
                              <Globe className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-100 text-xs font-sans">{p.name}</span>
                                <span className="text-[10px] text-emerald-400 font-mono font-bold">({p.domain})</span>
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                In-Scope: {p.inScope.length} regras • Criado em: {new Date(p.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUnlockWithCode(p.accessCode)}
                              className="px-3.5 py-2 bg-zinc-800 hover:bg-emerald-600 hover:text-black active:scale-[0.98] text-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-400" />
                              <span>Entrar</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* 🔓 ACTIVE WORKSPACE VIEW (QUANDO DESBLOQUEADO) */
          /* ======================================================== */
          <div>
            {/* Tab 1: Dashboard Overview */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Mission & Target Hero Card */}
                <div className="bg-gradient-to-r from-zinc-900/90 via-zinc-900/80 to-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono backdrop-blur-xl">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <h2 className="font-bold text-base text-zinc-100 font-sans">Superfície de Ataque Ativa: {currentProject.domain}</h2>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                        OPSEC ISOLATED
                      </span>
                      {currentProject.policy?.platform && (
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                          {currentProject.policy.platform}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-400 text-xs max-w-2xl leading-relaxed font-sans">
                      {currentProject.description}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-500 font-mono">
                      <span>In-Scope: <strong className="text-zinc-300">{currentProject.inScope.join(', ')}</strong></span>
                      <span>•</span>
                      <span>Out-of-Scope: <strong className="text-red-400">{currentProject.outOfScope.join(', ') || 'Nenhum'}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveTab('flowchart')}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-emerald-400 font-bold rounded-xl text-xs border border-zinc-700 transition-colors cursor-pointer"
                    >
                      <GitBranch className="w-4 h-4" />
                      <span>Ver Fluxograma de Recon</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('workbench')}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-cyan-300 font-bold rounded-xl text-xs border border-zinc-800 transition-colors cursor-pointer"
                    >
                      <Radio className="w-4 h-4" />
                      <span>Workbench Ao Vivo</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('drive')}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-950/60 hover:bg-blue-900/60 active:scale-[0.98] text-blue-300 font-bold rounded-xl text-xs border border-blue-800/80 transition-colors cursor-pointer"
                    >
                      <HardDrive className="w-4 h-4 text-blue-400" />
                      <span>Google Drive Vault</span>
                    </button>
                  </div>
                </div>

                {/* Metric KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
                  <div 
                    onClick={() => setActiveTab('assets')}
                    className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                      <span className="font-sans font-semibold">Subdomínios Isolados</span>
                      <Globe className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-bold text-zinc-100">{totalAssets}</div>
                    <span className="text-[11px] text-emerald-400 mt-1 block font-medium">{aliveCount} ativos respondendo HTTP</span>
                  </div>

                  <div 
                    onClick={() => setActiveTab('assets')}
                    className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                      <span className="font-sans font-semibold">Portas Mapeadas</span>
                      <Server className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-bold text-zinc-100">{totalPorts}</div>
                    <span className="text-[11px] text-zinc-400 mt-1 block font-sans">Serviços e portas mapeadas</span>
                  </div>

                  <div 
                    onClick={() => setActiveTab('assets')}
                    className={`bg-zinc-900/60 hover:bg-zinc-900 border rounded-2xl p-5 transition-all cursor-pointer group ${
                      vulnCount > 0 ? 'border-red-900/60 bg-red-950/20' : 'border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                      <span className="font-sans font-semibold">Vulnerabilidades</span>
                      <Flame className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-bold text-red-300">{vulnCount}</div>
                    <span className="text-[11px] text-red-400 mt-1 block font-bold">{criticalVulns} Críticas / Alto Impacto</span>
                  </div>

                  <div 
                    onClick={() => setActiveTab('assets')}
                    className={`bg-zinc-900/60 hover:bg-zinc-900 border rounded-2xl p-5 transition-all cursor-pointer group ${
                      takeoverCount > 0 ? 'border-amber-900/80 bg-amber-950/20 animate-pulse' : 'border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                      <span className="font-sans font-semibold">Takeovers Detectados</span>
                      <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl font-bold text-amber-300">{takeoverCount}</div>
                    <span className="text-[11px] text-amber-400 mt-1 block font-sans">CNAMEs órfãos candidatos</span>
                  </div>
                </div>

                {/* Empty State / Clean Workspace Helper */}
                {totalAssets === 0 ? (
                  <div className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-8 text-center space-y-4 font-mono backdrop-blur-xl">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mx-auto">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="text-base font-bold text-zinc-100 font-sans">Espaço de Trabalho Limpo para {currentProject.domain}</h3>
                      <p className="text-xs text-zinc-400 font-sans">
                        Nenhum dado falso carregado. Inicie o reconhecimento com ferramentas reais no terminal, execute o Workbench ao vivo ou importe arquivos RAW.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => setActiveTab('flowchart')}
                        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-black font-bold rounded-2xl text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                      >
                        <GitBranch className="w-4 h-4" />
                        <span>Abrir Fluxograma de Reconhecimento</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('workbench')}
                        className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 font-bold rounded-2xl text-xs flex items-center gap-2 border border-zinc-700 cursor-pointer"
                      >
                        <Radio className="w-4 h-4 text-cyan-400" />
                        <span>Disparar CRT.sh / DNS Ao Vivo</span>
                      </button>

                      <button
                        onClick={() => setIsIngestionOpen(true)}
                        className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-zinc-300 font-bold rounded-2xl text-xs flex items-center gap-2 border border-zinc-800 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>Importar Outputs de CLI (Subfinder/Httpx)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Interactive Attack Graph Preview Section */}
                    <div className="space-y-2 font-mono">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-sans">
                            Grafo de Correlação & Vetores de Ataque ({currentProject.domain})
                          </h3>
                        </div>
                        <button
                          onClick={() => setActiveTab('graph')}
                          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
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

                    {/* Live Discovered Assets Table Preview */}
                    <div className="space-y-2 font-mono">
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
                        onOpenAiTriage={handleOpenAiForAsset}
                      />
                    </div>
                  </>
                )}
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
                  onOpenAiTriage={handleOpenAiForAsset}
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
                  onAssetsImported={handleIngestSuccess}
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
          onUpdateTarget={handleUpdateScope}
          onClearWorkspace={handleClearWorkspace}
        />
      )}

      {isAiTriageOpen && currentProject && (
        <AiTriagerModal
          isOpen={isAiTriageOpen}
          onClose={() => setIsAiTriageOpen(false)}
          selectedAsset={selectedAssetForAi}
          allAssets={assets}
          targetDomain={currentProject.domain}
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
