import { CorrelatedAsset, Vulnerability, ServicePort, WebTech } from '@/types/recon';
import { ScopeGuard } from './scopeGuard';

export interface SubfinderEntry {
  host?: string;
  source?: string;
  sources?: string[];
  input?: string;
}

export interface HttpxEntry {
  input?: string;
  url?: string;
  host?: string;
  port?: string | number;
  status_code?: number;
  statusCode?: number;
  title?: string;
  webserver?: string;
  content_length?: number;
  content_type?: string;
  tech?: string[];
  technologies?: string[];
  cname?: string[];
  a?: string[];
  ip?: string;
  failed?: boolean;
  time?: string;
}

export interface NucleiEntry {
  'template-id'?: string;
  templateID?: string;
  info?: {
    name?: string;
    severity?: string;
    description?: string;
    tags?: string[];
    classification?: {
      'cve-id'?: string | string[];
      'cwe-id'?: string | string[];
      'cvss-score'?: number;
    };
    remediation?: string;
  };
  'matched-at'?: string;
  matchedAt?: string;
  'extracted-results'?: string[];
  'curl-command'?: string;
  type?: string;
  host?: string;
  ip?: string;
  timestamp?: string;
}

export interface NmapPortEntry {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'filtered' | 'closed';
  service?: string;
  product?: string;
  version?: string;
  banner?: string;
}

export interface NmapHostEntry {
  ip: string;
  hostname?: string;
  ports: NmapPortEntry[];
  os?: string;
}

/**
 * Universal Parser Utilities
 */
