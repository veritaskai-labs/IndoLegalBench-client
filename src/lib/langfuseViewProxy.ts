/**
 * Proxy the local Langfuse UI under /ai-monitoring/view.
 * The browser stays on this site. Langfuse Cloud is never contacted.
 */

import http from "node:http";
import https from "node:https";

import {
  LANGFUSE_VIEW_PREFIX,
  cloudHost,
  langfuseRewriteKind,
  rewriteLangfuseBody,
  rewriteLangfuseLocation,
} from "@/lib/langfuseViewRewrite";

const SESSION_COOKIE = "__Secure-next-auth.session-token";
const SESSION_TTL_MS = 10 * 60 * 1000;
const ROLE_TTL_MS = 15 * 1000;
const ALLOWED_ROLES = new Set(["admin", "developer_ai"]);

export type LangfuseViewSettings = {
  upstream: URL;
  hostHeader: string;
  origins: string[];
  callbackOrigin: string;
  email: string;
  password: string;
  benchApi: URL;
  prefix: string;
};

export type LangfuseViewConfig =
  | LangfuseViewSettings
  | { error: "cloud" | "upstream" | "bench" };

export type UpstreamCall = {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Uint8Array | null;
};

export type UpstreamExchange = {
  status: number;
  headers: Array<[string, string]>;
  body: Uint8Array;
};

export type LangfuseViewState = {
  sessionToken: string | null;
  sessionAt: number;
  minting: Promise<string | null> | null;
  roles: Map<string, { role: string; at: number }>;
};

export function createLangfuseViewState(): LangfuseViewState {
  return { sessionToken: null, sessionAt: 0, minting: null, roles: new Map() };
}

export const langfuseViewState = createLangfuseViewState();

export function readLangfuseViewSettings(env: NodeJS.ProcessEnv): LangfuseViewConfig {
  const upstream = parseHttpUrl(env.LANGFUSE_UPSTREAM?.trim() || "http://127.0.0.1:3000");
  const benchApi = parseHttpUrl(env.BENCH_API_ORIGIN?.trim() || "http://127.0.0.1:8000");
  if (!upstream) return { error: "upstream" };
  if (!benchApi) return { error: "bench" };
  if (cloudHost(upstream.href)) return { error: "cloud" };
  const hostHeader = env.LANGFUSE_UPSTREAM_HOST?.trim() || upstream.host;
  const origins = new Set<string>([upstream.origin]);
  const configuredPublic = env.LANGFUSE_PUBLIC_ORIGIN?.trim() ?? "";
  if (configuredPublic) {
    try {
      origins.add(new URL(configuredPublic).origin);
    } catch {
      return { error: "upstream" };
    }
  }
  if (!hostHeader.includes(":")) {
    origins.add(`https://${hostHeader}`);
    origins.add(`http://${hostHeader}`);
  }
  const callbackOrigin = [...origins].find((origin) => origin.startsWith("https://")) ?? upstream.origin;
  return {
    upstream,
    hostHeader,
    origins: [...origins],
    callbackOrigin,
    email: env.LANGFUSE_VIEW_EMAIL?.trim() ?? "",
    password: env.LANGFUSE_VIEW_PASSWORD ?? "",
    benchApi,
    prefix: LANGFUSE_VIEW_PREFIX,
  };
}

type ProxyDeps = {
  settings: LangfuseViewSettings;
  state: LangfuseViewState;
  send: (settings: LangfuseViewSettings, call: UpstreamCall) => Promise<UpstreamExchange>;
  benchFetch?: typeof fetch;
  now?: () => number;
};

