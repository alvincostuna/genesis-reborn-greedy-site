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

async function requirePermission(email: string, env: Env, permission: string): Promise<any> {
  return rpc(env, "genesis_admin_authorize", {
    p_actor: email,
    p_permission: permission
  });
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

  if (request.method === "POST") {
    if (path === "/admin/api/rbac/bootstrap") {
      let body: any = null;
      try { body = await request.json(); } catch {}
      const confirmation = String(body?.confirmation || "");
      const data = await rpc(env, "genesis_admin_bootstrap_owner", {
        p_actor: email,
        p_confirmation: confirmation
      });
      return json({ ok: true, data });
    }

    if (path === "/admin/api/rbac/principals") {
      await requirePermission(email, env, "ADMIN_ACCESS_MANAGE");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_principal_upsert", {
        p_actor: email,
        p_email: String(body?.email || ""),
        p_display_name: String(body?.display_name || ""),
        p_enabled: Boolean(body?.enabled),
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    if (path === "/admin/api/rbac/permissions") {
      await requirePermission(email, env, "ADMIN_ACCESS_MANAGE");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_permission_set", {
        p_actor: email,
        p_email: String(body?.email || ""),
        p_permission: String(body?.permission || ""),
        p_granted: Boolean(body?.granted),
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    const featureFlagMatch = path.match(/^\/admin\/api\/settings\/features\/(comments|fan-posting|share-rewards|pure-support)$/i);
    if (featureFlagMatch) {
      await requirePermission(email, env, "FEATURE_FLAGS");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const keyMap: Record<string,string> = {
        "comments":"COMMENTS",
        "fan-posting":"FAN_POSTING",
        "share-rewards":"SHARE_REWARDS",
        "pure-support":"PURE_SUPPORT"
      };
      const data = await rpc(env, "genesis_admin_set_feature_flag", {
        p_actor: email,
        p_flag_key: keyMap[featureFlagMatch[1].toLowerCase()],
        p_enabled: Boolean(body?.enabled),
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    if (path === "/admin/api/settings/payment-provider") {
      await requirePermission(email, env, "PAYMENTS_ENABLE");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_set_payment_provider", {
        p_actor: email,
        p_enabled: Boolean(body?.enabled),
        p_mode: String(body?.mode || ""),
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    if (path === "/admin/api/settings/payments") {
      await requirePermission(email, env, "PAYMENTS_ENABLE");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_set_payments_enabled", {
        p_actor: email,
        p_enabled: Boolean(body?.enabled),
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    if (path === "/admin/api/releases/verify-live-site") {
      await requirePermission(email, env, "RELEASE_LAUNCH");
      const base = "https://genesis-reborn-greedy.hirangnalupa.workers.dev/";
      const home = await fetch(base, { method: "GET", redirect: "manual" });
      const admin = await fetch(base + "admin/", { method: "GET", redirect: "manual" });
      const h = home.headers;
      const checks = {
        homepage_status: home.status,
        admin_status: admin.status,
        csp: Boolean(h.get("content-security-policy")),
        hsts: Boolean(h.get("strict-transport-security")),
        nosniff: String(h.get("x-content-type-options") || "").toLowerCase() === "nosniff",
        referrer: Boolean(h.get("referrer-policy")),
        admin_hidden: admin.status === 404
      };
      const data = await rpc(env, "genesis_admin_record_live_site_verification", {
        p_actor: email,
        p_url: base,
        p_homepage_status: checks.homepage_status,
        p_admin_status: checks.admin_status,
        p_csp: checks.csp,
        p_hsts: checks.hsts,
        p_nosniff: checks.nosniff,
        p_referrer: checks.referrer,
        p_admin_hidden: checks.admin_hidden,
        p_evidence: checks
      });
      return json({ ok: true, data: { ...data, checks } });
    }

    if (path === "/admin/api/releases/pause" || path === "/admin/api/releases/resume") {
      await requirePermission(email, env, "RELEASE_LAUNCH");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_set_release_pause", {
        p_actor: email,
        p_paused: path.endsWith("/pause"),
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    if (path === "/admin/api/releases/authorize-launch") {
      await requirePermission(email, env, "RELEASE_LAUNCH");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_authorize_launch", {
        p_actor: email,
        p_launch_at: String(body?.launch_at || ""),
        p_confirmation: String(body?.confirmation || ""),
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    const releaseActionMatch = path.match(/^\/admin\/api\/releases\/([0-9a-f-]+)\/(ready|hide|schedule|next-cycle|withdraw|release-now)$/i);
    if (releaseActionMatch) {
      const releaseId = releaseActionMatch[1];
      const action = releaseActionMatch[2].toLowerCase();
      let body: any = null;
      try { body = await request.json(); } catch {}

      if (action === "ready") {
        await requirePermission(email, env, "RELEASE_MANAGE");
        const data = await rpc(env, "genesis_admin_release_mark_ready", {
          p_actor: email, p_release_item_id: releaseId, p_reason: String(body?.reason || "")
        });
        return json({ ok: true, data });
      }
      if (action === "hide") {
        await requirePermission(email, env, "RELEASE_MANAGE");
        const data = await rpc(env, "genesis_admin_release_keep_hidden", {
          p_actor: email, p_release_item_id: releaseId, p_reason: String(body?.reason || "")
        });
        return json({ ok: true, data });
      }
      if (action === "schedule") {
        await requirePermission(email, env, "RELEASE_MANAGE");
        const data = await rpc(env, "genesis_admin_release_schedule_exact", {
          p_actor: email, p_release_item_id: releaseId,
          p_publish_at: String(body?.publish_at || ""), p_reason: String(body?.reason || "")
        });
        return json({ ok: true, data });
      }
      if (action === "next-cycle") {
        await requirePermission(email, env, "RELEASE_MANAGE");
        const data = await rpc(env, "genesis_admin_release_next_cycle", {
          p_actor: email, p_release_item_id: releaseId,
          p_after: body?.after ? String(body.after) : null, p_reason: String(body?.reason || "")
        });
        return json({ ok: true, data });
      }
      if (action === "withdraw") {
        const data = await rpc(env, "genesis_admin_release_withdraw", {
          p_actor: email, p_release_item_id: releaseId, p_reason: String(body?.reason || "")
        });
        return json({ ok: true, data });
      }
      if (action === "release-now") {
        await requirePermission(email, env, "RELEASE_LAUNCH");
        const data = await rpc(env, "genesis_admin_release_now", {
          p_actor: email, p_release_item_id: releaseId,
          p_confirmation: String(body?.confirmation || ""), p_reason: String(body?.reason || "")
        });
        return json({ ok: true, data });
      }
    }

    if (path === "/admin/api/production/hold") {
      await requirePermission(email, env, "PRODUCTION_CONTROL");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_production_hold", {
        p_actor: email,
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    if (path === "/admin/api/production/resume") {
      await requirePermission(email, env, "PRODUCTION_CONTROL");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_production_resume", {
        p_actor: email,
        p_hold_id: String(body?.hold_id || ""),
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    if (path === "/admin/api/production/emergency-stop") {
      await requirePermission(email, env, "PRODUCTION_AUTHORIZE");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_emergency_stop", {
        p_actor: email,
        p_confirmation: String(body?.confirmation || ""),
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    const packetInvalidateMatch = path.match(/^\/admin\/api\/production\/packets\/([0-9a-f-]+)\/invalidate$/i);
    if (packetInvalidateMatch) {
      await requirePermission(email, env, "PRODUCTION_CONTROL");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_runtime_packet_invalidate", {
        p_actor: email,
        p_packet_id: packetInvalidateMatch[1],
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    if (path === "/admin/api/roadmap/cutover-snapshot") {
      await requirePermission(email, env, "ROADMAP_ACTIVATE");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_create_pre_cutover_snapshot", {
        p_actor: email,
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    if (path === "/admin/api/roadmap/activate-v2") {
      await requirePermission(email, env, "ROADMAP_ACTIVATE");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const data = await rpc(env, "genesis_admin_activate_v2_cutover", {
        p_actor: email,
        p_snapshot_id: String(body?.snapshot_id || ""),
        p_snapshot_hash: String(body?.snapshot_hash || ""),
        p_confirmation: String(body?.confirmation || ""),
        p_reason: String(body?.reason || "")
      });
      return json({ ok: true, data });
    }

    const replyMatch = path.match(/^\/admin\/api\/messages\/([0-9a-f-]+)\/reply$/i);
    if (replyMatch) {
      await requirePermission(email, env, "MESSAGES_REPLY");
      let body: any = null;
      try { body = await request.json(); } catch {}
      const message = String(body?.body || "").trim();
      if (!message || message.length > 5000) {
        throw new HttpError(400, "INVALID_MESSAGE", "Reply must be between 1 and 5000 characters.");
      }
      const data = await rpc(env, "genesis_admin_reply_support", {
        p_conversation_id: replyMatch[1],
        p_actor: email,
        p_body: message
      });
      return json({ ok: true, data });
    }

    throw new HttpError(
      405,
      "READ_ONLY_PHASE",
      "Only Contact Us message replies are enabled. Release and production mutations remain disabled."
    );
  }

  if (request.method !== "GET") {
    throw new HttpError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }

  if (path === "/admin/api/rbac") {
    const data = await rpc(env, "genesis_admin_rbac_status", { p_actor: email });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/rbac/principals") {
    await requirePermission(email, env, "ADMIN_ACCESS_VIEW");
    const data = await rpc(env, "genesis_admin_principal_index", { p_actor: email });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/rbac/audit") {
    await requirePermission(email, env, "ADMIN_ACCESS_VIEW");
    const data = await rpc(env, "genesis_admin_audit_index", {
      p_actor: email,
      p_limit: intParam(url.searchParams.get("limit"), 100, 1, 200),
      p_offset: intParam(url.searchParams.get("offset"), 0, 0, 100000)
    });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/production/control") {
    await requirePermission(email, env, "DASHBOARD_VIEW");
    const data = await rpc(env, "genesis_admin_production_control_status", { p_actor: email });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/production") {
    await requirePermission(email, env, "DASHBOARD_VIEW");
    const data = await rpc(env, "genesis_admin_dashboard", { p_limit: 100 });
    return json({ ok: true, actor: email, data });
  }

  if (path === "/admin/api/manuscripts") {
    await requirePermission(email, env, "MANUSCRIPTS_VIEW");
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

  if (path === "/admin/api/settings/features") {
    await requirePermission(email, env, "SUPPORT_VIEW");
    const data = await rpc(env, "genesis_admin_feature_flags_status", { p_actor: email });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/releases/launch-preview") {
    await requirePermission(email, env, "RELEASE_VIEW");
    const data = await rpc(env, "genesis_admin_release_launch_preview", { p_actor: email });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/releases") {
    await requirePermission(email, env, "RELEASE_VIEW");
    const data = await rpc(env, "genesis_admin_release_queue", {
      p_release_status: url.searchParams.get("status") || null,
      p_limit: intParam(url.searchParams.get("limit"), 100, 1, 200),
      p_offset: intParam(url.searchParams.get("offset"), 0, 0, 100000)
    });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/release-policy") {
    await requirePermission(email, env, "RELEASE_VIEW");
    const [policy, clock] = await Promise.all([
      rpc(env, "api_release_policy"),
      rpc(env, "api_release_clock")
    ]);
    return json({ ok: true, data: {
      policy: Array.isArray(policy) ? policy[0] : policy,
      clock: Array.isArray(clock) ? clock[0] : clock
    }});
  }

  if (path === "/admin/api/roadmap/cutover-preview") {
    await requirePermission(email, env, "ROADMAP_VIEW");
    const data = await rpc(env, "genesis_admin_v2_cutover_preview", { p_actor: email });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/roadmap/cutover-status") {
    await requirePermission(email, env, "ROADMAP_VIEW");
    const data = await rpc(env, "genesis_admin_cutover_status", { p_actor: email });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/roadmap") {
    await requirePermission(email, env, "ROADMAP_VIEW");
    const data = await rpc(env, "genesis_admin_roadmap_summary");
    return json({ ok: true, data });
  }

  if (path === "/admin/api/continuity") {
    await requirePermission(email, env, "CONTINUITY_VIEW");
    const data = await rpc(env, "genesis_admin_continuity_summary");
    return json({ ok: true, data });
  }

  if (path === "/admin/api/authority") {
    await requirePermission(email, env, "AUTHORITY_VIEW");
    const data = await rpc(env, "genesis_admin_authority_index");
    return json({ ok: true, data });
  }

  if (path === "/admin/api/database/summary") {
    await requirePermission(email, env, "DATABASE_VIEW");
    const data = await rpc(env, "genesis_admin_game_database_summary");
    return json({ ok: true, data });
  }

  if (path === "/admin/api/database") {
    await requirePermission(email, env, "DATABASE_VIEW");
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

  if (path === "/admin/api/support/summary") {
    await requirePermission(email, env, "SUPPORT_VIEW");
    const data = await rpc(env, "genesis_admin_support_summary");
    return json({ ok: true, data });
  }

  if (path === "/admin/api/messages") {
    await requirePermission(email, env, "MESSAGES_VIEW");
    const data = await rpc(env, "genesis_admin_message_inbox", {
      p_limit: intParam(url.searchParams.get("limit"), 100, 1, 200),
      p_offset: intParam(url.searchParams.get("offset"), 0, 0, 100000)
    });
    return json({ ok: true, data });
  }

  if (path === "/admin/api/community") {
    await requirePermission(email, env, "COMMUNITY_VIEW");
    const data = await rpc(env, "genesis_admin_community_queue", {
      p_limit: intParam(url.searchParams.get("limit"), 100, 1, 200),
      p_offset: intParam(url.searchParams.get("offset"), 0, 0, 100000)
    });
    return json({ ok: true, data });
  }

  let match = path.match(/^\/admin\/api\/manuscripts\/([0-9a-f-]+)\/versions\/([a-z0-9_]+)$/i);
  if (match) {
    await requirePermission(email, env, "MANUSCRIPTS_VIEW");
    const data = await rpc(env, "genesis_admin_manuscript_version", {
      p_part_id: match[1],
      p_stage: stageName(match[2])
    });
    return json({ ok: true, data });
  }

  match = path.match(/^\/admin\/api\/manuscripts\/([0-9a-f-]+)\/compare$/i);
  if (match) {
    await requirePermission(email, env, "MANUSCRIPTS_VIEW");
    const data = await rpc(env, "genesis_admin_manuscript_compare", {
      p_part_id: match[1],
      p_from_stage: stageName(url.searchParams.get("from") || ""),
      p_to_stage: stageName(url.searchParams.get("to") || "")
    });
    return json({ ok: true, data });
  }

  match = path.match(/^\/admin\/api\/manuscripts\/([0-9a-f-]+)\/preview$/i);
  if (match) {
    await requirePermission(email, env, "MANUSCRIPTS_VIEW");
    const data = await rpc(env, "genesis_admin_manuscript_version", {
      p_part_id: match[1],
      p_stage: stageName(url.searchParams.get("stage") || "stage2")
    });
    return json({ ok: true, data });
  }

  match = path.match(/^\/admin\/api\/manuscripts\/([0-9a-f-]+)$/i);
  if (match) {
    await requirePermission(email, env, "MANUSCRIPTS_VIEW");
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
  } else {
    const pageMatch = url.pathname.match(/^\/site-preview\/(read|world|codex|fan-page|manga|support|account)\/?$/);
    if (pageMatch) {
      url.pathname = "/site-preview/" + pageMatch[1] + "/index.html";
    }
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
