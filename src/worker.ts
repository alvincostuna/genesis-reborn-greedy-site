import { createRemoteJWKSet, jwtVerify } from "jose";

interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
  ADMIN_EMAILS: string;
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function normalizeDomain(value: string): string {
  return String(value || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function requireAdmin(request: Request, env: Env): Promise<string> {
  const domain = normalizeDomain(env.CF_ACCESS_TEAM_DOMAIN);
  const audience = env.CF_ACCESS_AUD || "";
  const allowed = new Set(
    String(env.ADMIN_EMAILS || "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );

  if (!domain || !audience || allowed.size === 0) {
    throw new HttpError(503, "ADMIN_AUTH_NOT_CONFIGURED", "Admin authentication is not configured.");
  }

  const token = request.headers.get("CF-Access-Jwt-Assertion");
  if (!token) {
    throw new HttpError(401, "ADMIN_UNAUTHENTICATED", "Cloudflare Access authentication required.");
  }

  let jwks = jwksCache.get(domain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL("https://" + domain + "/cdn-cgi/access/certs"));
    jwksCache.set(domain, jwks);
  }

  try {
    const result = await jwtVerify(token, jwks, {
      issuer: "https://" + domain,
      audience
    });
    const email = String(result.payload.email || "").trim().toLowerCase();
    if (!email || !allowed.has(email)) {
      throw new HttpError(403, "ADMIN_FORBIDDEN", "Admin access denied.");
    }
    return email;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "ADMIN_UNAUTHENTICATED", "Invalid or expired Admin session.");
  }
}

async function rpc(env: Env, fn: string, params: Record<string, unknown> = {}): Promise<any> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(503, "SUPABASE_NOT_CONFIGURED", "Supabase server credentials are not configured.");
  }

  const response = await fetch(env.SUPABASE_URL + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: {
      "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(params)
  });

  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch {}

  if (!response.ok) {
    throw new HttpError(
      response.status,
      payload?.code || "SUPABASE_RPC_ERROR",
      payload?.message || "Supabase RPC failed."
    );
  }
  return payload;
}

