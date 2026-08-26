import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { BugBountyPolicy, TargetProject, ScopeRule, generateAccessCode } from '@/types/recon';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { programUrl, rawPolicyText, targetNameHint } = body;

    if (!programUrl && !rawPolicyText) {
      return NextResponse.json(
        { error: 'Por favor, informe a URL do programa de Bug Bounty ou cole o texto do briefing/política.' },
        { status: 400 }
      );
    }

    let pageContentToAnalyze = rawPolicyText || '';

    // If a URL was provided and no raw text, let's attempt to fetch policy summary or construct prompt
    if (programUrl && !rawPolicyText) {
      try {
        const response = await fetch(programUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ReconCorrelator-Squad/3.4',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7'
          },
          signal: AbortSignal.timeout(8000),
        });
        if (response.ok) {
          const html = await response.text();
          // Extract clean text snippet to avoid huge payloads
          pageContentToAnalyze = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .slice(0, 18000);
        }
      } catch (fetchErr) {
        console.warn('Could not directly fetch URL, relying on Gemini reasoning with domain:', fetchErr);
        pageContentToAnalyze = `URL do programa informada pelo pesquisador: ${programUrl}. Identifique a organização, o domínio raiz e o escopo associado a esta empresa.`;
      }
    }

    const ai = getAiClient();

    const systemInstruction = `Você é o Cyber Nexus & ShadowStrike — Especialista Sênior em Triagem e Engenharia de Bug Bounty (Red Team Elite).
Sua missão é ingerir a URL ou o texto da política de um programa de Bug Bounty (HackerOne, Bugcrowd, Intigriti, YesWeHack, VDP Privado ou Disclosure Direto) e extrair com precisão cirúrgica:
1. Nome da Organização e Domínio Raiz Principal (ex: 'uber.com', 'tesla.com', 'shopify.com', 'nubank.com.br').
2. Plataforma onde o programa é gerenciado.
3. Lista detalhada de In-Scope (wildcards '*.dominio.com', domínios específicos, APIs REST, subdomínios, CIDRs, Mobile).
4. Lista explícita de Out-of-Scope (ambientes de terceiros, domínios proibidos, restrições).
5. Ataques e Técnicas Permitidas (ex: enumeração de subdomínios, fuzzing com rate limit razoável, testes de lógica de negócios, injeções em endpoints de API, bypass de autenticação).
6. Ataques Proibidos e Vulnerabilidades Fora de Escopo (DDoS/DoS, Phishing/Engenharia Social, Self-XSS, Rate-Limit sem impacto direto, Ataques Físicos, Spam, SPF/DMARC puro).
7. Safe Harbor: Termos de proteção jurídica e se há cláusula expressa de Safe Harbor.
8. Headers customizados obrigatórios de identificação (ex: 'X-Bug-Bounty: hacker_username').
9. Faixas de Bounty em USD por severidade (Critical, High, Medium, Low).
10. Arquitetura predominante do alvo ('spa_web', 'microservices_api', 'cloud_native', 'hybrid', 'mobile_backend').
11. Estratégia de Reconhecimento Recomendada para este alvo específico.`;

    const userPrompt = `
Analise profundamente o programa de Bug Bounty abaixo:
URL fornecida: ${programUrl || 'N/A'}
Dica de Nome: ${targetNameHint || 'N/A'}
Texto/Conteúdo bruto da política ou briefing:
${pageContentToAnalyze || `Programa: ${programUrl}`}

Extraia todas as informações no formato JSON rigoroso. Se o texto for curto ou baseado apenas na URL, deduza inteligentemente os domínios raiz mais prováveis, padrões de escopo in-scope e out-of-scope e regras padrão de boas práticas de Bug Bounty.
`;

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Nome da empresa ou programa' },
            domain: { type: Type.STRING, description: 'Domínio principal ex: target.com' },
            description: { type: Type.STRING, description: 'Resumo executivo do escopo e regras' },
            platform: { 
              type: Type.STRING, 
              enum: ['hackerone', 'bugcrowd', 'intigriti', 'yeswehack', 'private_vdp', 'responsible_disclosure', 'custom'],
              description: 'Plataforma onde o programa está hospedado' 
            },
            inScope: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Lista de wildcards e domínios in-scope, ex: *.target.com, api.target.com'
            },
            outOfScope: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Lista de domínios ou caminhos estritamente proibidos'
            },
            permittedAttacks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Ataques, testes e metodologias permitidas dentro das regras de engajamento'
            },
            prohibitedVulns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Tipos de vulnerabilidade ou ataques expressamente proibidos'
            },
            safeHarbor: { type: Type.BOOLEAN, description: 'Se o programa oferece Safe Harbor explícito' },
            safeHarborTerms: { type: Type.STRING, description: 'Resumo das garantias de Safe Harbor' },
            policySummary: { type: Type.STRING, description: 'Diretrizes cruciais de teste e OPSEC' },
            reconStrategy: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Passos recomendados de reconhecimento para este alvo específico'
            },
            requiredHeaders: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  value: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ['key', 'value']
              }
            },
            targetArchitecture: {
              type: Type.STRING,
              enum: ['spa_web', 'microservices_api', 'cloud_native', 'hybrid', 'mobile_backend']
            },
            bountyTiers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING, enum: ['critical', 'high', 'medium', 'low'] },
                  minUsd: { type: Type.NUMBER },
                  maxUsd: { type: Type.NUMBER }
                },
                required: ['severity', 'minUsd', 'maxUsd']
              }
            }
          },
          required: ['name', 'domain', 'description', 'inScope', 'outOfScope', 'platform', 'policySummary']
        }
      }
    });

    const responseText = response.text?.trim() || '{}';
    const parsedJson = JSON.parse(responseText);

    // Build standard TargetProject structure
    const inScopeList: string[] = parsedJson.inScope && parsedJson.inScope.length > 0 
      ? parsedJson.inScope 
      : [`*.${parsedJson.domain}`, parsedJson.domain];

    const outOfScopeList: string[] = parsedJson.outOfScope || [];

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
      platform: (parsedJson.platform || 'custom') as any,
      programUrl: programUrl || undefined,
      policySummary: parsedJson.policySummary || 'Respeite as taxas de requisição e as regras de engajamento.',
      safeHarbor: parsedJson.safeHarbor ?? true,
      safeHarborTerms: parsedJson.safeHarborTerms || 'Testes conduzidos de boa-fé em conformidade com as regras estão cobertos por Safe Harbor.',
      permittedAttacks: parsedJson.permittedAttacks || [
        'Enumeração passiva e ativa de subdomínios com rate limit',
        'Fuzzing de diretórios e parâmetros com headers de identificação',
        'Testes de Injeção (SQLi, XSS refletido/armazenado, SSTI, SSRF)',
        'Análise de Broken Access Control e IDORs',
        'Testes de Autenticação e Lógica de Negócios'
      ],
      prohibitedVulns: parsedJson.prohibitedVulns || [
        'DDoS / DoS (Negação de Serviço)',
        'Engenharia Social / Phishing contra funcionários',
        'Ataques Físicos e Invassão de Instalações',
        'Self-XSS sem impacto escalável',
        'Missing SPF/DKIM/DMARC records sem spoofing demonstrável'
      ],
      reconStrategy: parsedJson.reconStrategy || [
        '1. Enumeração Passiva de DNS via crt.sh e subfinder',
        '2. Probing HTTPx com extração de tecnologias e status codes',
        '3. Triagem de Takeovers e CNAMEs órfãos',
        '4. Varredura de Vulnerabilidades Nuclei com templates de alta precisão'
      ],
      requiredHeaders: parsedJson.requiredHeaders && parsedJson.requiredHeaders.length > 0
        ? parsedJson.requiredHeaders
        : [{ key: 'X-Bug-Bounty', value: 'ranquine-researcher', description: 'Header de identificação do pesquisador' }],
      targetArchitecture: (parsedJson.targetArchitecture || 'cloud_native') as any,
      bountyTiers: parsedJson.bountyTiers || [
        { severity: 'critical', minUsd: 3000, maxUsd: 15000 },
        { severity: 'high', minUsd: 1000, maxUsd: 3000 },
        { severity: 'medium', minUsd: 300, maxUsd: 1000 },
        { severity: 'low', minUsd: 100, maxUsd: 300 },
      ],
      extractedAt: new Date().toISOString(),
    };

    const targetProject: TargetProject = {
      id: `target-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: parsedJson.name || parsedJson.domain,
      domain: parsedJson.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase(),
      accessCode: generateAccessCode(),
      description: parsedJson.description || `Superfície de ataque de ${parsedJson.name}`,
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
    console.error('Error parsing bug bounty program:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'Falha ao analisar programa de Bug Bounty.' 
      },
      { status: 500 }
    );
  }
}
