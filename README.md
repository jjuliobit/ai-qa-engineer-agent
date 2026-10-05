# QA Multi-Agent para Cursor

Configuração nativa do Cursor para operar como um AI QA Engineer com subagents
especializados e Playwright MCP. Não é uma aplicação Node nem um framework de
agentes externo.

## Decisão arquitetural importante

Subagents do Cursor não podem chamar outros subagents. Por isso:

- o Agent principal do chat atua como **QA Master**;
- `.cursor/rules/qa-master.mdc` define o fluxo de orquestração;
- os especialistas ficam em `.cursor/agents/*.md`;
- o QA Master recebe os retornos, persiste o estado e repassa contexto.

## Componentes

```text
.cursor/
  agents/
    requirement-analyzer.md
    business-rule-code-reviewer.md
    test-designer.md
    playwright-executor.md
    api-test-executor.md
    api-network-analyzer.md
    evidence-collector.md
    bug-investigator.md
    qa-reporter.md
  rules/
    qa-master.mdc
    qa-evidence-safety.mdc
  mcp.json
qa/
  CONTRACTS.md
  TASK_TEMPLATE.md
```

O `requirement-analyzer` extrai as regras, e o
`business-rule-code-reviewer` mapeia essas regras para implementação e testes
existentes. O `test-designer` usa os riscos para criar cenários. O
`playwright-executor` opera o navegador e o `api-test-executor` testa APIs
diretamente. Os demais agentes analisam rede, evidência, falhas e relatório.

## Configurar os MCPs

O arquivo `.cursor/mcp.json` configura:

- `atlassian`: Jira/Confluence pelo endpoint oficial
  `https://mcp.atlassian.com/v2/mcp`;
- `playwright`: browser via `@playwright/mcp`.

Requisitos:

1. Node.js/npm instalados na máquina.
2. Reabrir o workspace ou habilitar os servidores em
   **Cursor Settings → MCP**.
3. Autenticar o Atlassian MCP por OAuth e selecionar o site autorizado.
4. Aprovar a instalação/execução do Playwright MCP quando o Cursor solicitar.

O Node é usado apenas para iniciar o servidor MCP oficial do Playwright. Não há
projeto Node neste workspace.

Os recursos exatos de network body, trace, vídeo e download dependem da versão
do Playwright MCP. Quando algo não estiver disponível, os agents registram
`NOT AVAILABLE`.

## Ambientes local, homologação e produção

Copie `.env.qa.example` para `.env.qa` e preencha as URLs:

```text
QA_TARGET_ENV=homolog
QA_APP_BASE_URL_LOCAL=http://localhost:3000
QA_API_BASE_URL_LOCAL=http://localhost:8080
QA_APP_BASE_URL_HOMOLOG=https://homolog.example.com
QA_API_BASE_URL_HOMOLOG=https://api-homolog.example.com
QA_APP_BASE_URL_PRODUCTION=https://www.example.com
QA_API_BASE_URL_PRODUCTION=https://api.example.com
QA_TEST_EMAIL_LOCAL=
QA_TEST_PASSWORD_LOCAL=
QA_TEST_EMAIL_HOMOLOG=
QA_TEST_PASSWORD_HOMOLOG=
QA_TEST_EMAIL_PRODUCTION=
QA_TEST_PASSWORD_PRODUCTION=
QA_ALLOW_PRODUCTION=false
QA_ALLOW_API_WRITES=false
QA_API_TOKEN_ENV=QA_API_TOKEN_HOMOLOG
```

`.env.qa` não é versionado. `QA_API_TOKEN_ENV` contém apenas o nome da variável
de ambiente do sistema; o token real não deve ficar no arquivo.

O ambiente escrito no pedido substitui `QA_TARGET_ENV`. Não existe fallback
automático para produção. Produção e requests de escrita exigem autorizações
separadas.

## Uso

O `qa/TASK_TEMPLATE.md` é opcional. Você pode fornecer diretamente:

- descrição ou export JSON de um card Jira;
- texto colado no chat;
- link Jira, se houver uma integração autorizada capaz de lê-lo;
- documentação e arquivos usando `@arquivo`;
- task consolidado no formato do seu time.

Somente a chave também funciona:

```text
Execute o fluxo completo de QA para NEX-123.
Ambiente: Homolog
URL: https://...
```

Ao reconhecer `NEX-123`, o QA Master consulta o Jira pelo MCP `atlassian` antes
de chamar o Requirement Analyzer. Se OAuth, site ou permissão estiverem
indisponíveis, ele solicita autenticação/export em vez de inventar o conteúdo.

Para teste direto de API:

```text
Teste a API do card NEX-123 em homolog.
Use a base URL configurada em .env.qa.
Não execute operações de escrita.
```

Exemplo com arquivo:

```text
Execute o fluxo completo de QA usando o QA Master e os subagents do projeto.
Card Jira: @jira/NEX-123.md
Padrões do time: @docs/qa-standards.md
Ambiente: Homolog
URL: https://...
Crie um novo run, execute os cenários e gere o relatório final.
```

