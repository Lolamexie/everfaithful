/* Ever Faithful offline support. Bump VERSION whenever the app files change. */
const VERSION="ef-2026-11-12-2";
const CORE=[
  "./","./index.html","./privacy.html","./manifest.webmanifest",
  "./icons/icon.svg","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/apple-touch-icon.png","./icons/favicon-32.png",
  "./fonts/bricolage-grotesque-latin-500-normal.woff2",
  "./fonts/bricolage-grotesque-latin-700-normal.woff2",
  "./fonts/bricolage-grotesque-latin-800-normal.woff2",
  "./fonts/bricolage-grotesque-latin-ext-500-normal.woff2",
  "./fonts/bricolage-grotesque-latin-ext-700-normal.woff2",
  "./fonts/bricolage-grotesque-latin-ext-800-normal.woff2",
  "./fonts/bricolage-grotesque-vietnamese-500-normal.woff2",
  "./fonts/bricolage-grotesque-vietnamese-700-normal.woff2",
  "./fonts/bricolage-grotesque-vietnamese-800-normal.woff2",
  "./fonts/figtree-latin-400-normal.woff2",
  "./fonts/source-serif-4-latin-500-normal.woff2",
  "./fonts/source-serif-4-latin-ext-500-normal.woff2",
  "./fonts/source-serif-4-vietnamese-500-normal.woff2",
  "./fonts/eb-garamond-latin-400-normal.woff2",
  "./fonts/eb-garamond-latin-ext-400-normal.woff2",
  "./fonts/eb-garamond-latin-400-italic.woff2",
  "./fonts/eb-garamond-latin-ext-400-italic.woff2",
  "./fonts/eb-garamond-latin-500-normal.woff2",
  "./fonts/eb-garamond-latin-ext-500-normal.woff2",
  "./fonts/eb-garamond-latin-600-normal.woff2",
  "./fonts/eb-garamond-latin-ext-600-normal.woff2",
  "./fonts/figtree-latin-500-normal.woff2",
  "./fonts/figtree-latin-600-normal.woff2",
  "./fonts/figtree-latin-700-normal.woff2",
  "./fonts/figtree-latin-ext-400-normal.woff2",
  "./fonts/figtree-latin-ext-500-normal.woff2",
  "./fonts/figtree-latin-ext-600-normal.woff2",
  "./fonts/figtree-latin-ext-700-normal.woff2",
];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const req=e.request;
  /* Android: "Share to Ever Faithful" from WhatsApp or Files sends the backup here */
  if(req.method==="POST"&&new URL(req.url).pathname.endsWith("/share-backup")){
    e.respondWith((async()=>{
      try{const f=(await req.formData()).get("backup"); if(f&&f.text){const c=await caches.open("ef-share");await c.put("./__shared-backup",new Response(await f.text(),{headers:{"Content-Type":"text/plain"}}));}}catch(_){}
      return Response.redirect("./?restore=shared",303);
    })());
    return;
  }
  if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  if(req.mode==="navigate"){
    /* pages: try the network first so updates arrive, fall back to the saved copy when offline */
    e.respondWith(fetch(req).then(res=>{const copy=res.clone();if(res.ok&&!url.search)caches.open(VERSION).then(c=>c.put(req,copy));return res;})
      .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match("./index.html"))));
    return;
  }
  /* everything else: saved copy first, then the network */
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(res=>{const copy=res.clone();if(res.ok)caches.open(VERSION).then(c=>c.put(req,copy));return res;})));
});

/* reminder notifications */
self.addEventListener("push",e=>{
  let d={}; try{d=e.data?e.data.json():{};}catch(_){d={body:e.data?e.data.text():""};}
  e.waitUntil(self.registration.showNotification(d.title||"Ever Faithful",{body:d.body||"What are you thankful for today?",icon:"./icons/icon-192.png",badge:"./icons/badge-96.png",data:{url:d.url||"./"}}));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const url=new URL((e.notification.data&&e.notification.data.url)||"./",self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list){ if(c.url.startsWith(self.registration.scope)&&"focus" in c){ if("navigate" in c) c.navigate(url).catch(()=>{}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
