import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const SENSITIVE_KEY = /authorization|cookie|password|secret|token/i;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function fail(message) {
  process.stderr.write(`${JSON.stringify({ status: "BLOCKED", error: message })}\n`);
  process.exit(1);
}

function parseEnv(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function assertOrigin(url, allowedOrigins, label) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail(`${label} is not a valid URL`);
  }
  if (!allowedOrigins.includes(parsed.origin)) {
    fail(`${label} is outside the allowed origins`);
  }
  return parsed;
}

function buildUrl(baseUrl, pathOrUrl) {
  return new URL(pathOrUrl, baseUrl).toString();
}

function setField(target, field, value) {
  if (!field.startsWith("/")) {
    target[field] = value;
    return;
  }
  const parts = field
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  let current = target;
  for (const part of parts.slice(0, -1)) {
    current[part] ??= {};
    if (typeof current[part] !== "object" || current[part] === null) {
      fail("Credential field pointer conflicts with the documented login payload");
    }
    current = current[part];
  }
  current[parts.at(-1)] = value;
}

function getPointer(target, pointer) {
  if (pointer === "") return target;
  if (!pointer.startsWith("/")) fail("tokenPointer must be an RFC 6901 JSON Pointer");
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, part) => value?.[part], target);
}

function redact(value, secrets) {
  if (Array.isArray(value)) return value.map((item) => redact(item, secrets));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(item, secrets),
      ]),
    );
  }
  if (typeof value !== "string") return value;
  return secrets
    .filter(Boolean)
    .reduce((text, secret) => text.replaceAll(secret, "[REDACTED]"), value);
}

function sanitizeHeaders(headers, secrets) {
  return Object.fromEntries(
    [...headers.entries()].map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(value, secrets),
    ]),
  );
}

async function parseResponseBody(response, secrets) {
  const text = await response.text();
  if (!text) return null;
  const limited = text.length > 65_536 ? `${text.slice(0, 65_536)}…[TRUNCATED]` : text;
  try {
    return redact(JSON.parse(limited), secrets);
  } catch {
    return redact(limited, secrets);
  }
}

function encodeLoginBody(login, payload) {
  if (login.contentType === "application/json") {
    return JSON.stringify(payload);
  }
  if (login.contentType === "application/x-www-form-urlencoded") {
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (value === null || typeof value === "object") {
        fail("Form login payload supports scalar values only");
      }
      form.set(key, String(value));
    }
    return form.toString();
  }
  fail("Unsupported documented login content type");
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) fail("Usage: node api-password-login.mjs <sanitized-config.json>");

  let config;
  try {
    config = JSON.parse(await readFile(resolve(configPath), "utf8"));
  } catch {
    fail("Unable to read the sanitized request configuration");
  }

  const {
    environment,
    apiBaseUrl,
    allowedOrigins = [],
    credentials = {},
    login = {},
    request = {},
    safety = {},
  } = config;

  if (environment === "production" && safety.allowProduction !== true) {
    fail("Production is not explicitly allowed");
  }
  if (!apiBaseUrl || allowedOrigins.length === 0) {
    fail("apiBaseUrl and allowedOrigins are required");
  }
  assertOrigin(apiBaseUrl, allowedOrigins, "API base URL");

  const method = String(request.method || "GET").toUpperCase();
  if (
    !SAFE_METHODS.has(method) &&
    !(safety.allowApiWrites === true && safety.writeApproved === true)
  ) {
    fail("The target API write is not explicitly allowed and approved");
  }
  if (String(login.method || "").toUpperCase() !== "POST") {
    fail("Only a verified POST authentication contract is supported");
  }

  let env;
  try {
    env = parseEnv(await readFile(resolve(config.envFile || ".env.qa"), "utf8"));
  } catch {
    fail("Unable to read the local credential file");
  }
  const email = env[credentials.emailKey];
  const password = env[credentials.passwordKey];
  if (!email || !password) fail("Email or password is missing for the selected environment");

  const loginUrl = buildUrl(apiBaseUrl, login.path);
  const targetUrl = buildUrl(apiBaseUrl, request.path);
  assertOrigin(loginUrl, allowedOrigins, "Login URL");
  assertOrigin(targetUrl, allowedOrigins, "Target URL");

  const loginPayload = structuredClone(login.payload || {});
  setField(loginPayload, login.emailField, email);
  setField(loginPayload, login.passwordField, password);

  let loginResponse;
  try {
    loginResponse = await fetch(loginUrl, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": login.contentType },
      body: encodeLoginBody(login, loginPayload),
    });
  } catch {
    fail("Authentication request failed at transport level");
  }
  if (!loginResponse.ok) {
    fail(`Authentication failed with HTTP ${loginResponse.status}`);
  }

  let loginJson;
  try {
    loginJson = await loginResponse.json();
  } catch {
    fail("Authentication response is not valid JSON");
  }
  const token = getPointer(loginJson, login.tokenPointer);
  if (typeof token !== "string" || !token) {
    fail("The token was not found at the verified response pointer");
  }

  const targetHeaders = new Headers(request.headers || {});
  const transport = login.tokenTransport || {};
  if (transport.location === "header") {
    const prefix = transport.scheme ? `${transport.scheme} ` : "";
    targetHeaders.set(transport.name, `${prefix}${token}`);
  } else if (transport.location === "cookie") {
    targetHeaders.set("cookie", `${transport.name}=${token}`);
  } else {
    fail("Unsupported token transport");
  }

  let body;
  if (request.payload !== undefined && request.payload !== null) {
    const contentType = targetHeaders.get("content-type") || "application/json";
    targetHeaders.set("content-type", contentType);
    body =
      contentType === "application/json"
        ? JSON.stringify(request.payload)
        : String(request.payload);
  }

  const startedAt = new Date().toISOString();
  let response;
  try {
    response = await fetch(targetUrl, {
      method,
      redirect: "manual",
      headers: targetHeaders,
      body,
    });
  } catch {
    fail("Target API request failed at transport level");
  }
  const secrets = [email, password, token];
  const result = {
    status: "COMPLETED",
    startedAt,
    finishedAt: new Date().toISOString(),
    authentication: {
      mode: "password-login",
      contractSource: login.sourceId,
      status: "AUTHENTICATED",
    },
    request: {
      method,
      url: targetUrl,
      headers: sanitizeHeaders(targetHeaders, secrets),
      payload: redact(request.payload ?? null, secrets),
    },
    response: {
      status: response.status,
      headers: sanitizeHeaders(response.headers, secrets),
      body: await parseResponseBody(response, secrets),
    },
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch(() => fail("Unexpected execution failure"));
