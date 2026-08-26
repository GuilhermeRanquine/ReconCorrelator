import { NextRequest, NextResponse } from 'next/server';
import { WebTech } from '@/types/recon';
import { getCachedRecon, setCachedRecon, upsertAssets } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { url, timeoutMs = 6000, forceRefresh = false } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    const hostExtract = targetUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();

    // 1. Check Recon Cache
    if (!forceRefresh) {
      const cached = getCachedRecon('http-probe', hostExtract);
      if (cached) {
        return NextResponse.json({
          ...cached,
          fromCache: true,
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ReconCorrelator-Squad/3.5',
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

      // Read snippet to extract title & tech markers
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

    const result = {
      success: true,
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

    // 2. Cache in DB (60 min TTL)
    setCachedRecon('http-probe', hostExtract, result, 60);

    // 3. Upsert into assets table in DB
    try {
      upsertAssets([
        {
          subdomain: hostExtract,
          isAlive: status > 0,
          httpStatus: status,
          httpTitle: title,
          webServer: server,
          contentType,
          contentLength,
          technologies,
          tags: status > 0 ? ['http-alive'] : ['http-unreachable'],
        }
      ]);
    } catch (dbErr) {
      console.warn('Could not auto-upsert HTTP probe result to DB:', dbErr);
    }

    return NextResponse.json({
      ...result,
      fromCache: false,
    });
  } catch (err: any) {
    console.error('HTTP Probe error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro no probe HTTP' },
      { status: 500 }
    );
  }
}
