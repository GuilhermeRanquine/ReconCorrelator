'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { NexusReportsViewer } from '@/components/NexusReportsViewer';
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
  Bot
} from 'lucide-react';

export default function ReconCorrelatorApp() {
  const [projects, setProjects] = useState<TargetProject[]>(SAMPLE_PROJECTS);
  const [currentProject, setCurrentProject] = useState<TargetProject>(SAMPLE_PROJECTS[0]);
  const [assets, setAssets] = useState<CorrelatedAsset[]>([]);
  const [activeTab, setActiveTab] = useState<ReconTab>('dashboard');
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Modals
  const [isProgramIngestionOpen, setIsProgramIngestionOpen] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isIngestionOpen, setIsIngestionOpen] = useState(false);
  const [isScopeOpen, setIsScopeOpen] = useState(false);
  const [isAiTriageOpen, setIsAiTriageOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedAssetForAi, setSelectedAssetForAi] = useState<CorrelatedAsset | null>(null);

  // 1. Initial Load from Server-Side Central Database
  const fetchDatabaseProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/db/projects');
      const data = await res.json();
      if (data.success && Array.isArray(data.projects) && data.projects.length > 0) {
        setProjects(data.projects);
        return data.projects;
      }
    } catch (e) {
      console.warn('Could not fetch projects from DB, using fallback:', e);
    }
    return SAMPLE_PROJECTS;
  }, []);

  const fetchDatabaseAssets = useCallback(async (project: TargetProject) => {
    try {
      const res = await fetch(`/api/db/assets?projectId=${encodeURIComponent(project.id)}&domain=${encodeURIComponent(project.domain)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.assets)) {
        setAssets(data.assets);
        return;
      }
    } catch (e) {
      console.warn('Could not fetch assets from DB, fallback:', e);
    }
  }, []);

  // Initialize DB on mount
  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      const dbProjects = await fetchDatabaseProjects();
      if (!isMounted) return;

      const active = dbProjects[0] || SAMPLE_PROJECTS[0];
      setCurrentProject(active);
      await fetchDatabaseAssets(active);
      setIsDbLoaded(true);
    };

    initialize();
    return () => { isMounted = false; };
  }, [fetchDatabaseProjects, fetchDatabaseAssets]);

  // When active target changes, load its assets directly from central DB
  const handleSelectProject = (project: TargetProject) => {
    setCurrentProject(project);
    fetchDatabaseAssets(project);
  };

  // 2. Persist project changes to central DB
  const persistProjectToDb = async (project: TargetProject) => {
    try {
      await fetch('/api/db/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
    } catch (e) {
      console.warn('Could not persist project to DB:', e);
    }
  };

  // 3. Statistics computed from DB-backed state
  const totalAssets = assets.length;
  const aliveCount = assets.filter(a => a.isAlive).length;
  const allVulns = assets.flatMap(a => a.vulnerabilities || []);
  const vulnCount = allVulns.length;
  const criticalVulns = allVulns.filter(v => v.severity === 'critical' || v.severity === 'high').length;
  const takeoverCount = assets.filter(a => a.takeoverRisk).length;
  const totalPorts = assets.reduce((acc, a) => acc + (a.ports?.length || 0), 0);

  const handleOpenAiForAsset = (asset: CorrelatedAsset) => {
    setSelectedAssetForAi(asset);
    setIsAiTriageOpen(true);
  };

  const handleIngestSuccess = async (newAssets: CorrelatedAsset[]) => {
    try {
      const res = await fetch('/api/db/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: newAssets, rootDomain: currentProject.domain }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.assets)) {
        setAssets(data.assets.filter(a => a.rootDomain === currentProject.domain || a.subdomain.endsWith(`.${currentProject.domain}`)));
      } else {
        setAssets(newAssets);
      }
    } catch {
      setAssets(newAssets);
    }
  };

  const handleUpdateScope = async (updatedTarget: TargetProject) => {
    setCurrentProject(updatedTarget);
    const updatedList = projects.map(p => p.id === updatedTarget.id ? updatedTarget : p);
    setProjects(updatedList);
    await persistProjectToDb(updatedTarget);
  };

  const handleProgramCreated = async (newProject: TargetProject) => {
    const updatedList = [newProject, ...projects.filter(p => p.id !== newProject.id)];
    setProjects(updatedList);
    setCurrentProject(newProject);
    setAssets([]); // Clean slate for new target
    await persistProjectToDb(newProject);
    setActiveTab('flowchart');
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await fetch(`/api/db/projects?id=${encodeURIComponent(projectId)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Could not delete project on DB:', err);
    }

    const remaining = projects.filter(p => p.id !== projectId);
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
      await persistProjectToDb(blankProj);
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
      setAssets([]);
      await persistProjectToDb(blankProj);
    }
  };

  const handleCreateNewProject = async (newProj: TargetProject) => {
    const updated = [newProj, ...projects];
    setProjects(updated);
    setCurrentProject(newProj);
    setAssets([]);
    await persistProjectToDb(newProj);
    setActiveTab('dashboard');
  };

  const handleClearWorkspace = async () => {
    try {
      await fetch('/api/db/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear', domain: currentProject.domain }),
      });
    } catch (e) {
      console.warn('Could not clear assets in DB:', e);
    }
    setAssets([]);
  };

  const handleLoadDemoSandbox = async () => {
    setProjects(SAMPLE_PROJECTS);
    setCurrentProject(SAMPLE_PROJECTS[0]);
    setAssets(SAMPLE_ASSETS);
    // Upsert demo assets to DB
    try {
      await fetch('/api/db/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: SAMPLE_ASSETS, rootDomain: SAMPLE_PROJECTS[0].domain }),
      });
    } catch (e) {
      console.warn('Could not persist sample assets to DB:', e);
    }
  };

  // 4. Merge and persist discovered assets seamlessly into DB
  const handleAssetsDiscovered = async (newStubs: Partial<CorrelatedAsset>[]) => {
    if (!newStubs || newStubs.length === 0) return;

    // Optimistic UI update
    setAssets(prev => {
      const mergedMap = new Map<string, CorrelatedAsset>();
      for (const a of prev) mergedMap.set(a.subdomain.toLowerCase(), a);

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
            ips: Array.from(new Set([...existing.ips, ...(stub.ips || [])])),
            cnames: Array.from(new Set([...existing.cnames, ...(stub.cnames || [])])),
            ports: stub.ports && stub.ports.length > 0 ? stub.ports : existing.ports,
            technologies: stub.technologies && stub.technologies.length > 0 ? stub.technologies : existing.technologies,
            tags: Array.from(new Set([...existing.tags, ...(stub.tags || [])])),
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

    // Central Server Database Upsert (ACID Persistence)
    try {
      const res = await fetch('/api/db/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: newStubs, rootDomain: currentProject.domain }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.assets)) {
        // Sync filtered assets for current project
        const filtered = data.assets.filter((a: CorrelatedAsset) => 
          a.rootDomain?.toLowerCase() === currentProject.domain.toLowerCase() ||
          a.subdomain?.toLowerCase().endsWith(`.${currentProject.domain.toLowerCase()}`) ||
          a.subdomain?.toLowerCase() === currentProject.domain.toLowerCase()
        );
        setAssets(filtered);
      }
    } catch (dbErr) {
      console.warn('Background DB sync warning:', dbErr);
    }
  };

  const handleAddVulnerability = async (vuln: Vulnerability) => {
    // Optimistic UI update
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

    // Central Server DB save
    try {
      await fetch('/api/db/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_vulnerability', vulnerability: vuln }),
      });
    } catch (dbErr) {
      console.warn('Could not save vulnerability to central DB:', dbErr);
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
        isDbConnected={isDbLoaded}
      />

      {/* Main Body View */}
      <main className="max-w-7xl mx-auto px-4 py-6">
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
                    CENTRAL DB SYNCED
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
                  onClick={() => setActiveTab('reports')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-300 font-bold rounded-xl text-xs border border-indigo-700/60 transition-colors cursor-pointer shadow-md"
                >
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span>Nexus & Relatórios</span>
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
                    Persistência central ativada. Inicie o reconhecimento com ferramentas reais no Terminal ou no Workbench.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('terminal')}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Terminal className="w-4 h-4" />
                    <span>Abrir Terminal Linux & Arsenal</span>
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
                      <h3 className="font-bold text-zinc-200 text-sm">Visualizador da Superfície de Ataque Correlacionada (Banco Central)</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('graph')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Expandir Grafo</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <AttackGraph
                    assets={assets}
                    rootDomain={currentProject.domain}
                    onSelectAsset={handleOpenAiForAsset}
                  />
                </div>

                {/* High Priority Attack Vectors Banner */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-xl font-mono space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Vetores de Ataque Prioritários Triados pelo Squad</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleClearWorkspace}
                        className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                        title="Limpar todos os ativos do banco e começar do zero"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Limpar Workspace</span>
                      </button>
                      <button
                        onClick={() => { setSelectedAssetForAi(null); setIsAiTriageOpen(true); }}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>ALPHA AI Threat Review</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {assets
                      .filter(a => a.takeoverRisk || (a.vulnerabilities && a.vulnerabilities.some(v => v.severity === 'critical' || v.severity === 'high')))
                      .slice(0, 3)
                      .map((asset) => {
                        const topVuln = asset.vulnerabilities?.[0];
                        return (
                          <div
                            key={asset.id}
                            onClick={() => handleOpenAiForAsset(asset)}
                            className="bg-zinc-900/80 border border-red-900/50 hover:border-red-600 rounded-xl p-3.5 transition-all cursor-pointer space-y-2 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-zinc-100 text-xs group-hover:text-red-300 transition-colors">
                                {asset.subdomain}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-bold">
                                {asset.takeoverRisk ? 'TAKEOVER' : topVuln?.severity || 'HIGH'}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                              {asset.takeoverRisk ? asset.takeoverDetails : topVuln?.description || 'Vulnerabilidade identificada.'}
                            </p>
                            <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500">
                              <span>Portas: {asset.ports.map(p => p.port).join(', ') || '80, 443'}</span>
                              <span className="text-cyan-400 font-bold">Ver PoC ➔</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Terminal Linux & Hacker Arsenal */}
        {activeTab === 'terminal' && (
          <div className="space-y-4">
            <TerminalArsenal
              target={currentProject}
              assets={assets}
              onAssetsDiscovered={handleAssetsDiscovered}
              onAddVulnerability={handleAddVulnerability}
              onSelectProject={handleSelectProject}
              onSwitchTab={setActiveTab}
              researcherHandle="w0rmingstar"
            />
          </div>
        )}

        {/* Tab: Nexus Autônomo & Relatórios */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <NexusReportsViewer
              currentProject={currentProject}
              onSelectProject={handleSelectProject}
            />
          </div>
        )}

        {/* Tab 2: Flowchart & Playbook */}
        {activeTab === 'flowchart' && (
          <div className="space-y-4">
            <ReconFlowchart
              target={currentProject}
              onExecuteAutomation={handleExecuteAutomationFromStep}
              discoveredCount={totalAssets}
            />
          </div>
        )}

        {/* Tab 3: Live Workbench */}
        {activeTab === 'workbench' && (
          <div className="space-y-4">
            <LiveReconWorkbench
              target={currentProject}
              onAssetsDiscovered={handleAssetsDiscovered}
              onAddVulnerability={handleAddVulnerability}
            />
          </div>
        )}

        {/* Tab 4: Attack Graph */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            <AttackGraph
              assets={assets}
              rootDomain={currentProject.domain}
              onSelectAsset={handleOpenAiForAsset}
            />
          </div>
        )}

        {/* Tab 5: Assets Table */}
        {activeTab === 'assets' && (
          <AssetsTable
            assets={assets}
            onOpenAiForAsset={handleOpenAiForAsset}
          />
        )}

        {/* Tab 6: Pipeline Runner */}
        {activeTab === 'pipeline' && (
          <PipelineRunner
            target={currentProject}
            onJobFinished={(discovered) => {
              if (discovered.length > 0) handleAssetsDiscovered(discovered);
            }}
          />
        )}

        {/* Tab 7: Delta's TDD Test Center */}
        {activeTab === 'tdd' && (
          <TddTestCenter />
        )}

        {/* Tab 8: Google Drive Cloud Vault */}
        {activeTab === 'drive' && (
          <GoogleDriveHub
            target={currentProject}
            assets={assets}
            onImportRawData={(rawText) => {
              try {
                const parsed = JSON.parse(rawText);
                if (parsed.assets && Array.isArray(parsed.assets)) {
                  handleAssetsDiscovered(parsed.assets);
                  if (parsed.target) {
                    setCurrentProject(parsed.target);
                  }
                  setActiveTab('assets');
                  return;
                }
              } catch {
                // Raw subdomains format
                const lines = rawText.split('\n').map((l: string) => l.trim()).filter((l: string) => l && !l.startsWith('#'));
                const subdomains = lines.map((l: string) => l.replace(/^(https?:\/\/)?/, '').split('/')[0].split(':')[0]);
                handleAssetsDiscovered(subdomains.map((s: string) => ({ subdomain: s, rootDomain: currentProject.domain })));
                setActiveTab('assets');
              }
            }}
          />
        )}
      </main>

      {/* Modals */}
      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
        projects={projects}
        currentProject={currentProject}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
        onClearDemoProjects={handleClearDemoProjects}
        onCreateNewProject={handleCreateNewProject}
      />

      <ProgramIngestionModal
        isOpen={isProgramIngestionOpen}
        onClose={() => setIsProgramIngestionOpen(false)}
        onProgramCreated={handleProgramCreated}
      />

      <DataIngestionModal
        isOpen={isIngestionOpen}
        onClose={() => setIsIngestionOpen(false)}
        target={currentProject}
        onIngestSuccess={handleIngestSuccess}
      />

      <ScopeManagerModal
        isOpen={isScopeOpen}
        onClose={() => setIsScopeOpen(false)}
        target={currentProject}
        onUpdateScope={handleUpdateScope}
      />

      <AiTriagerModal
        isOpen={isAiTriageOpen}
        onClose={() => setIsAiTriageOpen(false)}
        target={currentProject}
        selectedAsset={selectedAssetForAi}
        allAssets={assets}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        target={currentProject}
        assets={assets}
      />
    </div>
  );
}
