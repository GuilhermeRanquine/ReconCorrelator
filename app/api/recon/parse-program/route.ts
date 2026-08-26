import { NextRequest, NextResponse } from 'next/server';
import { BugBountyPolicy, TargetProject, ScopeRule, generateAccessCode } from '@/types/recon';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { programUrl, rawPolicyText, targetNameHint } = body;

    if (!programUrl && !rawPolicyText) {
      return NextResponse.json(
        { error: 'Por favor, informe a URL do programa ou cole o texto do briefing.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    let extractedData: any = null;

    if (apiKey) {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const systemInstruction = `Você é o Cyber Nexus & ShadowStrike — Especialista Sênior em Triagem e Engenharia de Bug Bounty e Pentest Enterprise.
Extraia em formato JSON rigoroso:
{
  "name": "Nome da Empresa",
  "domain": "dominio.com.br",
  "description": "Resumo do escopo e regras",
  "platform": "hackerone" | "bugcrowd" | "intigriti" | "yeswehack" | "custom",
  "inScope": ["*.dominio.com", "api.dominio.com"],
  "outOfScope": ["admin.dominio.com"],
  "policySummary": "Resumo das regras",
  "safeHarbor": true
}`;

      const prompt = `URL: ${programUrl || 'N/A'}\nNome: ${targetNameHint || 'N/A'}\nTexto:\n${rawPolicyText || programUrl}`;

      try {
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\n${prompt}` }]
              }
            ]
          })
        });

        if (res.ok) {
          const resJson = await res.json();
          const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            extractedData = JSON.parse(match[0]);
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini parsing fallback:', geminiErr);
      }
    }

    // Fallback extraction
    if (!extractedData) {
      let inferredDomain = 'target.com';
      if (programUrl) {
        try {
          const u = new URL(programUrl.startsWith('http') ? programUrl : `https://${programUrl}`);
          inferredDomain = u.hostname.replace(/^www\./, '');
        } catch {
          inferredDomain = programUrl.replace(/^https?:\/\//, '').split('/')[0] || 'target.com';
        }
      } else if (targetNameHint) {
        inferredDomain = `${targetNameHint.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
      }

      const inferredName = targetNameHint || inferredDomain.split('.')[0].toUpperCase();

      extractedData = {
        name: inferredName,
        domain: inferredDomain,
        description: `Programa de Cibersegurança & Auditoria de ${inferredName}`,
        platform: 'custom',
        inScope: [`*.${inferredDomain}`, inferredDomain],
        outOfScope: [],
        policySummary: 'Regras de teste autorizadas de reconhecimento e auditoria de segurança.',
        safeHarbor: true
      };
    }

    const inScopeList: string[] = extractedData.inScope || [`*.${extractedData.domain}`, extractedData.domain];
    const outOfScopeList: string[] = extractedData.outOfScope || [];

    const rules: ScopeRule[] = [
      ...inScopeList.map((pattern, idx) => ({
        id: `rule-in-${idx}-${Date.now()}`,
        type: (pattern.startsWith('*.') ? 'wildcard' : pattern.includes('/') ? 'cidr' : 'domain') as any,
        pattern,
        isOutOfScope: false,
        rewardEligible: true,
      })),
      ...outOfScopeList.map((pattern, idx) => ({
        id: `rule-out-${idx}-${Date.now()}`,
        type: (pattern.startsWith('*.') ? 'wildcard' : pattern.includes('/') ? 'cidr' : 'domain') as any,
        pattern,
        isOutOfScope: true,
      })),
    ];

    const policy: BugBountyPolicy = {
      platform: (extractedData.platform || 'custom') as any,
      programUrl: programUrl || undefined,
      policySummary: extractedData.policySummary || 'Respeite as regras de engajamento.',
      safeHarbor: extractedData.safeHarbor ?? true,
      safeHarborTerms: 'Testes de boa-fé em conformidade com as regras.',
      permittedAttacks: [
        'Enumeração passiva e ativa de subdomínios',
        'Análise de portas e serviços web',
        'Triagem de configurações e takeovers'
      ],
      prohibitedVulns: ['DDoS', 'Social Engineering'],
      reconStrategy: ['DNS Enumeration', 'HTTP Probing', 'Takeover Detection'],
      requiredHeaders: [{ key: 'X-Nexus-Audit', value: 'recon-correlator-enterprise' }],
      targetArchitecture: 'cloud_native',
      extractedAt: new Date().toISOString(),
    };

    const targetProject: TargetProject = {
      id: `target-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: extractedData.name || extractedData.domain,
      domain: extractedData.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase(),
      accessCode: generateAccessCode('NEXUS'),
      description: extractedData.description || `Superfície de ${extractedData.name}`,
      createdAt: new Date().toISOString(),
      platform: policy.platform,
      programUrl: programUrl || undefined,
      inScope: inScopeList,
      outOfScope: outOfScopeList,
      rules,
      policy,
      isDemo: false,
    };

    return NextResponse.json({
      success: true,
      targetProject,
    });
  } catch (err: any) {
    console.error('Error parsing program:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Falha ao analisar programa.' },
      { status: 500 }
    );
  }
}
