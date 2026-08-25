'use client';

import React, { useState } from 'react';
import { TargetProject, CorrelatedAsset, Vulnerability } from '@/types/recon';
import { 
  Radio, 
  Terminal, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  ShieldAlert, 
  Globe, 
  Layers, 
  Zap, 
  FileCode, 
  Database,
  ExternalLink,
  Plus
} from 'lucide-react';

interface LiveReconWorkbenchProps {
  target: TargetProject;
  onAssetsDiscovered: (newAssets: Partial<CorrelatedAsset>[]) => void;
  onAddVulnerability?: (vuln: Vulnerability) => void;
}

export function LiveReconWorkbench({
  target,
  onAssetsDiscovered,
  onAddVulnerability,
}: LiveReconWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<'crtsh' | 'dns' | 'wayback' | 'http'>('crtsh');
  const [customHost, setCustomHost] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [outputLog, setOutputLog] = useState<string[]>([]);
  const [discoveredItems, setDiscoveredItems] = useState<any[]>([]);

  const targetHost = customHost ?? target.domain;
  const setTargetHost = (val: string) => setCustomHost(val);

  const addLog = (msg: string) => {
    setOutputLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 100)]);
  };

  // Run CRT.sh
  const handleRunCrtsh = async () => {
    setIsLoading(true);
    addLog(`Iniciando consulta aos logs de Certificate Transparency no CRT.sh para %25.${target.domain}...`);
    try {
      const res = await fetch(`/api/recon/crtsh?domain=${encodeURIComponent(target.domain)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro na consulta do CRT.sh');
      }

      addLog(`Sucesso! ${data.subdomains.length} subdomínios encontrados nos registros TLS.`);
      setDiscoveredItems(data.subdomains);

      // Convert to CorrelatedAsset stubs
      const newAssetStubs: Partial<CorrelatedAsset>[] = data.subdomains.map((sub: string) => ({
        subdomain: sub,
        rootDomain: target.domain,
        isAlive: false, // will be confirmed by DNS or HTTP probe
        cnames: [],
        ips: [],
        ports: [],
        technologies: [],
        vulnerabilities: [],
        takeoverRisk: false,
        inScope: true,
        tags: ['crt.sh', 'tls-cert'],
        discoveredVia: 'crtsh',
      }));

      onAssetsDiscovered(newAssetStubs);
      addLog(`Ativos correlacionados no grafo e tabela com sucesso.`);
    } catch (err: any) {
      addLog(`ERRO: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Run DNS & Takeover Scanner
  const handleRunDns = async () => {
    if (!targetHost.trim()) return;
    setIsLoading(true);
    addLog(`Resolvendo DNS DoH (Cloudflare/Google) e checando takeovers para ${targetHost}...`);
    try {
      const res = await fetch(`/api/recon/dns-lookup?host=${encodeURIComponent(targetHost.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro no DNS lookup');
      }

      addLog(`Host ${targetHost} ${data.isAlive ? 'VIVO' : 'SEM RESPOSTA'}. IPs: ${data.ips.join(', ') || 'Nenhum'}. CNAMEs: ${data.cnames.join(', ') || 'Nenhum'}`);

      if (data.takeoverRisk) {
        addLog(`ALERTA CRÍTICO: Risco de Subdomain Takeover detectado! (${data.takeoverService})`);
        if (onAddVulnerability) {
          onAddVulnerability({
            id: `vuln-takeover-${Date.now()}`,
            templateId: 'subdomain-takeover-cname',
            name: `Potencial Subdomain Takeover em ${targetHost}`,
            severity: 'high',
            description: data.takeoverDetails,
            matchedAt: targetHost,
            sourceTool: 'live-probe',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Update asset
      const assetUpdate: Partial<CorrelatedAsset> = {
        subdomain: targetHost.trim(),
        rootDomain: target.domain,
        isAlive: data.isAlive,
        ips: data.ips,
        cnames: data.cnames,
        dnsRecords: data.dnsRecords,
        cloudProvider: data.cloudProvider,
        takeoverRisk: data.takeoverRisk,
        takeoverDetails: data.takeoverDetails,
        inScope: true,
        tags: ['doh-resolved', ...(data.cloudProvider !== 'unknown' ? [data.cloudProvider] : [])],
        discoveredVia: 'dnsx',
      };

      onAssetsDiscovered([assetUpdate]);
      setDiscoveredItems([data]);
    } catch (err: any) {
      addLog(`ERRO: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Run Wayback URLs
  const handleRunWayback = async () => {
    setIsLoading(true);
    addLog(`Consultando Wayback Machine (Archive.org) e AlienVault OTX para ${target.domain}...`);
    try {
      const res = await fetch(`/api/recon/wayback?domain=${encodeURIComponent(target.domain)}&limit=150`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao minerar histórico');
      }

      addLog(`Descobertas ${data.totalUrls} URLs históricas, ${data.jsFiles.length} arquivos JS e ${data.sensitiveEndpoints.length} rotas sensíveis.`);
      setDiscoveredItems(data.urls);

      // Extract unique subdomains from wayback URLs
      const extractedSubs = new Set<string>();
      for (const u of data.urls) {
        try {
          const parsed = new URL(u);
          if (parsed.hostname.endsWith(target.domain)) {
            extractedSubs.add(parsed.hostname);
          }
        } catch {}
      }

      if (extractedSubs.size > 0) {
        const newAssetStubs: Partial<CorrelatedAsset>[] = Array.from(extractedSubs).map(sub => ({
          subdomain: sub,
          rootDomain: target.domain,
          isAlive: false,
          cnames: [],
          ips: [],
          ports: [],
          technologies: [],
          vulnerabilities: [],
          takeoverRisk: false,
          inScope: true,
          tags: ['wayback-mined'],
          discoveredVia: 'wayback',
        }));
        onAssetsDiscovered(newAssetStubs);
      }
    } catch (err: any) {
      addLog(`ERRO: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Run HTTP Probe
  const handleRunHttpProbe = async () => {
    if (!targetHost.trim()) return;
    setIsLoading(true);
    addLog(`Realizando probe HTTP/HTTPS e auditoria de headers em ${targetHost}...`);
    try {
      const res = await fetch('/api/recon/http-probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetHost.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro no probe HTTP');
      }

      addLog(`Status: ${data.status} ${data.statusText}. Title: "${data.title || 'N/A'}". Server: ${data.server || 'Oculto'}. Techs: ${data.technologies.map((t: any) => t.name).join(', ') || 'Nenhuma detectada'}`);

      const assetUpdate: Partial<CorrelatedAsset> = {
        subdomain: targetHost.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
        rootDomain: target.domain,
        isAlive: data.isAlive,
        httpStatus: data.status,
        httpTitle: data.title,
        webServer: data.server,
        contentLength: data.contentLength,
        contentType: data.contentType,
        technologies: data.technologies,
        headers: data.headers,
        inScope: true,
        tags: ['http-probed', `status-${data.status}`],
        discoveredVia: 'manual',
      };

      onAssetsDiscovered([assetUpdate]);
      setDiscoveredItems([data]);
    } catch (err: any) {
      addLog(`ERRO: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-5 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>Workbench de Reconhecimento em Tempo Real</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">
                LIVE REAL-WORLD
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Dispare consultas reais de infraestrutura, DNS DoH, Certificate Transparency e Wayback Machine.
            </p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setActiveTab('crtsh')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'crtsh' ? 'bg-emerald-600 text-black shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            1. CRT.sh TLS
          </button>
          <button
            onClick={() => setActiveTab('dns')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'dns' ? 'bg-emerald-600 text-black shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            2. DNS DoH & Takeover
          </button>
          <button
            onClick={() => setActiveTab('wayback')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'wayback' ? 'bg-emerald-600 text-black shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            3. Wayback & OTX
          </button>
          <button
            onClick={() => setActiveTab('http')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'http' ? 'bg-emerald-600 text-black shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            4. HTTP Probe & Headers
          </button>
        </div>
      </div>

      {/* Main Execution Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Controls Column */}
        <div className="md:col-span-5 space-y-4">
          {activeTab === 'crtsh' && (
            <div className="space-y-3 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
              <span className="text-xs font-bold text-zinc-200 block">Certificate Transparency Scanner</span>
              <p className="text-[11px] text-zinc-400">
                Consulta os logs públicos de certificados SSL/TLS para o domínio <strong>{target.domain}</strong>.
              </p>
              <button
                onClick={handleRunCrtsh}
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-900/40"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-black" />}
                <span>Disparar Varredura no CRT.sh</span>
              </button>
            </div>
          )}

          {activeTab === 'dns' && (
            <div className="space-y-3 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
              <span className="text-xs font-bold text-zinc-200 block">DNS DoH Resolver & Takeover Auditor</span>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Host / Subdomínio a Resolver:</label>
                <input
                  type="text"
                  value={targetHost}
                  onChange={(e) => setTargetHost(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={handleRunDns}
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-black" />}
                <span>Resolver DNS & Checar Takeover</span>
              </button>
            </div>
          )}

          {activeTab === 'wayback' && (
            <div className="space-y-3 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
              <span className="text-xs font-bold text-zinc-200 block">Wayback Machine & OTX URL Miner</span>
              <p className="text-[11px] text-zinc-400">
                Minera URLs arquivadas, rotas sensíveis e arquivos JavaScript para <strong>{target.domain}</strong>.
              </p>
              <button
                onClick={handleRunWayback}
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                <span>Buscar URLs no Arquivo Histórico</span>
              </button>
            </div>
          )}

          {activeTab === 'http' && (
            <div className="space-y-3 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
              <span className="text-xs font-bold text-zinc-200 block">Live HTTP Prober & Security Headers</span>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">URL ou Host:</label>
                <input
                  type="text"
                  value={targetHost}
                  onChange={(e) => setTargetHost(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={handleRunHttpProbe}
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                <span>Disparar Probe HTTP</span>
              </button>
            </div>
          )}
        </div>

        {/* Live Terminal Output Console (7 cols) */}
        <div className="md:col-span-7 bg-black border border-zinc-800 rounded-xl flex flex-col h-64 overflow-hidden">
          <div className="bg-zinc-900/90 border-b border-zinc-800 px-3 py-1.5 flex items-center justify-between text-xs">
            <span className="text-zinc-400 text-[11px] flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Console de Execução em Tempo Real</span>
            </span>
            <button
              onClick={() => setOutputLog([])}
              className="text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              Limpar
            </button>
          </div>

          <div className="p-3 font-mono text-xs overflow-y-auto flex-1 space-y-1 text-zinc-300">
            {outputLog.length === 0 ? (
              <span className="text-zinc-600 italic">Aguardando comando. Selecione uma ferramenta ao lado e clique em Disparar.</span>
            ) : (
              outputLog.map((line, idx) => (
                <div 
                  key={idx} 
                  className={`${
                    line.includes('ALERTA') || line.includes('ERRO') 
                      ? 'text-red-400 font-bold' 
                      : line.includes('Sucesso') || line.includes('VIVO') 
                      ? 'text-emerald-400' 
                      : 'text-zinc-300'
                  }`}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
