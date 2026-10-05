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
QA_ALLOW_PRODUCTION=false
QA_ALLOW_API_WRITES=false
QA_API_TOKEN_ENV=NOME_DA_VARIAVEL_DO_SISTEMA
```

O ambiente informado no pedido tem precedência sobre `QA_TARGET_ENV`. Depois,
selecione as URLs com o sufixo correspondente. URL explícita que divergir do
arquivo deve ser confirmada; não faça fallback silencioso entre ambientes.

`production` exige ambiente explicitamente pedido e
`QA_ALLOW_PRODUCTION=true`. Operações API diferentes de GET/HEAD/OPTIONS também
exigem `QA_ALLOW_API_WRITES=true` e aprovação específica no pedido. O nome em
`QA_API_TOKEN_ENV` é uma referência; nunca leia ou persista o valor no estado.

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
      "api_token_env": "QA_API_TOKEN_HOMOLOG"
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

Não inclua valores de credenciais. Informe somente o método autorizado:
`existing-session`, `manual-login` ou `not-available`.

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
  test-plan.json
  executions/<test-id>/attempt-<n>.json
  network/<test-id>/attempt-<n>.json
  evidence/index.json
  screenshots/
  report.md
  jira-bugs.md
```

Se uma ferramenta não permitir salvar um artefato, registre a referência
retornada pela ferramenta. Nunca crie um arquivo vazio para simular evidência.

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
