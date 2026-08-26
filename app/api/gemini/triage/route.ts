import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const domain = body.targetDomain || body.target?.domain || (typeof body.target === 'string' ? body.target : 'target.com');
    const assetData = body.asset || body.findings || {};
    const vulnsData = body.allVulns || [];
    const promptText = body.prompt || body.customPrompt || body.contextPrompt || 'Priorizar o caminho de menor resistência para obtenção de RCE, Information Disclosure crítico ou Account Takeover.';

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const systemPrompt = `Você é o ALPHA, Security Architect & Red Team Lead do Squad ReconCorrelator Nexus.
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

    if (apiKey) {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Análise concluída com sucesso.';
        return NextResponse.json({
          success: true,
          analysis: resultText,
          triage: resultText,
          author: 'ALPHA (Red Team Lead)',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Fallback Analysis if API Key not present or offline
    const fallbackText = `### 🛡️ [ALPHA Red Team Triagem Automática]
**Alvo:** \`${domain}\`

1. **Vetor de Ataque Mais Crítico & Superfície:**
   - O ativo possui subdomínios correlacionados e portas ativas.
   - Recomenda-se testar CNAMEs órfãos para **Subdomain Takeover** e endpoints de API não documentados (\`/swagger\`, \`/v1/api-docs\`, \`/graphql\`).

2. **PoC de Verificação e Reconhecimento:**
   \`\`\`bash
   # Verificação rápida de headers e TLS
   curl -i -s -k "https://${domain}" -H "X-Forwarded-For: 127.0.0.1"
   \`\`\`

3. **Recomendações Prioritárias:**
   - Isolar endpoints de staging e ambiente interno via WAF / VPN.
   - Forçar cabeçalhos HSTS e Content-Security-Policy estrito.`;

    return NextResponse.json({
      success: true,
      analysis: fallbackText,
      triage: fallbackText,
      author: 'ALPHA (Offline Intelligence Engine)',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Gemini Triage Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Erro ao processar triagem com IA Gemini',
      },
      { status: 500 }
    );
  }
}
