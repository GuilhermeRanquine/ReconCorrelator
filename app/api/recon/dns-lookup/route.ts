import { NextRequest, NextResponse } from 'next/server';
import { DnsRecord } from '@/types/recon';

// Subdomain Takeover Fingerprints
const TAKEOVER_SERVICES: { cnameMatch: RegExp; service: string; hint: string }[] = [
  { cnameMatch: /\.github\.io$/i, service: 'GitHub Pages', hint: 'Verifique se o repositório github.io foi excluído ou não existe.' },
  { cnameMatch: /\.s3\.amazonaws\.com$/i, service: 'AWS S3 Bucket', hint: 'Bucket S3 órfão pode ser recriado na região correspondente.' },
  { cnameMatch: /\.s3-website/i, service: 'AWS S3 Website', hint: 'S3 Website órfão pode ser reclamado com mesmo bucket name.' },
  { cnameMatch: /\.herokuapp\.com$/i, service: 'Heroku', hint: 'App Heroku desativada pode permitir registro do mesmo slug.' },
  { cnameMatch: /\.myshopify\.com$/i, service: 'Shopify', hint: 'Loja Shopify desvinculada ou não registrada.' },
  { cnameMatch: /\.zendesk\.com$/i, service: 'Zendesk', hint: 'Central de ajuda Zendesk desativada.' },
  { cnameMatch: /\.wordpress\.com$/i, service: 'WordPress.com', hint: 'Blog WordPress órfão.' },
  { cnameMatch: /\.ghost\.io$/i, service: 'Ghost CMS', hint: 'Instância Ghost órfã.' },
  { cnameMatch: /\.pantheonsite\.io$/i, service: 'Pantheon', hint: 'Ambiente Pantheon desvinculado.' },
  { cnameMatch: /\.surge\.sh$/i, service: 'Surge.sh', hint: 'Domínio Surge.sh disponível para claim.' },
  { cnameMatch: /\.readme\.io$/i, service: 'ReadMe.io', hint: 'Documentação ReadMe.io não registrada.' },
  { cnameMatch: /\.elasticbeanstalk\.com$/i, service: 'AWS Elastic Beanstalk', hint: 'Ambiente Beanstalk deletado na AWS.' },
  { cnameMatch: /\.azurewebsites\.net$/i, service: 'Azure App Service', hint: 'App Service Azure excluído.' },
  { cnameMatch: /\.trafficmanager\.net$/i, service: 'Azure Traffic Manager', hint: 'Perfil Traffic Manager órfão.' },
  { cnameMatch: /\.fastly\.net$/i, service: 'Fastly CDN', hint: 'Serviço Fastly órfão.' },
  { cnameMatch: /\.unbouncepages\.com$/i, service: 'Unbounce', hint: 'Landing page Unbounce não vinculada.' },
  { cnameMatch: /\.bitbucket\.io$/i, service: 'Bitbucket', hint: 'Página Bitbucket órfã.' },
  { cnameMatch: /\.firebaseapp\.com$/i, service: 'Firebase Hosting', hint: 'Projeto Firebase não associado.' },
];

