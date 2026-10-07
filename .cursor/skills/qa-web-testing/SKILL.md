---
name: qa-web-testing
description: Orquestra análise, desenho e execução segura de testes web e API com os subagents de QA do projeto. Use em pedidos de QA, validação de cards Jira, testes de UI/API, coleta de evidências, investigação de bugs ou geração de automação Playwright.
icon: beaker
color: green
---

# QA Web Testing

## Fluxo

1. Leia `qa/CONTRACTS.md` e aplique as Rules de segurança do workspace.
2. Normalize requisito, ambiente, origens permitidas, dados e aprovações sem
   inventar informações ausentes.
3. Atue como QA Master e delegue aos especialistas na ordem definida em
   `.cursor/rules/qa-master.mdc`. Subagents não podem orquestrar outros
   subagents.
4. Persista cada retorno real em `.qa/runs/<run-id>/` e mantenha `state.md`
   atualizado.
5. Só marque `PASS` com resultado esperado objetivamente observado.

## Autenticação de API

Leia e siga `.cursor/skills/api-password-login/SKILL.md`. Resumo:

- Não exija token em variável de ambiente. Ele não existe no `.env.qa`.
- Autentique com `QA_TEST_EMAIL_<AMBIENTE>` e `QA_TEST_PASSWORD_<AMBIENTE>`.
- Resolva o contrato de login por documentação, OpenAPI ou tráfego real do
  login web. Sem fonte, `BLOCKED`.
- O `api-test-executor` deve executar
  `node .cursor/skills/api-password-login/scripts/api-password-login.mjs`
  com JSON sanitizado. O helper obtém o token só em memória.

## Limites

- Nunca use produção por fallback.
- Não execute ações destrutivas ou escritas sem as aprovações exigidas.
- Não grave e-mail, senha, token, cookie ou cabeçalho de autorização em estado,
  relatório, screenshot ou mensagem.
- Gere automação somente quando o usuário pedir explicitamente.
