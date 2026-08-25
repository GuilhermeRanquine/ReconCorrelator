import { TargetProject, ReconPlaybook, ReconFlowStep } from '@/types/recon';

export class ReconPlaybookGenerator {
  static generateForTarget(target: TargetProject): ReconPlaybook {
    const domain = target.domain;
    const isApiHeavy = target.policy?.targetArchitecture === 'microservices_api' || target.name.toLowerCase().includes('api');
    const requiredHeader = target.policy?.requiredHeaders?.[0] || { key: 'X-HackerOne-Research', value: 'w0rmingstar' };
    const headerFlag = `-H "${requiredHeader.key}: ${requiredHeader.value}"`;
    const researcherHandle = requiredHeader.value || 'w0rmingstar';

    const steps: ReconFlowStep[] = [
      {
        id: 'step-phase-1-passive',
        phaseNumber: 1,
        phaseName: 'Fase 1: Reconhecimento Passivo & OSINT',
        stepTitle: 'Enumeração de Certificados e ASN (Sem Tocar no Alvo)',
        description: 'Coleta de subdomínios e infraestrutura sem emitir pacotes diretos ao servidor do alvo.',
        targetCategory: 'passive_dns',
        status: 'pending',
        recommendedTools: ['crt.sh', 'subfinder -all', 'amass enum -passive', 'shodan', 'alienvault otx'],
        commandSnippets: [
          {
            toolName: 'Subfinder (Passive)',
            cliCommand: `subfinder -d ${domain} -all -silent -o subdomains_passive.txt`,
            explanation: 'Varre dezenas de fontes públicas (VirusTotal, SecurityTrails, Chaos, Shodan, Censys, Crtsh).',
          },
          {
            toolName: 'Assetfinder & Amass',
            cliCommand: `amass enum -passive -d ${domain} | anew subdomains_passive.txt`,
            explanation: 'Cruza inteligência de ASNs e registros WHOIS históricos.',
          },
          {
            toolName: 'CRT.sh Certificate Transparency',
            cliCommand: `curl -s "https://crt.sh/?q=%25.${domain}&output=json" | jq -r '.[].name_value' | sed 's/\\*\\.//g' | sort -u | anew subdomains_passive.txt`,
            explanation: 'Extrai todos os certificados TLS já emitidos para a organização.',
          },
        ],
        expertProTips: [
          'Totalmente invisível para o SOC do cliente.',
          'Permite encontrar domínios esquecidos (shadow IT) criados há anos.',
          'Execute a automação do CRT.sh com 1-clique diretamente no painel.',
        ],
        isAutomationSupported: true,
        automationAction: 'run_crtsh',
      },
      {
        id: 'step-phase-2-dns-active',
        phaseNumber: 2,
        phaseName: 'Fase 2: Resolução DNS Ativa & Bruteforce',
        stepTitle: 'DNS Probing, Wildcard Filtering & Resolvers',
        description: 'Validação de quais subdomínios passivos realmente resolvem IPs e bruteforce de palavras-chave.',
        targetCategory: 'active_dns',
        status: 'pending',
        recommendedTools: ['dnsx', 'massdns', 'puredns', 'gotator'],
        commandSnippets: [
          {
            toolName: 'dnsx (Multi-Resolver Probe)',
            cliCommand: `dnsx -l subdomains_passive.txt -r resolvers.txt -a -aaaa -cname -resp -silent -o resolved_hosts.txt`,
            explanation: 'Valida registros DNS descartando respostas wildcard/falsos positivos.',
            wordlistSuggestion: 'https://raw.githubusercontent.com/trickest/resolvers/main/resolvers.txt',
          },
          {
            toolName: 'Gotator / PureDNS Bruteforce',
            cliCommand: `puredns bruteforce best-dns-wordlist.txt ${domain} -r resolvers.txt -w bruteforce_found.txt`,
            explanation: 'Bruteforce ativo de palavras como dev, staging, internal, v1, admin, auth, k8s, grafana.',
            wordlistSuggestion: 'Assetnote: best-dns-wordlist.txt',
          },
        ],
        expertProTips: [
          'Sempre utilize uma lista de resolvers públicos confiáveis e atualizados para evitar rate limit de DNS.',
          'Filtre respostas CNAME para investigar imediatamente possíveis Subdomain Takeovers.',
        ],
        isAutomationSupported: true,
        automationAction: 'run_dns_lookup',
      },
      {
        id: 'step-phase-3-portscan',
        phaseNumber: 3,
        phaseName: 'Fase 3: Varredura de Portas & Serviços',
        stepTitle: 'Port Scanning Rápido & Mapeamento de Portas Não-Padrão',
        description: 'Descoberta de portas HTTP alternativas (8080, 8443, 8000, 9000, 3000, 5000) e serviços de infraestrutura.',
        targetCategory: 'port_scan',
        status: 'pending',
        recommendedTools: ['naabu', 'nmap', 'masscan'],
        commandSnippets: [
          {
            toolName: 'Naabu (SYN Scan Rápido)',
            cliCommand: `naabu -l subdomains_passive.txt -top-ports 1000 -exclude-cdn -silent -o open_ports.txt`,
            explanation: 'Identifica portas abertas em segundos sem disparar alertas pesados em CDNs.',
          },
          {
            toolName: 'Nmap Service & Version Detection',
            cliCommand: `nmap -sV -sC -iL open_ports.txt -oN nmap_services_detailed.txt --open`,
            explanation: 'Extrai banners, versões de Apache/Nginx/Node/SSH e certificados SSL específicos.',
          },
        ],
        expertProTips: [
          'Evite escanear portas completas em IPs da Cloudflare (use a flag -exclude-cdn no Naabu).',
          'Concentre-se em portas 8080 (Spring/Jenkins), 9090 (Prometheus), 9200 (Elasticsearch), 5601 (Kibana) e 3000 (Grafana/Devs).',
        ],
      },
      {
        id: 'step-phase-4-webprobe',
        phaseNumber: 4,
        phaseName: 'Fase 4: Live HTTP Probing & Fingerprinting',
        stepTitle: 'HTTPX, Tecnologias, WAF & Screenshots',
        description: 'Filtragem de hosts vivos HTTP/HTTPS, códigos de status, títulos de páginas e tecnologias.',
        targetCategory: 'web_probe',
        status: 'pending',
        recommendedTools: ['httpx', 'gowitness', 'wappalyzer', 'wafw00f'],
        commandSnippets: [
          {
            toolName: 'HTTPX (Full Fingerprint)',
            cliCommand: `httpx -l open_ports.txt -title -tech-detect -status-code -content-length -web-server -location ${headerFlag} -json -o httpx_live.json`,
            explanation: 'Gera inventário completo de endpoints web com status HTTP, titles e stacks.',
          },
          {
            toolName: 'WAF Detection (wafw00f)',
            cliCommand: `wafw00f -i live_urls.txt -o waf_inventory.json`,
            explanation: 'Identifica se o alvo usa Cloudflare, AWS WAF, Akamai, Imperva ou F5.',
          },
        ],
        expertProTips: [
          'Preste atenção especial em respostas 401/403 que podem ser burladas com headers customizados ou paths duplicados.',
          'Endpoints com títulos como "Swagger UI", "Admin Login", "GitLab", "Jenkins" ou "Actuator" devem ser priorizados imediatamente.',
        ],
        isAutomationSupported: true,
        automationAction: 'run_http_probe',
      },
      {
        id: 'step-phase-5-jsmining',
        phaseNumber: 5,
        phaseName: 'Fase 5: Content Discovery & JS Mining',
        stepTitle: 'Extração de URLs Históricas, Parâmetros e Segredos em JavaScript',
        description: 'Mineração profunda em bundles Webpack, source maps e histórico da Wayback Machine para encontrar chaves de API e rotas ocultas.',
        targetCategory: 'js_analysis',
        status: 'pending',
        recommendedTools: ['katana', 'gau', 'waybackurls', 'paramspider', 'secretfinder', 'trufflehog'],
        commandSnippets: [
          {
            toolName: 'Katana (Modern Web Crawler)',
            cliCommand: `katana -list live_urls.txt -jc -kf all -d 3 -silent -o katana_endpoints.txt ${headerFlag}`,
            explanation: 'Executa crawler JavaScript moderno analisando endpoints e chamadas de API dinâmicas.',
          },
          {
            toolName: 'Waybackurls & GAU (Historical Mining)',
            cliCommand: `gau ${domain} --subs --threads 10 | anew historical_urls.txt`,
            explanation: 'Extrai todo o histórico de URLs arquivadas na Wayback Machine, AlienVault e CommonCrawl.',
          },
          {
            toolName: 'SecretFinder & JS Endpoints',
            cliCommand: `cat katana_endpoints.txt | grep "\\.js$" | xargs -I% -P5 python3 SecretFinder.py -i % -o cli`,
            explanation: 'Localiza chaves de API da AWS, Stripe, Google Maps, JWT secrets e rotas privadas nos arquivos JS.',
          },
        ],
        expertProTips: [
          'Source maps (.js.map) muitas vezes contêm o código-fonte original completo da aplicação frontend!',
          'Use regex para filtrar endpoints com parâmetros vulneráveis: `id=`, `url=`, `redirect=`, `token=`, `file=`.',
        ],
        isAutomationSupported: true,
        automationAction: 'run_wayback',
      },
      {
        id: 'step-phase-6-fuzzing',
        phaseNumber: 6,
        phaseName: 'Fase 6: Directory Fuzzing & API Discovery',
        stepTitle: 'Enumeração de Diretórios, Swagger, Actuators e GraphQL',
        description: 'Fuzzing inteligente de rotas de API não documentadas, painéis de administração e arquivos de backup.',
        targetCategory: 'fuzzing',
        status: 'pending',
        recommendedTools: ['ffuf', 'kiterunner', 'feroxbuster', 'arjun'],
        commandSnippets: [
          {
            toolName: 'FFuF (Directory & Backup Fuzzing)',
            cliCommand: `ffuf -u https://TARGET/FUZZ -w /wordlists/raft-large-words.txt -mc 200,301,302,403 ${headerFlag} -rate 50 -o fuzz_results.json`,
            explanation: 'Varredura com rate-limit respeitoso para encontrar arquivos sensíveis e painéis.',
            wordlistSuggestion: 'SecLists: Discovery/Web-Content/raft-large-words.txt',
          },
          {
            toolName: 'Kiterunner (API Routes & Swagger Discovery)',
            cliCommand: `kr scan https://TARGET -w /wordlists/routes-large.kite ${headerFlag} -A=apiroutes-210228`,
            explanation: 'Detecta rotas de microsserviços e APIs REST (ex: /api/v1/users, /v2/transfers).',
            wordlistSuggestion: 'Assetnote: routes-large.kite',
          },
          {
            toolName: 'Arjun (Hidden HTTP Parameters)',
            cliCommand: `arjun -u https://TARGET/api/endpoint -m GET,POST -oJ params.json`,
            explanation: 'Encontra parâmetros ocultos aceitos pelo backend (ex: debug=true, admin=1, role=superuser).',
          },
        ],
        expertProTips: [
          'Em alvos de Bug Bounty, respeite rigorosamente o rate limit (flag -rate 30 no ffuf) para evitar bloqueio do IP.',
          'Teste sempre arquivos de backup comuns: `.env`, `.git/config`, `config.json`, `app.js.bak`, `dump.sql`.',
        ],
      },
      {
        id: 'step-phase-7-nuclei',
        phaseNumber: 7,
        phaseName: 'Fase 7: Vulnerability Scanning & Nuclei Matching',
        stepTitle: 'Varredura de CVEs, Misconfigurations & Exposures',
        description: 'Execução de templates Nuclei direcionados para identificar falhas conhecidas de alto impacto.',
        targetCategory: 'vuln_scan',
        status: 'pending',
        recommendedTools: ['nuclei', 'subzy (Takeovers)'],
        commandSnippets: [
          {
            toolName: 'Nuclei (Exposures & Misconfigurations)',
            cliCommand: `nuclei -l live_urls.txt -t exposures/,misconfiguration/,takeovers/ -severity critical,high,medium ${headerFlag} -json -o nuclei_findings.json`,
            explanation: 'Testa painéis expostos, credenciais padrão, chaves de API e Spring Boot Actuators.',
          },
          {
            toolName: 'Nuclei (CVEs Recentes & 0-Days de Software)',
            cliCommand: `nuclei -l live_urls.txt -t cves/2024/,cves/2025/,cves/2026/ -severity critical,high ${headerFlag} -json -o nuclei_cves.json`,
            explanation: 'Varre por falhas conhecidas de RCE e Auth Bypass em Apache, Nginx, Jenkins, Laravel, etc.',
          },
        ],
        expertProTips: [
          'Nunca execute templates destrutivos ou de negação de serviço (DoS). O Nuclei possui tags seguras.',
          'Sempre configure o header obrigatório do programa para evitar ser bloqueado pela equipe de segurança.',
        ],
        isAutomationSupported: true,
        automationAction: 'run_nuclei_triage',
      },
      {
        id: 'step-phase-8-reporting',
        phaseNumber: 8,
        phaseName: 'Fase 8: Exploit Chaining & Bug Bounty Report',
        stepTitle: 'Triagem com ALPHA AI, PoC cURL e Envio do Relatório',
        description: 'Encadeamento de vulnerabilidades para maximizar severidade (ex: Info Leak ➔ Account Takeover ➔ RCE) e redação do relatório final.',
        targetCategory: 'reporting',
        status: 'pending',
        recommendedTools: ['ALPHA Red Team AI Triager', 'CVSS v3.1 Calculator', 'Markdown Exporter'],
        commandSnippets: [
          {
            toolName: 'PoC Verification (cURL Exato)',
            cliCommand: `curl -i -s -k -X GET "https://target.com/vulnerable/endpoint" ${headerFlag}`,
            explanation: 'Gera a Prova de Conceito reproduzível em um único comando.',
          },
        ],
        expertProTips: [
          'Reports com PoC em vídeo ou comando cURL exato são validados em média 3x mais rápido pelos triagers da HackerOne/Bugcrowd.',
          'Demonstre sempre o impacto real no negócio (Business Impact) para garantir o payout máximo da faixa Critical/High.',
        ],
      },
    ];

    return {
      id: `playbook-${target.id}`,
      targetDomain: domain,
      targetArchitecture: target.policy?.targetArchitecture || 'cloud_native',
      overallProgress: 0,
      steps,
      lastUpdated: new Date().toISOString(),
    };
  }
}
