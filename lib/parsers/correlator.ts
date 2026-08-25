import { CorrelatedAsset, AttackGraphData, GraphNode, GraphEdge, Vulnerability, ServicePort, WebTech } from '@/types/recon';
import { ScopeGuard } from './scopeGuard';
import { HttpxEntry, NmapHostEntry } from './reconParsers';

export interface IngestionPayload {
  subdomains?: string[];
  httpx?: HttpxEntry[];
  nmap?: NmapHostEntry[];
  nuclei?: Vulnerability[];
  rootDomain?: string;
  scopeGuard?: ScopeGuard;
}

export class ReconCorrelator {
  /**
   * Correlates multi-tool reconnaissance data into structured assets
   */
  public static correlate(payload: IngestionPayload): {
    assets: CorrelatedAsset[];
    outOfScopeFiltered: string[];
    summary: {
      totalSubdomains: number;
      aliveCount: number;
      totalIps: number;
      totalOpenPorts: number;
      totalVulns: number;
      criticalVulns: number;
      takeoverRisks: number;
    };
  } {
    const assetMap = new Map<string, CorrelatedAsset>();
    const outOfScopeFiltered: string[] = [];
    const scopeGuard = payload.scopeGuard || new ScopeGuard();
    const rootDomain = payload.rootDomain || 'target.com';

    // Helper to get or create asset record
    const getOrCreateAsset = (subdomain: string): CorrelatedAsset => {
      const cleanSub = subdomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      if (!assetMap.has(cleanSub)) {
        const inScopeCheck = scopeGuard.isAllowed(cleanSub);
        assetMap.set(cleanSub, {
          id: `asset-${cleanSub.replace(/[^a-z0-9]/g, '-')}`,
          subdomain: cleanSub,
          rootDomain,
          isAlive: false,
          cnames: [],
          ips: [],
          ports: [],
          technologies: [],
          vulnerabilities: [],
          takeoverRisk: false,
          firstSeen: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          inScope: inScopeCheck.allowed,
          tags: [],
        });
      }
      return assetMap.get(cleanSub)!;
    };

    // 1. Ingest Subdomains
    if (payload.subdomains) {
      for (const sub of payload.subdomains) {
        if (!sub) continue;
        const scopeCheck = scopeGuard.isAllowed(sub);
        if (!scopeCheck.allowed) {
          outOfScopeFiltered.push(`${sub} (${scopeCheck.reason})`);
          continue;
        }
        getOrCreateAsset(sub);
      }
    }

    // 2. Ingest HTTPX Data
    if (payload.httpx) {
      for (const http of payload.httpx) {
        const rawHost = http.host || http.input || (http.url ? new URL(http.url).hostname : '');
        if (!rawHost) continue;

        const cleanHost = rawHost.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
        const scopeCheck = scopeGuard.isAllowed(cleanHost);
        if (!scopeCheck.allowed) {
          outOfScopeFiltered.push(`${cleanHost} (${scopeCheck.reason})`);
          continue;
        }

        const asset = getOrCreateAsset(cleanHost);
        asset.isAlive = true;
        asset.httpStatus = http.status_code || http.statusCode;
        asset.httpTitle = http.title;
        asset.webServer = http.webserver;
        asset.contentLength = http.content_length;
        asset.responseUrl = http.url;
        asset.contentType = http.content_type;

        // IPs
        if (http.ip && !asset.ips.includes(http.ip)) {
          asset.ips.push(http.ip);
        }
        if (http.a && Array.isArray(http.a)) {
          http.a.forEach(ip => {
            if (!asset.ips.includes(ip)) asset.ips.push(ip);
          });
        }

        // CNAMEs
        if (http.cname && Array.isArray(http.cname)) {
          http.cname.forEach(c => {
            if (!asset.cnames.includes(c)) {
              asset.cnames.push(c);
              // Check takeover risk (unclaimed S3, Github Pages, Heroku, Azure)
              if (
                c.includes('s3.amazonaws.com') ||
                c.includes('github.io') ||
                c.includes('herokuapp.com') ||
                c.includes('azurewebsites.net') ||
                c.includes('trafficmanager.net') ||
                c.includes('fastly.net') ||
                c.includes('zendesk.com')
              ) {
                if (asset.httpStatus === 404 || asset.httpStatus === 502 || asset.httpStatus === 403) {
                  asset.takeoverRisk = true;
                  asset.takeoverDetails = `Potencial Subdomain Takeover: CNAME ${c} com HTTP ${asset.httpStatus}`;
                  if (!asset.tags.includes('takeover-candidate')) asset.tags.push('takeover-candidate');
                }
              }
            }
          });
        }

        // Detect Cloud Provider
        const allIpStrings = asset.ips.join(' ') + ' ' + (asset.webServer || '') + ' ' + asset.cnames.join(' ');
        if (allIpStrings.includes('cloudflare') || asset.webServer?.toLowerCase().includes('cloudflare')) {
          asset.cloudProvider = 'cloudflare';
        } else if (allIpStrings.includes('amazonaws') || allIpStrings.includes('aws')) {
          asset.cloudProvider = 'aws';
        } else if (allIpStrings.includes('google') || allIpStrings.includes('gcp')) {
          asset.cloudProvider = 'gcp';
        } else if (allIpStrings.includes('azure')) {
          asset.cloudProvider = 'azure';
        }

        // Tech stack
        const techs = http.tech || http.technologies || [];
        for (const t of techs) {
          if (!asset.technologies.some(existing => existing.name.toLowerCase() === t.toLowerCase())) {
            asset.technologies.push({ name: t });
          }
        }

        // Add default web ports if discovered
        const parsedPort = http.port ? parseInt(String(http.port), 10) : http.url?.startsWith('https') ? 443 : 80;
        if (!isNaN(parsedPort) && !asset.ports.some(p => p.port === parsedPort)) {
          asset.ports.push({
            port: parsedPort,
            protocol: 'tcp',
            state: 'open',
            service: parsedPort === 443 ? 'https' : 'http',
            product: asset.webServer,
          });
        }
      }
    }

    // 3. Ingest Nmap / Naabu Ports
    if (payload.nmap) {
      for (const host of payload.nmap) {
        // Find matching asset by hostname or IP
        let matchedAssets: CorrelatedAsset[] = [];
        if (host.hostname) {
          const cleanHost = host.hostname.trim().toLowerCase();
          if (assetMap.has(cleanHost)) matchedAssets.push(assetMap.get(cleanHost)!);
        }

        if (matchedAssets.length === 0 && host.ip) {
          assetMap.forEach(a => {
            if (a.ips.includes(host.ip)) matchedAssets.push(a);
          });
        }

        // If not matched, but in scope, create asset from IP or hostname
        if (matchedAssets.length === 0) {
          const targetName = host.hostname || host.ip;
          const scopeCheck = scopeGuard.isAllowed(targetName);
          if (scopeCheck.allowed) {
            const newAsset = getOrCreateAsset(targetName);
            if (host.ip && !newAsset.ips.includes(host.ip)) newAsset.ips.push(host.ip);
            matchedAssets.push(newAsset);
          }
        }

        for (const asset of matchedAssets) {
          if (host.ip && !asset.ips.includes(host.ip)) asset.ips.push(host.ip);
          for (const newPort of host.ports) {
            const existingPort = asset.ports.find(p => p.port === newPort.port);
            if (!existingPort) {
              asset.ports.push(newPort);
            } else {
              if (newPort.service && newPort.service !== 'unknown') existingPort.service = newPort.service;
              if (newPort.banner) existingPort.banner = newPort.banner;
            }
          }
        }
      }
    }

    // 4. Ingest Nuclei Findings
    if (payload.nuclei) {
      for (const vuln of payload.nuclei) {
        const matchedUrl = vuln.matchedAt || '';
        let targetHost = '';
        try {
          if (matchedUrl.startsWith('http://') || matchedUrl.startsWith('https://')) {
            targetHost = new URL(matchedUrl).hostname;
          } else {
            targetHost = matchedUrl.split('/')[0].split(':')[0];
          }
        } catch {
          targetHost = matchedUrl.split('/')[0].split(':')[0];
        }

        targetHost = targetHost.trim().toLowerCase();
        let matchedAsset = assetMap.get(targetHost);

        // Fallback matching
        if (!matchedAsset) {
          assetMap.forEach(a => {
            if (matchedUrl.includes(a.subdomain) || (a.ips.length > 0 && a.ips.some(ip => matchedUrl.includes(ip)))) {
              matchedAsset = a;
            }
          });
        }

        if (matchedAsset) {
          if (!matchedAsset.vulnerabilities.some(v => v.templateId === vuln.templateId && v.matchedAt === vuln.matchedAt)) {
            matchedAsset.vulnerabilities.push(vuln);
          }
        } else {
          // Check scope and add as new asset
          const scopeCheck = scopeGuard.isAllowed(targetHost);
          if (scopeCheck.allowed) {
            const newAsset = getOrCreateAsset(targetHost);
            newAsset.isAlive = true;
            newAsset.vulnerabilities.push(vuln);
          }
        }
      }
    }

    // Convert map to array and compute statistics
    const assets = Array.from(assetMap.values());
    let totalOpenPorts = 0;
    let totalVulns = 0;
    let criticalVulns = 0;
    let takeoverRisks = 0;
    const ipSet = new Set<string>();

    for (const a of assets) {
      totalOpenPorts += a.ports.filter(p => p.state === 'open').length;
      totalVulns += a.vulnerabilities.length;
      criticalVulns += a.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length;
      if (a.takeoverRisk) takeoverRisks++;
      a.ips.forEach(ip => ipSet.add(ip));
    }

    return {
      assets,
      outOfScopeFiltered,
      summary: {
        totalSubdomains: assets.length,
        aliveCount: assets.filter(a => a.isAlive).length,
        totalIps: ipSet.size,
        totalOpenPorts,
        totalVulns,
        criticalVulns,
        takeoverRisks,
      },
    };
  }

