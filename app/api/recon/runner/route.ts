import { NextRequest, NextResponse } from 'next/server';
import { getReconCache, setReconCache, upsertAssets, getAssets, readDb } from '@/lib/db';
import { CorrelatedAsset, Vulnerability } from '@/types/recon';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { domain, pipeline = 'full', forceRefresh = false } = body;

    if (!domain) {
      return NextResponse.json({ success: false, error: 'domain é obrigatório' }, { status: 400 });
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const logs: { tool: string; level: 'info' | 'success' | 'warning' | 'error'; message: string; timestamp: string }[] = [];

    const addLog = (tool: string, level: 'info' | 'success' | 'warning' | 'error', message: string) => {
      logs.push({ tool, level, message, timestamp: new Date().toLocaleTimeString() });
    };

    addLog('ALPHA', 'info', `[BACKEND EXECUTION] Iniciando motor de reconhecimento em segundo plano para: ${cleanDomain}`);

    // Check if full pipeline run is in cache
    if (!forceRefresh) {
      const cachedRun = await getReconCache('pipeline-runner', cleanDomain);
      if (cachedRun && Array.isArray(cachedRun.assets) && cachedRun.assets.length > 0) {
        addLog('CACHE', 'success', `[⚡ CACHE-HIT] Resultados consolidados carregados da base de dados sem repetição de requisições externas.`);
        return NextResponse.json({
          success: true,
          fromCache: true,
          domain: cleanDomain,
          assets: cachedRun.assets,
          logs: [...logs, ...(cachedRun.logs || [])],
          stats: cachedRun.stats,
          executedAt: cachedRun.executedAt,
        });
      }
    }

    // Step 1: Subdomain Discovery via CRT.sh & Certificate Logs
    addLog('crtsh', 'info', `Consultando Certificate Transparency logs para %.${cleanDomain}...`);
    let discoveredSubs: string[] = [cleanDomain];
    try {
      const crtCached = await getReconCache('crtsh', cleanDomain);
      if (crtCached && Array.isArray(crtCached.subdomains)) {
        discoveredSubs = crtCached.subdomains;
        addLog('crtsh', 'success', `[CACHE] ${discoveredSubs.length} subdomínios recuperados da base de dados.`);
      } else {
        // Fallback live crt query
        const crtRes = await fetch(`https://crt.sh/?q=%.${cleanDomain}&output=json`, {
          headers: { 'User-Agent': 'ReconCorrelator-Squad/3.4' },
          signal: AbortSignal.timeout(6000),
        }).catch(() => null);

        if (crtRes && crtRes.ok) {
          const raw = await crtRes.json().catch(() => []);
          const subSet = new Set<string>();
          for (const item of raw) {
            if (item.name_value) {
              for (const n of String(item.name_value).split('\n')) {
                const s = n.trim().toLowerCase().replace(/^\*\./, '');
                if (s.endsWith(`.${cleanDomain}`) || s === cleanDomain) subSet.add(s);
              }
            }
          }
          subSet.add(cleanDomain);
          discoveredSubs = Array.from(subSet).sort();
        }
        await setReconCache('crtsh', cleanDomain, { subdomains: discoveredSubs, queriedAt: new Date().toISOString() }, 86400);
        addLog('crtsh', 'success', `[LIVE] ${discoveredSubs.length} subdomínios descobertos via CRT.sh.`);
      }
    } catch (e: any) {
      addLog('crtsh', 'warning', `Aviso em CRT.sh: ${e.message}`);
    }

    // Initial asset stubs upsert
    const assetStubs: Partial<CorrelatedAsset>[] = discoveredSubs.map(sub => ({
      subdomain: sub,
      rootDomain: cleanDomain,
      isAlive: false,
      tags: ['subdomain-discovery'],
      discoveredVia: 'crtsh',
    }));
    await upsertAssets(assetStubs, cleanDomain);

    // Step 2: Parallel DNS DoH resolution for up to top 15 subdomains
    addLog('dnsx', 'info', `Resolvendo DNS DoH (Cloudflare / Google) para os subdomínios prioritários...`);
    const prioritized = discoveredSubs.slice(0, 15);
    const resolvedAssets: Partial<CorrelatedAsset>[] = [];

    await Promise.all(
      prioritized.map(async sub => {
        try {
          const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(sub)}&type=A`, {
            headers: { Accept: 'application/dns-json' },
            signal: AbortSignal.timeout(3500),
          }).catch(() => null);

          if (res && res.ok) {
            const data = await res.json().catch(() => ({}));
            const answers = data.Answer || [];
            const ips = answers.filter((a: any) => a.type === 1).map((a: any) => a.data);
            const cnames = answers.filter((a: any) => a.type === 5).map((a: any) => String(a.data).replace(/\.$/, ''));

            const isAlive = ips.length > 0 || cnames.length > 0;
            if (isAlive) {
              addLog('dnsx', 'success', `[+] Ativo respondendo: ${sub} -> IPs: [${ips.join(', ')}] CNAMEs: [${cnames.join(', ')}]`);
            }

            resolvedAssets.push({
              subdomain: sub,
              rootDomain: cleanDomain,
              isAlive,
              ips,
              cnames,
              tags: ['doh-resolved'],
            });
          }
        } catch {}
      })
    );

    if (resolvedAssets.length > 0) {
      await upsertAssets(resolvedAssets, cleanDomain);
    }

    // Retrieve consolidated assets from DB
    const finalAssets = await getAssets({ rootDomain: cleanDomain });
    const stats = {
      subdomains: finalAssets.length,
      alive: finalAssets.filter(a => a.isAlive).length,
      ports: finalAssets.reduce((acc, a) => acc + a.ports.length, 0),
      vulns: finalAssets.reduce((acc, a) => acc + a.vulnerabilities.length, 0),
    };

    const finalPayload = {
      assets: finalAssets,
      logs,
      stats,
      executedAt: new Date().toISOString(),
    };

    // Cache pipeline execution
    await setReconCache('pipeline-runner', cleanDomain, finalPayload, 43200);

    return NextResponse.json({
      success: true,
      fromCache: false,
      domain: cleanDomain,
      ...finalPayload,
    });
  } catch (err: any) {
    console.error('Pipeline runner error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
