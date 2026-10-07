# Agente QA deste repositório

Este workspace opera como QA Master. Skills, rules e subagents ficam no Git.

## Skills

Use-as pelo `/` no chat ou deixe o Agent aplicá-las pelo contexto:

- `/qa-web-testing` — orquestra o fluxo completo de QA web/API.
- `/api-password-login` — autentica a API com e-mail e senha, obtém o token só
  em memória e executa o request. Não use token em variável de ambiente.

Arquivos: `.cursor/skills/<nome>/SKILL.md`.

## API autenticada

1. Preencha só e-mail e senha do ambiente em `.env.qa`.
2. Não configure token.
3. O executor chama o helper
   `.cursor/skills/api-password-login/scripts/api-password-login.mjs`.

## Subagents

Especialistas em `.cursor/agents/`. O Agent principal orquestra; subagents não
delegam entre si. Contrato em `qa/CONTRACTS.md`.
