'use client';

import React, { useState } from 'react';
import { TargetProject, CorrelatedAsset } from '@/types/recon';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  FileJson, 
  FileSpreadsheet,
  CloudUpload,
  HardDrive,
  CheckCircle2
} from 'lucide-react';
import { getAccessToken, googleSignIn } from '@/lib/googleAuth';
import { getOrCreateReconFolder, uploadFileToDrive } from '@/lib/googleDrive';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: TargetProject;
  assets: CorrelatedAsset[];
}

export function ExportModal({ isOpen, onClose, target, assets }: ExportModalProps) {
  const [format, setFormat] = useState<'markdown' | 'json' | 'csv'>('markdown');
  const [copied, setCopied] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateMarkdownReport = () => {
    let md = `# Reconnaissance & Attack Surface Report: ${target.domain}\n\n`;
    md += `**Gerado por:** ReconCorrelator (DevSecOps Squad v3.4)\n`;
    md += `**Data:** ${new Date().toISOString()}\n`;
    md += `**Total de Ativos:** ${assets.length} | **Vivos:** ${assets.filter(a => a.isAlive).length} | **Vulnerabilidades:** ${assets.reduce((a, b) => a + b.vulnerabilities.length, 0)}\n\n`;

    md += `## 1. Regras de Escopo (OPSEC Boundaries)\n`;
    md += `- **In-Scope:** ${target.inScope.join(', ')}\n`;
    md += `- **Out-of-Scope:** ${target.outOfScope.join(', ') || 'Nenhuma exclusão específica'}\n\n`;

    md += `## 2. Vulnerabilidades Críticas e de Alto Impacto\n`;
    const allVulns = assets.flatMap(a => a.vulnerabilities.map(v => ({ ...v, assetSub: a.subdomain })));
    if (allVulns.length === 0) {
      md += `*Nenhuma vulnerabilidade crítica reportada no momento.*\n\n`;
    } else {
      allVulns.forEach((v, i) => {
        md += `### 2.${i + 1} [${v.severity.toUpperCase()}] ${v.name}\n`;
        md += `- **Alvo:** \`${v.assetSub}\` (\`${v.matchedAt}\`)\n`;
        md += `- **Template:** \`${v.templateId}\` | **CVSS:** ${v.cvssScore || 'N/A'}\n`;
        if (v.description) md += `- **Descrição:** ${v.description}\n`;
        if (v.curlCommand) md += `- **PoC cURL:**\n\`\`\`bash\n${v.curlCommand}\n\`\`\`\n`;
        if (v.remediation) md += `- **Remediação:** ${v.remediation}\n`;
        md += `\n`;
      });
    }

    md += `## 3. Matriz de Ativos Mapeados\n`;
    md += `| Subdomínio | Status HTTP | IPs | Portas Abertas | Tecnologias | Takeover? |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    assets.forEach(a => {
      const portsStr = a.ports.map(p => p.port).join(', ') || '-';
      const techStr = a.technologies.map(t => t.name).join(', ') || '-';
      const ipsStr = a.ips.join(', ') || '-';
      md += `| \`${a.subdomain}\` | ${a.httpStatus || 'Down'} | ${ipsStr} | ${portsStr} | ${techStr} | ${a.takeoverRisk ? '⚠️ SIM' : 'Não'} |\n`;
    });

    return md;
  };

  const generateJson = () => {
    return JSON.stringify({ target, assets, exportedAt: new Date().toISOString() }, null, 2);
  };

  const generateCsv = () => {
    let csv = `Subdomain,IsAlive,HttpStatus,HttpTitle,WebServer,IPs,Ports,Technologies,VulnCount,TakeoverRisk\n`;
    assets.forEach(a => {
      const ips = `"${a.ips.join(';')}"`;
      const ports = `"${a.ports.map(p => p.port).join(';')}"`;
      const techs = `"${a.technologies.map(t => t.name).join(';')}"`;
      const title = `"${(a.httpTitle || '').replace(/"/g, '""')}"`;
      const server = `"${(a.webServer || '').replace(/"/g, '""')}"`;
      csv += `"${a.subdomain}",${a.isAlive},${a.httpStatus || ''},${title},${server},${ips},${ports},${techs},${a.vulnerabilities.length},${a.takeoverRisk}\n`;
    });
    return csv;
  };

  const exportContent = format === 'markdown' ? generateMarkdownReport() : format === 'json' ? generateJson() : generateCsv();

  const handleDownload = () => {
    const blob = new Blob([exportContent], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recon-${target.domain}-${Date.now()}.${format === 'markdown' ? 'md' : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToGoogleDrive = async () => {
    setIsSavingToDrive(true);
    setDriveSuccess(null);
    setDriveError(null);

    try {
      let token = getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (!authRes?.accessToken) {
          throw new Error('Autenticação com o Google Drive necessária.');
        }
        token = authRes.accessToken;
      }

      const folderId = await getOrCreateReconFolder(token);
      const ext = format === 'markdown' ? 'md' : format;
      const mime = format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/markdown';
      const fileName = `Recon_${target.domain}_${new Date().toISOString().slice(0, 10)}_${Date.now()}.${ext}`;

      await uploadFileToDrive(token, fileName, exportContent, mime, folderId);
      setDriveSuccess(`Salvo no Google Drive: ${fileName}`);
    } catch (err: unknown) {
      console.error('Save to Drive error:', err);
      setDriveError(err instanceof Error ? err.message : 'Falha ao salvar no Google Drive');
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-zinc-900/90 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-zinc-100 text-sm">Exportação de Relatório de Reconhecimento</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 text-xs">
          <button
            onClick={() => setFormat('markdown')}
            className={`flex-1 py-2.5 px-3 border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              format === 'markdown' ? 'border-emerald-500 text-emerald-400 bg-zinc-900 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Markdown (Bug Bounty Report)</span>
          </button>

          <button
            onClick={() => setFormat('json')}
            className={`flex-1 py-2.5 px-3 border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              format === 'json' ? 'border-cyan-500 text-cyan-400 bg-zinc-900 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>JSON Completo</span>
          </button>

          <button
            onClick={() => setFormat('csv')}
            className={`flex-1 py-2.5 px-3 border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              format === 'csv' ? 'border-amber-500 text-amber-400 bg-zinc-900 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV (Planilha)</span>
          </button>
        </div>

        {/* Preview */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Prévia do Conteúdo:</span>
            <button
              onClick={handleCopy}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado!' : 'Copiar Tudo'}</span>
            </button>
          </div>

          <pre className="bg-black border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 font-mono overflow-x-auto max-h-80 whitespace-pre-wrap">
            {exportContent}
          </pre>
        </div>

        {/* Feedback alerts */}
        {driveSuccess && (
          <div className="mx-4 mb-2 p-2 bg-emerald-950/60 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{driveSuccess}</span>
            </div>
            <button onClick={() => setDriveSuccess(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
          </div>
        )}

        {driveError && (
          <div className="mx-4 mb-2 p-2 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-xs flex items-center justify-between">
            <span>{driveError}</span>
            <button onClick={() => setDriveError(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
          </div>
        )}

        {/* Footer */}
        <div className="bg-zinc-900/90 border-t border-zinc-800 p-3.5 flex flex-wrap justify-between items-center gap-2">
          <span className="text-[11px] text-zinc-500">
            {assets.length} ativos prontos para exportação
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleSaveToGoogleDrive}
              disabled={isSavingToDrive}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Salvar na pasta 'ReconCorrelator Reports' do Google Drive"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{isSavingToDrive ? 'Salvando...' : 'Salvar no Google Drive'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
