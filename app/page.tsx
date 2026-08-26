'use client';

import React, { useState, useEffect } from 'react';
import { TargetProject, CorrelatedAsset, Vulnerability, ReconFlowStep } from '@/types/recon';
import { SAMPLE_PROJECTS, SAMPLE_ASSETS } from '@/lib/sampleData';
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
  RotateCcw,
  ShieldCheck,
  Lock,
  HardDrive,
  FolderKanban,
  Check
} from 'lucide-react';

export default function ReconCorrelatorApp() {
  const [projects, setProjects] = useState<TargetProject[]>(SAMPLE_PROJECTS);
  const [currentProject, setCurrentProject] = useState<TargetProject>(SAMPLE_PROJECTS[0]);
  const [assets, setAssets] = useState<CorrelatedAsset[]>(SAMPLE_ASSETS);
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

  // Initial load directly from backend Database API
  useEffect(() => {
    async function bootstrapFromDatabase() {
      try {
        setIsDbSyncing(true);
        setDbStatus('syncing');
        const res = await fetch('/api/db/sync');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (Array.isArray(data.projects) && data.projects.length > 0) {
              setProjects(data.projects);
              const active = data.activeProject || data.projects[0];
              setCurrentProject(active);
            }
            if (Array.isArray(data.assets)) {
              setAssets(data.assets);
            }
            setDbStatus('connected');
          }
        }
      } catch (e) {
        console.warn('Backend DB sync warning:', e);
        setDbStatus('error');
      } finally {
        setIsDbSyncing(false);
      }
    }
    bootstrapFromDatabase();
  }, []);

  // Switch project and fetch its assets from database
  const handleSelectProject = async (proj: TargetProject) => {
    setCurrentProject(proj);
    try {
      setIsDbSyncing(true);
      const res = await fetch(`/api/db/assets?rootDomain=${encodeURIComponent(proj.domain)}`);
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

  // Statistics
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

    if (remaining.length > 0) {
      setProjects(remaining);
      if (currentProject.id === projectId) {
        handleSelectProject(remaining[0]);
      }
    } else {
      const blankProj: TargetProject = {
        id: `target-${Date.now()}`,
        name: 'Novo Programa',
        domain: 'target.com',
        description: 'Programa de Bug Bounty limpo',
        createdAt: new Date().toISOString(),
        inScope: ['*.target.com', 'target.com'],
        outOfScope: [],
        rules: [],
        policy: {
          platform: 'custom',
          policySummary: 'Regras de teste do programa.',
          safeHarbor: true,
          prohibitedVulns: ['DDoS', 'Self-XSS'],
          requiredHeaders: [{ key: 'X-Bug-Bounty', value: 'w0rmingstar', description: 'Header de teste' }],
          targetArchitecture: 'cloud_native',
          bountyTiers: [],
          extractedAt: new Date().toISOString(),
        },
        isDemo: false,
      };
      setProjects([blankProj]);
      setCurrentProject(blankProj);
      setAssets([]);
      try {
        await fetch('/api/db/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blankProj),
        });
      } catch {}
    }
  };

  const handleClearDemoProjects = async () => {
    const onlyReal = projects.filter(p => !p.isDemo && !p.id.includes('demo') && p.domain !== 'acmefinance.io' && p.domain !== 'cyberbank.corp');
    if (onlyReal.length > 0) {
      setProjects(onlyReal);
      handleSelectProject(onlyReal[0]);
    } else {
      const blankProj: TargetProject = {
        id: `target-${Date.now()}`,
        name: 'Meu Alvo de Bug Bounty',
        domain: 'empresa.com',
        description: 'Programa de Bug Bounty real importado',
        createdAt: new Date().toISOString(),
        inScope: ['*.empresa.com', 'empresa.com'],
        outOfScope: [],
        rules: [],
        policy: {
          platform: 'custom',
          policySummary: 'Regras de teste do programa.',
          safeHarbor: true,
          prohibitedVulns: ['DDoS', 'Self-XSS'],
          requiredHeaders: [{ key: 'X-Bug-Bounty', value: 'w0rmingstar', description: 'Header de identificação' }],
          targetArchitecture: 'cloud_native',
          bountyTiers: [],
          extractedAt: new Date().toISOString(),
        },
        isDemo: false,
      };
      setProjects([blankProj]);
      setCurrentProject(blankProj);
      try {
        await fetch('/api/db/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blankProj),
        });
      } catch {}
    }
    setAssets([]);
  };

  const handleCreateNewProject = async (newProj: TargetProject) => {
    setProjects(prev => [newProj, ...prev]);
    setCurrentProject(newProj);
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
    setAssets([]);
    try {
      await fetch(`/api/db/assets?rootDomain=${encodeURIComponent(currentProject.domain)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to clear assets in DB:', e);
    }
  };

  const handleLoadDemoSandbox = async () => {
    setProjects(SAMPLE_PROJECTS);
    setCurrentProject(SAMPLE_PROJECTS[0]);
    setAssets(SAMPLE_ASSETS);

    try {
      for (const p of SAMPLE_PROJECTS) {
        await fetch('/api/db/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        });
      }
      await fetch('/api/db/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: SAMPLE_ASSETS,
          rootDomain: SAMPLE_PROJECTS[0].domain,
        }),
      });
    } catch (e) {
      console.warn('Failed to seed demo sandbox to DB:', e);
    }
  };

  // Merge & Persist discovered assets into Backend Database
  const handleAssetsDiscovered = async (newStubs: Partial<CorrelatedAsset>[]) => {
    if (!newStubs || newStubs.length === 0) return;

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
              vulnerabilities: [vuln],
            },
          ],
          rootDomain: currentProject.domain,
        }),
      });
    } catch (e) {
      console.error('Failed to persist vulnerability to DB:', e);
    }
  };

  const handleExecuteAutomationFromStep = (action: string, step: ReconFlowStep) => {
    setActiveTab('workbench');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-black cyber-grid-bg relative">
      {/* Top Header */}
      <Header
        currentProject={currentProject}
        projects={projects}
        onSelectProject={handleSelectProject}
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

      {/* Database State Banner */}
      <div className="max-w-7xl mx-auto px-4 pt-2 pb-0 flex items-center justify-between text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isDbSyncing ? 'bg-amber-400 animate-ping' : dbStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-zinc-300">
            {isDbSyncing ? 'Sincronizando com Banco de Dados Backend...' : dbStatus === 'connected' ? 'Banco de Dados Backend Conectado & Persistente (Zero LocalStorage)' : 'Erro de Conexão com Backend'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Alvo Ativo: <strong className="text-emerald-400">{currentProject.domain}</strong></span>
          <span>•</span>
          <span>Ativos Salvos no DB: <strong className="text-cyan-400">{totalAssets}</strong></span>
        </div>
      </div>

      {/* Main Body View */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Tab 1: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Mission & Target Hero Card */}
            <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="font-bold text-base text-zinc-100">Superfície de Ataque Ativa: {currentProject.domain}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                    OPSEC SAFE
                  </span>
                  {currentProject.policy?.platform && (
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                      {currentProject.policy.platform}
                    </span>
                  )}
                </div>
                <p className="text-zinc-400 text-xs max-w-2xl leading-relaxed">
                  {currentProject.description}
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-500">
                  <span>In-Scope: <strong className="text-zinc-300">{currentProject.inScope.join(', ')}</strong></span>
                  <span>•</span>
                  <span>Out-of-Scope: <strong className="text-red-400">{currentProject.outOfScope.join(', ') || 'Nenhum'}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsProgramIngestionOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Programa / Link BugBounty</span>
                </button>

                <button
                  onClick={() => setActiveTab('flowchart')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold rounded-xl text-xs border border-zinc-700 transition-colors cursor-pointer"
                >
                  <GitBranch className="w-4 h-4" />
                  <span>Ver Fluxograma de Recon</span>
                </button>

                <button
                  onClick={() => setActiveTab('workbench')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-cyan-300 font-bold rounded-xl text-xs border border-zinc-800 transition-colors cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>Workbench Ao Vivo</span>
                </button>

                <button
                  onClick={() => setActiveTab('drive')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 font-bold rounded-xl text-xs border border-blue-800/80 transition-colors cursor-pointer"
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
                className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 rounded-xl p-4 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span>Subdomínios</span>
                  <Globe className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-bold text-zinc-100">{totalAssets}</div>
                <span className="text-[11px] text-emerald-400 mt-1 block font-medium">{aliveCount} ativos respondendo HTTP</span>
              </div>

              <div 
                onClick={() => setActiveTab('assets')}
                className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 rounded-xl p-4 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span>Portas Mapeadas</span>
                  <Server className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-bold text-zinc-100">{totalPorts}</div>
                <span className="text-[11px] text-zinc-400 mt-1 block">Serviços e portas HTTP/SSH</span>
              </div>

              <div 
                onClick={() => setActiveTab('assets')}
                className={`bg-zinc-900/60 hover:bg-zinc-900 border rounded-xl p-4 transition-all cursor-pointer group ${
                  vulnCount > 0 ? 'border-red-900/60 bg-red-950/20' : 'border-zinc-800/80'
                }`}
              >
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span>Vulnerabilidades</span>
                  <Flame className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-bold text-red-300">{vulnCount}</div>
                <span className="text-[11px] text-red-400 mt-1 block font-bold">{criticalVulns} Críticas / Alto Impacto</span>
              </div>

              <div 
                onClick={() => setActiveTab('assets')}
                className={`bg-zinc-900/60 hover:bg-zinc-900 border rounded-xl p-4 transition-all cursor-pointer group ${
                  takeoverCount > 0 ? 'border-amber-900/80 bg-amber-950/20 animate-pulse' : 'border-zinc-800/80'
                }`}
              >
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span>Takeovers Detectados</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-bold text-amber-300">{takeoverCount}</div>
                <span className="text-[11px] text-amber-400 mt-1 block">CNAMEs órfãos candidatos</span>
              </div>
            </div>

            {/* Empty State / Clean Workspace Helper */}
            {totalAssets === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center space-y-4 font-mono">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mx-auto">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-base font-bold text-zinc-100">Espaço de Trabalho Limpo para {currentProject.domain}</h3>
                  <p className="text-xs text-zinc-400">
                    Nenhum dado falso carregado. Inicie o reconhecimento com ferramentas reais ou ingira logs do seu terminal.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('flowchart')}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>Abrir Fluxograma de Reconhecimento</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('workbench')}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs flex items-center gap-2 border border-zinc-700 cursor-pointer"
                  >
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span>Disparar CRT.sh / DNS Ao Vivo</span>
                  </button>

                  <button
                    onClick={handleLoadDemoSandbox}
                    className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold rounded-xl text-xs flex items-center gap-2 border border-zinc-800 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Carregar Sandbox Didática</span>
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
                      <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                        Grafo de Correlação & Vetores de Ataque
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

                  <div className="h-[480px] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
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
                      <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                        Tabela de Ativos & Superfície de Ataque ({assets.length})
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
            <div className="h-[760px] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
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
          onCreateProject={handleCreateNewProject}
          onDeleteProject={handleDeleteProject}
          onClearDemoProjects={handleClearDemoProjects}
        />
      )}

      {isIngestionOpen && (
        <DataIngestionModal
          isOpen={isIngestionOpen}
          onClose={() => setIsIngestionOpen(false)}
          onIngestSuccess={handleIngestSuccess}
          targetDomain={currentProject.domain}
        />
      )}

      {isScopeOpen && (
        <ScopeManagerModal
          isOpen={isScopeOpen}
          onClose={() => setIsScopeOpen(false)}
          target={currentProject}
          onUpdateTarget={handleUpdateScope}
          onClearWorkspace={handleClearWorkspace}
        />
      )}

      {isAiTriageOpen && (
        <AiTriagerModal
          isOpen={isAiTriageOpen}
          onClose={() => setIsAiTriageOpen(false)}
          selectedAsset={selectedAssetForAi}
          allAssets={assets}
          targetDomain={currentProject.domain}
        />
      )}

      {isExportOpen && (
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
