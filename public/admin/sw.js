self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  // Admin content is intentionally network-only. Never persist manuscript/API/auth responses.
  if(url.origin===self.location.origin && url.pathname.startsWith("/admin/")){
    event.respondWith(fetch(req).catch(()=>new Response(
      "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>GENESIS Admin</title><body style='margin:0;background:#07101b;color:#f4f7fb;font-family:system-ui;padding:24px'><h1>GENESIS Admin</h1><p>An internet connection and valid Admin session are required.</p></body>",
      {status:503,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}}
    )));
  }
});