function intParam(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function stageName(value: string): string {
  const map: Record<string,string> = {
    "stage1": "STAGE1",
    "stage2": "STAGE2",
    "final": "FINAL_CANON",
    "final_canon": "FINAL_CANON"
  };
  const stage = map[String(value || "").toLowerCase()];
  if (!stage) throw new HttpError(400, "INVALID_STAGE", "Invalid manuscript stage.");
  return stage;
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const email = await requireAdmin(request, env);
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method !== "GET") {
    throw new HttpError(
      405,
      "READ_ONLY_PHASE",
      "Release mutations are intentionally disabled during the PRE-LAUNCH read-only Control Center build."
    );
  }

  if (path === "/admin/api/production") {
    const data = await rpc(env, "genesis_admin_dashboard", { p_limit: 100 });
    return json({ ok: true, actor: email, data });
  }

  if (path === "/admin/api/manuscripts") {
    const data = await rpc(env, "genesis_admin_manuscript_index", {
      p_saga_number: url.searchParams.get("saga")
        ? intParam(url.searchParams.get("saga"), 1, 1, 99)
        : null,
      p_episode_number: url.searchParams.get("episode")
        ? intParam(url.searchParams.get("episode"), 1, 1, 9999)
        : null,
      p_dashboard_state: url.searchParams.get("state") || null,
      p_query: url.searchParams.get("q") || null,
      p_limit: intParam(url.searchParams.get("limit"), 100, 1, 200),
      p_offset: intParam(url.searchParams.get("offset"), 0, 0, 100000)
    });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/releases") {
    const data = await rpc(env, "genesis_admin_release_queue", {
      p_release_status: url.searchParams.get("status") || null,
      p_limit: intParam(url.searchParams.get("limit"), 100, 1, 200),
      p_offset: intParam(url.searchParams.get("offset"), 0, 0, 100000)
    });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/database/summary") {
    const data = await rpc(env, "genesis_admin_game_database_summary");
    return json({ ok: true, data });
  }

  if (path === "/admin/api/database") {
    const domain = String(url.searchParams.get("domain") || "").trim().toLowerCase();
    const allowed = new Set(["monsters","classes","professions","skills","loot","maps","items","npcs","quests","crafting","companions"]);
    if (!allowed.has(domain)) {
      throw new HttpError(400, "INVALID_DATABASE_DOMAIN", "Invalid game database domain.");
    }
    const data = await rpc(env, "genesis_admin_game_database_list", {
      p_domain: domain,
      p_query: url.searchParams.get("q") || null,
      p_limit: intParam(url.searchParams.get("limit"), 50, 1, 200),
      p_offset: intParam(url.searchParams.get("offset"), 0, 0, 100000)
    });
    return json({ ok: true, data });
  }

  let match = path.match(/^\/admin\/api\/manuscripts\/([0-9a-f-]+)\/versions\/([a-z0-9_]+)$/i);
  if (match) {
    const data = await rpc(env, "genesis_admin_manuscript_version", {
      p_part_id: match[1],
      p_stage: stageName(match[2])
    });
    return json({ ok: true, data });
  }

  match = path.match(/^\/admin\/api\/manuscripts\/([0-9a-f-]+)\/compare$/i);
  if (match) {
    const data = await rpc(env, "genesis_admin_manuscript_compare", {
      p_part_id: match[1],
      p_from_stage: stageName(url.searchParams.get("from") || ""),
      p_to_stage: stageName(url.searchParams.get("to") || "")
    });
    return json({ ok: true, data });
  }

  match = path.match(/^\/admin\/api\/manuscripts\/([0-9a-f-]+)\/preview$/i);
  if (match) {
    const data = await rpc(env, "genesis_admin_manuscript_version", {
      p_part_id: match[1],
      p_stage: stageName(url.searchParams.get("stage") || "stage2")
    });
    return json({ ok: true, data });
  }

  match = path.match(/^\/admin\/api\/manuscripts\/([0-9a-f-]+)$/i);
  if (match) {
    const data = await rpc(env, "genesis_admin_manuscript_detail", {
      p_part_id: match[1]
    });
    return json({ ok: true, data });
  }

  throw new HttpError(404, "ADMIN_ROUTE_NOT_FOUND", "Admin API route not found.");
}

async function handleSitePreviewAsset(request: Request, env: Env): Promise<Response> {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  if (url.pathname === "/site-preview" || url.pathname === "/site-preview/") {
    url.pathname = "/site-preview/index.html";
  }

  const response = await env.ASSETS.fetch(new Request(url.toString(), request));
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, private");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function handleAdminAsset(request: Request, env: Env): Promise<Response> {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  if (url.pathname === "/admin" || url.pathname === "/admin/") {
    url.pathname = "/admin/index.html";
  }

  const response = await env.ASSETS.fetch(new Request(url.toString(), request));
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, private");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function fail(error: unknown): Response {
  const e = error as { status?: number; code?: string; message?: string };
  return json({
    ok: false,
    error: {
      code: e.code || "INTERNAL_ADMIN_ERROR",
      message: e.message || "Admin request failed."
    }
  }, e.status || 500);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/site-preview" || url.pathname.startsWith("/site-preview/")) {
        return await handleSitePreviewAsset(request, env);
      }

      if (url.pathname.startsWith("/admin/api/")) {
        return await handleApi(request, env);
      }

      if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
        return await handleAdminAsset(request, env);
      }

      // Safety: this feature branch does not replace the current public reader.
      return new Response("GENESIS Control Center preview branch — live public site is not mounted here.", {
        status: 404,
        headers: { "Cache-Control": "no-store" }
      });
    } catch (error) {
      return fail(error);
    }
  }
};
