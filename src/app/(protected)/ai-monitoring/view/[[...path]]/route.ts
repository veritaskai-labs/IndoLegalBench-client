import type { NextRequest } from "next/server";

import {
  handleLangfuseView,
  langfuseViewState,
  readLangfuseViewSettings,
  sendToLangfuse,
} from "@/lib/langfuseViewProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path?: string[] }> };

async function handle(request: NextRequest, context: Context): Promise<Response> {
  const settings = readLangfuseViewSettings(process.env);
  if ("error" in settings) {
    return new Response("Langfuse Cloud tidak dihubungi.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  const { path } = await context.params;
  return handleLangfuseView(request, path, {
    settings,
    state: langfuseViewState,
    send: sendToLangfuse,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
