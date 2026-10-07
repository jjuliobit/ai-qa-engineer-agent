# QA TASK — OPCIONAL

Use este arquivo somente quando for útil consolidar informações dispersas. Um
card Jira, texto colado, export JSON ou documentação referenciada pode ser
enviado diretamente ao QA Master sem copiar os dados para este template.

Não adapte o padrão oficial do seu time a este arquivo. Referencie o documento
ou Rule do time como fonte e o QA Master aplicará esse padrão na normalização.

## Identification

- Jira:
- Environment: local | homolog | production
- Web URL: opcional se configurada em `.env.qa`
- API URL: opcional se configurada em `.env.qa`
- Module:
- Feature:
- User profile:

## Requirement

Cole aqui o requisito sem resumir.

## Documentation

- Links ou trechos:

## Business rules

- Regras conhecidas:

## Test data

- Dados de teste autorizados:
- Registros que podem ser criados:
- Registros que não podem ser alterados:
- Arquivos autorizados para upload:

## Authentication

Escolha um método, sem gravar credenciais neste arquivo:

- [ ] Existing authenticated browser session
- [ ] Manual login by the user when requested
- [ ] Email/password login using credentials from `.env.qa`
- [ ] Authentication not required

Para API, não informe token nem variável de ambiente de token. O executor faz
login com e-mail e senha do `.env.qa` e mantém o token somente em memória. Se
conhecido, referencie o OpenAPI ou a documentação do endpoint de autenticação.

## Safety

- Allowed origins:
- Destructive actions allowed: no
- Explicit destructive approvals:

## Requested scope

- [ ] Requirement analysis
- [ ] Test design
- [ ] Browser execution
- [ ] UI validation
- [ ] API/network analysis
- [ ] Console analysis
- [ ] Evidence collection
- [ ] Bug investigation/reproduction
- [ ] Final QA report
- [ ] Jira-ready bug report
- [ ] Generate Playwright automation (TypeScript/@playwright/test only)

## Execution notes

- Browser/headless preference:
- Known environment limitations:
- Maximum scenario count:
- Other constraints:
