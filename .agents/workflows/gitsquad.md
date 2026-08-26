---
description: 🚀 GitSquad: 24/7 Autonomous Git Engine & Continuous Version Control
---

# 🌐 WORKFLOW: GITSQUAD (CONTINUOUS REPO WATCHER & GITOPS ENGINE)

## 1. PROPÓSITO DO WORKFLOW
Este workflow define a rotina operacional contínua e autônoma do **GitSquad**. Ele permite que o agente execute ciclos de versionamento ininterruptos, identificando alterações no repositório, lendo os relatórios em `reports/`, criando branches apropriadas, realizando commits convencionais e enviando (`push`) as mudanças para o repositório remoto.

---

## 2. O CICLO DE EXECUÇÃO CONTÍNUA (THE CONTINUOUS GIT WATCHER LOOP)

Ao ser acionado ou operar em modo contínuo, o GitSquad executa os seguintes passos a cada ciclo:

### PASSO 1: Mapeamento de Estado do Repositório
```bash
git status --porcelain
git branch --show-current
git log -1 --oneline
```
- Identifica se há modificações em arquivos rastreados (`M`), novos arquivos (`??`), remoções (`D`) ou se a branch está à frente/atrás do remoto.

### PASSO 2: Ingestão de Contexto e Relatórios
- Lista os arquivos no diretório `reports/` (ex: `reports/REL-*.md`).
- Lê o relatório mais recente para capturar:
  - Protocolo (ex: `REL-20260826-NEXUS-001`)
  - Esquadrões envolvidos (`@CoreFoundry`, `@LuminaUI`, `@AegisForge`, `@QualityVanguard`, etc.)
  - Escopo das alterações e testes realizados.

### PASSO 3: Tomada de Decisão de Branching
- **Branch Feature / Refactor**: Se houver um conjunto novo de funcionalidades em desenvolvimento e a branch atual for `main`, cria e faz checkout para `feature/[NOME-OU-PROTOCOLO]`.
- **Branch Hotfix / Sec**: Se for uma correção de vulnerabilidade ou bug crítico, direciona para `fix/[NOME-OU-PROTOCOLO]`.
- **Merge & Release**: Se o relatório em `reports/` indicar status de homologação final aprovado pelos chefes de área, realiza o merge na `main` e gera tag semântica.

### PASSO 4: Filtro de Segurança Pré-Commit (Zero Secret Leaks)
- Garante que arquivos com segredos locais (`.env`, `.env.local`, `.antigravity`, chaves de API, arquivos temporários de build) estejam no `.gitignore` e NÃO entrem no staging.
- Adiciona os arquivos com segurança: `git add <arquivos-selecionados>`.

### PASSO 5: Commit Semântico Estruturado
- Formata a mensagem de commit utilizando o padrão Conventional Commits com referência explícita ao protocolo e squads:
```bash
git commit -m "feat(hub): [REL-20260826-NEXUS-001] implement Google Drive Hub and TDD test center" -m "- Squads: @CoreFoundry @LuminaUI @QualityVanguard" -m "- Protocolo: reports/REL-20260826-NEXUS-001.md"
```

### PASSO 6: Sincronização Remota (Push)
- Executa o push da branch ativa para o servidor remoto:
```bash
git push -u origin <branch-name>
```
- Em caso de commits pendentes na `main`, executa `git push origin main`.

### PASSO 7: Retroalimentação e Próximo Ciclo
- Notifica o conselho executivo (`@NexusPrime`, `@TechNexus`, `@CyberNexus`) sobre o hash do commit e branch atualizada.
- Permanece em prontidão para a próxima iteração.
