# 📑 RFC-20260826-001: SEGMENTAÇÃO MULTI-PAGE & FLUXO DE AUTENTICAÇÃO COM DASHBOARD

- **Código**: `RFC-20260826-001`
- **Data**: `2026-08-26`
- **Autor**: `@NexusPrime` & `@ApexBlueprint`
- **Status**: `APPROVED / IMPLEMENTING`
- **Esquadrões Envolvidos**: `@TechNexus` (`@ApexBlueprint`, `@CoreFoundry`, `@LuminaUI`, `@QualityVanguard`), `@CyberNexus` (`@ShadowStrike`, `@SentinelNexus`, `@AegisForge`, `@CoreGovernance`), `@GitSquad`

---

## 1. RESUMO EXECUTIVO
Atualmente, o ReconCorrelator operava sob um modelo de página única centralizada. Esta RFC estabelece a **segmentação formal de rotas do Next.js App Router**, separando a experiência em:
1. **`/login`**: Página dedicada e imersiva de autenticação com proteção anti-bruteforce, canvas interativo iOS style, e validação de sessão PBKDF2/SHA-512.
2. **`/dashboard`**: Hub central protegido de inteligência, controle de Bug Bounties, métricas de ativos, inventário de vulnerabilidades e acesso ao arsenal ofensivo.
3. **`/` (Root)**: Guardião de roteamento que verifica a sessão do usuário e redireciona instantaneamente para `/dashboard` (se autenticado) ou `/login` (se não autenticado).
4. **Encerramento Seguro de Sessão (Logout)**: Invalidação de token criptográfico no banco de dados SQLite, expiração do cookie HttpOnly `recon_session` (`maxAge: 0`) e redirecionamento obrigatório para `/login`.

---

## 2. ARQUITETURA DE ROTAS & NEXT.JS APP ROUTER

```
┌────────────────────────────────────────────────────────┐
│                        app/                            │
│ ├─ page.tsx             ──► Root Guard (Redirects)     │
│ ├─ layout.tsx           ──► Global HTML & Font Shell   │
│ ├─ middleware.ts        ──► Edge Server-side Auth Guard│
│ ├─ login/                                              │
│ │  └─ page.tsx          ──► Dedicated Login View       │
│ ├─ dashboard/                                          │
│ │  └─ page.tsx          ──► Protected Recon & Bug Hub  │
│ └─ api/auth/                                           │
│    ├─ login/route.ts    ──► PBKDF2 Auth & Set-Cookie   │
│    ├─ logout/route.ts   ──► Invalidate & Clear Cookie  │
│    └─ session/route.ts  ──► Token Hash Verification    │
└────────────────────────────────────────────────────────┘
```

---

## 3. ESPECIFICAÇÃO DE CIBERSEGURANÇA & SESSÕES

1. **Proteção de Rotas (Auth Guard)**:
   - Toda tentativa de acesso a `/dashboard` sem um cookie válido `recon_session` resulta em redirecionamento HTTP 307 / client router push para `/login`.
   - Se um usuário autenticado tentar acessar `/login`, o sistema o redireciona automaticamente para `/dashboard`.
2. **Ciclo de Vida do Cookie `recon_session`**:
   - `HttpOnly: true`: Inacessível por JavaScript malicioso via XSS.
   - `SameSite: strict`: Imune a ataques CSRF entre domínios.
   - `Secure: true` em ambiente de produção (HTTPS).
   - `Path: /`: Válido em toda a aplicação.
3. **Invalidação Real no Logout**:
   - O endpoint `/api/auth/logout` remove a hash do token da tabela `sessions` e zera o cookie imediatamente.

---

## 4. CRITÉRIOS DE ACEITE DO QA (@QualityVanguard)
- [x] Acesso a `/` sem sessão redireciona para `/login`.
- [x] Acesso a `/login` com credenciais corretas (`ranquine` / `194518`) autentica e redireciona para `/dashboard`.
- [x] Acesso a `/dashboard` sem sessão redireciona para `/login`.
- [x] O botão "Sair do Sistema" (Logout) limpa a sessão e redireciona para `/login`.
- [x] Não há vazamento de dados de Bug Bounty para sessões não autenticadas.
