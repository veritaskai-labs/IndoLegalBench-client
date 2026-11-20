import { describe, expect, it } from "vitest";
import {
  cloudHost,
  rewriteLangfuseBody,
  rewriteLangfuseLocation,
} from "./langfuseViewRewrite";

const ORIGIN = "https://lf.example";
const REMOVE =
  'function a(e){return e}Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"removeBasePath"';

describe("rewriteLangfuseBody", () => {
  it("points Next basePath, public assets, and API calls at the view prefix", () => {
    const source = [
      'function a(e){return(0,n.pathHasPrefix)(e,"")}',
      'function o(e,t){return(0,n.addPathPrefix)(e,"")}',
      REMOVE,
      'this.basePath=""',
      "self.__next_set_public_path__(`${n}/_next/`)",
      "`${E()}/api/trpc/${e}`",
      '"/api/auth/session"',
      'GET /api/public/traces',
      "`/_next/data/${buildId}`",
    ].join(";");
    const rewritten = rewriteLangfuseBody(source, "script", [ORIGIN]);

    expect(rewritten).toContain('pathHasPrefix)(e,"/ai-monitoring/view")');
    expect(rewritten).toContain('addPathPrefix)(e,"/ai-monitoring/view")');
    expect(rewritten).toContain('var p="/ai-monitoring/view"');
    expect(rewritten).toContain('this.basePath="/ai-monitoring/view"');
    expect(rewritten).toContain("`${E()}/ai-monitoring/view/api/trpc/${e}`");
    expect(rewritten).toContain('"/ai-monitoring/view/api/auth/session"');
    expect(rewritten).toContain("GET /api/public/traces");
    expect(rewritten).toContain("`/_next/data/${buildId}`");

    const remove = rewritten.slice(rewritten.indexOf("function a(e){var p="));
    const fn = new Function(`${remove.slice(0, remove.indexOf("Object.defineProperty"))}; return a`)();
    expect(fn("/ai-monitoring/view/organization/x")).toBe("/organization/x");
    expect(fn("/ai-monitoring/view")).toBe("/");
    expect(fn("/ai-monitoring/view?x=1")).toBe("/?x=1");
    expect(fn("/organization/x")).toBe("/organization/x");
  });

  it("rewrites the document once, including a Langfuse origin and the asset prefix", () => {
    const html = [
      `<script id="__NEXT_DATA__" type="application/json">{"page":"/"}</script>`,
      `<script src="${ORIGIN}/_next/static/a.js"></script>`,
      '<link href="/_next/static/b.css">',
    ].join("");
    const rewritten = rewriteLangfuseBody(html, "html", [ORIGIN]);
    expect(rewritten).toContain('src="/ai-monitoring/view/_next/static/a.js"');
    expect(rewritten).toContain('href="/ai-monitoring/view/_next/static/b.css"');
    expect(rewritten).not.toContain("/ai-monitoring/view/ai-monitoring/view/");
    expect(rewritten).toContain('"assetPrefix":"/ai-monitoring/view"');
    expect(rewritten).toContain(
      'globalThis.TURBOPACK_CHUNK_BASE_PATH="/ai-monitoring/view/_next/"',
    );
    expect(rewritten).not.toContain(ORIGIN);
  });

  it("prefixes CSS asset urls once", () => {
    const css = `@font-face{src:url(/_next/static/media/a.woff2)}url(${ORIGIN}/_next/static/media/b.woff2)`;
    const rewritten = rewriteLangfuseBody(css, "style", [ORIGIN]);
    expect(rewritten.match(/\/ai-monitoring\/view\/_next\//g)).toHaveLength(2);
  });
});

describe("rewriteLangfuseLocation", () => {
  it("keeps redirects under the view and drops other hosts", () => {
    expect(rewriteLangfuseLocation("/organization/abc", "/ai-monitoring/view", [ORIGIN])).toBe(
      "/ai-monitoring/view/organization/abc",
    );
    expect(rewriteLangfuseLocation(`${ORIGIN}/project/1`, "/ai-monitoring/view", [ORIGIN])).toBe(
      "/ai-monitoring/view/project/1",
    );
    expect(
      rewriteLangfuseLocation("/ai-monitoring/view/project/1", "/ai-monitoring/view", [ORIGIN]),
    ).toBe("/ai-monitoring/view/project/1");
    expect(rewriteLangfuseLocation("https://evil.example/phish")).toBe("/ai-monitoring/view/");
  });
});

describe("cloudHost", () => {
  it("recognises Langfuse Cloud only", () => {
    expect(cloudHost("https://cloud.langfuse.com")).toBe(true);
    expect(cloudHost("https://langfuse.com/project")).toBe(true);
    expect(cloudHost("http://127.0.0.1:3300")).toBe(false);
    expect(cloudHost("not a url")).toBe(false);
  });
});