  /**
   * Generates Graph Nodes and Edges for Visual Attack Surface
   */
  public static buildAttackGraph(assets: CorrelatedAsset[], rootDomain: string): AttackGraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeSet = new Set<string>();

    // 1. Root Domain Node
    const rootNodeId = `root-${rootDomain}`;
    nodes.push({
      id: rootNodeId,
      label: rootDomain,
      type: 'root',
      alive: true,
      details: { totalAssets: assets.length },
    });
    nodeSet.add(rootNodeId);

    for (const asset of assets) {
      const subNodeId = `sub-${asset.subdomain}`;
      if (!nodeSet.has(subNodeId)) {
        // Highest severity for node badge
        let maxSev: any = undefined;
        if (asset.vulnerabilities.length > 0) {
          if (asset.vulnerabilities.some(v => v.severity === 'critical')) maxSev = 'critical';
          else if (asset.vulnerabilities.some(v => v.severity === 'high')) maxSev = 'high';
          else if (asset.vulnerabilities.some(v => v.severity === 'medium')) maxSev = 'medium';
          else maxSev = 'low';
        }

        nodes.push({
          id: subNodeId,
          label: asset.subdomain,
          type: 'subdomain',
          alive: asset.isAlive,
          severity: maxSev,
          details: {
            title: asset.httpTitle,
            status: asset.httpStatus,
            takeover: asset.takeoverRisk,
          },
        });
        nodeSet.add(subNodeId);

        edges.push({
          id: `edge-${rootNodeId}-${subNodeId}`,
          source: rootNodeId,
          target: subNodeId,
          type: 'resolves_to',
        });
      }

      // IP Nodes
      for (const ip of asset.ips) {
        const ipNodeId = `ip-${ip}`;
        if (!nodeSet.has(ipNodeId)) {
          nodes.push({
            id: ipNodeId,
            label: ip,
            type: 'ip',
            alive: true,
            details: { cloud: asset.cloudProvider },
          });
          nodeSet.add(ipNodeId);
        }

        const edgeId = `edge-${subNodeId}-${ipNodeId}`;
        if (!edges.some(e => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: subNodeId,
            target: ipNodeId,
            type: 'resolves_to',
          });
        }
      }

