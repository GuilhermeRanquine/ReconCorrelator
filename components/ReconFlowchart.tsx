'use client';

import React, { useState } from 'react';
import { TargetProject, ReconPlaybook, ReconFlowStep, CorrelatedAsset } from '@/types/recon';
import { ReconPlaybookGenerator } from '@/lib/reconPlaybookGenerator';
import { 
  GitBranch, 
  Terminal, 
  Copy, 
  Check, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Code, 
  BookOpen, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Globe,
  Radio,
  FileCheck
} from 'lucide-react';

interface ReconFlowchartProps {
  target: TargetProject;
  onExecuteAutomation?: (action: string, step: ReconFlowStep) => void;
  discoveredCount?: number;
}

export function ReconFlowchart({ target, onExecuteAutomation, discoveredCount = 0 }: ReconFlowchartProps) {
  // Maintain custom step statuses per target
  const [stepStatusOverrides, setStepStatusOverrides] = useState<Record<string, ReconFlowStep['status']>>({});
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const basePlaybook = React.useMemo(() => ReconPlaybookGenerator.generateForTarget(target), [target]);

  const stepsWithStatus = React.useMemo(() => {
    return basePlaybook.steps.map(step => ({
      ...step,
      status: stepStatusOverrides[step.id] || step.status,
    }));
  }, [basePlaybook, stepStatusOverrides]);

  const activeStepId = selectedStepId || stepsWithStatus[0]?.id;
  const selectedStep = stepsWithStatus.find(s => s.id === activeStepId) || stepsWithStatus[0];

  const handleToggleStatus = (stepId: string, newStatus: ReconFlowStep['status']) => {
    setStepStatusOverrides(prev => ({
      ...prev,
      [stepId]: newStatus,
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const completedSteps = stepsWithStatus.filter(s => s.status === 'completed').length;
  const progressPercent = Math.round((completedSteps / stepsWithStatus.length) * 100);

  return (
    <div className="space-y-5 font-mono">
      {/* Header Info & Progress */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-zinc-100">
              Fluxograma Dinâmico de Reconhecimento & Playbook: {target.domain}
            </h2>
          </div>
          <p className="text-zinc-400 text-xs max-w-2xl leading-relaxed">
            Metodologia metódica de 8 fases alinhada aos padrões OWASP WSTG, PTES e Bug Bounty Top Tier (HackerOne/Bugcrowd).
          </p>
        </div>

        {/* Progress Metric */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-4 py-3 min-w-[220px] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Progresso do Playbook</span>
            <span className="text-emerald-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
            <span>{completedSteps} de {stepsWithStatus.length} fases concluídas</span>
            <span>{discoveredCount} ativos mapeados</span>
          </div>
        </div>
      </div>

      {/* Main Flowchart Grid: Left Nodes Pipeline / Right Detailed Phase Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Visual Step Nodes & Connectors (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Trilha de Execução (Fases 1 a 8)</span>
            <span className="text-[10px] text-zinc-500">Clique para inspecionar</span>
          </div>

          <div className="space-y-2">
            {stepsWithStatus.map((step) => {
              const isSelected = step.id === activeStepId;
              const isCompleted = step.status === 'completed';
              const isInProgress = step.status === 'in_progress';

              return (
                <div key={step.id} className="relative">
                  {/* Visual Node Card */}
                  <div
                    onClick={() => setSelectedStepId(step.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-zinc-900 border-emerald-500/80 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                        : isCompleted
                        ? 'bg-zinc-900/40 border-emerald-900/40 hover:bg-zinc-900 hover:border-zinc-700'
                        : isInProgress
                        ? 'bg-zinc-900/60 border-cyan-900/60 hover:bg-zinc-900 hover:border-cyan-700'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(
                            step.id,
                            step.status === 'completed' ? 'pending' : step.status === 'pending' ? 'in_progress' : 'completed'
                          );
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-transform hover:scale-105 shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : isInProgress
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-800 animate-pulse'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                        }`}
                        title="Alternar status da fase"
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : isInProgress ? <Clock className="w-3.5 h-3.5" /> : step.phaseNumber}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase truncate">
                            {step.phaseName.split(':')[0]}
                          </span>
                          {step.isAutomationSupported && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold">
                              AUTO 1-CLICK
                            </span>
                          )}
                        </div>
                        <h4 className={`text-xs font-bold truncate ${
                          isSelected ? 'text-emerald-300' : isCompleted ? 'text-zinc-300 line-through opacity-80' : 'text-zinc-200'
                        }`}>
                          {step.stepTitle}
                        </h4>
                      </div>
                    </div>

                    <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-zinc-600'
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Step Inspector & Command Generator (7 cols) */}
        <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col space-y-5">
          {/* Inspector Header */}
          <div className="border-b border-zinc-800/80 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                {selectedStep.phaseName}
              </span>
              <h3 className="text-sm font-bold text-zinc-100 mt-1.5">{selectedStep.stepTitle}</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{selectedStep.description}</p>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-1.5">
              {(['pending', 'in_progress', 'completed', 'skipped'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => handleToggleStatus(selectedStep.id, st)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    selectedStep.status === st
                      ? st === 'completed'
                        ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                        : st === 'in_progress'
                        ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                        : st === 'skipped'
                        ? 'bg-amber-950 border-amber-700 text-amber-300'
                        : 'bg-zinc-800 border-zinc-600 text-zinc-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {st === 'pending' ? 'Pendente' : st === 'in_progress' ? 'Executando' : st === 'completed' ? 'Concluído' : 'Ignorar'}
                </button>
              ))}
            </div>
          </div>

          {/* 1-Click Integrated Automation Banner (if available) */}
          {selectedStep.isAutomationSupported && selectedStep.automationAction && onExecuteAutomation && (
            <div className="bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-zinc-950 border border-cyan-800/60 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ação de Reconhecimento em Tempo Real Disponível</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Dispare esta fase diretamente no navegador/servidor para o alvo <strong>{target.domain}</strong>.
                </p>
              </div>

              <button
                onClick={() => onExecuteAutomation(selectedStep.automationAction!, selectedStep)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg hover:shadow-cyan-900/40 cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Disparar Agora</span>
              </button>
            </div>
          )}

          {/* Recommended Tools Badges */}
          <div className="space-y-1.5">
            <span className="text-xs text-zinc-400 font-semibold block">Ferramentas Recomendadas do Squad:</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedStep.recommendedTools.map((tool) => (
                <span key={tool} className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {/* CLI Commands Snippets (Interpolated with Real Target Domain) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-bold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Comandos Prontos para Executar no Terminal / VPS</span>
              </span>
              <span className="text-[10px] text-zinc-500">Target: {target.domain}</span>
            </div>

            <div className="space-y-2.5">
              {selectedStep.commandSnippets.map((cmd, idx) => {
                const uniqueKey = `${selectedStep.id}-cmd-${idx}`;
                const isCopied = copiedIndex === uniqueKey;

                return (
                  <div key={idx} className="bg-black border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="bg-zinc-900/80 border-b border-zinc-800 px-3 py-1.5 flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-200 text-[11px]">{cmd.toolName}</span>
                      <button
                        onClick={() => copyToClipboard(cmd.cliCommand, uniqueKey)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>

                    <div className="p-3 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap selection:bg-emerald-800 selection:text-white">
                      {cmd.cliCommand}
                    </div>

                    <div className="px-3 pb-2.5 text-[11px] text-zinc-400 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900 pt-2">
                      <span>{cmd.explanation}</span>
                      {cmd.wordlistSuggestion && (
                        <span className="text-[10px] text-cyan-400 font-mono">
                          📁 {cmd.wordlistSuggestion}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expert Red Team Tips */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3.5 space-y-2 text-xs">
            <span className="text-zinc-200 font-bold flex items-center gap-1.5 text-xs text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Dicas de Ouro do Squad ALPHA (Red Team Enforced)</span>
            </span>
            <ul className="space-y-1 text-zinc-400 text-[11px] leading-relaxed list-disc list-inside">
              {selectedStep.expertProTips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
