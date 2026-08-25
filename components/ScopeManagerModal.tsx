'use client';

import React, { useState } from 'react';
import { TargetProject, ScopeRule } from '@/types/recon';
import { ScopeGuard } from '@/lib/parsers/scopeGuard';
import { 
  X, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Info,
  ShieldCheck
} from 'lucide-react';

interface ScopeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: TargetProject;
  onUpdateScope: (updatedTarget: TargetProject) => void;
}

export function ScopeManagerModal({
  isOpen,
  onClose,
  target,
  onUpdateScope,
}: ScopeManagerModalProps) {
  const [inScopeInput, setInScopeInput] = useState('');
  const [outOfScopeInput, setOutOfScopeInput] = useState('');
  const [testDomain, setTestDomain] = useState('');
  const [testResult, setTestResult] = useState<{ allowed: boolean; reason: string } | null>(null);

  if (!isOpen) return null;

  const currentGuard = new ScopeGuard(target.inScope, target.outOfScope, target.rules);

  const handleAddInScope = () => {
    if (!inScopeInput.trim()) return;
    const clean = inScopeInput.trim().toLowerCase();
    if (!target.inScope.includes(clean)) {
      const updated = { ...target, inScope: [...target.inScope, clean] };
      onUpdateScope(updated);
      setInScopeInput('');
    }
  };

  const handleRemoveInScope = (val: string) => {
    const updated = { ...target, inScope: target.inScope.filter(s => s !== val) };
    onUpdateScope(updated);
  };

  const handleAddOutOfScope = () => {
    if (!outOfScopeInput.trim()) return;
    const clean = outOfScopeInput.trim().toLowerCase();
    if (!target.outOfScope.includes(clean)) {
      const updated = { ...target, outOfScope: [...target.outOfScope, clean] };
      onUpdateScope(updated);
      setOutOfScopeInput('');
    }
  };

  const handleRemoveOutOfScope = (val: string) => {
    const updated = { ...target, outOfScope: target.outOfScope.filter(s => s !== val) };
    onUpdateScope(updated);
  };

  const handleTestScope = () => {
    if (!testDomain.trim()) return;
    const res = currentGuard.isAllowed(testDomain.trim());
    setTestResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-zinc-900/90 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">OPSEC Scope Guard - Gestão de Fronteiras</h3>
              <p className="text-[11px] text-zinc-400">Proteção contra Scope Leakage em Bug Bounty e Pentest</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Interactive Tester Sandbox */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulador de Validação em Tempo Real (Sandbox)</span>
              </span>
              <span className="text-[10px] text-zinc-500">Testa contra regras ativas</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Digite um host ou IP para testar (ex: admin.acmefinance.io, 198.51.100.12)"
                value={testDomain}
                onChange={(e) => {
                  setTestDomain(e.target.value);
                  if (e.target.value.trim()) {
                    setTestResult(currentGuard.isAllowed(e.target.value.trim()));
                  } else {
                    setTestResult(null);
                  }
                }}
                className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleTestScope}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Validar
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                testResult.allowed
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-red-950/60 border-red-800 text-red-300'
              }`}>
                {testResult.allowed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">
                    {testResult.allowed ? 'ALVO AUTORIZADO (IN-SCOPE)' : 'ALVO PROIBIDO (OUT-OF-SCOPE)'}
                  </span>
                  <span className="text-[11px] opacity-90 block mt-0.5">{testResult.reason}</span>
                </div>
              </div>
            )}
          </div>

          {/* In-Scope and Out-of-Scope lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* In Scope */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>IN-SCOPE (Autorizados)</span>
                </span>
                <span className="text-[10px] text-zinc-500">{target.inScope.length} regras</span>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="*.target.com ou 10.0.0.0/24"
                  value={inScopeInput}
                  onChange={(e) => setInScopeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddInScope()}
                  className="flex-1 bg-black border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleAddInScope}
                  className="px-3 py-1.5 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {target.inScope.map((item) => (
                  <div key={item} className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300">
                    <span className="font-mono text-[11px] truncate">{item}</span>
                    <button
                      onClick={() => handleRemoveInScope(item)}
                      className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Out of Scope */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  <span>OUT-OF-SCOPE (Exclusões)</span>
                </span>
                <span className="text-[10px] text-zinc-500">{target.outOfScope.length} regras</span>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="admin.target.com ou 1.2.3.4"
                  value={outOfScopeInput}
                  onChange={(e) => setOutOfScopeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOutOfScope()}
                  className="flex-1 bg-black border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
                />
                <button
                  onClick={handleAddOutOfScope}
                  className="px-3 py-1.5 bg-red-950 border border-red-800 text-red-300 rounded-lg text-xs font-bold hover:bg-red-900 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {target.outOfScope.map((item) => (
                  <div key={item} className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300">
                    <span className="font-mono text-[11px] truncate text-red-300">{item}</span>
                    <button
                      onClick={() => handleRemoveOutOfScope(item)}
                      className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-900/90 border-t border-zinc-800 p-3.5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar e Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