async function queryDoH(name: string, type: string): Promise<any[]> {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/dns-json' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.Answer || [];
    }
  } catch (err) {
    // Fallback to Google DNS DoH
    try {
      const gUrl = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
      const gRes = await fetch(gUrl, { signal: AbortSignal.timeout(4000) });
      if (gRes.ok) {
        const gData = await gRes.json();
        return gData.Answer || [];
      }
    } catch {}
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return handleDnsLookup(body.host || body.domain);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const host = searchParams.get('host') || searchParams.get('domain');
    return handleDnsLookup(host);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function handleDnsLookup(host: string | null | undefined) {
  try {
    if (!host) {
      return NextResponse.json({ error: 'Parâmetro host é obrigatório' }, { status: 400 });
    }

    const cleanHost = host.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // Run parallel DoH queries for A, AAAA, CNAME, TXT, MX, NS
    const [aAnswers, aaaaAnswers, cnameAnswers, txtAnswers, mxAnswers, nsAnswers] = await Promise.all([
      queryDoH(cleanHost, 'A'),
      queryDoH(cleanHost, 'AAAA'),
      queryDoH(cleanHost, 'CNAME'),
      queryDoH(cleanHost, 'TXT'),
      queryDoH(cleanHost, 'MX'),
      queryDoH(cleanHost, 'NS'),
    ]);

    const ips: string[] = [];
    const cnames: string[] = [];
    const dnsRecords: DnsRecord[] = [];

    // Parse A (type 1)
    for (const ans of aAnswers) {
      if (ans.type === 1 && ans.data) {
        ips.push(ans.data);
        dnsRecords.push({ type: 'A', value: ans.data, ttl: ans.TTL });
      }
    }

    // Parse AAAA (type 28)
    for (const ans of aaaaAnswers) {
      if (ans.type === 28 && ans.data) {
        ips.push(ans.data);
        dnsRecords.push({ type: 'AAAA', value: ans.data, ttl: ans.TTL });
      }
    }

    // Parse CNAME (type 5)
    for (const ans of cnameAnswers) {
      if (ans.type === 5 && ans.data) {
        const cnameVal = String(ans.data).replace(/\.$/, '');
        cnames.push(cnameVal);
        dnsRecords.push({ type: 'CNAME', value: cnameVal, ttl: ans.TTL });
      }
    }

    // Parse TXT (type 16)
    for (const ans of txtAnswers) {
      if (ans.type === 16 && ans.data) {
        dnsRecords.push({ type: 'TXT', value: String(ans.data), ttl: ans.TTL });
      }
    }

    // Parse MX (type 15)
    for (const ans of mxAnswers) {
      if (ans.type === 15 && ans.data) {
        dnsRecords.push({ type: 'MX', value: String(ans.data), ttl: ans.TTL });
      }
    }

    // Parse NS (type 2)
    for (const ans of nsAnswers) {
      if (ans.type === 2 && ans.data) {
        dnsRecords.push({ type: 'NS', value: String(ans.data), ttl: ans.TTL });
      }
    }

    // Takeover Analysis
    let takeoverRisk = false;
    let takeoverDetails = '';
    let takeoverService = '';

    for (const cname of cnames) {
      for (const t of TAKEOVER_SERVICES) {
        if (t.cnameMatch.test(cname)) {
          takeoverRisk = true;
          takeoverService = t.service;
          takeoverDetails = `CNAME aponta para ${cname} (${t.service}). ${t.hint}`;
          break;
        }
      }
      if (takeoverRisk) break;
    }

    // Identify Cloud Provider
    let cloudProvider: 'aws' | 'gcp' | 'azure' | 'cloudflare' | 'digitalocean' | 'unknown' = 'unknown';
    const allDnsText = [...cnames, ...ips].join(' ').toLowerCase();
    if (allDnsText.includes('amazonaws') || allDnsText.includes('awsglobalaccelerator') || allDnsText.includes('cloudfront')) {
      cloudProvider = 'aws';
    } else if (allDnsText.includes('cloudflare') || allDnsText.includes('104.') || allDnsText.includes('172.67.')) {
      cloudProvider = 'cloudflare';
    } else if (allDnsText.includes('azure') || allDnsText.includes('trafficmanager')) {
      cloudProvider = 'azure';
    } else if (allDnsText.includes('google') || allDnsText.includes('appspot') || allDnsText.includes('1e100.net')) {
      cloudProvider = 'gcp';
    } else if (allDnsText.includes('digitalocean')) {
      cloudProvider = 'digitalocean';
    }

    return NextResponse.json({
      success: true,
      host: cleanHost,
      isAlive: ips.length > 0 || cnames.length > 0,
      ips: Array.from(new Set(ips)),
      cnames: Array.from(new Set(cnames)),
      dnsRecords,
      cloudProvider,
      takeoverRisk,
      takeoverDetails,
      takeoverService,
      resolvedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('DNS Lookup Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro na resolução DNS DoH' },
      { status: 500 }
    );
  }
}
