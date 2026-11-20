import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLangfuseViewState,
  handleLangfuseView,
  readLangfuseViewSettings,
  type LangfuseViewSettings,
  type UpstreamCall,
  type UpstreamExchange,
} from "./langfuseViewProxy";

const settings: LangfuseViewSettings = {
  upstream: new URL("http://127.0.0.1:3300"),
  hostHeader: "lf.example",
  origins: ["http://127.0.0.1:3300", "https://lf.example"],
  callbackOrigin: "https://lf.example",
  email: "admin@veritask.test",
  password: "test-password",
  benchApi: new URL("http://127.0.0.1:8000"),
  prefix: "/ai-monitoring/view",
};

function request(cookie = "veritask_session=33333333-3333-3333-3333-333333333333"): Request {
  return new Request("https://bench.example/ai-monitoring/view/", {
    headers: cookie ? { cookie } : {},
  });
}

function bench(role: string, status = 200): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify({ role }), {
      status,
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

function scripted(document: UpstreamExchange): {
  send: (settings: LangfuseViewSettings, call: UpstreamCall) => Promise<UpstreamExchange>;
  calls: UpstreamCall[];
} {
  const calls: UpstreamCall[] = [];
  const send = async (_settings: LangfuseViewSettings, call: UpstreamCall) => {
    calls.push(call);
    if (call.path === "/api/auth/csrf") {
      return {
        status: 200,
        headers: [
          ["content-type", "application/json"],
          ["set-cookie", "csrf=1; Path=/; HttpOnly"],
        ],
        body: new TextEncoder().encode('{"csrfToken":"csrf-token"}'),
      };
    }
    if (call.path === "/api/auth/callback/credentials") {
      return {
        status: 200,
        headers: [
          ["content-type", "application/json"],
          ["set-cookie", "__Secure-next-auth.session-token=session-1; Path=/; Secure"],
        ],
        body: new TextEncoder().encode('{"url":"https://lf.example/"}'),
      };
    }
    return document;
  };
  return { send, calls };
}

describe("handleLangfuseView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not contact Langfuse without a bench session", async () => {
    const send = vi.fn();
    const response = await handleLangfuseView(request(""), [], {
      settings,
      state: createLangfuseViewState(),
      send,
      benchFetch: bench("admin"),
    });
    expect(response.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a contributor before contacting Langfuse", async () => {
    const send = vi.fn();
    const response = await handleLangfuseView(request(), [], {
      settings,
      state: createLangfuseViewState(),
      send,
      benchFetch: bench("contributor"),
    });
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Halaman ini hanya untuk Admin dan Developer AI.");
    expect(send).not.toHaveBeenCalled();
  });

  it("returns the local UI on this origin, already signed in", async () => {
    const { send, calls } = scripted({
      status: 200,
      headers: [
        ["content-type", "text/html; charset=utf-8"],
        ["content-security-policy", "default-src 'self'; frame-ancestors 'none'"],
        ["x-frame-options", "SAMEORIGIN"],
        ["set-cookie", "__Secure-next-auth.csrf-token=abc; Path=/; Domain=lf.example; Secure"],
      ],
      body: new TextEncoder().encode(
        '<script id="__NEXT_DATA__" type="application/json">{"page":"/"}</script><script src="/_next/static/a.js"></script>',
      ),
    });
    const response = await handleLangfuseView(request(), [], {
      settings,
      state: createLangfuseViewState(),
      send,
      benchFetch: bench("admin"),
    });
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('"assetPrefix":"/ai-monitoring/view"');
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(response.headers.get("content-security-policy")).not.toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-frame-options")).toBeNull();
    expect(response.headers.get("set-cookie")).not.toContain("Domain=");
    const page = calls.find((call) => call.path === "/");
    expect(page?.headers.host).toBe("lf.example");
    expect(page?.headers.cookie).toContain("__Secure-next-auth.session-token=session-1");
    expect(calls.some((call) => call.path.includes("langfuse.com"))).toBe(false);
  });

  it("does not show the Langfuse login when the UI password is unset", async () => {
    const send = vi.fn();
    const response = await handleLangfuseView(request(), [], {
      settings: { ...settings, password: "" },
      state: createLangfuseViewState(),
      send,
      benchFetch: bench("developer_ai"),
    });
    expect(response.status).toBe(503);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("readLangfuseViewSettings", () => {
  it("refuses Langfuse Cloud and otherwise stays on loopback", () => {
    const defaults = readLangfuseViewSettings({});
    expect("error" in defaults).toBe(false);
    if (!("error" in defaults)) expect(defaults.upstream.href).toBe("http://127.0.0.1:3000/");
    expect(readLangfuseViewSettings({ LANGFUSE_UPSTREAM: "https://cloud.langfuse.com" })).toEqual({
      error: "cloud",
    });
    const local = readLangfuseViewSettings({
      LANGFUSE_UPSTREAM: "http://127.0.0.1:3300",
      LANGFUSE_UPSTREAM_HOST: "lf.example",
    });
    expect("error" in local).toBe(false);
    if (!("error" in local)) {
      expect(local.hostHeader).toBe("lf.example");
      expect(local.origins).toContain("https://lf.example");
    }
  });
});