export async function handleLangfuseView(
  request: Request,
  path: string[] | undefined,
  deps: ProxyDeps,
): Promise<Response> {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.includes("veritask_session=")) {
    return plain(401, "Masuk diperlukan.");
  }
  const role = await benchRole(cookie, deps);
  if (role === null) return plain(401, "Masuk diperlukan.");
  if (!ALLOWED_ROLES.has(role)) return plain(403, "Halaman ini hanya untuk Admin dan Developer AI.");
  if (!deps.settings.email || !deps.settings.password) {
    return plain(503, "Sesi Langfuse lokal belum diatur.");
  }

  const upstreamPath = upstreamPathFor(path, new URL(request.url).search);
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? null
      : new Uint8Array(await request.arrayBuffer());
  const first = await exchange(deps, request, upstreamPath, body, false);
  if (first === null) return plain(502, "Antarmuka Langfuse lokal tidak terjangkau.");
  const chosen = isSignIn(first) ? await exchange(deps, request, upstreamPath, body, true) : first;
  if (chosen === null || isSignIn(chosen)) return plain(502, "Antarmuka Langfuse lokal tidak terjangkau.");
  return toResponse(chosen, deps.settings);
}

export function sendToLangfuse(
  settings: LangfuseViewSettings,
  call: UpstreamCall,
): Promise<UpstreamExchange> {
  const lib = settings.upstream.protocol === "https:" ? https : http;
  const headers: Record<string, string> = { ...call.headers, host: settings.hostHeader };
  headers["accept-encoding"] = "identity";
  if (call.body) headers["content-length"] = String(call.body.byteLength);
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        protocol: settings.upstream.protocol,
        hostname: settings.upstream.hostname,
        port: settings.upstream.port || (settings.upstream.protocol === "https:" ? 443 : 80),
        method: call.method,
        path: call.path,
        headers,
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const pairs: Array<[string, string]> = [];
          const raw = res.rawHeaders;
          for (let i = 0; i < raw.length; i += 2) {
            pairs.push([raw[i] ?? "", raw[i + 1] ?? ""]);
          }
          resolve({
            status: res.statusCode ?? 502,
            headers: pairs,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    if (call.body) req.write(call.body);
    req.end();
  });
}

function upstreamPathFor(path: string[] | undefined, search: string): string {
  const segments = (path ?? []).filter((segment) => segment.length > 0).map(encodeURIComponent);
  return `/${segments.join("/")}${search}`;
}

async function exchange(
  deps: ProxyDeps,
  request: Request,
  path: string,
  body: Uint8Array | null,
  forceSession: boolean,
): Promise<UpstreamExchange | null> {
  const token = await sessionToken(deps, forceSession);
  if (!token) return null;
  const headers = forwardedHeaders(request, deps.settings, token);
  try {
    return await deps.send(deps.settings, { method: request.method, path, headers, body });
  } catch {
    return null;
  }
}

function forwardedHeaders(
  request: Request,
  settings: LangfuseViewSettings,
  token: string,
): Record<string, string> {
  const headers: Record<string, string> = { host: settings.hostHeader, "accept-encoding": "identity" };
  for (const name of ["accept", "content-type", "user-agent", "x-requested-with"]) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  const cookie = withSession(request.headers.get("cookie"), token);
  if (cookie) headers.cookie = cookie;
  headers.origin = settings.callbackOrigin;
  headers.referer = `${settings.callbackOrigin}/`;
  return headers;
}

function withSession(cookie: string | null, token: string): string {
  const parts = (cookie ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith(`${SESSION_COOKIE}=`));
  parts.push(`${SESSION_COOKIE}=${token}`);
  return parts.join("; ");
}

