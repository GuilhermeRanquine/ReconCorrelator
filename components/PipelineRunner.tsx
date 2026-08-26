'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TargetProject, ReconJob, ToolLogEntry, CorrelatedAsset } from '@/types/recon';
import { 
  Play, 
  Square, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  RefreshCw, 
  Trash2,
  Download
} from 'lucide-react';

interface PipelineRunnerProps {
  target: TargetProject;
  onJobFinished: (discoveredAssets: CorrelatedAsset[]) => void;
}

export function PipelineRunner({ target, onJobFinished }: PipelineRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<ToolLogEntry[]>([]);
  const [stats, setStats] = useState({ subdomains: 0, alive: 0, ports: 0, vulns: 0 });
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  const steps = [
    {
      id: 'subfinder',
      name: 'Enumeração de Subdomínios',
      tool: 'subfinder & amass',
      cmd: `subfinder -d ${target.domain} -silent -json -all`,
      desc: 'Pesquisa em 40+ fontes OSINT (CertSpotter, VirusTotal, Shodan, SecurityTrails)',
    },
    {
      id: 'dnsx_httpx',
      name: 'DNS Resolution & Web Probing',
      tool: 'dnsx + httpx',
      cmd: `httpx -l subs.txt -status-code -title -tech-detect -cname -json -silent`,
      desc: 'Verifica resolução A/CNAME, códigos HTTP, servidores e tecnologias web',
    },
    {
      id: 'naabu_nmap',
      name: 'Port Scanning & Service Fingerprint',
      tool: 'naabu & nmap',
      cmd: `naabu -host ${target.domain} -top-ports 100 -silent -json | nmap -sV -sC -iL -`,
      desc: 'Varredura de portas abertas (80, 443, 8080, 8443, 9090, 22) e banners',
    },
    {
      id: 'nuclei',
      name: 'Vulnerability Triager',
      tool: 'nuclei engine',
      cmd: `nuclei -l alive.txt -t cves/ -t misconfiguration/ -t takeovers/ -json -silent`,
      desc: 'Varredura com templates comunitários para CVEs críticas, Spring Boot, Jenkins e Takeovers',
    },
    {
      id: 'correlator',
      name: 'Correlação & Validação OPSEC',
      tool: 'ReconCorrelator Brain',
      cmd: `recon-correlate --target ${target.domain} --enforce-scope`,
      desc: 'Construção do Grafo de Ataque, detecção de dangling CNAMEs e filtragem de escopo',
    },
  ];

  const addLog = (level: ToolLogEntry['level'], tool: string, message: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        level,
        tool,
        message,
      },
    ]);
  };

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStartPipeline = async () => {
    setIsRunning(true);
    setCurrentStepIndex(0);
    setProgress(15);
    setLogs([]);
    setStats({ subdomains: 0, alive: 0, ports: 0, vulns: 0 });

    addLog('info', 'ALPHA', `[INICIALIZAÇÃO] Disparando motor de reconhecimento no backend para: ${target.domain}`);
    addLog('info', 'OPSEC', `[ESCOPO] Verificando regras de escopo: ${target.inScope.length} in-scope, ${target.outOfScope.length} out-of-scope`);

    try {
      setCurrentStepIndex(1);
      setProgress(40);
      addLog('info', 'subfinder', `Consultando Certificate Logs e fontes OSINT no backend...`);

      const res = await fetch('/api/recon/runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: target.domain }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.fromCache) {
          addLog('success', 'CACHE', `[⚡ CACHE-HIT] Resultados recuperados da base de dados sem requisições repetidas.`);
        }
        if (Array.isArray(data.logs)) {
          data.logs.forEach((l: any) => addLog(l.level, l.tool, l.message));
        }

        setCurrentStepIndex(3);
        setProgress(85);

        if (data.stats) {
          setStats(data.stats);
        }

        if (Array.isArray(data.assets) && data.assets.length > 0) {
          onJobFinished(data.assets);
        }

        setCurrentStepIndex(4);
        setProgress(100);
        addLog('success', 'ALPHA', `[SQUAD FINALIZADO] Reconhecimento concluído e salvo no banco de dados.`);
      } else {
        addLog('error', 'BACKEND', `[-] Erro na execução: ${data.error || 'Falha desconhecida'}`);
      }
    } catch (err: any) {
      addLog('error', 'ENGINE', `[-] Falha na comunicação com o backend: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopPipeline = () => {
    setIsRunning(false);
    addLog('warning', 'BETA', '[PROCESS KILL] Pipeline interrompido pelo usuário. Processos filhos finalizados via SIGTERM.');
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Banner & Control */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-zinc-100 text-sm">Orquestrador de Reconocimento Assíncrono</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                Target: {target.domain}
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-0.5">
              Pipeline de 5 estágios: Subfinder ➔ DNSX / HTTPX ➔ Naabu / Nmap ➔ Nuclei ➔ Correlação
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={handleStopPipeline}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Abortar (SIGTERM)</span>
            </button>
          ) : (
            <button
              onClick={handleStartPipeline}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-emerald-900/40 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Executar Pipeline Completo</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar & Stages */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5">
            {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
            <span>Progresso da Operação:</span> <strong className="text-zinc-200">{progress}%</strong>
          </span>
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <span>Subdomínios: <strong className="text-zinc-200">{stats.subdomains}</strong></span>
            <span>Ativos Vivos: <strong className="text-emerald-400">{stats.alive}</strong></span>
            <span>Portas: <strong className="text-amber-400">{stats.ports}</strong></span>
            <span>Vulns: <strong className="text-red-400">{stats.vulns}</strong></span>
          </div>
        </div>

        {/* Bar */}
        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 pt-2">
          {steps.map((step, idx) => {
            const isCompleted = progress === 100 || (isRunning && currentStepIndex > idx);
            const isCurrent = isRunning && currentStepIndex === idx;

            return (
              <div
                key={step.id}
                className={`p-2.5 rounded-lg border text-xs transition-all ${
                  isCurrent
                    ? 'bg-zinc-900 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/20'
                    : isCompleted
                    ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                    : 'bg-zinc-950/40 border-zinc-900 text-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[11px] text-zinc-300">0{idx + 1}. {step.tool}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-zinc-800" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">{step.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Terminal Stream */}
      <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-zinc-900/90 border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            <span className="text-zinc-400 text-[11px] ml-2 font-bold">stdout / stderr stream (Recon Engine)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogs([])}
              className="text-zinc-500 hover:text-zinc-300 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpar Terminal</span>
            </button>
          </div>
        </div>

        <div className="p-4 h-[380px] overflow-y-auto font-mono text-xs space-y-1.5 bg-black/90">
          {logs.length === 0 ? (
            <div className="text-zinc-600 flex flex-col items-center justify-center h-full space-y-2">
              <Terminal className="w-8 h-8 text-zinc-700" />
              <p>O terminal de execução está em modo de espera (IDLE).</p>
              <p className="text-[11px]">Clique em &quot;Executar Pipeline Completo&quot; para iniciar as varreduras assíncronas.</p>
            </div>
          ) : (
            logs.map((log) => {
              let color = 'text-zinc-300';
              let badgeBg = 'bg-zinc-800 text-zinc-300';

              if (log.level === 'vuln') {
                color = 'text-red-400 font-bold';
                badgeBg = 'bg-red-950 border border-red-800 text-red-300';
              } else if (log.level === 'warning') {
                color = 'text-amber-400';
                badgeBg = 'bg-amber-950 text-amber-300';
              } else if (log.level === 'success') {
                color = 'text-emerald-400';
                badgeBg = 'bg-emerald-950 text-emerald-300';
              }

              return (
                <div key={log.id} className="flex items-start gap-2.5 font-mono leading-relaxed">
                  <span className="text-zinc-600 text-[10px] select-none">{log.timestamp}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold select-none ${badgeBg}`}>
                    {log.tool}
                  </span>
                  <span className={`${color} break-all`}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={terminalBottomRef} />
        </div>
      </div>
    </div>
  );
}
