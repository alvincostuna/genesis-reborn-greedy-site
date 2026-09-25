const CACHE="genesis-reader-shell-v1";
const SHELL=[
  "/site-preview/",
  "/site-preview/read/",
  "/site-preview/site.css",
  "/site-preview/site.js",
  "/assets/genesis-official-logo-64.png",
  "/assets/genesis-official-logo.png"
];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("genesis-reader-shell-")&&k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(!url.pathname.startsWith("/site-preview/")&&!url.pathname.startsWith("/assets/"))return;
  event.respondWith((async()=>{
    try{
      const fresh=await fetch(req);
      if(fresh.ok && (url.pathname.startsWith("/site-preview/")||url.pathname.startsWith("/assets/"))){
        const cache=await caches.open(CACHE);
        cache.put(req,fresh.clone()).catch(()=>{});
      }
      return fresh;
    }catch{
      const cached=await caches.match(req);
      if(cached)return cached;
      if(req.mode==="navigate")return (await caches.match("/site-preview/"))||Response.error();
      return Response.error();
    }
  })());
});