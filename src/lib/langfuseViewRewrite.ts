/** Rewrite Langfuse so its UI stays under /ai-monitoring/view on this origin. */

export const LANGFUSE_VIEW_PREFIX = "/ai-monitoring/view";

export type LangfuseRewriteKind = "html" | "script" | "style" | "json";

const BASE_HAS = 'pathHasPrefix)(e,"")';
const BASE_ADD = 'addPathPrefix)(e,"")';
const BASE_REMOVE =
  'function a(e){return e}Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"removeBasePath"';

export function cloudHost(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/\.$/, "");
    return host === "langfuse.com" || host.endsWith(".langfuse.com");
  } catch {
    return false;
  }
}

export function rewriteLangfuseLocation(
  value: string,
  prefix = LANGFUSE_VIEW_PREFIX,
  origins: readonly string[] = [],
): string {
  let next = value.trim();
  for (const origin of origins) {
    const trimmed = origin.replace(/\/$/, "");
    if (!trimmed) continue;
    if (next === trimmed || next.startsWith(`${trimmed}/`) || next.startsWith(`${trimmed}?`)) {
      next = next.slice(trimmed.length) || "/";
      break;
    }
  }
  if (next === prefix || next.startsWith(`${prefix}/`) || next.startsWith(`${prefix}?`)) {
    return next;
  }
  if (next.startsWith("/")) return `${prefix}${next}`;
  if (next.startsWith("?")) return `${prefix}/${next}`;
  return `${prefix}/`;
}

export function rewriteLangfuseBody(
  body: string,
  kind: LangfuseRewriteKind,
  origins: readonly string[],
  prefix = LANGFUSE_VIEW_PREFIX,
): string {
  if (kind === "json") return replaceOrigins(body, origins, prefix);
  let next = kind === "style" ? replaceOrigins(body, origins, prefix) : rewriteScript(body, origins, prefix);
  if (kind === "html" || kind === "style") {
    next = prefixRootPaths(next, prefix);
    if (kind === "html") {
      next = next.replace(
        /(^|[^A-Za-z0-9_])\/(icon\.svg|icon256\.png|apple-touch-icon\.png)/g,
        `$1${prefix}/$2`,
      );
      next = injectAssetPrefix(next, prefix);
      next = injectChunkBase(next, prefix);
    }
  }
  return next;
}

function rewriteScript(body: string, origins: readonly string[], prefix: string): string {
  const embedded = JSON.stringify(prefix);
  let next = replaceOrigins(body, origins, prefix);
  if (process.env.LANGFUSE_VIEW_PATCH_BASE !== "0") {
    next = next.replaceAll(BASE_HAS, `pathHasPrefix)(e,${embedded})`);
    next = next.replaceAll(BASE_ADD, `addPathPrefix)(e,${embedded})`);
    const remove =
      `function a(e){var p=${embedded};if(e===p)return"/";if(e.startsWith(p+"/"))return e.slice(p.length)||"/";if(e.startsWith(p+"?"))return"/"+e.slice(p.length);return e}` +
      'Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"removeBasePath"';
    next = next.replaceAll(BASE_REMOVE, remove);
    next = next.replaceAll('this.basePath=""', `this.basePath=${embedded}`);
  }
  next = next.replace(/(["'`])\/api\//g, `$1${prefix}/api/`);
  next = next.replace(/\}\/api\//g, `}${prefix}/api/`);
  return next;
}

function replaceOrigins(body: string, origins: readonly string[], prefix: string): string {
  let next = body;
  for (const origin of origins) {
    const trimmed = origin.replace(/\/$/, "");
    if (trimmed) next = next.split(trimmed).join(prefix);
  }
  return next;
}

/** Prefix root-absolute /_next/ once. A path that already sits under the view is left as it is. */
function prefixRootPaths(body: string, prefix: string): string {
  return body.replace(/(^|[^A-Za-z0-9_])\/_next\//g, `$1${prefix}/_next/`);
}

/** Turbopack otherwise requests /_next/ on this origin, which is the bench app. */
function injectChunkBase(html: string, prefix: string): string {
  const tag = `<script>globalThis.TURBOPACK_CHUNK_BASE_PATH=${JSON.stringify(`${prefix}/_next/`)}</script>`;
  const head = html.match(/<head\b[^>]*>/i);
  if (!head || head.index === undefined) return tag + html;
  const end = head.index + head[0].length;
  return html.slice(0, end) + tag + html.slice(end);
}

function injectAssetPrefix(html: string, prefix: string): string {
  const marker = '<script id="__NEXT_DATA__"';
  const start = html.indexOf(marker);
  if (start < 0) return html;
  const open = html.indexOf(">", start);
  const close = html.indexOf("</script>", open);
  if (open < 0 || close < 0) return html;
  try {
    const data = JSON.parse(html.slice(open + 1, close)) as { assetPrefix?: string };
    data.assetPrefix = prefix;
    return `${html.slice(0, open + 1)}${JSON.stringify(data)}${html.slice(close)}`;
  } catch {
    return html;
  }
}

export function langfuseRewriteKind(contentType: string | null): LangfuseRewriteKind | null {
  const type = (contentType ?? "").toLowerCase();
  if (type.includes("text/html")) return "html";
  if (type.includes("javascript") || type.includes("ecmascript")) return "script";
  if (type.includes("text/css")) return "style";
  if (type.includes("json") || type.includes("text/plain")) return "json";
  return null;
}
