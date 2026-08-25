import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (!domain) {
      return NextResponse.json({ error: 'Parâmetro domain é obrigatório' }, { status: 400 });
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    const urlsSet = new Set<string>();
    const jsFilesSet = new Set<string>();
    const sensitiveEndpoints: { url: string; category: string }[] = [];

    // Query Wayback Machine CDX API
    const waybackUrl = `https://web.archive.org/cdx/search/cdx?url=*.${cleanDomain}/*&output=json&fl=original&collapse=urlkey&limit=${limit}`;

    try {
      const response = await fetch(waybackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ReconCorrelator-Squad/3.4',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const rows: any = await response.json();
        if (Array.isArray(rows)) {
          // CDX returns header in first row [['original'], ['http://...'], ...]
          for (let i = 1; i < rows.length; i++) {
            const u = rows[i][0];
            if (u && typeof u === 'string') {
              urlsSet.add(u);
              if (u.endsWith('.js') || u.includes('.js?')) {
                jsFilesSet.add(u);
              }
              if (u.includes('/api/') || u.includes('/v1/') || u.includes('/v2/') || u.includes('/graphql') || u.includes('/admin') || u.includes('/swagger') || u.includes('/actuator') || u.includes('/auth') || u.includes('/login')) {
                sensitiveEndpoints.push({
                  url: u,
                  category: u.includes('/api/') || u.includes('/graphql') ? 'API Endpoint' : u.includes('/actuator') ? 'Spring Actuator' : u.includes('/swagger') ? 'Swagger Docs' : 'Sensitive Path',
                });
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('Wayback fetch failed or timed out:', e.message);
    }

    // Also query AlienVault OTX
    try {
      const otxUrl = `https://otx.alienvault.com/api/v1/indicators/domain/${cleanDomain}/url_list?limit=50&page=1`;
      const otxRes = await fetch(otxUrl, {
        headers: { 'User-Agent': 'ReconCorrelator-Squad/3.4' },
        signal: AbortSignal.timeout(6000),
      });
      if (otxRes.ok) {
        const data = await otxRes.json();
        if (data && Array.isArray(data.url_list)) {
          for (const item of data.url_list) {
            if (item.url) {
              urlsSet.add(item.url);
              if (item.url.endsWith('.js') || item.url.includes('.js?')) {
                jsFilesSet.add(item.url);
              }
            }
          }
        }
      }
    } catch (otxErr: any) {
      console.warn('AlienVault OTX fetch failed:', otxErr.message);
    }

    const allUrls = Array.from(urlsSet);
    const jsFiles = Array.from(jsFilesSet);

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      totalUrls: allUrls.length,
      urls: allUrls.slice(0, 300),
      jsFiles: jsFiles.slice(0, 50),
      sensitiveEndpoints: sensitiveEndpoints.slice(0, 30),
      sources: ['Wayback Machine (Archive.org)', 'AlienVault OTX'],
      queriedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Archive URLs error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao consultar URLs históricas' },
      { status: 500 }
    );
  }
}