      // Open Ports Nodes (Show only high value / web ports to avoid crowding)
      for (const port of asset.ports) {
        const portNodeId = `port-${asset.subdomain}-${port.port}`;
        if (!nodeSet.has(portNodeId)) {
          nodes.push({
            id: portNodeId,
            label: `Port ${port.port} (${port.service || 'tcp'})`,
            type: 'port',
            alive: true,
            details: port,
          });
          nodeSet.add(portNodeId);

          edges.push({
            id: `edge-${subNodeId}-${portNodeId}`,
            source: subNodeId,
            target: portNodeId,
            type: 'hosts',
          });
        }
      }

      // Vulnerabilities Nodes
      for (const vuln of asset.vulnerabilities) {
        const vulnNodeId = `vuln-${vuln.id}`;
        if (!nodeSet.has(vulnNodeId)) {
          nodes.push({
            id: vulnNodeId,
            label: vuln.name,
            type: 'vulnerability',
            severity: vuln.severity,
            alive: true,
            details: vuln,
          });
          nodeSet.add(vulnNodeId);

          edges.push({
            id: `edge-${subNodeId}-${vulnNodeId}`,
            source: subNodeId,
            target: vulnNodeId,
            type: 'vulnerable_to',
            label: vuln.severity.toUpperCase(),
          });
        }
      }
    }

    return { nodes, edges };
  }
}
