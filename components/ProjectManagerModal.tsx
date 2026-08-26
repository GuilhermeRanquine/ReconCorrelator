'use client';

import React, { useState } from 'react';
import { TargetProject, generateAccessCode } from '@/types/recon';
import { IndustrySector, EnterpriseTier, SlaLevel, ComplianceFramework } from '@/types/enterprise';
import { 
  X, 
  Trash2, 
  Plus, 
  Globe, 
  Check, 
  AlertTriangle, 
  ShieldCheck,
  Building2,
  Key,
  Copy,
  Lock,
  Briefcase,
  Layers,
  Filter
} from '@/lib/icons';

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
  // Form state
  const [newDomain, setNewDomain] = useState('');
  const [newName, setNewName] = useState('');
  const [newTradeName, setNewTradeName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newIndustry, setNewIndustry] = useState<IndustrySector>('fintech');
  const [newTier, setNewTier] = useState<EnterpriseTier>('tier1_mission_critical');
  const [newSla, setNewSla] = useState<SlaLevel>('24_7_soc_15m_crit');
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
    const code = customAccessCode.trim() ? customAccessCode.trim().toUpperCase() : generateAccessCode('NEXUS');

    const newProj: TargetProject = {
      id: `target-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      tradeName: newTradeName.trim() || cleanName,
      cnpjOrTaxId: newCnpj.trim() || undefined,
      industry: newIndustry,
      tier: newTier,
      sla: newSla,
      domain: cleanDomain,
      accessCode: code,
      description: `Superfície de reconhecimento e monitoramento contínuo da empresa ${cleanName}`,
      createdAt: new Date().toISOString(),
      confidentialityLevel: 'strictly_confidential',
      complianceFrameworks: ['ISO27001', 'LGPD', 'SOC2_TYPE2'],
      contractStatus: 'active',
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
        policySummary: 'Regras de teste e auditoria autorizada de cibersegurança MSSP.',
        safeHarbor: true,
        prohibitedVulns: ['DDoS', 'Social Engineering'],
        requiredHeaders: [{ key: 'X-Nexus-Audit', value: 'recon-correlator-enterprise' }],
        targetArchitecture: 'cloud_native',
        extractedAt: new Date().toISOString(),
      },
      isDemo: false,
    };

    onCreateNewProject(newProj);
    setNewDomain('');
    setNewName('');
    setNewTradeName('');
    setNewCnpj('');
    setCustomAccessCode('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <span>Gestão de Empresas & Clientes MSSP</span>
                <span className="text-[10px] bg-zinc-800 text-emerald-400 px-2 py-0.5 rounded-full border border-zinc-700">
                  {projects.length} Registradas
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Isolamento estrito e chaves de segurança por empresa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Create New Company Button / Form */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 px-4 border border-dashed border-zinc-700 hover:border-emerald-500/60 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 text-zinc-300 hover:text-emerald-300 text-xs flex items-center justify-center gap-2 transition-all shadow-sm group"
            >
              <Plus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Cadastrar Nova Empresa / Cliente Enterprise</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-emerald-500/40 space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Dados Corporativos do Cliente
                </span>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1 uppercase">
                    Razão Social (Legal Name) *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Banco Global S.A."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1 uppercase">
                    Nome Fantasia (Trade Name)
                  </label>
                  <input
                    type="text"
                    value={newTradeName}
                    onChange={(e) => setNewTradeName(e.target.value)}
                    placeholder="Ex: Global Bank"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1 uppercase">
                    Domínio Principal *
                  </label>
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="ex: globalbank.com.br"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-emerald-400 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1 uppercase">
                    CNPJ / Tax ID
                  </label>
                  <input
                    type="text"
                    value={newCnpj}
                    onChange={(e) => setNewCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1 uppercase">
                    Setor Econômico
                  </label>
                  <select
                    value={newIndustry}
                    onChange={(e) => setNewIndustry(e.target.value as IndustrySector)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="fintech">Fintech & Banking</option>
                    <option value="health_pharma">Saúde & Farmacêutica</option>
                    <option value="ecommerce">E-Commerce & Varejo</option>
                    <option value="saas_cloud">SaaS & Cloud Provider</option>
                    <option value="government">Governo & Setor Público</option>
                    <option value="energy_utilities">Energia & Utilities</option>
                    <option value="defense_aerospace">Defesa & Aeroespacial</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 font-bold block mb-1 uppercase">
                    Nível de Atendimento & SLA
                  </label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as EnterpriseTier)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="tier1_mission_critical">Tier 1 Mission-Critical (24/7 SOC)</option>
                    <option value="tier2_enterprise">Tier 2 Enterprise (4h Response)</option>
                    <option value="tier3_retainer">Tier 3 Retainer (12h Standard)</option>
                    <option value="incident_response">Resposta a Incidentes Dedicada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 font-bold block mb-1 uppercase">
                  Código de Acesso Personalizado (Opcional)
                </label>
                <input
                  type="text"
                  value={customAccessCode}
                  onChange={(e) => setCustomAccessCode(e.target.value)}
                  placeholder="Ex: NEXUS-GB-2026 (Deixe vazio para gerar aleatório)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-amber-300 uppercase placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newDomain.trim()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar e Criar Empresa
                </button>
              </div>
            </div>
          )}

          {/* Companies List */}
          <div className="space-y-2.5">
            <h3 className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold flex items-center justify-between">
              <span>Empresas Ativas</span>
              <span className="text-zinc-500">{projects.length} Total</span>
            </h3>

            {projects.length === 0 ? (
              <div className="p-8 text-center border border-zinc-800/80 rounded-2xl bg-zinc-900/30 text-zinc-500 text-xs">
                Nenhuma empresa cadastrada no momento.
              </div>
            ) : (
              projects.map(p => {
                const isSelected = currentProject?.id === p.id;
                const isDeleting = deleteConfirmId === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p);
                      onClose();
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20' 
                        : 'bg-zinc-900/50 hover:bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{p.name}</span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30 uppercase">
                              Ativa
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                            {p.industry || 'Fintech'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span>🌐 {p.domain}</span>
                          {p.cnpjOrTaxId && <span>• 📄 {p.cnpjOrTaxId}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Copy Access Code */}
                      <button
                        onClick={(e) => handleCopyCode(p, e)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-950 border border-amber-800/60 text-amber-300 text-[11px] hover:border-amber-500 transition-colors"
                        title="Copiar Código Único de Acesso"
                      >
                        <Key className="w-3 h-3 text-amber-400" />
                        <span className="font-bold font-mono">{p.accessCode}</span>
                        {copiedCodeId === p.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                      </button>

                      {/* Delete Action */}
                      {isDeleting ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              onDeleteProject(p.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg hover:bg-rose-500"
                          >
                            Confirmar Exclusão
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-zinc-800 text-zinc-300 text-[10px] rounded-lg"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(p.id);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
                          title="Remover Empresa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span>🔒 Todos os dados são criptografados com AES-256-GCM no Vault</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
