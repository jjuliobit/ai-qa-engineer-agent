# Contratos do sistema QA

## Fontes aceitas

`qa/TASK_TEMPLATE.md` é opcional. O QA Master aceita uma ou mais fontes:

- descrição ou export JSON de card Jira;
- link Jira, somente quando houver integração/ferramenta autorizada para lê-lo;
- texto da mensagem atual;
- arquivo Markdown, PDF ou documentação referenciada;
- regras e padrões do time em Rules, `AGENTS.md` ou arquivos indicados;
- template preenchido.

Quando a entrada contiver uma chave de issue, por exemplo `NEX-123`, o QA Master
deve consultar o MCP `atlassian` antes de normalizar. Colete apenas campos
necessários: key, summary, description, issue type, status, acceptance criteria
ou custom fields aplicáveis, labels/components, links e comentários relevantes.
Registre o timestamp de leitura e a identidade do site/projeto retornada pela
ferramenta. Não atualize o card.

Um link inacessível não prova o conteúdo do card. Nesse caso, solicite a
descrição/export ou use `BLOCKED`. Regras de processo do time não devem ser
tratadas como regras de negócio do produto.

## Normalização pelo QA Master

Antes da primeira delegação, o QA Master cria um task canônico. Campos ausentes
continuam ausentes; não é necessário preencher o template. Toda afirmação
normalizada mantém `source_id`.

Quando fontes conflitarem, aplique uma precedência somente se ela estiver
definida nos padrões do time ou pelo usuário. Caso contrário, registre a
contradição e use `CLARIFY` se ela alterar o teste esperado.

## Resolução de ambiente

O arquivo `.env.qa` é opcional e deve seguir `.env.qa.example`. Ele contém
configuração não secreta:

```text
QA_TARGET_ENV=local | homolog | production
QA_APP_BASE_URL_<AMBIENTE>=...
QA_API_BASE_URL_<AMBIENTE>=...
QA_TEST_EMAIL_<AMBIENTE>=...
QA_TEST_PASSWORD_<AMBIENTE>=...
QA_ALLOW_PRODUCTION=false
QA_ALLOW_API_WRITES=false
```

O ambiente informado no pedido tem precedência sobre `QA_TARGET_ENV`. Depois,
selecione as URLs com o sufixo correspondente. URL explícita que divergir do
arquivo deve ser confirmada; não faça fallback silencioso entre ambientes.

`production` exige ambiente explicitamente pedido e
`QA_ALLOW_PRODUCTION=true`. Operações API diferentes de GET/HEAD/OPTIONS também
exigem `QA_ALLOW_API_WRITES=true` e aprovação específica no pedido. A única
exceção é a requisição de autenticação no modo `password-login`: ela pode usar
POST sem habilitar escritas de negócio quando o contrato real a identificar
explicitamente como login e a origem estiver autorizada.

Para login web ou de API, selecione email e senha pelo mesmo sufixo do
ambiente. Não use credencial de outro ambiente como fallback. O QA Master
registra somente os nomes das chaves; o executor lê os valores no momento do
login e nunca os retorna.

No modo `password-login`, o token de API não é configuração de entrada e não
pode existir como variável de ambiente. Não há `QA_API_TOKEN` nem equivalente.
O `api-test-executor` autentica com email e senha via
`node .cursor/skills/api-password-login/scripts/api-password-login.mjs`,
extrai o token conforme um contrato de login verificado e o helper o mantém
somente em memória até terminar o cenário. O contrato deve vir de OpenAPI,
documentação ou request/response real observado no login web e informar método,
endpoint, campos de credencial e localização do token. Nunca invente esses dados.
Contrato ausente, chave vazia, MFA ou captcha requer login manual ou `BLOCKED`.

## Envelope de entrada

O QA Master deve passar a cada subagent somente o contexto necessário:

```json
{
  "run_id": "qa-YYYYMMDD-HHMMSS",
  "sources": [
    {
      "source_id": "jira:NEX-123",
      "type": "jira | message | file | documentation | team-standard",
      "reference": "NEX-123 ou caminho/URL",
      "content": "conteúdo realmente obtido",
      "retrieval_status": "AVAILABLE | NOT_AVAILABLE"
    }
  ],
  "team_standards": [
    {
      "source_id": "file:docs/qa-standards.md",
      "scope": "process | test-design | execution | reporting | product",
      "content": "regra aplicável"
    }
  ],
  "task": {
    "jira": "NEX-123",
    "requirement": "...",
    "url": "https://...",
    "environment": "Homolog",
    "environment_config": {
      "name": "homolog",
      "app_base_url": "https://...",
      "api_base_url": "https://api...",
      "source": ".env.qa",
      "allow_production": false,
      "allow_api_writes": false,
      "credential_mode": "password-login",
      "email_key": "QA_TEST_EMAIL_HOMOLOG",
      "password_key": "QA_TEST_PASSWORD_HOMOLOG",
      "api_login_contract": {
        "source_id": "openapi:auth-operation ou runtime:login-request",
        "method": "POST",
        "path": "valor realmente verificado",
        "content_type": "valor realmente verificado",
        "email_field": "valor realmente verificado",
        "password_field": "valor realmente verificado",
        "token_pointer": "valor realmente verificado",
        "token_transport": {
          "location": "header | cookie",
          "name": "valor realmente verificado",
          "scheme": "valor verificado ou null"
        }
      }
    },
    "profile": "...",
    "documentation": [],
    "business_rules": [],
    "test_data": {},
    "constraints": {
      "destructive_actions_allowed": false,
      "allowed_origins": []
    }
  },
  "assignment": {},
  "previous_results": [],
  "artifact_dir": ".qa/runs/<run-id>"
}
```

