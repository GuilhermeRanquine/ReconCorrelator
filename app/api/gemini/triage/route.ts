import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const domain = body.targetDomain || body.target?.domain || (typeof body.target === 'string' ? body.target : 'target.com');
    const assetData = body.asset || body.findings || {};
    const vulnsData = body.allVulns || [];
    const promptText = body.prompt || body.customPrompt || body.contextPrompt || 'Priorizar o caminho de menor resistência para obtenção de RCE, Information Disclosure crítico ou Account Takeover.';

    const ai = getAiClient();

    const systemPrompt = `Você é o ALPHA, Security Architect & Red Team Lead do Squad ReconCorrelator.
Seu objetivo é analisar a superfície de ataque correlacionada de um alvo de Bug Bounty / Pentest e fornecer:
1. **Vetor de Ataque Mais Crítico & Chaining (Encadeamento de Exploits)**: Como encadear as portas abertas, tecnologias identificadas e vulnerabilidades/misconfigurations.
2. **Passo a Passo de Exploração Manual & Prova de Conceito (PoC)**: Comandos específicos cURL, payloads de teste e parâmetros para validar sem causar negação de serviço.
3. **Draft de Report para Bug Bounty (HackerOne/Bugcrowd)**: Título, Severidade (CVSS v3.1), Impacto no Negócio e Mitigação Recomendada.

Responda em Markdown limpo, profissional, direto e técnico (em português).`;

    const userPrompt = `
Alvo: ${domain}
Ativo Analisado: ${JSON.stringify(assetData, null, 2)}
Vulnerabilidades Encontradas: ${JSON.stringify(vulnsData, null, 2)}
Pergunta / Contexto do Pesquisador: ${promptText}
`;

    const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
    });

    const resultText = response.text || 'Análise concluída com sucesso.';

    return NextResponse.json({
      success: true,
      analysis: resultText,
      triage: resultText,
      author: 'ALPHA (Red Team Lead)',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Gemini Triage Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Erro ao processar triagem com IA Gemini',
        fallbackAnalysis: `**[ALPHA Offline Mode]**: Não foi possível contatar a API do Gemini. 
Recomendação imediata de Red Team:
1. **Subdomain Takeovers:** Verifique os CNAMEs órfãos imediatamente usando \`dig CNAME <subdomínio>\`.
2. **Spring Boot / Actuator:** Teste os endpoints \`/actuator/env\` e \`/actuator/heapdump\` para vazamento de chaves AWS.
3. **Painéis Jenkins / Git:** Verifique acessos anônimos em portas alternativas (8080, 8443, 9090).`,
      },
      { status: 500 }
    );
  }
}
