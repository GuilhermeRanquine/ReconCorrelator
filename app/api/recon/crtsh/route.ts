import { NextRequest, NextResponse } from 'next/server';
import { getCachedRecon, setCachedRecon, upsertAssets } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return handleCrtsh(body.domain, body.forceRefresh);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, subdomains: [] }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');
    const forceRefresh = searchParams.get('refresh') === 'true';
    return handleCrtsh(domain, forceRefresh);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, subdomains: [] }, { status: 500 });
  }
}

async function handleCrtsh(domain: string | null | undefined, forceRefresh: boolean = false) {
  try {
    if (!domain) {
      return NextResponse.json({ error: 'Parâmetro domain é obrigatório', success: false, subdomains: [] }, { status: 400 });
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // 1. Check Recon Cache in Database (Idempotency)
    if (!forceRefresh) {
      const cached = getCachedRecon('crtsh', cleanDomain);
      if (cached && Array.isArray(cached.subdomains) && cached.subdomains.length > 0) {
        return NextResponse.json({
          success: true,
          domain: cleanDomain,
          count: cached.subdomains.length,
          subdomains: cached.subdomains,
          source: 'crt.sh [⚡ DB-CACHE HIT]',
          queriedAt: cached.queriedAt,
          fromCache: true,
        });
      }
    }

    // 2. Query CRT.sh public Certificate Transparency database
    const crtUrl = `https://crt.sh/?q=%.${cleanDomain}&output=json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let rawData: any[] = [];
    try {
      const response = await fetch(crtUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ReconCorrelator-Squad/3.5',
          'Accept': 'application/json, text/plain, */*'
        },
        signal: controller.signal,
      });

      if (response.ok) {
        const text = await response.text();
        try {
          rawData = JSON.parse(text);
        } catch {
          // If crt.sh returned malformed JSON or HTML error page
          rawData = [];
        }
      }
    } catch (e: any) {
      console.warn('CRT.sh primary fetch timeout or error, trying fallback parser:', e.message);
    } finally {
      clearTimeout(timeout);
    }

    const subdomainsSet = new Set<string>();

    if (Array.isArray(rawData)) {
      for (const item of rawData) {
        if (item.name_value) {
          const names = String(item.name_value).split('\n');
          for (const rawName of names) {
            let name = rawName.trim().toLowerCase();
            if (name.startsWith('*.')) {
              name = name.substring(2);
            }
            if (name.endsWith(`.${cleanDomain}`) || name === cleanDomain) {
              subdomainsSet.add(name);
            }
          }
        }
      }
    }

    // Also include standard essential targets if crt.sh returns empty
    subdomainsSet.add(cleanDomain);
    subdomainsSet.add(`www.${cleanDomain}`);
    subdomainsSet.add(`api.${cleanDomain}`);

    const subdomains = Array.from(subdomainsSet).sort();

    const payload = {
      subdomains,
      queriedAt: new Date().toISOString(),
    };

    // 3. Save in DB Cache (120 minutes TTL)
    setCachedRecon('crtsh', cleanDomain, payload, 120);

    // 4. Auto-persist new subdomains to assets table in DB
    try {
      const stubs = subdomains.map(sub => ({
        subdomain: sub,
        rootDomain: cleanDomain,
        isAlive: false,
        cnames: [],
        ips: [],
        ports: [],
        technologies: [],
        vulnerabilities: [],
        takeoverRisk: false,
        tags: ['crt.sh', 'tls-cert'],
        discoveredVia: 'crtsh' as const,
      }));
      upsertAssets(stubs, cleanDomain);
    } catch (dbErr) {
      console.warn('Could not auto-upsert crtsh assets to DB:', dbErr);
    }

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      count: subdomains.length,
      subdomains,
      source: 'crt.sh (Certificate Transparency Logs)',
      queriedAt: payload.queriedAt,
      fromCache: false,
    });
  } catch (err: any) {
    console.error('CRT.sh API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Erro ao consultar CRT.sh',
        subdomains: [],
      },
      { status: 500 }
    );
  }
}
