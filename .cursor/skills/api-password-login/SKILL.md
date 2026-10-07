---
name: api-password-login
description: Autentica APIs com e-mail e senha, obtém o token só em memória e executa o request. Use em testes de API, 401, token ausente, ou quando o usuário recusar token em variável de ambiente.
icon: shield
color: blue
---

# API password login

Nunca procure `QA_API_TOKEN`, `ACCESS_TOKEN`, `BEARER_TOKEN` nem qualquer
token em `.env.qa`, no envelope ou no sistema. O token só existe depois do
login, dentro do helper, e nunca volta ao contexto do agente.

## Quando usar

- Cenário direto de API autenticada.
- A IA parou porque “falta o token”.
- O usuário pediu login com e-mail e senha.

## Passos

1. Resolva o contrato de login por OpenAPI, documentação ou tráfego real do
   login web. Sem fonte verificável, use `BLOCKED`; não invente path, campos
   nem `Authorization: Bearer`.
2. Informe só os nomes das chaves: `QA_TEST_EMAIL_<AMBIENTE>` e
   `QA_TEST_PASSWORD_<AMBIENTE>`. Não leia `.env.qa` no chat.
3. Grave um JSON sanitizado no diretório do run. Schema em
   [reference.md](reference.md). O arquivo não pode conter e-mail, senha,
   token ou cookie.
4. Execute:

   `node .cursor/skills/api-password-login/scripts/api-password-login.mjs <arquivo>`

5. O helper lê e-mail/senha internamente, faz POST de login, aplica o token
   só em memória e chama o endpoint do cenário. Valide status e corpo
   sanitizados antes de marcar `PASS`.
6. Um 401 por expiração permite um único novo login e uma única repetição.

MFA, captcha, credencial vazia ou contrato ausente: `BLOCKED`.
