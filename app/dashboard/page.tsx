'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TargetProject, CorrelatedAsset, Vulnerability, ReconFlowStep } from '@/types/recon';
import { Header, ReconTab } from '@/components/Header';
import { PowerBiDashboard } from '@/components/PowerBiDashboard';
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
import { AccountSettingsModal } from '@/components/AccountSettingsModal';

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
  Loader2,
  Building2
} from '@/lib/icons';

export default function DashboardPage() {
  const router = useRouter();

  // Authentication State
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Projects & Active Bounty State
  const [projects, setProjects] = useState<TargetProject[]>([]);
  const [currentProject, setCurrentProject] = useState<TargetProject | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(true);
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
  // 📦 3. LOAD PROJECTS & ALL ASSETS FROM DATABASE
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
            setCurrentProject(data.projects[0]);
          }
        }
        if (data.assets) {
          setAssets(data.assets);
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
      setAccessCodeError('Código de Acesso inválido para esta empresa/programa.');
    }
  };

  const syncProjectData = async (targetId?: string, accessCode?: string) => {
    try {
      setIsDbSyncing(true);
      const url = new URL('/api/db/sync', window.location.origin);
      if (targetId && targetId !== 'all') {
        url.searchParams.set('targetId', targetId);
      }
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

  const handleSelectProject = (p: TargetProject | null) => {
    setCurrentProject(p);
    if (p) {
      syncProjectData(p.id, p.accessCode);
    } else {
      syncProjectData('all');
    }
  };

  const handleLockBounty = () => {
    setIsUnlocked(false);
  };

  const handleAssetsDiscovered = async (newAssets: Partial<CorrelatedAsset>[]) => {
    const targetDomain = currentProject ? currentProject.domain : 'target.com';
    const targetId = currentProject ? currentProject.id : undefined;

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
          rootDomain: targetDomain,
          projectId: targetId,
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
          projectId: targetId,
          rootDomain: targetDomain,
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
          vulnerabilities: [...(a.vulnerabilities || []), vuln],
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
    setIsProgramIngestionOpen(false);
  };

  const handleCreateNewProject = (newProj: TargetProject) => {
    setProjects(prev => [newProj, ...prev]);
    setCurrentProject(newProj);
    setIsUnlocked(true);
    setIsProjectManagerOpen(false);
  };

  const handleDeleteProject = (projectId: string) => {
    const filtered = projects.filter(p => p.id !== projectId);
    setProjects(filtered);
    if (currentProject?.id === projectId) {
      if (filtered.length > 0) {
        setCurrentProject(filtered[0]);
      } else {
        setCurrentProject(null);
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
          <span>Verificando credenciais e inicializando Vault Criptografado...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] text-[var(--text-primary)] font-mono selection:bg-emerald-500 selection:text-black">
      {/* Dynamic Shrinking Header with Navigation & Themes */}
      <Header
        currentProject={currentProject}
        projects={projects}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectProject={(p) => handleSelectProject(p)}
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

      {/* Main Content Canvas (Edge-to-Edge Full Width) */}
      <main className="w-full px-3 sm:px-4 lg:px-6 py-4 space-y-6">
        {/* Tab 1: Executive Power BI Cyber Dashboard */}
        {activeTab === 'dashboard' && (
          <PowerBiDashboard
            projects={projects}
            currentProject={currentProject}
            assets={assets}
            onSelectProject={handleSelectProject}
            onOpenProjectManager={() => setIsProjectManagerOpen(true)}
            onOpenIngestion={() => setIsIngestionOpen(true)}
            onNewScan={() => setActiveTab('workbench')}
            onOpenExport={() => setIsExportOpen(true)}
          />
        )}

        {/* Tab 2: Attack Graph */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Grafo Topológico de Ataque & Relações ({assets.length} Nós)
                </h3>
              </div>
            </div>
            <div className="h-[760px] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
              <AttackGraph
                assets={assets}
                rootDomain={currentProject?.domain || 'target.com'}
                onSelectAsset={handleOpenAiForAsset}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Assets Table */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Inventário Completo de Ativos & Superfície ({assets.length})
                </h3>
              </div>
            </div>
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
              onSelectProject={(p) => handleSelectProject(p)}
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

        {/* Tab 8: Google Drive Vault (5TB Offload) */}
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

      {isSettingsOpen && (
        <AccountSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
