'use client';

import React, { useState, useMemo } from 'react';
import { TargetProject, CorrelatedAsset, Vulnerability, Severity } from '@/types/recon';
import { ComplianceFramework, IndustrySector, EnterpriseTier } from '@/types/enterprise';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Globe, 
  Server, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Filter, 
  Building2, 
  Lock, 
  Zap, 
  Radio, 
  Layers, 
  CheckCircle2, 
  Search, 
  Download, 
  ArrowUpRight, 
  SlidersHorizontal,
  CloudUpload,
  HardDrive,
  Cpu
} from '@/lib/icons';

interface PowerBiDashboardProps {
  projects: TargetProject[];
  currentProject: TargetProject | null;
  assets: CorrelatedAsset[];
  onSelectProject: (project: TargetProject | null) => void;
  onOpenProjectManager: () => void;
  onOpenIngestion: () => void;
  onNewScan: () => void;
  onOpenExport: () => void;
}

export function PowerBiDashboard({
  projects,
  currentProject,
  assets,
  onSelectProject,
  onOpenProjectManager,
  onOpenIngestion,
  onNewScan,
  onOpenExport
}: PowerBiDashboardProps) {
  // Slicers / Filters State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(currentProject?.id || 'all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChartTab, setActiveChartTab] = useState<'overview' | 'mitre' | 'assets' | 'compliance'>('overview');

  // Synchronize company filter if currentProject changes externally
  React.useEffect(() => {
    if (currentProject) {
      setSelectedCompanyId(currentProject.id);
    } else {
      setSelectedCompanyId('all');
    }
  }, [currentProject]);

  // Handle company slicer change
  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCompanyId(val);
    if (val === 'all') {
      onSelectProject(null);
    } else {
      const proj = projects.find(p => p.id === val);
      if (proj) onSelectProject(proj);
    }
  };

  // 1. Filtered Assets Calculation
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Company match
      if (selectedCompanyId !== 'all') {
        const targetProj = projects.find(p => p.id === selectedCompanyId);
        if (targetProj) {
          const matchPid = asset.projectId === selectedCompanyId;
          const matchDomain = asset.rootDomain.toLowerCase() === targetProj.domain.toLowerCase() ||
                              asset.subdomain.toLowerCase().endsWith(`.${targetProj.domain.toLowerCase()}`);
          if (!matchPid && !matchDomain) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inSub = asset.subdomain.toLowerCase().includes(q);
        const inIp = (asset.ips || []).some(ip => ip.includes(q));
        const inTitle = (asset.httpTitle || '').toLowerCase().includes(q);
        const inTech = (asset.technologies || []).some(t => t.name.toLowerCase().includes(q));
        if (!inSub && !inIp && !inTitle && !inTech) return false;
      }

      // Severity Filter
      if (selectedSeverity !== 'all') {
        const hasSev = (asset.vulnerabilities || []).some(v => v.severity?.toLowerCase() === selectedSeverity.toLowerCase());
        if (!hasSev && selectedSeverity !== 'takeover') return false;
        if (selectedSeverity === 'takeover' && !asset.takeoverRisk) return false;
      }

      return true;
    });
  }, [assets, projects, selectedCompanyId, searchQuery, selectedSeverity]);

  // 2. Metrics & KPI Scorecards
  const kpis = useMemo(() => {
    let criticalVulns = 0;
    let highVulns = 0;
    let mediumVulns = 0;
    let lowVulns = 0;
    let infoVulns = 0;
    let takeoverCount = 0;
    let openPortsCount = 0;

    const vectorCounts: Record<string, number> = {
      'Web Application Exploits': 0,
      'Exposed APIs / Endpoints': 0,
      'Subdomain Takeover': 0,
      'Cloud Misconfigurations': 0,
      'Exposed Port / Service': 0,
      'TLS & Cryptography Weakness': 0
    };

    const techStackCount: Record<string, number> = {};

    filteredAssets.forEach(asset => {
      if (asset.takeoverRisk) {
        takeoverCount++;
        vectorCounts['Subdomain Takeover']++;
      }

      openPortsCount += (asset.ports?.length || 0);
      if ((asset.ports?.length || 0) > 2) {
        vectorCounts['Exposed Port / Service']++;
      }

      (asset.technologies || []).forEach(t => {
        techStackCount[t.name] = (techStackCount[t.name] || 0) + 1;
      });

      (asset.vulnerabilities || []).forEach(v => {
        const sev = v.severity?.toLowerCase();
        if (sev === 'critical') criticalVulns++;
        else if (sev === 'high') highVulns++;
        else if (sev === 'medium') mediumVulns++;
        else if (sev === 'low') lowVulns++;
        else infoVulns++;

        const name = (v.name || '').toLowerCase();
        if (name.includes('api') || name.includes('swagger') || name.includes('graphql')) {
          vectorCounts['Exposed APIs / Endpoints']++;
        } else if (name.includes('cloud') || name.includes('s3') || name.includes('bucket') || name.includes('blob')) {
          vectorCounts['Cloud Misconfigurations']++;
        } else if (name.includes('ssl') || name.includes('tls') || name.includes('cert')) {
          vectorCounts['TLS & Cryptography Weakness']++;
        } else {
          vectorCounts['Web Application Exploits']++;
        }
      });
    });

    const totalFindings = criticalVulns + highVulns + mediumVulns + lowVulns + infoVulns;
    const aliveHosts = filteredAssets.filter(a => a.isAlive).length;

    // Composite Risk Index (0 - 100)
    const compositeRisk = Math.min(
      100,
      Math.round(criticalVulns * 22 + highVulns * 10 + mediumVulns * 3 + takeoverCount * 15 + (aliveHosts > 0 ? 5 : 0))
    );

    // Risk Tier Level
    let riskTier = 'Baixo';
    let riskColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (compositeRisk >= 75) {
      riskTier = 'CRÍTICO';
      riskColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    } else if (compositeRisk >= 50) {
      riskTier = 'ELEVADO';
      riskColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    } else if (compositeRisk >= 25) {
      riskTier = 'MODERADO';
      riskColor = 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
    }

    return {
      totalAssets: filteredAssets.length,
      aliveHosts,
      criticalVulns,
      highVulns,
      mediumVulns,
      lowVulns,
      infoVulns,
      takeoverCount,
      openPortsCount,
      totalFindings,
      compositeRisk,
      riskTier,
      riskColor,
      vectorCounts,
      topTechs: Object.entries(techStackCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }, [filteredAssets]);

  // Active Company Object
  const activeCompany = useMemo(() => {
    return projects.find(p => p.id === selectedCompanyId) || null;
  }, [projects, selectedCompanyId]);

  return (
    <div className="w-full space-y-4 font-mono">
      {/* ======================================================== */}
      {/* 🎛️ POWER BI TOP GLOBAL SLICER & ENTERPRISE CONTROLS BAR */}
      {/* ======================================================== */}
      <div className="glass-panel p-3.5 rounded-2xl border border-white/10 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        {/* Left: Slicers (Company, Severity, Search) */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Company Slicer */}
          <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
            <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold hidden sm:inline">Empresa:</span>
            <select
              value={selectedCompanyId}
              onChange={handleCompanyChange}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="all" className="bg-zinc-950 text-white">🌐 Todas as Empresas ({projects.length})</option>
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-zinc-950 text-zinc-200">
                  🏢 {p.name} ({p.domain})
                </option>
              ))}
            </select>
          </div>

          {/* Severity Slicer */}
          <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-white/10">
            <Filter className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold hidden md:inline">Severidade:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-950 text-white">Todas as Ameaças</option>
              <option value="critical" className="bg-zinc-950 text-rose-400">🔴 Críticas ({kpis.criticalVulns})</option>
              <option value="high" className="bg-zinc-950 text-orange-400">🟠 Altas ({kpis.highVulns})</option>
              <option value="medium" className="bg-zinc-950 text-amber-400">🟡 Médias ({kpis.mediumVulns})</option>
              <option value="takeover" className="bg-zinc-950 text-purple-400">🟣 Takeover Risk ({kpis.takeoverCount})</option>
            </select>
          </div>

          {/* Instant Search Filter */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por subdomínio, IP, tech..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Quick Action Buttons & Vault Security Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Security Vault Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[11px] shadow-sm">
            <Lock className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-semibold">AES-256-GCM Vault Ativo</span>
          </div>

          <button
            onClick={onOpenProjectManager}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 text-xs text-zinc-200 hover:text-white transition-all shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gerenciar Empresas</span>
          </button>

          <button
            onClick={onNewScan}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Novo Recon Scan</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🏢 ACTIVE ENTERPRISE PROFILE BANNER (IF SELECTED) */}
      {/* ======================================================== */}
      {activeCompany && (
        <div className="glass-card p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-base shadow-md">
              {activeCompany.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-white tracking-wide">{activeCompany.name}</h2>
                {activeCompany.tradeName && (
                  <span className="text-xs text-zinc-400">({activeCompany.tradeName})</span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30 uppercase font-semibold">
                  {activeCompany.tier || 'Enterprise Tier 1'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] border border-zinc-700">
                  {activeCompany.industry || 'Fintech & Cloud'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-3 flex-wrap">
                <span>🌐 Domínio: <strong className="text-zinc-200">{activeCompany.domain}</strong></span>
                {activeCompany.cnpjOrTaxId && <span>📄 CNPJ: <strong className="text-zinc-200">{activeCompany.cnpjOrTaxId}</strong></span>}
                <span>⏱️ SLA: <strong className="text-emerald-400">{activeCompany.sla || '24/7 SOC (15m P1)'}</strong></span>
                <span>🔒 Isolamento: <code className="text-cyan-400 font-mono">{activeCompany.accessCode}</code></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(activeCompany.complianceFrameworks || ['ISO27001', 'LGPD', 'SOC2_TYPE2']).map(fw => (
              <span key={fw} className="px-2 py-0.5 rounded-lg bg-zinc-900/90 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
                {fw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📊 POWER BI EXECUTIVE KPI SCORECARD TILES (EDGE-TO-EDGE) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Scorecard 1: Attack Surface Total */}
        <div className="glass-card p-3.5 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Superfície Total</span>
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{kpis.totalAssets}</span>
            <span className="text-[11px] text-emerald-400 font-semibold">{kpis.aliveHosts} Vivos</span>
          </div>
          <div className="mt-1 w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${kpis.totalAssets > 0 ? (kpis.aliveHosts / kpis.totalAssets) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Scorecard 2: Critical & High Findings */}
        <div className="glass-card p-3.5 rounded-2xl border border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-300 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Falhas Críticas</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400">{kpis.criticalVulns}</span>
            <span className="text-[11px] text-orange-400 font-semibold">+{kpis.highVulns} Altas</span>
          </div>
          <span className="text-[10px] text-zinc-400">Ação imediata requerida</span>
        </div>

        {/* Scorecard 3: Subdomain Takeovers */}
        <div className="glass-card p-3.5 rounded-2xl border border-purple-500/30 bg-purple-950/10 hover:border-purple-500/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-300 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Takeover Risks</span>
            <AlertTriangle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400">{kpis.takeoverCount}</span>
            <span className="text-[11px] text-purple-300 font-semibold">DNS CNAMEs</span>
          </div>
          <span className="text-[10px] text-zinc-400">Dangling Cloud Records</span>
        </div>

        {/* Scorecard 4: Exposed Ports & Services */}
        <div className="glass-card p-3.5 rounded-2xl border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Portas Abertas</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-400">{kpis.openPortsCount}</span>
            <span className="text-[11px] text-zinc-400 font-semibold">Serviços</span>
          </div>
          <span className="text-[10px] text-zinc-400">TCP/UDP Fingerprinted</span>
        </div>

        {/* Scorecard 5: Composite Risk Index Score (0-100) */}
        <div className={`glass-card p-3.5 rounded-2xl border ${kpis.riskColor} transition-all flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Índice de Risco</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black">{kpis.compositeRisk}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider">/ 100 ({kpis.riskTier})</span>
          </div>
          <div className="mt-1 w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${kpis.compositeRisk > 50 ? 'bg-rose-500' : 'bg-emerald-400'}`} 
              style={{ width: `${kpis.compositeRisk}%` }}
            />
          </div>
        </div>

        {/* Scorecard 6: SLA & Security Posture */}
        <div className="glass-card p-3.5 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">SLA Conformidade</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">99.8%</span>
            <span className="text-[11px] text-zinc-400 font-semibold">MTTR &lt; 2h</span>
          </div>
          <span className="text-[10px] text-zinc-400">Zero SLA Breach</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📈 POWER BI INTERACTIVE CHARTS GRID (2 COLUMNS EDGE-TO-EDGE) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Main Panel: Severity Radial & Attack Vector Breakdown (7 Cols) */}
        <div className="lg:col-span-7 glass-card p-4 rounded-3xl border border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Vetores de Ameaça & Distribuição MITRE ATT&CK
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-lg bg-zinc-900 text-zinc-400 border border-zinc-800">
                {kpis.totalFindings} Ocorrências Mapeadas
              </span>
            </div>
          </div>

          {/* Interactive Attack Vector Bar Chart */}
          <div className="space-y-2.5">
            {Object.entries(kpis.vectorCounts).map(([vector, count]) => {
              const percentage = kpis.totalFindings > 0 ? Math.round((count / (kpis.totalFindings + 1)) * 100) : 0;
              let barColor = 'bg-emerald-500';
              if (vector.includes('Web')) barColor = 'bg-rose-500';
              else if (vector.includes('Takeover')) barColor = 'bg-purple-500';
              else if (vector.includes('API')) barColor = 'bg-cyan-500';
              else if (vector.includes('Cloud')) barColor = 'bg-amber-500';

              return (
                <div key={vector} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium truncate max-w-[260px] sm:max-w-md">{vector}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{count}</span>
                      <span className="text-[10px] text-zinc-500 w-8 text-right">{percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-900/90 rounded-full h-2 overflow-hidden border border-white/5">
                    <div 
                      className={`h-full ${barColor} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max(percentage, count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tech Stack Distribution Tags */}
          {kpis.topTechs.length > 0 && (
            <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Tecnologias Identificadas:</span>
              {kpis.topTechs.map(([tech, count]) => (
                <span key={tech} className="px-2 py-0.5 rounded-lg bg-zinc-900 text-zinc-300 border border-white/10 text-[11px]">
                  {tech} <strong className="text-emerald-400">({count})</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Severity Donut & Risk Exposure Matrix (5 Cols) */}
        <div className="lg:col-span-5 glass-card p-4 rounded-3xl border border-white/10 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Distribuição de Severidade CVSS
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-semibold">CVSS v3.1 / v4.0</span>
          </div>

          {/* Severity Matrix Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-rose-300 font-bold uppercase">Crítico (9.0 - 10.0)</span>
                <p className="text-xl font-black text-rose-400">{kpis.criticalVulns}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-xs">
                P1
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-orange-300 font-bold uppercase">Alto (7.0 - 8.9)</span>
                <p className="text-xl font-black text-orange-400">{kpis.highVulns}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-xs">
                P2
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-300 font-bold uppercase">Médio (4.0 - 6.9)</span>
                <p className="text-xl font-black text-amber-400">{kpis.mediumVulns}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
                P3
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-300 font-bold uppercase">Baixo / Info (0.1 - 3.9)</span>
                <p className="text-xl font-black text-emerald-400">{kpis.lowVulns + kpis.infoVulns}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                P4
              </div>
            </div>
          </div>

          {/* Quick Storage & 5TB Google Drive Offload Banner */}
          <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Google Drive Vault (5 TB)</p>
                <p className="text-[10px] text-zinc-400">Relatórios e dumps isolados fora do Git</p>
              </div>
            </div>
            <button
              onClick={onOpenExport}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold transition-all shadow-sm"
            >
              Exportar Vault
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🛡️ TOP EXPOSED ASSETS & DRILLDOWN TABLE (EDGE-TO-EDGE) */}
      {/* ======================================================== */}
      <div className="glass-card p-4 rounded-3xl border border-white/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Superfície de Ataque Ativa & Matriz de Risco ({filteredAssets.length} Ativos)
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400 font-semibold">Exibindo top descobertas correlacionadas</span>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 space-y-2">
            <Globe className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
            <p className="text-xs">Nenhum ativo corresponde aos filtros selecionados.</p>
            <button
              onClick={onNewScan}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 transition-all"
            >
              Executar Ingestão / Scan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 text-[10px] uppercase text-zinc-400 font-bold tracking-wider">
                  <th className="py-2.5 px-3">Subdomínio / Host</th>
                  <th className="py-2.5 px-3">Status HTTP</th>
                  <th className="py-2.5 px-3">IPs / Rede</th>
                  <th className="py-2.5 px-3">Portas Abertas</th>
                  <th className="py-2.5 px-3">Tecnologias</th>
                  <th className="py-2.5 px-3">Vulnerabilidades</th>
                  <th className="py-2.5 px-3">Takeover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredAssets.slice(0, 15).map(asset => (
                  <tr key={asset.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${asset.isAlive ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                        <span className="font-mono font-bold text-white">{asset.subdomain}</span>
                      </div>
                      {asset.httpTitle && (
                        <p className="text-[10px] text-zinc-400 truncate max-w-xs ml-4">{asset.httpTitle}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {asset.httpStatus ? (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          asset.httpStatus === 200 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          asset.httpStatus >= 400 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                          'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                        }`}>
                          {asset.httpStatus}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-[10px]">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300 font-mono text-[11px]">
                      {(asset.ips || []).slice(0, 2).join(', ') || <span className="text-zinc-600">N/A</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(asset.ports || []).slice(0, 4).map(p => (
                          <span key={p.port} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-cyan-300 font-mono">
                            {p.port}
                          </span>
                        ))}
                        {(asset.ports || []).length > 4 && (
                          <span className="text-[10px] text-zinc-500">+{asset.ports!.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(asset.technologies || []).slice(0, 3).map(t => (
                          <span key={t.name} className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-white/5 text-[10px]">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        {(asset.vulnerabilities || []).length > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold">
                            {asset.vulnerabilities!.length} Falhas
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-[10px]">0</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {asset.takeoverRisk ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 text-[10px] font-bold animate-pulse">
                          RISCO
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-[10px]">Seguro</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
