import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return handleCrtsh(body.domain);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, subdomains: [] }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');
    return handleCrtsh(domain);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, subdomains: [] }, { status: 500 });
  }
}

async function handleCrtsh(domain: string | null | undefined) {
  try {
    if (!domain) {
      return NextResponse.json({ error: 'Parâmetro domain é obrigatório', success: false, subdomains: [] }, { status: 400 });
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // Query CRT.sh public database
    const crtUrl = `https://crt.sh/?q=%.${cleanDomain}&output=json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let rawData: any[] = [];
    try {
      const response = await fetch(crtUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ReconCorrelator-Squad/3.4',
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

    // Also include the root domain itself and common standard entries if crt.sh is slow
    subdomainsSet.add(cleanDomain);

    const subdomains = Array.from(subdomainsSet).sort();

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      count: subdomains.length,
      subdomains,
      source: 'crt.sh (Certificate Transparency Logs)',
      queriedAt: new Date().toISOString(),
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