`sources` pode conter o card Jira completo sem que exista um arquivo de task.
No task canônico, use `REQUIREMENT NOT DEFINED` somente quando o contrato do
subagent exigir string; não suponha o valor.

Não inclua valores de credenciais no envelope. Informe somente o método
autorizado: `existing-session`, `manual-login`, `password-login`,
`not-required` ou `not-available`, mais os nomes das chaves quando o método for
`password-login`. `api_login_contract` é omitido enquanto não houver fonte real;
valores do exemplo acima são marcadores, não defaults.

## Envelope de saída

Exceto o Reporter, todo subagent retorna um único objeto JSON válido:

```json
{
  "agent": "agent-name",
  "status": "SUCCESS | PARTIAL | BLOCKED | FAILED",
  "result": {},
  "evidence_refs": [],
  "issues": [],
  "missing_information": [],
  "next_action": {
    "type": "CONTINUE | CLARIFY | RERUN | STOP",
    "reason": "...",
    "instructions": []
  }
}
```

`evidence_refs` contém somente caminhos/IDs que existem. `issues` não equivale a
bugs confirmados. O QA Master valida o envelope antes de encaminhá-lo.

## Estado do run

O arquivo `.qa/runs/<run-id>/state.md` contém:

```text
Run ID
Task fingerprint
Current stage
Agents already executed + input fingerprint
Scenario queue
Attempts per scenario
Evidence index
Open questions
Safety approvals
Final status
```

O fingerprint evita chamadas duplicadas. `RERUN` deve criar nova tentativa, não
sobrescrever a anterior.

## Diretório de artefatos

```text
.qa/runs/<run-id>/
  state.md
  requirement.json
  code-review.json
  test-plan.json
  executions/<test-id>/attempt-<n>.json
  network/<test-id>/attempt-<n>.json
  evidence/index.json
  screenshots/
  automation/automation-result.json
  report.md
  jira-bugs.md
```

Se uma ferramenta não permitir salvar um artefato, registre a referência
retornada pela ferramenta. Nunca crie um arquivo vazio para simular evidência.

## Rastreabilidade regra → código → runtime

Quando o código da aplicação estiver disponível, o QA Master chama
`business-rule-code-reviewer` após a análise do requisito. Cada conclusão exige
`source_id` da regra e citação real de arquivo, símbolo e linhas.

Status estáticos permitidos:

- `STATICALLY_SUPPORTED`: o fluxo revisado suporta a regra; não prova runtime;
- `PARTIALLY_SUPPORTED`;
- `STATIC_MISMATCH`: contradição direta que ainda exige validação funcional;
- `NOT_FOUND`;
- `NOT_TRACEABLE`;
- `SOURCE_CONFLICT`.

O desenho dos testes usa esses achados para priorização. Somente o Bug
Investigator combina evidência estática e runtime. Achado estático isolado é
`POTENTIAL_CODE_ISSUE`, nunca `BUG_CONFIRMED`.

## Geração de automação

Automação não faz parte automática de todo run. Somente quando o usuário pedir,
o QA Master chama `playwright-typescript-automation-engineer` com requisito,
cenário, resultado e seletores/evidências observados.

Todo código Playwright gerado deve usar TypeScript e `@playwright/test`, com
arquivos `*.spec.ts`. Não gere Python, não hardcode URLs ou credenciais e não
invente seletores. Cenário não executado permanece `NOT_RUN`; criação do arquivo
não prova PASS.

## Status do cenário

- `PASS`: resultado esperado validado objetivamente.
- `FAIL`: comportamento esperado foi validado e divergiu.
- `BLOCKED`: pré-condição, acesso, dado, ambiente ou ferramenta impediu o teste.
- `NOT_VERIFIED`: execução ocorreu, mas não há evidência suficiente para PASS/FAIL.

## Classificação da investigação

`BUG_CONFIRMED`, `POSSIBLE_BUG`, `ENVIRONMENT_ISSUE`, `TEST_DATA_ISSUE`,
`BLOCKED` ou `NOT_ENOUGH_EVIDENCE`.

## Política de retry

- Retry mecânico: uma repetição para timeout transitório, elemento em loading ou
  conexão interrompida, após nova observação.
- Não repetir assertion funcional apenas para buscar PASS.
- Reprodução de falha: somente por solicitação do Bug Investigator, no máximo
  duas novas tentativas por cenário.
- A quarta ação sem progresso encerra o cenário como `BLOCKED` ou
  `NOT_VERIFIED`, com o motivo observado.

## Correlação

Cada passo executado recebe `action_id`. Rede, console e screenshot devem usar o
mesmo ID quando a ferramenta disponibilizar timestamps suficientes:

```text
user action → request → response → UI observation
```

Não atribua um request de background a uma ação sem correlação temporal ou
causal suficiente.
