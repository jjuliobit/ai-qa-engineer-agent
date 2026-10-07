# Helper de autenticação de API

Use o helper apenas depois de verificar o contrato de login. O arquivo de
configuração não pode conter email, senha, token ou cookie. Não existe chave
de token no `.env.qa`.

```json
{
  "environment": "homolog",
  "apiBaseUrl": "https://api-homolog.example.com",
  "allowedOrigins": ["https://api-homolog.example.com"],
  "credentials": {
    "emailKey": "QA_TEST_EMAIL_HOMOLOG",
    "passwordKey": "QA_TEST_PASSWORD_HOMOLOG"
  },
  "login": {
    "sourceId": "openapi:operation-id",
    "method": "POST",
    "path": "/verified-login-path",
    "contentType": "application/json",
    "payload": {},
    "emailField": "verified-email-field",
    "passwordField": "verified-password-field",
    "tokenPointer": "/verified/token/path",
    "tokenTransport": {
      "location": "header",
      "name": "verified-header-name",
      "scheme": "verified-scheme-or-null"
    }
  },
  "request": {
    "method": "GET",
    "path": "/verified-target-path",
    "headers": {},
    "payload": null
  },
  "safety": {
    "allowProduction": false,
    "allowApiWrites": false,
    "writeApproved": false
  }
}
```

`emailField` e `passwordField` aceitam um campo de primeiro nível ou JSON
Pointer RFC 6901 para payload aninhado. `tokenPointer` é sempre JSON Pointer RFC
6901. `payload` do login contém somente valores estáticos não secretos exigidos
pelo contrato.

Para cookie, use `location: "cookie"`, o nome verificado e `scheme: null`.
Somente `application/json` e `application/x-www-form-urlencoded` são aceitos no
login. O helper bloqueia produção sem autorização, requests de negócio não
seguras sem as duas aprovações, redirects e origens fora de `allowedOrigins`.

O resultado já redige headers e valores sensíveis. Ainda assim, o executor deve
validar status e conteúdo contra a expectativa do cenário antes de definir
`PASS`.
