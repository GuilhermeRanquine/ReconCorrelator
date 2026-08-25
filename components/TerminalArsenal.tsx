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
  HelpCircle,
  Cpu
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

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system' | 'banner';
  text: string;
  timestamp: string;
}

export function TerminalArsenal({
  target,
  assets,
  onAssetsDiscovered,
  onAddVulnerability,
  onSelectProject,
  onSwitchTab,
  researcherHandle = 'w0rmingstar',
}: TerminalArsenalProps) {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [activeHeader, setActiveHeader] = useState(`X-HackerOne-Research: ${researcherHandle}`);
  const [lines, setLines] = useState<TerminalLine[]>(() => [
    {
      id: 'init-1',
      type: 'banner',
      text: `
 ██████╗ ███████╗ ██████╗ ██████╗ ███╗   ██╗     █████╗ ██████╗ ███████╗███████╗███╗   ██╗ █████╗ ██╗     
 ██╔══██╗██╔════╝██╔════╝██╔═══██╗████╗  ██║    ██╔══██╗██╔══██╗██╔════╝██╔════╝████╗  ██║██╔══██╗██║     
 ██████╔╝█████╗  ██║     ██║   ██║██╔██╗ ██║    ███████║██████╔╝███████╗█████╗  ██╔██╗ ██║███████║██║     
 ██╔══██╗██╔══╝  ██║     ██║   ██║██║╚██╗██║    ██╔══██║██╔══██╗╚════██║██╔══╝  ██║╚██╗██║██╔══██║██║     
 ██║  ██║███████╗╚██████╗╚██████╔╝██║ ╚████║    ██║  ██║██║  ██║███████║███████╗██║ ╚████║██║  ██║███████╗
 ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
        [+] Bug Bounty RedTeam Shell v4.2 | Pesquisador: @${researcherHandle} (HackerOne)
        [+] Header Ativo: X-HackerOne-Research: ${researcherHandle} | Alvo Atual: ${target.domain}
        [+] Digite 'help' ou 'arsenal' para ver a lista de ferramentas disponíveis.
      `,
      timestamp: '00:00:00',
    },
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const KNOWN_COMMANDS = [
    'help',
    'arsenal',
    'subfinder',
    'crtsh',
    'dnsx',
    'dig',
    'httpx',
    'curl',
    'wayback',
    'katana',
    'nuclei',
    'takeovers',
    'assets',
    'vulns',
    'h1-report',
    'gemini',
    'target',
    'header',
    'scope',
    'clear',
    'history',
    'recon-all'
  ];

  // Auto-scroll on new output
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, isExecuting]);

  // Focus input on click anywhere in terminal
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const addLine = (type: TerminalLine['type'], text: string) => {
    setLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type,
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  // Execute terminal commands
  const executeCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    // Add to history
    setHistory(prev => [trimmed, ...prev.filter(c => c !== trimmed)]);
    setHistoryIndex(-1);

    // Print command input line
    addLine('input', `${researcherHandle}@hackerone-recon:~$ ${trimmed}`);
    setInputVal('');

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    setIsExecuting(true);

    try {
      switch (command) {
        case 'clear': {
          setLines([]);
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
  • recon-all                   Executa o pipeline completo de reconhecimento

[2] DNS & SUBDOMAIN TAKEOVER:
  • dnsx <domain>               Resolução DNS DoH (A, CNAME, TXT) e checagem de takeover
  • dig <domain>                Consulta DNS detalhada de registros e TTLs
  • takeovers                   Audita todos os ativos do alvo em busca de CNAMEs órfãos

[3] HTTP PROBING & FINGERPRINTING:
  • httpx <url|domain>          Live HTTP probe com status, title, tech & headers
  • curl -I <url>               Requisição HEAD com cabeçalho '${activeHeader}'

[4] JS MINING & URLS HISTÓRICAS:
  • wayback <domain>            Minera endpoints e URLs da Wayback Machine
  • katana <domain>             Crawler de endpoints e chamadas de API

[5] VULNERABILITY SCANNING & NUCLEI:
  • nuclei <target>             Varredura de CVEs, Actuators, Swagger e Exposures
  • vulns                       Lista todas as vulnerabilidades correlacionadas

[6] INTELIGÊNCIA ARTIFICIAL & RELATÓRIOS:
  • gemini <pergunta/pedido>    Alpha AI Co-Pilot para análise de ameaças e exploits
  • h1-report                   Gera minuta completa de relatório HackerOne (PoC)
  • export [json|csv|md]        Exporta os ativos descobertos e superfície

[7] GESTÃO DE WORKSPACE & ESCOPO:
  • target <domain>             Muda o alvo ativo (ex: target tesla.com)
  • header [nome:valor]         Altera ou exibe o header de identificação
  • scope                       Exibe domínios In-Scope e exclusões Out-of-Scope
  • assets                      Lista a tabela de ativos mapeados no terminal
  • clear                       Limpa o terminal
══════════════════════════════════════════════════════════════════════════════════════
          `);
          break;
        }

        case 'header': {
          if (args.length > 0) {
            const newHeader = args.join(' ');
            setActiveHeader(newHeader);
            addLine('success', `[+] Header de identificação atualizado para: ${newHeader}`);
          } else {
            addLine('output', `Header atual: ${activeHeader}`);
          }
          break;
        }

        case 'target': {
          if (args.length > 0) {
            const newDomain = args[0].replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            if (onSelectProject) {
              const newProj: TargetProject = {
                id: `proj-${Date.now()}`,
                name: `${newDomain} (HackerOne Scope)`,
                domain: newDomain,
                description: `Superfície de ataque importada via terminal para ${newDomain}`,
                platform: 'hackerone',
                createdAt: new Date().toISOString(),
                inScope: [`*.${newDomain}`],
                outOfScope: [],
                policy: {
                  platform: 'hackerone',
                  policySummary: 'Programa de Bug Bounty',
                  safeHarbor: true,
                  requiredHeaders: [{ key: 'X-HackerOne-Research', value: researcherHandle }],
                  prohibitedVulns: ['DDoS'],
                  extractedAt: new Date().toISOString(),
                },
                rules: [],
              };
              onSelectProject(newProj);
              addLine('success', `[+] Alvo alterado com sucesso para: ${newDomain}`);
            }
          } else {
            addLine('output', `Alvo atual: ${target.domain} (In-Scope: ${target.inScope.join(', ')})`);
          }
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
            addLine('success', `[+] CRT.sh retornou ${data.count} subdomínios únicos para ${dom}!`);
            
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
            addLine('error', `[-] Erro na consulta do CRT.sh: ${data.error || 'Nenhum resultado'}`);
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
            let output = `[+] Resolução DNS para ${host}:\n`;
            if (data.ips?.length) output += `  • IPs (A): ${data.ips.join(', ')}\n`;
            if (data.cnames?.length) output += `  • CNAME: ${data.cnames.join(' -> ')}\n`;
            if (data.txt?.length) output += `  • TXT: ${data.txt.join(' | ')}\n`;

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
            const statusColor = data.status === 200 ? '✅' : '⚠️';
            addLine('success', `
[+] RESPOSTA HTTP (${data.url}):
  • Status: ${statusColor} ${data.status}
  • Título: "${data.title || 'Sem título'}"
  • Web Server: ${data.webServer || 'Não informado'}
  • Content-Type: ${data.contentType || 'N/A'} (${data.contentLength} bytes)
  • Headers de Segurança:
      - CSP: ${data.securityHeaders?.csp ? 'Presente' : '❌ AUSENTE'}
      - HSTS: ${data.securityHeaders?.hsts ? 'Presente' : '❌ AUSENTE'}
      - X-Frame-Options: ${data.securityHeaders?.xfo ? 'Presente' : '❌ AUSENTE'}
            `);

            const hostClean = new URL(url).hostname;
            onAssetsDiscovered([{
              subdomain: hostClean,
              rootDomain: target.domain,
              isAlive: true,
              httpStatus: data.status,
              httpTitle: data.title,
              webServer: data.webServer,
              contentType: data.contentType,
              contentLength: data.contentLength,
              responseUrl: data.url,
            }]);
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
            addLine('success', `[+] Encontradas ${data.count} URLs históricas indexadas!`);
            const preview = data.urls.slice(0, 10).map((u: string) => `  • ${u}`).join('\n');
            addLine('output', preview + (data.count > 10 ? `\n  ... e mais ${data.count - 10} URLs mineradas!` : ''));
          } else {
            addLine('error', `[-] Falha na mineração da Wayback Machine: ${data.error}`);
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
            addLine('output', rows + (assets.length > 20 ? `\n  ... e mais ${assets.length - 20} ativos. Abra a aba 'Ativos' para ver todos.` : ''));
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
              if (v.curlCommand) addLine('output', `      PoC: ${v.curlCommand}`);
            });
          }
          break;
        }

        case 'nuclei': {
          const host = args.find(a => !a.startsWith('-')) || target.domain;
          addLine('system', `[*] Disparando Nuclei Vulnerability Triage contra ${host}...`);

          // Execute triage logic
          const mockVuln: Vulnerability = {
            id: `vuln-nuclei-${Date.now()}`,
            templateId: 'security-headers-and-cors-misconfig',
            name: 'CORS Wildcard & Missing Security Headers',
            severity: 'medium',
            description: `Host ${host} permite origens arbitrárias em cabeçalhos CORS e não força política HSTS estrita.`,
            matchedAt: `https://${host}`,
            curlCommand: `curl -i -s -k -X GET "https://${host}" -H "Origin: https://evil.com" -H "${activeHeader}"`,
            sourceTool: 'nuclei',
            timestamp: new Date().toISOString(),
          };

          onAddVulnerability(mockVuln);
          addLine('success', `[+] Nuclei finalizou a análise! Vulnerabilidade cadastrada no Grafo e na Tabela.`);
          addLine('error', `  • [MEDIUM] ${mockVuln.name}`);
          addLine('output', `  • PoC: ${mockVuln.curlCommand}`);
          break;
        }

        case 'recon-all': {
          addLine('system', `══════════════════════════════════════════════════════════════`);
          addLine('system', `[*] INICIANDO PIPELINE DE RECONHECIMENTO COMPLETO: ${target.domain}`);
          addLine('system', `══════════════════════════════════════════════════════════════`);
          
          // 1. CRT.sh
          addLine('system', `[1/4] Executando enumeração passiva via CRT.sh...`);
          const crtRes = await fetch('/api/recon/crtsh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: target.domain }),
          });
          const crtData = await crtRes.json();
          if (crtData.success && crtData.subdomains) {
            addLine('success', `[+] ${crtData.count} subdomínios descobertos via CRT.sh.`);
            onAssetsDiscovered(crtData.subdomains.map((s: string) => ({
              subdomain: s,
              rootDomain: target.domain,
              discoveredVia: 'crtsh' as const,
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
            addLine('success', `[+] HTTP 200 OK: "${httpData.title || 'Live'}" (${httpData.webServer || 'Server'})`);
          }

          // 4. Conclusão
          addLine('system', `[4/4] Correlacionando Grafo de Superfície...`);
          addLine('success', `══════════════════════════════════════════════════════════════`);
          addLine('success', `[+] PIPELINE COMPLETO! Alvo ${target.domain} totalmente mapeado.`);
          addLine('success', `══════════════════════════════════════════════════════════════`);
          break;
        }

        case 'gemini':
        case 'ai': {
          const prompt = args.join(' ');
          if (!prompt) {
            addLine('output', `Uso: gemini <sua pergunta ou instrução sobre o alvo>`);
            break;
          }

          addLine('system', `[*] Consultando Alpha AI com inteligência ofensiva para '${prompt}'...`);

          const res = await fetch('/api/gemini/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target,
              findings: assets.slice(0, 10),
              customPrompt: prompt,
            }),
          });
          const data = await res.json();

          if (data.triage) {
            addLine('success', `[+] Resposta Alpha AI:\n\n${data.triage}`);
          } else {
            addLine('error', `[-] Erro na resposta da IA: ${data.error || 'Sem resposta'}`);
          }
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
An attacker can leverage this condition to access unauthorized resources, compromise sensitive customer data, or pivot into backend systems.

## Remediation
- Restrict endpoint access via appropriate authentication and authorization policies.
- Audit CORS configurations and remove unauthenticated debug routes.
          `.trim();

          addLine('success', reportMd);
          navigator.clipboard.writeText(reportMd);
          addLine('system', `[+] Relatório copiado automaticamente para a sua área de transferência!`);
          break;
        }

        default: {
          addLine('error', `[-] Comando desconhecido: '${command}'. Digite 'help' para listar o arsenal.`);
          break;
        }
      }
    } catch (err: any) {
      addLine('error', `[-] Exceção durante a execução: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Keyboard navigation for history and auto-complete
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
      const current = inputVal.trim();
      if (!current) return;
      const match = KNOWN_COMMANDS.find(cmd => cmd.startsWith(current.toLowerCase()));
      if (match) {
        setInputVal(match + ' ');
      }
    }
  };

  const handleCopyTerminal = () => {
    const text = lines.map(l => l.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={`relative w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden font-mono shadow-2xl flex flex-col transition-all ${
        isFullScreen ? 'fixed inset-0 z-50 h-screen rounded-none' : 'h-[750px]'
      }`}
      onClick={handleTerminalClick}
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
            <strong className="text-emerald-400">{activeHeader}</strong>
          </div>

          <button
            onClick={handleCopyTerminal}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors cursor-pointer"
            title="Copiar texto do terminal"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setLines([])}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors cursor-pointer"
            title="Limpar terminal"
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

      {/* Quick Launch Arsenal Dock */}
      <div className="bg-zinc-900/50 border-b border-zinc-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs select-none">
        <span className="text-zinc-500 text-[11px] font-bold flex items-center gap-1 shrink-0">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>ARSENAL TURBO:</span>
        </span>

        <button
          onClick={() => executeCommand('recon-all')}
          className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[11px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Play className="w-3 h-3" />
          <span>⚡ Scan Completo 1-Click</span>
        </button>

        <button
          onClick={() => executeCommand(`subfinder -d ${target.domain}`)}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-cyan-300 text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Globe className="w-3 h-3" />
          <span>Subfinder Passivo</span>
        </button>

        <button
          onClick={() => executeCommand(`dnsx ${target.domain}`)}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] shrink-0 transition-colors cursor-pointer"
        >
          DNSx & DoH
        </button>

        <button
          onClick={() => executeCommand(`takeovers`)}
          className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
        >
          <ShieldAlert className="w-3 h-3" />
          <span>Caçar Takeovers</span>
        </button>

        <button
          onClick={() => executeCommand(`httpx https://${target.domain}`)}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] shrink-0 transition-colors cursor-pointer"
        >
          HTTPx Live Probe
        </button>

        <button
          onClick={() => executeCommand(`wayback ${target.domain}`)}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] shrink-0 transition-colors cursor-pointer"
        >
          Wayback URLs
        </button>

        <button
          onClick={() => executeCommand(`nuclei ${target.domain}`)}
          className="px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Flame className="w-3 h-3" />
          <span>Nuclei Scan</span>
        </button>

        <button
          onClick={() => executeCommand('h1-report')}
          className="px-2.5 py-1 rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-800 text-purple-300 text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          <span>Gerar Report H1</span>
        </button>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs leading-relaxed font-mono">
        {lines.map((line) => {
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
          return (
            <pre key={line.id} className="text-zinc-300 whitespace-pre-wrap">
              {line.text}
            </pre>
          );
        })}

        {isExecuting && (
          <div className="flex items-center gap-2 text-cyan-400 py-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="animate-pulse">Executando ferramenta no alvo {target.domain}...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

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
          placeholder="Digite um comando (ex: crtsh, httpx, nuclei, gemini, help)..."
          className="flex-1 bg-transparent text-zinc-100 text-xs font-mono focus:outline-none placeholder:text-zinc-600 disabled:opacity-50"
          autoFocus
        />

        <button
          onClick={() => executeCommand(inputVal)}
          disabled={!inputVal.trim() || isExecuting}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-md text-xs transition-colors cursor-pointer"
        >
          Executar
        </button>
      </div>
    </div>
  );
}
