const {test,expect}=require('@playwright/test');
const {backend}=require('./backend.cjs');
test.use({serviceWorkers:'allow'});
test('PWA guarda somente arquivos públicos e abre a tela sem conexão',async({page,context})=>{
  await page.goto('/');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await expect.poll(()=>page.evaluate(async()=>{const cache=await caches.open('pensefit-static-2.2.0');return(await cache.keys()).length})).toBeGreaterThan(20);
  const urls=await page.evaluate(async()=>{const cache=await caches.open('pensefit-static-2.2.0');return(await cache.keys()).map(r=>r.url)});
  expect(urls.every(url=>new URL(url).origin==='http://localhost:3000')).toBe(true);
  expect(urls.some(url=>/\/auth\/|\/rest\/|\/storage\/|documents|photos|\.pdf/.test(url))).toBe(false);
  await context.setOffline(true);await page.reload();await expect(page.locator('#authScreen')).toBeVisible();
});

test('demonstração consultada continua disponível offline sem guardar dados da conta no cache público',async({page,context})=>{
 await backend(page,{signedIn:true});await page.goto('/');await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await expect.poll(()=>page.evaluate(()=>window.PensePlatform?.store.loading)).toBe(false);await page.evaluate(()=>window.PenseFit.navigate('library'));await page.locator('#libraryHost .exercise-preview').first().click();await expect.poll(()=>page.locator('#platformDialog .exercise-frames img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
 await expect.poll(()=>page.evaluate(async()=>{const cache=await caches.open('pensefit-static-2.2.0');return(await cache.keys()).some(r=>r.url.endsWith('Barbell_Bench_Press_-_Medium_Grip-1.jpg'))})).toBe(true);
 await context.setOffline(true);const loaded=await page.evaluate(async()=>{const url=document.querySelector('#platformDialog .exercise-frames img').src;const result=await fetch(url);return result.ok&&(await result.blob()).size>100});expect(loaded).toBe(true);
 const urls=await page.evaluate(async()=>{const cache=await caches.open('pensefit-static-2.2.0');return(await cache.keys()).map(r=>r.url)});expect(urls.some(url=>/\/auth\/|\/rest\/|\/storage\/|documents|photos|\.pdf/.test(url))).toBe(false);
});
