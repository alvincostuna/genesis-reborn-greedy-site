interface Env {
  ASSETS: Fetcher;
}

const PAGE_ROUTES: Record<string,string> = {
  "/": "/index.html",
  "/read": "/read/index.html",
  "/read/": "/read/index.html",
  "/world": "/world/index.html",
  "/world/": "/world/index.html",
  "/codex": "/codex/index.html",
  "/codex/": "/codex/index.html",
  "/fan-page": "/fan-page/index.html",
  "/fan-page/": "/fan-page/index.html",
  "/manga": "/manga/index.html",
  "/manga/": "/manga/index.html",
  "/support": "/support/index.html",
  "/support/": "/support/index.html",
  "/account": "/account/index.html",
  "/account/": "/account/index.html"
};

function securityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options","nosniff");
  headers.set("Referrer-Policy","strict-origin-when-cross-origin");
  headers.set("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  headers.set("X-Frame-Options","SAMEORIGIN");
  headers.set("Cross-Origin-Opener-Policy","same-origin");
  headers.set("Cross-Origin-Resource-Policy","same-origin");
  headers.set("Strict-Transport-Security","max-age=31536000; includeSubDomains");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; " +
    "img-src 'self' data: https:; style-src 'self'; script-src 'self'; " +
    "connect-src 'self' https://lyhrwymhzhhxszquxnke.supabase.co; form-action 'self'; upgrade-insecure-requests"
  );
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return securityHeaders(new Response("Method Not Allowed",{status:405,headers:{Allow:"GET, HEAD"}}));
    }

    const url = new URL(request.url);

    // The live public Worker never serves the private Control Center.
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      return securityHeaders(new Response("Not Found",{status:404}));
    }

    const mapped = PAGE_ROUTES[url.pathname] || url.pathname;
    const assetUrl = new URL(request.url);
    assetUrl.pathname = mapped;

    const response = await env.ASSETS.fetch(new Request(assetUrl,request));
    return securityHeaders(response);
  }
};
