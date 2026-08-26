import { NextRequest, NextResponse } from 'next/server';
import { WebTech } from '@/types/recon';
import { getReconCache, setReconCache, upsertAssets } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return handleHttpProbe(body.url, body.timeoutMs, body.rootDomain, body.forceRefresh);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url') || searchParams.get('host');
    const timeoutMs = searchParams.get('timeout') ? parseInt(searchParams.get('timeout')!, 10) : 6000;
    const rootDomain = searchParams.get('rootDomain');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    return handleHttpProbe(url, timeoutMs, rootDomain, forceRefresh);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function handleHttpProbe(url: string | null | undefined, timeoutMs: number = 6000, rootDomain?: string | null, forceRefresh: boolean = false) {
  try {
    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    const hostOnly = targetUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
    const determinedRootDomain = rootDomain || hostOnly.split('.').slice(-2).join('.');

    // 1. Check Database Cache
    if (!forceRefresh) {
      const cached = await getReconCache('http-probe', targetUrl);
      if (cached && (cached.status > 0 || cached.isAlive !== undefined)) {
        return NextResponse.json({
          success: true,
          fromCache: true,
          ...cached,
        });
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let status = 0;
    let statusText = '';
    let headers: Record<string, string> = {};
    let title = '';
    let server = '';
    let contentLength = 0;
    let contentType = '';
    let finalUrl = targetUrl;
    const technologies: WebTech[] = [];

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ReconCorrelator-Squad/3.4',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      status = response.status;
      statusText = response.statusText;
      finalUrl = response.url;

      response.headers.forEach((val, key) => {
        headers[key.toLowerCase()] = val;
      });

      server = headers['server'] || '';
      contentType = headers['content-type'] || '';
      contentLength = parseInt(headers['content-length'] || '0', 10);

      // Read a snippet of text to extract title & tech markers
      const htmlText = await response.text();
      const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }

      // Tech fingerprint heuristics
      if (server) {
        technologies.push({ name: server, category: 'Web Server', confidence: 100 });
      }
      if (headers['x-powered-by']) {
        technologies.push({ name: headers['x-powered-by'], category: 'Framework / Backend', confidence: 100 });
      }
      if (headers['cf-ray'] || server.toLowerCase().includes('cloudflare')) {
        technologies.push({ name: 'Cloudflare', category: 'CDN / WAF', confidence: 100 });
      }
      if (headers['x-amz-cf-id'] || headers['via']?.toLowerCase().includes('cloudfront')) {
        technologies.push({ name: 'Amazon CloudFront', category: 'CDN', confidence: 100 });
      }
      if (htmlText.includes('wp-content') || htmlText.includes('wp-includes')) {
        technologies.push({ name: 'WordPress', category: 'CMS', confidence: 95 });
      }
      if (htmlText.includes('__NEXT_DATA__') || htmlText.includes('/_next/static')) {
        technologies.push({ name: 'Next.js', category: 'React Framework', confidence: 100 });
      }
      if (htmlText.includes('reactroot') || htmlText.includes('data-reactroot')) {
        technologies.push({ name: 'React', category: 'Frontend', confidence: 90 });
      }
      if (htmlText.includes('ng-version') || htmlText.includes('ng-app')) {
        technologies.push({ name: 'Angular', category: 'Frontend', confidence: 90 });
      }
      if (htmlText.includes('vue') || htmlText.includes('data-v-')) {
        technologies.push({ name: 'Vue.js', category: 'Frontend', confidence: 85 });
      }
      if (headers['set-cookie']?.includes('AWSALB') || headers['set-cookie']?.includes('AWSALBCORS')) {
        technologies.push({ name: 'AWS Application Load Balancer', category: 'Infrastructure', confidence: 100 });
      }
    } catch (fetchErr: any) {
      status = 0;
      statusText = fetchErr.message || 'Host offline or unreachable';
    } finally {
      clearTimeout(timer);
    }

    // Security headers audit
    const securityHeaders = {
      strictTransportSecurity: !!headers['strict-transport-security'],
      contentSecurityPolicy: !!headers['content-security-policy'],
      xFrameOptions: headers['x-frame-options'] || null,
      xContentTypeOptions: headers['x-content-type-options'] || null,
      accessControlAllowOrigin: headers['access-control-allow-origin'] || null,
    };

    const payload = {
      targetUrl,
      finalUrl,
      isAlive: status > 0,
      status,
      statusText,
      title,
      server,
      contentType,
      contentLength,
      headers,
      securityHeaders,
      technologies,
      probedAt: new Date().toISOString(),
    };

    // 2. Save to database cache
    await setReconCache('http-probe', targetUrl, payload, 43200);

    // 3. Auto-update asset in database
    if (status > 0) {
      await upsertAssets(
        [
          {
            subdomain: hostOnly,
            rootDomain: determinedRootDomain,
            isAlive: true,
            httpStatus: status,
            httpTitle: title,
            webServer: server,
            contentType,
            contentLength,
            responseUrl: finalUrl,
            technologies,
            tags: ['http-probed'],
          },
        ],
        determinedRootDomain
      );
    }

    return NextResponse.json({
      success: true,
      fromCache: false,
      ...payload,
    });
  } catch (err: any) {
    console.error('HTTP Probe error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro no probe HTTP' },
      { status: 500 }
    );
  }
}
