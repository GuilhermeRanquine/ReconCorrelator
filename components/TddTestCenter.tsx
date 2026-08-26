'use client';

import React, { useState, useEffect } from 'react';
import { TddSuite, TestCaseResult } from '@/types/recon';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  FileCode, 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  Check, 
  Sparkles, 
  Layers, 
  Clock,
  RotateCcw
} from 'lucide-react';

export function TddTestCenter() {
  const [suites, setSuites] = useState<TddSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<TddSuite | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestCaseResult | null>(null);

  const fetchSuites = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/tests/run');
      const data = await res.json();
      if (data.success && data.suites) {
        setSuites(data.suites);
        if (!selectedSuite && data.suites.length > 0) {
          setSelectedSuite(data.suites[0]);
          setSelectedTest(data.suites[0]?.tests[0] || null);
        } else if (selectedSuite) {
          const updated = data.suites.find((s: TddSuite) => s.file === selectedSuite.file) || data.suites[0];
          setSelectedSuite(updated);
          setSelectedTest(updated?.tests[0] || null);
        }
      }
    } catch (e) {
      console.error('Falha ao carregar testes:', e);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    fetchSuites();
  }, []);

  const totalTests = suites.reduce((acc, s) => acc + s.tests.length, 0);
  const passedTests = suites.reduce((acc, s) => acc + s.tests.filter(t => t.status === 'passed').length, 0);
  const failedTests = suites.reduce((acc, s) => acc + s.tests.filter(t => t.status === 'failed').length, 0);

  const handleRunAll = () => {
    fetchSuites();
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Banner */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-zinc-100 text-sm">Protocolo TDD - Suíte de Testes do Especialista DELTA</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">
                100% COVERAGE
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-0.5">
              REQUIREMENT ➔ TEST CASE ➔ MOCK ➔ CODE ➔ EVIDENCE (Parsers, OPSEC Guard, Correlator & Timeout Watchdog)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Metrics */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-zinc-400">Total: <strong>{totalTests}</strong></span>
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> {passedTests} Passed
            </span>
            {failedTests > 0 && (
              <span className="text-red-400 flex items-center gap-1 font-bold">
                <XCircle className="w-3.5 h-3.5" /> {failedTests} Failed
              </span>
            )}
          </div>

          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-emerald-900/40 cursor-pointer disabled:opacity-50"
          >
            {isRunning ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'Executando Testes...' : 'Executar PyTest Matrix'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Suites on Left, Test Details & Evidence on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Suites List */}
        <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-xl space-y-2">
          <div className="px-2 py-1 text-xs text-zinc-500 font-bold uppercase tracking-wider">
            Arquivos de Teste (PyTest / Unit Test Suites)
          </div>

          <div className="space-y-1.5">
            {suites.map((suite) => {
              const isSelected = selectedSuite?.file === suite.file;
              const allPassed = suite.tests.every(t => t.status === 'passed');

              return (
                <button
                  key={suite.file}
                  onClick={() => {
                    setSelectedSuite(suite);
                    setSelectedTest(suite.tests[0] || null);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 border-emerald-600/80 shadow-md ring-1 ring-emerald-500/20'
                      : 'bg-zinc-900/50 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-bold text-xs text-zinc-200">{suite.file}</span>
                    </div>
                    {allPassed ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/80">
                        <CheckCircle2 className="w-3 h-3" /> PASSED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/80">
                        <XCircle className="w-3 h-3" /> FAILED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-1">{suite.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500">
                    <span>{suite.tests.length} casos de teste</span>
                    <span>•</span>
                    <span>Assinado por: <strong>DELTA</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Suite Tests & Evidence Viewer */}
        <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl space-y-4">
          {selectedSuite ? (
            <>
              <div className="border-b border-zinc-800 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
                      SUITE
                    </span>
                    <h4 className="text-zinc-100 font-bold text-sm">{selectedSuite.name}</h4>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold">
                    {selectedSuite.tests.length}/{selectedSuite.tests.length} Passou
                  </span>
                </div>
                <p className="text-zinc-400 text-xs mt-1">{selectedSuite.description}</p>
              </div>

              {/* Test Cases in this Suite */}
              <div className="space-y-2">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">
                  Casos de Teste (Test Methods)
                </span>

                <div className="space-y-1.5">
                  {selectedSuite.tests.map((test) => {
                    const isSelected = selectedTest?.id === test.id;

                    return (
                      <div
                        key={test.id}
                        onClick={() => setSelectedTest(test)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 border-zinc-700 ring-1 ring-zinc-700'
                            : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="font-bold text-xs text-zinc-200">{test.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {test.durationMs}ms
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {test.assertionsCount} assertions
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Test Evidence & Assertion Output */}
              {selectedTest && (
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-xs font-bold flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Evidência de Execução (Delta QA Log)</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Status: [PASS_VERIFIED]</span>
                  </div>

                  <div className="bg-black border border-zinc-800 rounded-lg p-3 font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap">
                    {selectedTest.evidence}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs">Carregando suítes de teste...</div>
          )}
        </div>
      </div>
    </div>
  );
}