Exemplo com o conteúdo no chat:

```text
Analise e teste este card Jira:
NEX-123 — <descrição e critérios de aceite>

Siga @docs/qa-standards.md.
URL de homologação: https://...
```

Se o card estiver disponível por Jira MCP, o link ou ID pode ser usado. Sem
integração, o QA Master não consegue inferir o conteúdo a partir do link; forneça
a descrição, um export ou um arquivo.

O QA Master seguirá:

```text
Requirement Analyzer
→ Business Rule Code Reviewer (quando houver código)
→ Test Designer
→ Playwright Executor
→ API/Network Analyzer
→ Evidence Collector
→ Bug Investigator (quando necessário)
→ possível rerun controlado
→ QA Reporter
```

## Revisão das regras no código

Quando o código da aplicação estiver no workspace, o QA Master chama
`business-rule-code-reviewer` antes do desenho dos testes. Para cada regra, ele
procura o fluxo relevante e cita arquivo, símbolo e linhas reais.

Os status estáticos são `STATICALLY_SUPPORTED`, `PARTIALLY_SUPPORTED`,
`STATIC_MISMATCH`, `NOT_FOUND`, `NOT_TRACEABLE` e `SOURCE_CONFLICT`.

Essa revisão é deliberadamente conservadora:

- código atual não substitui a regra documentada;
- uma implementação aparentemente correta não prova comportamento runtime;
- divergência estática isolada é risco, não bug confirmado;
- o Bug Investigator só confirma defeito ao combinar requisito, código e
  evidência funcional suficiente.

Você também pode pedir uma etapa:

```text
Use o requirement-analyzer e o test-designer para revisar @qa/minha-task.md.
Não execute o navegador.
```

## Padrões do time

Não copie o processo do time para `TASK_TEMPLATE.md`.

- Para regras que devem valer em todo pedido de QA, crie uma Rule como
  `.cursor/rules/team-qa-standards.mdc`.
- Para documentação extensa ou versionada, mantenha o arquivo original e
  referencie-o com `@arquivo` no pedido.
- Regras de processo, padrões de desenho e formato de relatório ficam separadas
  das regras de negócio do produto.

O QA Master envia essas fontes ao `requirement-analyzer` com identificação de
origem. Se documentos conflitarem e o time não definir precedência, o sistema
aponta a ambiguidade em vez de escolher silenciosamente.

## Memória e evidências

Cada execução usa `.qa/runs/<run-id>/`. O QA Master mantém `state.md` e salva os
retornos dos subagents, tentativas, correlações, screenshots disponíveis e
relatórios. O contrato completo está em `qa/CONTRACTS.md`.

Subagents têm contexto isolado. O QA Master sempre deve passar explicitamente o
task e os resultados anteriores necessários. O fingerprint no estado evita
trabalho duplicado.

## Credenciais

Não coloque senha, token ou cookie no task, Git ou relatório. Há três modos:

1. sessão já autenticada no browser controlado pelo MCP;
2. login manual quando o QA Master pausar e solicitar;
3. email e senha por ambiente no `.env.qa`.

O `.env.qa` já foi criado e está ignorado pelo Git. Preencha somente as chaves
do ambiente usado. O executor não usa credenciais de outro ambiente como
fallback e não deve copiá-las para estado, relatório ou evidências.

Limitação: no modo env, Cursor e Playwright precisam consumir a credencial para
preencher o formulário; ela pode passar pelo contexto da ferramenta. Para
produção, MFA ou contas sensíveis, prefira sessão autenticada ou login manual.

## Segurança operacional

- Ações destrutivas são negadas por padrão.
- Navegação fica restrita às origens informadas no task.
- Upload exige arquivo e autorização explícitos.
- Browser scenarios são sequenciais para não disputar a sessão.
- PASS exige validação objetiva, não apenas ação sem erro.
- Falha sem evidência suficiente não vira bug confirmado.
- `.qa/runs/` não deve ser versionado; screenshots podem conter dados visíveis.

## Adicionar um subagent

Crie `.cursor/agents/<nome>.md`:

```markdown
---
name: meu-agent
description: Quando e por que o QA Master deve usar este especialista.
model: inherit
readonly: true
---

Responsabilidade, limites, contrato de entrada e saída.
```

Depois atualize a regra do QA Master somente se o novo agent entrar no fluxo
obrigatório. Para uma especialização opcional, uma boa `description` permite ao
Agent principal selecioná-lo quando relevante.

## Limitações

- Custom subagents não delegam para outros subagents.
- `readonly` orienta o comportamento, mas não é sandbox de segurança.
- MCP é configurado por workspace, não por subagent.
- Artefatos não são duráveis automaticamente; o QA Master deve salvá-los.
- Aprovações de ferramentas continuam sujeitas às configurações do Cursor.
