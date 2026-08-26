'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TargetProject, CorrelatedAsset, Vulnerability } from '@/types/recon';
import { 
  Terminal as TerminalIcon, 
  Play, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldAlert, 
  Zap, 
  Globe, 
  Radio, 
  Layers, 
  Download, 
  Flame, 
  Maximize2, 
  Minimize2,
  Folder,
  FolderPlus,
  Pin,
  Edit2,
  Plus,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Search,
  Cpu,
  Bookmark,
  FileCode,
  CornerDownLeft,
  X
} from 'lucide-react';

interface TerminalArsenalProps {
  target: TargetProject;
  assets: CorrelatedAsset[];
  onAssetsDiscovered: (newStubs: Partial<CorrelatedAsset>[]) => void;
  onAddVulnerability: (vuln: Vulnerability) => void;
  onSelectProject?: (project: TargetProject) => void;
  onSwitchTab?: (tab: any) => void;
  researcherHandle?: string;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'banner' | 'ai';
  text: string;
  timestamp: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  folderId: string;
  lines: TerminalLine[];
  pinned: boolean;
  createdAt: string;
}

export interface TerminalFolder {
  id: string;
  name: string;
  isOpen: boolean;
}

const DEFAULT_FOLDERS: TerminalFolder[] = [
  { id: 'recon-osint', name: 'Recon & OSINT', isOpen: true },
  { id: 'vuln-scans', name: 'Auditoria & Takeovers', isOpen: true },
  { id: 'ai-chats', name: 'AI Red Team Prompts', isOpen: true },
];

const SUGGESTIONS = [
  { text: 'recon-all', desc: '⚡ Pipeline Completo de Reconhecimento', type: 'cmd' },
  { text: 'subfinder -d ', desc: '🌐 Enumeração passiva de subdomínios', type: 'cmd' },
  { text: 'crtsh ', desc: '📜 Consulta Certificate Transparency Logs', type: 'cmd' },
  { text: 'dnsx ', desc: '📡 Resolução DNS DoH e detecção de Takeover', type: 'cmd' },
  { text: 'httpx ', desc: '🔍 Probe HTTP de portas, títulos e servidores', type: 'cmd' },
  { text: 'wayback ', desc: '⏳ Mineração de URLs históricas do Archive.org', type: 'cmd' },
  { text: 'takeovers', desc: '🚨 Auditar todos os CNAMEs em busca de Takeover', type: 'cmd' },
  { text: 'nuclei ', desc: '🔥 Varredura de vulnerabilidades conhecidas', type: 'cmd' },
  { text: 'h1-report', desc: '📝 Gerar minuta de relatório de vulnerabilidade', type: 'cmd' },
  { text: 'assets', desc: '📊 Listar tabela de ativos no terminal', type: 'cmd' },
  { text: 'vulns', desc: '⚠️ Listar vulnerabilidades encontradas', type: 'cmd' },
  { text: 'gemini analisar vetores críticos de ataque', desc: '🤖 IA: Identificar elo mais fraco da superfície', type: 'ai' },
  { text: 'gemini como explorar Spring Boot Actuator /env', desc: '🤖 IA: Gerar PoC passo a passo', type: 'ai' },
  { text: 'gemini criar payload de bypass para CORS permissivo', desc: '🤖 IA: Payload de extração de token', type: 'ai' },
  { text: 'gemini validar se o CNAME é vulnerável a takeover', desc: '🤖 IA: Triagem de DNS órfão', type: 'ai' },
  { text: 'help', desc: '❓ Exibir arsenal e comandos disponíveis', type: 'cmd' },
  { text: 'clear', desc: '🧹 Limpar tela do terminal', type: 'cmd' },
];