export class ReconParsers {
  /**
   * Parse Subfinder output (JSON Lines or JSON Array)
   */
  public static parseSubfinder(raw: string): { subdomains: string[]; errors: string[] } {
    const subdomains = new Set<string>();
    const errors: string[] = [];

    if (!raw || !raw.trim()) return { subdomains: [], errors: [] };

    const lines = raw.trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        if (line.startsWith('{')) {
          const parsed = JSON.parse(line) as SubfinderEntry;
          const host = parsed.host || parsed.input;
          if (host) subdomains.add(host.trim().toLowerCase());
        } else {
          // Plain text list of subdomains
          const cleaned = line.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].trim().toLowerCase();
          if (cleaned) subdomains.add(cleaned);
        }
      } catch (err: any) {
        // Check if whole raw text is a JSON Array
        if (i === 0 && raw.trim().startsWith('[')) {
          try {
            const arr = JSON.parse(raw) as SubfinderEntry[];
            arr.forEach(item => {
              const h = item.host || item.input;
              if (h) subdomains.add(h.trim().toLowerCase());
            });
            return { subdomains: Array.from(subdomains), errors: [] };
          } catch (e: any) {
            errors.push(`JSON Array parse error: ${e.message}`);
          }
        }
        errors.push(`Line ${i + 1} invalid: ${err.message}`);
      }
    }

    return { subdomains: Array.from(subdomains), errors };
  }

  /**
   * Parse HTTPX output (JSON Lines or JSON Array)
   */
  public static parseHttpx(raw: string): { entries: HttpxEntry[]; errors: string[] } {
    const entries: HttpxEntry[] = [];
    const errors: string[] = [];

    if (!raw || !raw.trim()) return { entries: [], errors: [] };

    const lines = raw.trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        if (line.startsWith('{')) {
          const item = JSON.parse(line) as HttpxEntry;
          entries.push(item);
        }
      } catch (err: any) {
        if (i === 0 && raw.trim().startsWith('[')) {
          try {
            const arr = JSON.parse(raw) as HttpxEntry[];
            return { entries: arr, errors: [] };
          } catch (e: any) {
            errors.push(`Httpx array parse error: ${e.message}`);
          }
        }
        errors.push(`Httpx Line ${i + 1} error: ${err.message}`);
      }
    }

    return { entries, errors };
  }

  /**
   * Parse Nuclei output (JSON Lines or JSON Array)
   */
  public static parseNuclei(raw: string): { vulns: Vulnerability[]; errors: string[] } {
    const vulns: Vulnerability[] = [];
    const errors: string[] = [];

    if (!raw || !raw.trim()) return { vulns: [], errors: [] };

    const lines = raw.trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        if (line.startsWith('{')) {
          const item = JSON.parse(line) as NucleiEntry;
          const templateId = item['template-id'] || item.templateID || 'unknown-template';
          const name = item.info?.name || templateId;
          const rawSev = (item.info?.severity || 'info').toLowerCase();
          const severity = ['info', 'low', 'medium', 'high', 'critical'].includes(rawSev)
            ? (rawSev as any)
            : 'info';

          const cveRaw = item.info?.classification?.['cve-id'];
          const cve = Array.isArray(cveRaw) ? cveRaw : cveRaw ? [cveRaw] : undefined;

          const cweRaw = item.info?.classification?.['cwe-id'];
          const cwe = Array.isArray(cweRaw) ? cweRaw : cweRaw ? [cweRaw] : undefined;

          vulns.push({
            id: `vuln-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            templateId,
            name,
            severity,
            description: item.info?.description,
            matchedAt: item['matched-at'] || item.matchedAt || item.host || '',
            extractedResults: item['extracted-results'],
            curlCommand: item['curl-command'],
            cve,
            cwe,
            cvssScore: item.info?.classification?.['cvss-score'],
            remediation: item.info?.remediation,
            sourceTool: 'nuclei',
            timestamp: item.timestamp || new Date().toISOString(),
          });
        }
      } catch (err: any) {
        if (i === 0 && raw.trim().startsWith('[')) {
          try {
            const arr = JSON.parse(raw) as NucleiEntry[];
            arr.forEach((item, idx) => {
              const templateId = item['template-id'] || item.templateID || `template-${idx}`;
              const name = item.info?.name || templateId;
              const rawSev = (item.info?.severity || 'info').toLowerCase();
              const severity = ['info', 'low', 'medium', 'high', 'critical'].includes(rawSev) ? (rawSev as any) : 'info';
              vulns.push({
                id: `vuln-${Date.now()}-${idx}`,
                templateId,
                name,
                severity,
                description: item.info?.description,
                matchedAt: item['matched-at'] || item.matchedAt || item.host || '',
                extractedResults: item['extracted-results'],
                curlCommand: item['curl-command'],
                sourceTool: 'nuclei',
                timestamp: item.timestamp || new Date().toISOString(),
              });
            });
            return { vulns, errors: [] };
          } catch (e: any) {
            errors.push(`Nuclei array parse error: ${e.message}`);
          }
        }
        errors.push(`Nuclei line ${i + 1} parse error: ${err.message}`);
      }
    }

    return { vulns, errors };
  }

  /**
   * Parse Nmap / Naabu outputs (JSON or Nmap Grepable/Text)
   */
  public static parseNmap(raw: string): { hosts: NmapHostEntry[]; errors: string[] } {
    const hosts: NmapHostEntry[] = [];
    const errors: string[] = [];

    if (!raw || !raw.trim()) return { hosts: [], errors: [] };

    // Check if JSON Lines (e.g. Naabu -json: {"ip":"1.2.3.4","port":80,"host":"sub.domain.com"})
    const lines = raw.trim().split('\n');
    const naabuMap = new Map<string, { hostname?: string; ports: Set<number> }>();

    let isJson = false;
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        isJson = true;
        try {
          const item = JSON.parse(line.trim());
          const ip = item.ip || item.host || 'unknown';
          const port = parseInt(item.port, 10);
          if (!naabuMap.has(ip)) {
            naabuMap.set(ip, { hostname: item.host !== ip ? item.host : undefined, ports: new Set() });
          }
          if (!isNaN(port)) {
            naabuMap.get(ip)!.ports.add(port);
          }
        } catch (e: any) {
          errors.push(`Naabu line error: ${e.message}`);
        }
      }
    }

    if (isJson && naabuMap.size > 0) {
      naabuMap.forEach((val, ip) => {
        hosts.push({
          ip,
          hostname: val.hostname,
          ports: Array.from(val.ports).map(p => ({
            port: p,
            protocol: 'tcp',
            state: 'open',
            service: p === 80 ? 'http' : p === 443 ? 'https' : p === 22 ? 'ssh' : p === 8080 ? 'http-proxy' : p === 8443 ? 'https-alt' : 'unknown',
          })),
        });
      });
      return { hosts, errors };
    }

    // Text parsing for standard Nmap output
    let currentIp = '';
    let currentHost = '';
    let currentPorts: NmapPortEntry[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Nmap scan report for sub.example.com (1.2.3.4)
      const reportMatch = trimmed.match(/Nmap scan report for (?:([^\s()]+)\s+\(([^()]+)\)|([^\s]+))/i);
      if (reportMatch) {
        if (currentIp || currentPorts.length > 0) {
          hosts.push({
            ip: currentIp || currentHost || 'unknown',
            hostname: currentHost !== currentIp ? currentHost : undefined,
            ports: [...currentPorts],
          });
          currentPorts = [];
        }

        if (reportMatch[1] && reportMatch[2]) {
          currentHost = reportMatch[1];
          currentIp = reportMatch[2];
        } else if (reportMatch[3]) {
          const val = reportMatch[3];
          if (/^\d+\.\d+\.\d+\.\d+$/.test(val)) {
            currentIp = val;
            currentHost = '';
          } else {
            currentHost = val;
            currentIp = val;
          }
        }
        continue;
      }

      // Port lines: 80/tcp open http Apache httpd 2.4.41
      const portMatch = trimmed.match(/^(\d+)\/(tcp|udp)\s+(\w+)\s+([^\s]+)?(?:\s+(.*))?$/i);
      if (portMatch) {
        const port = parseInt(portMatch[1], 10);
        const protocol = portMatch[2].toLowerCase() as 'tcp' | 'udp';
        const state = (portMatch[3].toLowerCase() as any) || 'open';
        const service = portMatch[4] || 'unknown';
        const banner = portMatch[5] || '';

        currentPorts.push({
          port,
          protocol,
          state: state === 'open' ? 'open' : state === 'filtered' ? 'filtered' : 'closed',
          service,
          banner,
        });
      }
    }

    if (currentIp || currentPorts.length > 0) {
      hosts.push({
        ip: currentIp || currentHost || 'unknown',
        hostname: currentHost !== currentIp ? currentHost : undefined,
        ports: [...currentPorts],
      });
    }

    return { hosts, errors };
  }
}