async function benchRole(cookie: string, deps: ProxyDeps): Promise<string | null> {
  const now = deps.now ?? Date.now;
  const cached = deps.state.roles.get(cookie);
  if (cached && now() - cached.at < ROLE_TTL_MS) return cached.role;
  const fetcher = deps.benchFetch ?? fetch;
  try {
    const response = await fetcher(new URL("/me", deps.settings.benchApi), {
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { role?: unknown };
    if (typeof payload.role !== "string") return null;
    deps.state.roles.set(cookie, { role: payload.role, at: now() });
    return payload.role;
  } catch {
    return null;
  }
}

async function sessionToken(deps: ProxyDeps, force: boolean): Promise<string | null> {
  const now = deps.now ?? Date.now;
  const state = deps.state;
  if (!force && state.sessionToken && now() - state.sessionAt < SESSION_TTL_MS) return state.sessionToken;
  if (!force && state.minting) return state.minting;
  const run = mintSession(deps.settings, deps.send);
  state.minting = run;
  try {
    const token = await run;
    if (token) {
      state.sessionToken = token;
      state.sessionAt = now();
    } else {
      state.sessionToken = null;
    }
    return token;
  } finally {
    if (state.minting === run) state.minting = null;
  }
}

async function mintSession(
  settings: LangfuseViewSettings,
  send: ProxyDeps["send"],
): Promise<string | null> {
  try {
    const csrf = await send(settings, {
      method: "GET",
      path: "/api/auth/csrf",
      headers: { accept: "application/json", host: settings.hostHeader },
      body: null,
    });
    const payload = JSON.parse(Buffer.from(csrf.body).toString("utf8")) as { csrfToken?: unknown };
    if (typeof payload.csrfToken !== "string" || !payload.csrfToken) return null;
    const csrfCookie = setCookies(csrf.headers)
      .map((cookie) => cookie.split(";")[0])
      .filter(Boolean)
      .join("; ");
    const form = new URLSearchParams({
      csrfToken: payload.csrfToken,
      email: settings.email,
      password: settings.password,
      callbackUrl: `${settings.callbackOrigin}/`,
      json: "true",
    });
    const login = await send(settings, {
      method: "POST",
      path: "/api/auth/callback/credentials",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        cookie: csrfCookie,
        "x-auth-return-redirect": "1",
        host: settings.hostHeader,
        origin: settings.callbackOrigin,
      },
      body: new TextEncoder().encode(form.toString()),
    });
    return cookieValue(setCookies(login.headers), SESSION_COOKIE);
  } catch {
    return null;
  }
}

function cookieValue(cookies: string[], name: string): string | null {
  for (const cookie of cookies) {
    const pair = cookie.split(";", 1)[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq > 0 && pair.slice(0, eq) === name) return pair.slice(eq + 1);
  }
  return null;
}

function isSignIn(exchangeResult: UpstreamExchange): boolean {
  const location = headerValue(exchangeResult.headers, "location") ?? "";
  if (exchangeResult.status >= 300 && exchangeResult.status < 400 && location.includes("/auth/sign-in")) {
    return true;
  }
  const type = headerValue(exchangeResult.headers, "content-type") ?? "";
  if (!type.includes("text/html")) return false;
  const html = Buffer.from(exchangeResult.body).toString("utf8");
  return html.includes('"page":"/auth/sign-in"') || html.includes('name="password"');
}

function toResponse(exchangeResult: UpstreamExchange, settings: LangfuseViewSettings): Response {
  const headers = new Headers();
  const type = headerValue(exchangeResult.headers, "content-type");
  const kind = langfuseRewriteKind(type);
  if (type) headers.set("content-type", type);
  const cache = headerValue(exchangeResult.headers, "cache-control");
  if (kind === "html") headers.set("cache-control", "no-store");
  else if (cache) headers.set("cache-control", cache);
  const location = headerValue(exchangeResult.headers, "location");
  if (location) {
    headers.set("location", rewriteLangfuseLocation(location, settings.prefix, settings.origins));
  }
  for (const cookie of setCookies(exchangeResult.headers)) {
    headers.append("set-cookie", cookie.replace(/;\s*Domain=[^;]*/gi, ""));
  }
  if (kind === "html") headers.set("content-security-policy", framePolicy());
  let body: BodyInit = Buffer.from(exchangeResult.body);
  if (kind) {
    const text = Buffer.from(exchangeResult.body).toString("utf8");
    body = rewriteLangfuseBody(text, kind, settings.origins, settings.prefix);
  }
  return new Response(body, { status: exchangeResult.status, headers });
}

function framePolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function setCookies(headers: Array<[string, string]>): string[] {
  return headers.filter(([name]) => name.toLowerCase() === "set-cookie").map(([, value]) => value);
}

function headerValue(headers: Array<[string, string]>, name: string): string | null {
  const found = headers.find(([header]) => header.toLowerCase() === name);
  return found ? found[1] : null;
}

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}