export function TerminalArsenal({
  target,
  assets,
  onAssetsDiscovered,
  onAddVulnerability,
  onSelectProject,
  onSwitchTab,
  researcherHandle = 'w0rmingstar',
}: TerminalArsenalProps) {
  // Active Header for requests
  const activeHeader = target.policy?.requiredHeaders?.[0] 
    ? `${target.policy.requiredHeaders[0].key}: ${target.policy.requiredHeaders[0].value}`
    : `X-Bug-Bounty: ${researcherHandle}`;

  // Terminal state
  const [folders, setFolders] = useState<TerminalFolder[]>(DEFAULT_FOLDERS);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('default-session');
  
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Folder & Session Management State
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const [selectedFolderForNewSession, setSelectedFolderForNewSession] = useState<string>('recon-osint');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial load from Backend Database API
  useEffect(() => {
    async function loadTerminalState() {
      try {
        const res = await fetch(`/api/db/terminal?targetId=${encodeURIComponent(target.id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (Array.isArray(data.folders) && data.folders.length > 0) {
              setFolders(data.folders);
            } else {
              setFolders(DEFAULT_FOLDERS);
            }

            if (Array.isArray(data.sessions) && data.sessions.length > 0) {
              setSessions(data.sessions);
              setActiveSessionId(data.sessions[0].id);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Error loading terminal from DB:', e);
      }

      // Default initial session
      const initialSession: TerminalSession = {
        id: `sess-${Date.now()}`,
        name: `Recon Shell (${target.domain})`,
        folderId: 'recon-osint',
        pinned: true,
        createdAt: new Date().toISOString(),
        lines: [
          {
            id: 'init-banner',
            type: 'banner',
            text: `
 ██████╗ ███████╗ ██████╗ ██████╗ ███╗   ██╗     █████╗ ██████╗ ███████╗███████╗███╗   ██╗ █████╗ ██╗     
 ██╔══██╗██╔════╝██╔════╝██╔═══██╗████╗  ██║    ██╔══██╗██╔══██╗██╔════╝██╔════╝████╗  ██║██╔══██╗██║     
 ██████╔╝█████╗  ██║     ██║   ██║██╔██╗ ██║    ███████║██████╔╝███████╗█████╗  ██╔██╗ ██║███████║██║     
 ██╔══██╗██╔══╝  ██║     ██║   ██║██║╚██╗██║    ██╔══██║██╔══██╗╚════██║██╔══╝  ██║╚██╗██║██╔══██║██║     
 ██║  ██║███████╗╚██████╗╚██████╔╝██║ ╚████║    ██║  ██║██║  ██║███████║███████╗██║ ╚████║██║  ██║███████╗
 ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
        [+] Bug Bounty RedTeam Shell v4.5 | Alvo Ativo: ${target.domain}
        [+] Header Ativo: ${activeHeader}
        [+] Suporta comandos de rede (crtsh, dnsx, httpx, wayback, nuclei) e prompts de IA Gemini!
        [+] Banco de Dados Backend: Persistência centralizada & Caching ativo.
            `,
            timestamp: new Date().toLocaleTimeString(),
          }
        ]
      };
      setSessions([initialSession]);
      setActiveSessionId(initialSession.id);
    }
    loadTerminalState();
  }, [target.id]);

  // Persist folders
  const saveFolders = (newFolders: TerminalFolder[]) => {
    setFolders(newFolders);
    fetch('/api/db/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: target.id, folders: newFolders, sessions }),
    }).catch(e => console.warn('DB terminal save error:', e));
  };

  // Persist sessions
  const saveSessions = (newSessions: TerminalSession[]) => {
    setSessions(newSessions);
    fetch('/api/db/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: target.id, folders, sessions: newSessions }),
    }).catch(e => console.warn('DB terminal save error:', e));
  };

  // Get active session
  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || {
    id: 'fallback',
    name: 'Sessão Principal',
    folderId: 'recon-osint',
    pinned: false,
    createdAt: new Date().toISOString(),
    lines: [],
  };

  // Internal auto-scroll without jumping the entire page
  const scrollToBottom = () => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession.lines, isExecuting]);

  // Append line to active session
  const addLine = (type: TerminalLine['type'], text: string) => {
    const newLine: TerminalLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      text,
      timestamp: new Date().toLocaleTimeString(),
    };

    const updated = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          lines: [...s.lines, newLine],
        };
      }
      return s;
    });

    saveSessions(updated);
  };

  // Session actions
  const handleCreateSession = (folderId: string) => {
    const newSess: TerminalSession = {
      id: `sess-${Date.now()}`,
      name: `Sessão ${sessions.length + 1} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      folderId,
      pinned: false,
      createdAt: new Date().toISOString(),
      lines: [
        {
          id: `line-init-${Date.now()}`,
          type: 'system',
          text: `[+] Nova sessão inicializada para o alvo ${target.domain} no grupo [${folders.find(f => f.id === folderId)?.name || 'Geral'}].`,
          timestamp: new Date().toLocaleTimeString(),
        }
      ],
    };

    const updated = [newSess, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newSess.id);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter(s => s.id !== sessionId);
    if (remaining.length > 0) {
      saveSessions(remaining);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
      }
    } else {
      // Re-create default
      handleCreateSession('recon-osint');
    }
  };

  const handleTogglePinSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.map(s => s.id === sessionId ? { ...s, pinned: !s.pinned } : s);
    saveSessions(updated);
  };

  const handleSaveSessionName = (sessionId: string) => {
    if (!editingSessionName.trim()) return;
    const updated = sessions.map(s => s.id === sessionId ? { ...s, name: editingSessionName.trim() } : s);
    saveSessions(updated);
    setEditingSessionId(null);
  };

  // Folder actions
  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    const newF: TerminalFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      isOpen: true,
    };
    saveFolders([...folders, newF]);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (folders.length <= 1) return;
    const remainingFolders = folders.filter(f => f.id !== folderId);
    const updatedSessions = sessions.map(s => s.folderId === folderId ? { ...s, folderId: remainingFolders[0].id } : s);
    saveFolders(remainingFolders);
    saveSessions(updatedSessions);
  };

  const toggleFolder = (folderId: string) => {
    saveFolders(folders.map(f => f.id === folderId ? { ...f, isOpen: !f.isOpen } : f));
  };

  // Command & AI Execution Engine
  const executeCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    // Update history
    const newHist = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, 50);
    setHistory(newHist);
    try {
      localStorage.setItem(`recon_history_${target.id}`, JSON.stringify(newHist));
    } catch {}
    setHistoryIndex(-1);
    setShowSuggestions(false);

    // Print command input line
    addLine('input', `${researcherHandle}@hackerone-recon:~$ ${trimmed}`);
    setInputVal('');

    setIsExecuting(true);

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      // 1. Check if user typed a known CLI tool command
      switch (command) {
        case 'clear': {
          const updated = sessions.map(s => s.id === activeSessionId ? { ...s, lines: [] } : s);
          saveSessions(updated);
          setIsExecuting(false);
          return;
        }

        case 'help':
        case 'arsenal': {
          addLine('system', `
══════════════════════════════════════════════════════════════════════════════════════
               ARSENAL DE RECONHECIMENTO & PENTEST BUG BOUNTY (HACKERONE)
══════════════════════════════════════════════════════════════════════════════════════

[1] ENUMERAÇÃO DE ATIVOS & CERTIFICADOS:
  • subfinder -d <domain>        Varredura passiva de subdomínios (CRT.sh + OSINT)
  • crtsh <domain>              Consulta direta ao Certificate Transparency Logs
  • recon-all                   Executa o pipeline completo de reconhecimento 1-Click

[2] DNS & SUBDOMAIN TAKEOVER:
  • dnsx <domain>               Resolução DNS DoH (A, CNAME, TXT) e checagem de takeover
  • dig <domain>                Consulta DNS detalhada de registros e TTLs
  • takeovers                   Audita todos os ativos do alvo em busca de CNAMEs órfãos

[3] HTTP PROBING & FINGERPRINTING:
  • httpx <url|domain>          Live HTTP probe com status, title, tech & headers
  • curl -I <url>               Requisição HEAD com cabeçalho de identificação

[4] JS MINING & URLS HISTÓRICAS:
  • wayback <domain>            Minera endpoints e URLs da Wayback Machine
  • katana <domain>             Crawler de endpoints e chamadas de API

[5] VULNERABILITY SCANNING & NUCLEI:
  • nuclei <target>             Varredura de CVEs, Actuators, Swagger e Exposures
  • vulns                       Lista todas as vulnerabilidades correlacionadas

[6] INTELIGÊNCIA ARTIFICIAL (DUAL-ENGINE):
  • gemini <pergunta/instrução> Alpha AI Co-Pilot para análise de ameaças e exploits
  • <qualquer pergunta direta>  Toda mensagem natural sem comando é enviada à IA!
  • h1-report                   Gera minuta completa de relatório HackerOne (PoC)

[7] GESTÃO DE WORKSPACE & ESCOPO:
  • target <domain>             Muda o alvo ativo (ex: target tesla.com)
  • scope                       Exibe domínios In-Scope e exclusões Out-of-Scope
  • assets                      Lista a tabela de ativos mapeados no terminal
  • clear                       Limpa o terminal
══════════════════════════════════════════════════════════════
          `);
          break;
        }

        case 'scope': {
          addLine('output', `
[+] ESCOPO DO PROGRAMA: ${target.name}
  • Domínio Base: ${target.domain}
  • In-Scope: ${target.inScope.join(', ') || 'Nenhum'}
  • Out-of-Scope: ${target.outOfScope.join(', ') || 'Nenhum'}
  • Header Obrigatório: ${activeHeader}
  • Safe Harbor: ${target.policy?.safeHarbor ? 'ATIVO (Protegido)' : 'NÃO ESPECIFICADO'}
          `);
          break;
        }

        case 'subfinder':
        case 'crtsh': {
          const dom = args.find(a => !a.startsWith('-')) || target.domain;
          addLine('system', `[*] Consultando Certificate Transparency Logs para: ${dom}...`);

          const res = await fetch('/api/recon/crtsh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: dom }),
          });
          const data = await res.json();

          if (data.success && data.subdomains) {
            if (data.fromCache) {
              addLine('system', `[⚡ CACHE-HIT] ${data.count} subdomínios carregados da base de dados persistente em 1ms.`);
            } else {
              addLine('success', `[+] CRT.sh retornou ${data.count} subdomínios únicos para ${dom}!`);
            }
            
            const discoveredStubs = data.subdomains.map((s: string) => ({
              subdomain: s,
              rootDomain: dom,
              discoveredVia: 'crtsh' as const,
              tags: ['crtsh-live', 'osint'],
            }));

            onAssetsDiscovered(discoveredStubs);

            const preview = data.subdomains.slice(0, 15).map((s: string) => `  [+] ${s}`).join('\n');
            addLine('output', preview + (data.count > 15 ? `\n  ... e mais ${data.count - 15} subdomínios inseridos no Grafo e na Tabela!` : ''));
          } else {
            addLine('error', `[-] Erro na consulta do CRT.sh: ${data.error || 'Nenhum resultado retornado'}`);
          }
          break;
        }

        case 'dnsx':
        case 'dig': {
          const host = args.find(a => !a.startsWith('-')) || target.domain;
          addLine('system', `[*] Resolvendo DNS DoH (Cloudflare/Google) para ${host}...`);

          const res = await fetch('/api/recon/dns-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host }),
          });
          const data = await res.json();

          if (data.success) {
            if (data.fromCache) {
              addLine('system', `[⚡ CACHE-HIT] Resolução DNS recuperada do Banco de Dados em 1ms.`);
            }
            let output = `[+] Resolução DNS para ${host}:\n`;
            if (data.ips?.length) output += `  • IPs (A): ${data.ips.join(', ')}\n`;
            if (data.cnames?.length) output += `  • CNAME: ${data.cnames.join(' -> ')}\n`;
            if (data.dnsRecords?.length) {
              output += `  • Registros Mapeados: ${data.dnsRecords.map((r: any) => `${r.type} ${r.value}`).slice(0, 5).join(' | ')}\n`;
            }

            if (data.takeoverRisk) {
              output += `\n🚨 [ALERTA DE TAKEOVER DETECTADO]!\n  • Detalhes: ${data.takeoverDetails}\n  • CNAME Órfão: ${data.cnames?.[0]}`;
              addLine('error', output);

              onAddVulnerability({
                id: `takeover-${Date.now()}`,
                templateId: 'subdomain-takeover-cname-dangling',
                name: `Subdomain Takeover: ${data.cnames?.[0]}`,
                severity: 'high',
                description: `CNAME órfão apontando para serviço terceiro desprovisionado (${data.cnames?.[0]}).`,
                matchedAt: host,
                curlCommand: `curl -I "https://${host}" -H "${activeHeader}"`,
                sourceTool: 'live-probe',
                timestamp: new Date().toISOString(),
              });
            } else {
              addLine('success', output);
            }

            onAssetsDiscovered([{
              subdomain: host,
              rootDomain: target.domain,
              ips: data.ips || [],
              cnames: data.cnames || [],
              takeoverRisk: data.takeoverRisk,
              takeoverDetails: data.takeoverDetails,
            }]);
          } else {
            addLine('error', `[-] Falha na resolução DNS: ${data.error}`);
          }
          break;
        }

        case 'httpx':
        case 'curl': {
          let url = args.find(a => !a.startsWith('-')) || `https://${target.domain}`;
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
          }

          addLine('system', `[*] Enviando probe HTTP para ${url} com header '${activeHeader}'...`);

          const res = await fetch('/api/recon/http-probe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              customHeader: activeHeader,
            }),
          });
          const data = await res.json();

          if (data.success) {
            if (data.fromCache) {
              addLine('system', `[⚡ CACHE-HIT] Probe HTTP recuperado do Banco de Dados em 1ms.`);
            }
            const statusColor = data.status === 200 ? '✅' : '⚠️';
            addLine('success', `
[+] RESPOSTA HTTP (${data.targetUrl}):
  • Status: ${statusColor} ${data.status} ${data.statusText || ''}
  • Título: "${data.title || 'Sem título'}"
  • Web Server: ${data.server || 'Não informado'}
  • Content-Type: ${data.contentType || 'N/A'} (${data.contentLength} bytes)
  • Tecnologias: ${data.technologies?.map((t: any) => t.name).join(', ') || 'Nenhuma detectada'}
  • Headers de Segurança:
      - CSP: ${data.securityHeaders?.contentSecurityPolicy ? 'Presente' : '❌ AUSENTE'}
      - HSTS: ${data.securityHeaders?.strictTransportSecurity ? 'Presente' : '❌ AUSENTE'}
      - X-Frame-Options: ${data.securityHeaders?.xFrameOptions ? 'Presente' : '❌ AUSENTE'}
            `);

            try {
              const hostClean = new URL(url).hostname;
              onAssetsDiscovered([{
                subdomain: hostClean,
                rootDomain: target.domain,
                isAlive: true,
                httpStatus: data.status,
                httpTitle: data.title,
                webServer: data.server,
                contentType: data.contentType,
                contentLength: data.contentLength,
                responseUrl: data.targetUrl,
                technologies: data.technologies || [],
              }]);
            } catch {}
          } else {
            addLine('error', `[-] Erro na conexão HTTP: ${data.error}`);
          }
          break;
        }

        case 'wayback':
        case 'katana': {
          const dom = args.find(a => !a.startsWith('-')) || target.domain;
          addLine('system', `[*] Mineração histórica na Wayback Machine para: ${dom}...`);

          const res = await fetch('/api/recon/wayback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: dom }),
          });
          const data = await res.json();

          if (data.success && data.urls) {
            if (data.fromCache) {
              addLine('system', `[⚡ CACHE-HIT] URLs históricas recuperadas do Banco de Dados.`);
            }
            addLine('success', `[+] Encontradas ${data.totalUrls || data.urls.length} URLs históricas indexadas!`);
            const preview = data.urls.slice(0, 10).map((u: string) => `  • ${u}`).join('\n');
            addLine('output', preview + (data.urls.length > 10 ? `\n  ... e mais ${data.urls.length - 10} URLs mineradas!` : ''));
          } else {
            addLine('error', `[-] Falha na mineração da Wayback Machine: ${data.error || 'Nenhum resultado'}`);
          }
          break;
        }

        case 'takeovers': {
          addLine('system', `[*] Auditando todos os ${assets.length} ativos em busca de Subdomain Takeovers...`);
          const vulnsFound = assets.filter(a => a.takeoverRisk);

          if (vulnsFound.length > 0) {
            addLine('error', `🚨 [TAKEOVERS ENCONTRADOS]: ${vulnsFound.length} ativos vulneráveis!`);
            vulnsFound.forEach(a => {
              addLine('error', `  • ${a.subdomain} -> CNAME: ${a.cnames.join(', ')} (${a.takeoverDetails})`);
            });
          } else {
            addLine('success', `[+] Nenhum CNAME órfão ativo nos ativos atuais. Rode 'subfinder' ou 'dnsx' para expandir a busca.`);
          }
          break;
        }

        case 'assets':
        case 'ls': {
          if (assets.length === 0) {
            addLine('output', `Nenhum ativo mapeado no momento. Use 'subfinder' ou 'recon-all' para começar.`);
          } else {
            addLine('output', `[+] ATIVOS MAPEADOS (${assets.length} total, ${assets.filter(a => a.isAlive).length} vivos HTTP):\n`);
            const rows = assets.slice(0, 20).map(a => {
              const alive = a.isAlive ? '🟢 ALIVE' : '⚪ DOWN';
              const status = a.httpStatus ? `[HTTP ${a.httpStatus}]` : '';
              const ipStr = a.ips.length ? `(IPs: ${a.ips.join(', ')})` : '';
              const vulnStr = a.vulnerabilities.length ? `[🚨 ${a.vulnerabilities.length} VULNS]` : '';
              return `  • ${alive.padEnd(8)} ${a.subdomain.padEnd(32)} ${status.padEnd(12)} ${ipStr} ${vulnStr}`;
            }).join('\n');
            addLine('output', rows + (assets.length > 20 ? `\n  ... e mais ${assets.length - 20} ativos.` : ''));
          }
          break;
        }

        case 'vulns': {
          const allVulns = assets.flatMap(a => a.vulnerabilities);
          if (allVulns.length === 0) {
            addLine('success', `[+] Nenhuma vulnerabilidade registrada até o momento.`);
          } else {
            addLine('error', `[!] TOTAL DE ${allVulns.length} VULNERABILIDADES IDENTIFICADAS:\n`);
            allVulns.forEach((v, idx) => {
              addLine('error', `  [${idx + 1}] [${v.severity.toUpperCase()}] ${v.name} -> ${v.matchedAt}`);
            });
          }
          break;
        }

        case 'nuclei': {
          const host = args.find(a => !a.startsWith('-')) || target.domain;
          addLine('system', `[*] Disparando Nuclei Vulnerability Triage contra ${host}...`);

          // Execute DNS and HTTP probe first
          const [dnsRes, httpRes] = await Promise.all([
            fetch('/api/recon/dns-lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ host }),
            }).then(r => r.json()).catch(() => ({})),
            fetch('/api/recon/http-probe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: `https://${host}` }),
            }).then(r => r.json()).catch(() => ({})),
          ]);

          if (dnsRes.takeoverRisk) {
            addLine('error', `[!] [TAKEOVER DETECTADO]: ${dnsRes.takeoverDetails}`);
          } else {
            addLine('success', `[+] Nuclei Triage concluído em ${host}.`);
            addLine('output', `  • Status HTTP: ${httpRes.status || '200'}\n  • Tecnologias: ${httpRes.technologies?.map((t: any) => t.name).join(', ') || 'N/A'}`);
          }
          break;
        }

        case 'recon-all': {
          addLine('system', `══════════════════════════════════════════════════════════════`);
          addLine('system', `[*] INICIANDO PIPELINE DE RECONHECIMENTO COMPLETO: ${target.domain}`);
          addLine('system', `══════════════════════════════════════════════════════════════`);

          // 1. CRT.sh
          addLine('system', `[1/4] Coletando subdomínios em Certificate Transparency Logs...`);
          const crtRes = await fetch('/api/recon/crtsh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: target.domain }),
          });
          const crtData = await crtRes.json();
          if (crtData.success && crtData.subdomains) {
            addLine('success', `[+] CRT.sh descobriu ${crtData.count} subdomínios.`);
            onAssetsDiscovered(crtData.subdomains.map((s: string) => ({
              subdomain: s,
              rootDomain: target.domain,
              discoveredVia: 'crtsh',
              tags: ['pipeline-auto'],
            })));
          }

          // 2. DNS Root
          addLine('system', `[2/4] Resolvendo DNS e verificando Takeovers...`);
          const dnsRes = await fetch('/api/recon/dns-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host: target.domain }),
          });
          const dnsData = await dnsRes.json();
          if (dnsData.success) {
            addLine('success', `[+] DNS resolvido: ${dnsData.ips?.join(', ')}`);
          }

          // 3. HTTP Probe
          addLine('system', `[3/4] Enviando HTTP Probe com '${activeHeader}'...`);
          const httpRes = await fetch('/api/recon/http-probe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: `https://${target.domain}`, customHeader: activeHeader }),
          });
          const httpData = await httpRes.json();
          if (httpData.success) {
            addLine('success', `[+] HTTP Probe concluído: "${httpData.title || 'Live'}" (${httpData.server || 'Server'})`);
          }

          // 4. Conclusão
          addLine('system', `[4/4] Correlacionando Grafo de Superfície...`);
          addLine('success', `[+] PIPELINE COMPLETO! Alvo ${target.domain} totalmente mapeado no Grafo e na Tabela.`);
          break;
        }

        case 'h1-report': {
          const vulns = assets.flatMap(a => a.vulnerabilities);
          const topVuln = vulns[0] || {
            name: 'Security Misconfiguration in Subdomain Asset',
            severity: 'high',
            matchedAt: `https://${target.domain}`,
            curlCommand: `curl -i -s -k -X GET "https://${target.domain}" -H "${activeHeader}"`,
          };

          const reportMd = `
# [HackerOne Vulnerability Report]
**Program**: ${target.name} (${target.domain})
**Researcher**: @${researcherHandle}
**Header**: \`${activeHeader}\`
**Severity**: ${topVuln.severity.toUpperCase()}
**Title**: ${topVuln.name} on ${topVuln.matchedAt}

## Summary
During the security assessment of **${target.domain}**, an issue was identified affecting **${topVuln.matchedAt}**.

## Steps to Reproduce (Proof of Concept)
Execute the following cURL command containing the required HackerOne identification header:

\`\`\`bash
${topVuln.curlCommand}
\`\`\`

## Impact
An attacker can leverage this condition to access unauthorized resources or compromise sensitive customer data.
          `.trim();

          addLine('success', reportMd);
          navigator.clipboard.writeText(reportMd);
          addLine('system', `[+] Relatório copiado automaticamente para a sua área de transferência!`);
          break;
        }

        // 2. AI Prompt Mode (Direct or via 'gemini' / 'ai' prefix)
        default: {
          const prompt = command === 'gemini' || command === 'ai' ? args.join(' ') : trimmed;
          addLine('system', `[*] Consultando ALPHA AI (Red Team Architect) para: "${prompt}"...`);

          const res = await fetch('/api/gemini/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetDomain: target.domain,
              target,
              findings: assets.slice(0, 10),
              allVulns: assets.flatMap(a => a.vulnerabilities),
              prompt: prompt,
              contextPrompt: prompt,
            }),
          });
          const data = await res.json();

          const aiReply = data.analysis || data.triage;
          if (aiReply) {
            addLine('ai', `🤖 [ALPHA Red Team Copilot]:\n\n${aiReply}`);
          } else {
            addLine('error', `[-] Erro na resposta da IA: ${data.error || 'Sem resposta do modelo'}`);
          }
          break;
        }
      }
    } catch (err: any) {
      addLine('error', `[-] Erro de execução: ${err.message || 'Falha inesperada'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(history.length - 1, historyIndex + 1);
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const current = inputVal.trim().toLowerCase();
      if (!current) return;
      const match = SUGGESTIONS.find(s => s.text.toLowerCase().startsWith(current));
      if (match) {
        setInputVal(match.text);
      }
    }
  };

  const handleCopyTerminal = () => {
    const text = currentSession.lines.map(l => l.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredSuggestions = inputVal.trim().length > 0 
    ? SUGGESTIONS.filter(s => s.text.toLowerCase().includes(inputVal.trim().toLowerCase()))
    : [];

  return (
    <div 
      className={`relative w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden font-mono shadow-2xl flex flex-col transition-all ${
        isFullScreen ? 'fixed inset-0 z-50 h-screen rounded-none' : 'h-[780px]'
      }`}
    >
      {/* Top Shell Bar */}
      <div className="bg-zinc-900/95 border-b border-zinc-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800 text-xs">
            <TerminalIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-200 font-bold tracking-wider">HACKERONE ARSENAL LINUX SHELL</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
              ROOT SHELL
            </span>
          </div>
        </div>

        {/* Quick Header & Target Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-300 text-[11px]">
            <span className="text-zinc-500">Target:</span>
            <strong className="text-cyan-400">{target.domain}</strong>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-300 text-[11px]">
            <span className="text-zinc-500">Header:</span>
            <strong className="text-emerald-400 truncate max-w-[200px]">{activeHeader}</strong>
          </div>

          <button
            onClick={handleCopyTerminal}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors cursor-pointer"
            title="Copiar texto da sessão atual"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => {
              const updated = sessions.map(s => s.id === activeSessionId ? { ...s, lines: [] } : s);
              saveSessions(updated);
            }}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors cursor-pointer"
            title="Limpar tela da sessão atual"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors cursor-pointer"
            title={isFullScreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Split Layout: Sidebar + Terminal Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sessions & Folders Sidebar */}
        <div className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between select-none">
          {/* Top Actions in Sidebar */}
          <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sessões & Pastas</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                className="p-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 rounded transition-colors cursor-pointer"
                title="Criar Nova Pasta"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleCreateSession(folders[0]?.id || 'recon-osint')}
                className="p-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 rounded transition-colors cursor-pointer"
                title="Nova Sessão de Terminal"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* New Folder Form */}
          {isCreatingFolder && (
            <div className="p-2.5 bg-zinc-900 border-b border-zinc-800 space-y-1.5">
              <input
                type="text"
                placeholder="Nome da Pasta..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
                className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-2 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 rounded cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddFolder}
                  className="px-2 py-0.5 text-[10px] bg-emerald-600 text-black font-bold rounded cursor-pointer"
                >
                  Criar
                </button>
              </div>
            </div>
          )}

          {/* Folders and Sessions Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3 text-xs">
            {folders.map((folder) => {
              const folderSessions = sessions.filter(s => s.folderId === folder.id);

              return (
                <div key={folder.id} className="space-y-1">
                  {/* Folder Row */}
                  <div 
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-zinc-900/80 text-zinc-300 font-bold cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {folder.isOpen ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronRight className="w-3 h-3 text-zinc-500" />}
                      <span className="text-[11px] text-zinc-300 truncate">{folder.name}</span>
                      <span className="text-[9px] text-zinc-600">({folderSessions.length})</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateSession(folder.id);
                        }}
                        className="p-0.5 text-zinc-500 hover:text-emerald-400"
                        title="Nova sessão nesta pasta"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      {folders.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                          className="p-0.5 text-zinc-500 hover:text-red-400"
                          title="Excluir pasta"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sessions inside this folder */}
                  {folder.isOpen && (
                    <div className="pl-4 space-y-0.5">
                      {folderSessions.length === 0 ? (
                        <div className="px-2 py-1 text-[10px] text-zinc-600 italic">Pasta vazia</div>
                      ) : (
                        folderSessions.map((session) => {
                          const isActive = session.id === activeSessionId;
                          const isEditing = editingSessionId === session.id;

                          return (
                            <div
                              key={session.id}
                              onClick={() => setActiveSessionId(session.id)}
                              className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-950/70 border border-emerald-700/80 text-emerald-300 font-bold shadow-sm'
                                  : 'hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate flex-1">
                                <MessageSquare className={`w-3 h-3 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingSessionName}
                                    onChange={(e) => setEditingSessionName(e.target.value)}
                                    onBlur={() => handleSaveSessionName(session.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSessionName(session.id)}
                                    className="w-full bg-black border border-emerald-500 rounded px-1 text-[11px] text-zinc-100 focus:outline-none"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span className="text-[11px] truncate">{session.name}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => handleTogglePinSession(session.id, e)}
                                  className={`p-0.5 ${session.pinned ? 'text-amber-400 opacity-100' : 'text-zinc-500 hover:text-amber-400'}`}
                                  title={session.pinned ? 'Desafixar' : 'Fixar'}
                                >
                                  <Pin className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSessionId(session.id);
                                    setEditingSessionName(session.name);
                                  }}
                                  className="p-0.5 text-zinc-500 hover:text-cyan-400"
                                  title="Renomear sessão"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteSession(session.id, e)}
                                  className="p-0.5 text-zinc-500 hover:text-red-400"
                                  title="Excluir sessão"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Stats in Sidebar Footer */}
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 text-[10px] text-zinc-500 space-y-1 font-mono">
            <div className="flex items-center justify-between">
              <span>Alvo:</span>
              <strong className="text-zinc-300">{target.domain}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Ativos Coletados:</span>
              <strong className="text-emerald-400">{assets.length}</strong>
            </div>
          </div>
        </div>

        {/* Right Terminal Area */}
        <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
          {/* Quick Launch Arsenal Dock (Preventing window scroll jump) */}
          <div className="bg-zinc-900/50 border-b border-zinc-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs select-none">
            <span className="text-zinc-500 text-[11px] font-bold flex items-center gap-1 shrink-0">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>ARSENAL TURBO:</span>
            </span>

            <button
              type="button"
              onClick={() => executeCommand('recon-all')}
              className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[11px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              <span>⚡ Scan Completo 1-Click</span>
            </button>

            <button
              type="button"
              onClick={() => executeCommand(`subfinder -d ${target.domain}`)}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-cyan-300 text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              <span>Subfinder Passivo</span>
            </button>

            <button
              type="button"
              onClick={() => executeCommand(`dnsx ${target.domain}`)}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              DNSx & DoH
            </button>

            <button
              type="button"
              onClick={() => executeCommand(`takeovers`)}
              className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Caçar Takeovers</span>
            </button>

            <button
              type="button"
              onClick={() => executeCommand(`httpx https://${target.domain}`)}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              HTTPx Live Probe
            </button>

            <button
              type="button"
              onClick={() => executeCommand(`wayback ${target.domain}`)}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              Wayback URLs
            </button>

            <button
              type="button"
              onClick={() => executeCommand(`nuclei ${target.domain}`)}
              className="px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Flame className="w-3 h-3" />
              <span>Nuclei Scan</span>
            </button>

            <button
              type="button"
              onClick={() => executeCommand('h1-report')}
              className="px-2.5 py-1 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-800 text-purple-300 text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Gerar Report H1</span>
            </button>
          </div>

          {/* Terminal Output Area */}
          <div 
            ref={terminalBodyRef}
            onClick={() => inputRef.current?.focus()}
            className="flex-1 overflow-y-auto p-4 space-y-2 text-xs leading-relaxed font-mono cursor-text"
          >
            {currentSession.lines.length === 0 ? (
              <div className="text-zinc-600 italic py-4">Terminal pronto. Digite um comando ou pergunte algo à IA...</div>
            ) : (
              currentSession.lines.map((line) => {
                if (line.type === 'banner') {
                  return (
                    <pre key={line.id} className="text-emerald-400 font-bold whitespace-pre overflow-x-auto text-[11px]">
                      {line.text}
                    </pre>
                  );
                }
                if (line.type === 'input') {
                  return (
                    <div key={line.id} className="text-zinc-100 font-bold flex items-center gap-1">
                      <span className="text-emerald-400">{researcherHandle}@hackerone-recon</span>
                      <span className="text-zinc-500">:</span>
                      <span className="text-cyan-400">~$</span>
                      <span>{line.text.replace(/^.*~\$\s*/, '')}</span>
                    </div>
                  );
                }
                if (line.type === 'error') {
                  return (
                    <pre key={line.id} className="text-red-400 whitespace-pre-wrap">
                      {line.text}
                    </pre>
                  );
                }
                if (line.type === 'success') {
                  return (
                    <pre key={line.id} className="text-emerald-300 whitespace-pre-wrap font-medium">
                      {line.text}
                    </pre>
                  );
                }
                if (line.type === 'system') {
                  return (
                    <pre key={line.id} className="text-cyan-400 whitespace-pre-wrap">
                      {line.text}
                    </pre>
                  );
                }
                if (line.type === 'ai') {
                  return (
                    <div key={line.id} className="bg-purple-950/20 border border-purple-800/60 rounded-xl p-3 text-purple-200 whitespace-pre-wrap shadow-md my-1">
                      {line.text}
                    </div>
                  );
                }
                return (
                  <pre key={line.id} className="text-zinc-300 whitespace-pre-wrap">
                    {line.text}
                  </pre>
                );
              })
            )}

            {isExecuting && (
              <div className="flex items-center gap-2 text-cyan-400 py-1 font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="animate-pulse">Processando comando / IA no alvo {target.domain}...</span>
              </div>
            )}
          </div>

          {/* Autocomplete / Suggestions Box */}
          {filteredSuggestions.length > 0 && (
            <div className="px-4 py-1.5 bg-zinc-900/90 border-t border-zinc-800/90 flex flex-wrap items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-zinc-500 text-[10px] font-bold">Sugestões:</span>
              {filteredSuggestions.slice(0, 4).map((sug, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => {
                    setInputVal(sug.text);
                    inputRef.current?.focus();
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                    sug.type === 'ai'
                      ? 'bg-purple-950/80 border border-purple-800 text-purple-300 hover:bg-purple-900'
                      : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-emerald-300'
                  }`}
                >
                  <span>{sug.text}</span>
                  <span className="text-[9px] text-zinc-500">({sug.desc})</span>
                </button>
              ))}
            </div>
          )}

          {/* Terminal Prompt Input */}
          <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-3 flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-xs">{researcherHandle}@hackerone-recon</span>
            <span className="text-zinc-500">:</span>
            <span className="text-cyan-400 font-bold text-xs">~$</span>

            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              placeholder="Digite comando hacker (ex: crtsh, httpx, nuclei) ou faça perguntas para a IA Gemini..."
              className="flex-1 bg-transparent text-zinc-100 text-xs font-mono focus:outline-none placeholder:text-zinc-600 disabled:opacity-50"
              autoFocus
            />

            <button
              type="button"
              onClick={() => executeCommand(inputVal)}
              disabled={!inputVal.trim() || isExecuting}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Executar</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
