const CACHE='pensefit-static-2.1.1';
const FILES=['./','index.html','platform.css','leaflet.css','run.css','assets/run-hero.webp','auth.css','platform.js','app.js','auth.js','config.js','vendor/supabase.js','manifest.webmanifest','assets/recipe-rice.webp','assets/recipe-oats.webp','assets/recipe-almonds.webp','assets/recipe-trout.webp','assets/icon-192.png','assets/icon-512.png','assets/inter-latin-400-normal.woff2','assets/inter-latin-600-normal.woff2','assets/inter-latin-800-normal.woff2','assets/workout-monday.webp','assets/workout-tuesday.webp','assets/workout-wednesday.webp','assets/workout-thursday.webp','assets/workout-friday.webp'];
const ALLOWED=new Set(FILES.map(file=>new URL(file,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([...ALLOWED])).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('pensefit-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request;
 // Apenas recursos estáticos explicitamente listados. Sem Auth, REST, documentos, fotos privadas ou dados pessoais.
 if(request.method!=='GET'||request.headers.has('Authorization')||!ALLOWED.has(request.url))return;
 event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)))}return response}).catch(()=>caches.match(request).then(cached=>cached||Response.error())));
});
