'use client';

import React, { useState, useMemo } from 'react';
import { CorrelatedAsset, Vulnerability } from '@/types/recon';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Terminal, 
  Copy, 
  Check, 
  Globe, 
  Server, 
  Sparkles, 
  Tag, 
  ChevronRight, 
  Eye, 
  Code,
  Flame
} from 'lucide-react';

interface AssetsTableProps {
  assets: CorrelatedAsset[];
  onOpenAiForAsset: (asset: CorrelatedAsset) => void;
  onTagAsset?: (assetId: string, tag: string) => void;
}

export function AssetsTable({ assets, onOpenAiForAsset, onTagAsset }: AssetsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | '200' | '8080' | 'takeover' | 'vulns' | 'aws'>('all');
  const [selectedAsset, setSelectedAsset] = useState<CorrelatedAsset | null>(assets[0] || null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Filtering
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Free-text search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesSub = asset.subdomain.toLowerCase().includes(query);
        const matchesTitle = asset.httpTitle?.toLowerCase().includes(query);
        const matchesIp = asset.ips.some(ip => ip.includes(query));
        const matchesTech = asset.technologies.some(t => t.name.toLowerCase().includes(query));
        const matchesVuln = asset.vulnerabilities.some(v => v.name.toLowerCase().includes(query));
        if (!matchesSub && !matchesTitle && !matchesIp && !matchesTech && !matchesVuln) {
          return false;
        }
      }

      // Quick Filters
      if (quickFilter === '200') return asset.httpStatus === 200;
      if (quickFilter === '8080') return asset.ports.some(p => p.port === 8080 || p.port === 8443);
      if (quickFilter === 'takeover') return asset.takeoverRisk;
      if (quickFilter === 'vulns') return asset.vulnerabilities.length > 0;
      if (quickFilter === 'aws') return asset.cloudProvider === 'aws' || asset.cnames.some(c => c.includes('amazon') || c.includes('elasticbeanstalk'));

      return true;
    });
  }, [assets, searchTerm, quickFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const copyAllLiveUrls = () => {
    const urls = filteredAssets
      .filter(a => a.isAlive && a.responseUrl)
      .map(a => a.responseUrl)
      .join('\n');
    copyToClipboard(urls, 'all-urls');
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Filter Bar */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtrar por subdomínio, IP, tecnologia, título ou CVE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          <button
            onClick={() => setQuickFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              quickFilter === 'all'
                ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({assets.length})
          </button>

          <button
            onClick={() => setQuickFilter('200')}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
              quickFilter === '200'
                ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-emerald-400'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            HTTP 200 ({assets.filter(a => a.httpStatus === 200).length})
          </button>

          <button
            onClick={() => setQuickFilter('vulns')}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
              quickFilter === 'vulns'
                ? 'bg-red-950 border-red-700 text-red-300'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-red-400'
            }`}
          >
            <Flame className="w-3 h-3 text-red-400" />
            Com Vulnerabilidades ({assets.filter(a => a.vulnerabilities.length > 0).length})
          </button>

          <button
            onClick={() => setQuickFilter('takeover')}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${
              quickFilter === 'takeover'
                ? 'bg-amber-950 border-amber-700 text-amber-300'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Takeover Candidate ({assets.filter(a => a.takeoverRisk).length})
          </button>

          <button
            onClick={() => setQuickFilter('8080')}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              quickFilter === '8080'
                ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-cyan-400'
            }`}
          >
            Portas 8080/8443 ({assets.filter(a => a.ports.some(p => p.port === 8080 || p.port === 8443)).length})
          </button>

          <button
            onClick={copyAllLiveUrls}
            className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 flex items-center gap-1 transition-colors cursor-pointer"
            title="Copiar lista de URLs HTTP(S) vivas para clipboard"
          >
            {copiedText === 'all-urls' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedText === 'all-urls' ? 'URLs Copiadas!' : 'Copiar URLs Vivas'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Table on Left + Inspector Drawer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Assets Table */}
        <div className="lg:col-span-7 xl:col-span-8 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto max-h-[640px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800 sticky top-0 z-10 backdrop-blur">
                <tr>
                  <th className="py-2.5 px-3">Subdomínio</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Título / Web Server</th>
                  <th className="py-2.5 px-3">Portas / IPs</th>
                  <th className="py-2.5 px-3">Findings</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      Nenhum ativo encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const isSelected = selectedAsset?.id === asset.id;
                    const maxSev = asset.vulnerabilities.find(v => v.severity === 'critical')
                      ? 'critical'
                      : asset.vulnerabilities.find(v => v.severity === 'high')
                      ? 'high'
                      : asset.vulnerabilities.find(v => v.severity === 'medium')
                      ? 'medium'
                      : asset.vulnerabilities.length > 0
                      ? 'low'
                      : null;

                    return (
                      <tr
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className={`hover:bg-zinc-900/70 transition-colors cursor-pointer ${
                          isSelected ? 'bg-zinc-900 border-l-2 border-l-cyan-400' : ''
                        }`}
                      >
                        {/* Subdomain */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${asset.isAlive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                            <span className="font-bold text-zinc-200">{asset.subdomain}</span>
                          </div>
                          {asset.cnames.length > 0 && (
                            <span className="text-[10px] text-zinc-500 block truncate max-w-[180px]" title={asset.cnames.join(', ')}>
                              CNAME: {asset.cnames[0]}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          {asset.httpStatus ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              asset.httpStatus >= 200 && asset.httpStatus < 300 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                              asset.httpStatus >= 300 && asset.httpStatus < 400 ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                              asset.httpStatus === 404 ? 'bg-zinc-800 text-zinc-400' :
                              'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}>
                              HTTP {asset.httpStatus}
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-[10px]">Unreachable</span>
                          )}
                        </td>

                        {/* Title & Server */}
                        <td className="py-3 px-3 max-w-[200px]">
                          <span className="text-zinc-300 font-medium truncate block" title={asset.httpTitle || 'Sem título'}>
                            {asset.httpTitle || <em className="text-zinc-600 font-normal">Sem título</em>}
                          </span>
                          <span className="text-[10px] text-zinc-500 truncate block">
                            {asset.webServer || 'Nenhum banner'}
                          </span>
                        </td>

                        {/* Ports & IPs */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[140px]">
                            {asset.ports.slice(0, 3).map(p => (
                              <span key={p.port} className="bg-zinc-900 border border-zinc-800 text-amber-300 px-1 py-0.2 rounded text-[10px]">
                                :{p.port}
                              </span>
                            ))}
                            {asset.ports.length > 3 && (
                              <span className="text-[10px] text-zinc-500">+{asset.ports.length - 3}</span>
                            )}
                          </div>
                          {asset.ips.length > 0 && (
                            <span className="text-[10px] text-cyan-400 block mt-0.5">{asset.ips[0]}</span>
                          )}
                        </td>

                        {/* Vulnerability badges */}
                        <td className="py-3 px-3">
                          {asset.takeoverRisk && (
                            <span className="px-1.5 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 text-[10px] font-bold block mb-1">
                              TAKEOVER
                            </span>
                          )}
                          {asset.vulnerabilities.length > 0 ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              maxSev === 'critical' ? 'bg-red-950 text-red-300 border border-red-800' :
                              maxSev === 'high' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                              'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {asset.vulnerabilities.length} vuln(s)
                            </span>
                          ) : (
                            <span className="text-zinc-600 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAiForAsset(asset);
                            }}
                            className="p-1.5 hover:bg-purple-950 hover:text-purple-300 rounded border border-transparent hover:border-purple-800 text-zinc-400 transition-colors"
                            title="Disparar Triagem com IA Gemini para este ativo"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Inspector Panel */}
        <div className="lg:col-span-5 xl:col-span-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col justify-between overflow-y-auto max-h-[640px]">
          {selectedAsset ? (
            <div className="space-y-4">
              {/* Asset Header */}
              <div className="border-b border-zinc-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedAsset.isAlive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {selectedAsset.isAlive ? `HTTP ${selectedAsset.httpStatus || 200} (VIVO)` : 'INACESSÍVEL'}
                  </span>

                  <button
                    onClick={() => onOpenAiForAsset(selectedAsset)}
                    className="flex items-center gap-1 px-2 py-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-700/80 rounded text-purple-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>AI RedTeam Triage</span>
                  </button>
                </div>

                <h3 className="text-zinc-100 font-bold text-base mt-2 break-all">{selectedAsset.subdomain}</h3>
                {selectedAsset.httpTitle && (
                  <p className="text-zinc-400 text-xs mt-1 italic">&quot;{selectedAsset.httpTitle}&quot;</p>
                )}
              </div>

              {/* Subdomain Takeover Warning Box */}
              {selectedAsset.takeoverRisk && (
                <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-red-300 font-bold mb-1">
                    <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                    <span>RISCO CRÍTICO: SUBDOMAIN TAKEOVER</span>
                  </div>
                  <p className="text-red-200 text-[11px] leading-relaxed">
                    {selectedAsset.takeoverDetails || 'CNAME órfão detectado apontando para serviço externo não registrado.'}
                  </p>
                </div>
              )}

              {/* Network & Infrastructure */}
              <div className="space-y-2 text-xs">
                <span className="text-zinc-500 text-[10px] font-semibold tracking-wider uppercase block">
                  Infraestrutura & Rede
                </span>

                <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-[11px]">IPs Resolvidos:</span>
                    <div className="flex gap-1">
                      {selectedAsset.ips.map(ip => (
                        <span key={ip} className="bg-cyan-950 border border-cyan-800 text-cyan-300 px-1.5 py-0.5 rounded text-[10px]">
                          {ip}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedAsset.cnames.length > 0 && (
                    <div className="text-[11px]">
                      <span className="text-zinc-400 block mb-0.5">CNAME:</span>
                      <span className="text-zinc-300 break-all bg-black/40 p-1 rounded block border border-zinc-800/80">
                        {selectedAsset.cnames.join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Cloud Provider:</span>
                    <span className="text-zinc-200 uppercase font-bold">{selectedAsset.cloudProvider || 'On-Premise / Desconhecido'}</span>
                  </div>
                </div>
              </div>

              {/* Open Ports */}
              {selectedAsset.ports.length > 0 && (
                <div className="space-y-2 text-xs">
                  <span className="text-zinc-500 text-[10px] font-semibold tracking-wider uppercase block">
                    Portas Abertas & Serviços
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {selectedAsset.ports.map(p => (
                      <div key={p.port} className="bg-zinc-900 border border-zinc-800 rounded p-2 text-[11px]">
                        <div className="flex items-center justify-between font-bold text-amber-300">
                          <span>Porta {p.port}</span>
                          <span className="text-[10px] text-zinc-500 uppercase">{p.protocol}</span>
                        </div>
                        <span className="text-zinc-400 text-[10px] block truncate">{p.service || 'unknown'} {p.product ? `(${p.product})` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technologies */}
              {selectedAsset.technologies.length > 0 && (
                <div className="space-y-2 text-xs">
                  <span className="text-zinc-500 text-[10px] font-semibold tracking-wider uppercase block">
                    Fingerprint de Tecnologias
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAsset.technologies.map(t => (
                      <span key={t.name} className="bg-purple-950/60 border border-purple-800/80 text-purple-300 px-2 py-0.5 rounded text-[11px]">
                        {t.name} {t.version ? `(${t.version})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Vulnerabilities */}
              {selectedAsset.vulnerabilities.length > 0 && (
                <div className="space-y-2 text-xs">
                  <span className="text-red-400 text-[10px] font-semibold tracking-wider uppercase block">
                    Vulnerabilidades Triadas ({selectedAsset.vulnerabilities.length})
                  </span>
                  <div className="space-y-2">
                    {selectedAsset.vulnerabilities.map(v => (
                      <div key={v.id} className="bg-red-950/30 border border-red-900/60 rounded-lg p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-200 text-xs">{v.name}</span>
                          <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-red-900 font-bold text-red-200">{v.severity}</span>
                        </div>
                        {v.description && (
                          <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">{v.description}</p>
                        )}
                        {v.curlCommand && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-0.5">
                              <span>PoC cURL:</span>
                              <button
                                onClick={() => copyToClipboard(v.curlCommand!, v.id)}
                                className="text-cyan-400 hover:text-cyan-300 cursor-pointer"
                              >
                                {copiedText === v.id ? 'Copiado!' : 'Copiar'}
                              </button>
                            </div>
                            <pre className="bg-black/60 p-1.5 rounded text-[10px] text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap border border-zinc-800">
                              {v.curlCommand}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-zinc-800 flex items-center gap-2">
                {selectedAsset.responseUrl && (
                  <a
                    href={selectedAsset.responseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-xs transition-colors"
                  >
                    <span>Acessar Alvo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  onClick={() => copyToClipboard(`nmap -sV -sC -p- ${selectedAsset.subdomain}`, 'nmap-cmd')}
                  className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copiar comando Nmap completo para este host"
                >
                  {copiedText === 'nmap-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copiedText === 'nmap-cmd' ? 'Comando Copiado' : 'cURL/Nmap'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-zinc-500">
              Selecione um ativo na tabela ao lado para inspecionar os detalhes de infraestrutura e vulnerabilidades.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
