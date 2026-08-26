'use client';

import React, { useState } from 'react';
import { TargetProject, generateAccessCode } from '@/types/recon';
import { 
  X, 
  FolderKanban, 
  Trash2, 
  Plus, 
  Globe, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck,
  Layers,
  ArrowRight,
  Key,
  Copy,
  Lock
} from 'lucide-react';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: TargetProject[];
  currentProject: TargetProject | null;
  onSelectProject: (project: TargetProject) => void;
  onDeleteProject: (projectId: string) => void;
  onCreateNewProject: (project: TargetProject) => void;
}

export function ProjectManagerModal({
  isOpen,
  onClose,
  projects,
  currentProject,
  onSelectProject,
  onDeleteProject,
  onCreateNewProject,
}: ProjectManagerModalProps) {
  const [newDomain, setNewDomain] = useState('');
  const [newName, setNewName] = useState('');
  const [customAccessCode, setCustomAccessCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = (project: TargetProject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.accessCode) {
      navigator.clipboard.writeText(project.accessCode);
      setCopiedCodeId(project.id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  const handleCreate = () => {
    if (!newDomain.trim()) return;
    const cleanDomain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const cleanName = newName.trim() || cleanDomain;
    const code = customAccessCode.trim() ? customAccessCode.trim().toUpperCase() : generateAccessCode();

    const newProj: TargetProject = {
      id: `target-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      domain: cleanDomain,
      accessCode: code,
      description: `Superfície de reconhecimento do programa ${cleanName}`,
      createdAt: new Date().toISOString(),
      inScope: [`*.${cleanDomain}`, cleanDomain],
      outOfScope: [],
      rules: [
        {
          id: `rule-${Date.now()}-1`,
          type: 'wildcard',
          pattern: `*.${cleanDomain}`,
          isOutOfScope: false,
          rewardEligible: true,
        },
        {
          id: `rule-${Date.now()}-2`,
          type: 'domain',
          pattern: cleanDomain,
          isOutOfScope: false,
          rewardEligible: true,
        }
      ],
      policy: {
        platform: 'custom',
        policySummary: 'Regras de teste do programa. Não realize testes de DoS/DDoS.',
        safeHarbor: true,
        prohibitedVulns: ['DDoS', 'Self-XSS', 'Social Engineering'],
        requiredHeaders: [{ key: 'X-Bug-Bounty', value: 'w0rmingstar', description: 'Header de identificação' }],
        targetArchitecture: 'cloud_native',
        bountyTiers: [
          { severity: 'critical', minUsd: 3000, maxUsd: 10000 },
          { severity: 'high', minUsd: 1000, maxUsd: 3000 },
          { severity: 'medium', minUsd: 300, maxUsd: 1000 },
          { severity: 'low', minUsd: 100, maxUsd: 300 },
        ],
        extractedAt: new Date().toISOString(),
      },
      isDemo: false,
    };

    onCreateNewProject(newProj);
    setNewDomain('');
    setNewName('');
    setCustomAccessCode('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">Gerenciador de Bug Bounties & Chaves de Acesso</h3>
              <p className="text-[11px] text-zinc-400">Cada programa possui isolamento estrito e código de acesso único</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Programas Cadastrados:</span>
              <strong className="text-emerald-400">{projects.length}</strong>
            </div>

            <button
              onClick={() => setIsCreating(!isCreating)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'Fechar Formulário' : 'Novo Bug Bounty Manual'}</span>
            </button>
          </div>

          {/* New Project Inline Form */}
          {isCreating && (
            <div className="p-4 bg-zinc-900/80 border border-emerald-900/60 rounded-xl space-y-3 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cadastrar Novo Alvo Real de Bug Bounty</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Domínio Raiz (ex: empresa.com):</label>
                  <input
                    type="text"
                    placeholder="empresa.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Nome da Organização (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Empresa Real Corp"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-700"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-zinc-400 block mb-1">Código Único de Acesso (Deixe em branco para auto-gerar):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="ex: BB-MEU-ALVO ou deixe vazio para auto-gerar"
                      value={customAccessCode}
                      onChange={(e) => setCustomAccessCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono uppercase focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomAccessCode(generateAccessCode())}
                      className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded-lg cursor-pointer"
                    >
                      Gerar Código
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newDomain.trim()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Criar e Ativar
                </button>
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {projects.length === 0 ? (
              <div className="p-8 text-center bg-zinc-900/30 border border-zinc-800/60 rounded-xl space-y-2">
                <AlertTriangle className="w-8 h-8 text-zinc-500 mx-auto" />
                <p className="text-xs text-zinc-300 font-bold">Nenhum programa de Bug Bounty cadastrado.</p>
                <p className="text-[11px] text-zinc-500">Crie seu primeiro alvo acima para começar do zero com segurança total.</p>
              </div>
            ) : (
              projects.map((project) => {
                const isSelected = currentProject?.id === project.id;
                const isConfirmingDelete = deleteConfirmId === project.id;
                const isCopied = copiedCodeId === project.id;

                return (
                  <div
                    key={project.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-600/80 shadow-md ring-1 ring-emerald-500/20'
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700'
                    }`}
                  >
                    <div 
                      onClick={() => {
                        onSelectProject(project);
                        onClose();
                      }}
                      className="flex-1 flex items-start gap-3 cursor-pointer"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected 
                          ? 'bg-emerald-600 text-black font-bold' 
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        <Globe className="w-4 h-4" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-zinc-100 text-xs">{project.name}</span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">({project.domain})</span>
                          {isSelected && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-black font-bold">
                              ATIVO
                            </span>
                          )}
                        </div>

                        {/* Access Code Pill */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black border border-amber-800/60 text-amber-300 text-[10px] font-mono">
                            <Key className="w-3 h-3 text-amber-400" />
                            <span>Código: <strong>{project.accessCode || 'N/A'}</strong></span>
                            <button
                              onClick={(e) => handleCopyCode(project, e)}
                              className="ml-1 text-zinc-400 hover:text-amber-200 transition-colors cursor-pointer"
                              title="Copiar Código de Acesso Único"
                            >
                              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete / Action area */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 bg-red-950 border border-red-800 rounded-lg p-1">
                          <span className="text-[10px] text-red-300 font-bold px-1">Excluir?</span>
                          <button
                            onClick={() => {
                              onDeleteProject(project.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px] cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(project.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Excluir este programa e todos os seus dados"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onSelectProject(project);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-black'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Desbloqueado</span>
                          </>
                        ) : (
                          <>
                            <span>Entrar</span>
                            <ArrowRight className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-zinc-900/90 border-t border-zinc-800 p-3.5 flex justify-between items-center text-xs">
          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Isolamento Estrito Ativo: Nenhum dado é compartilhado entre bounties.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
