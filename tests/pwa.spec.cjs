const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'allow'});
test('PWA guarda somente arquivos públicos e abre a tela sem conexão',async({page,context})=>{
  await page.goto('/');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await expect.poll(()=>page.evaluate(async()=>{const cache=await caches.open('pensefit-static-2.1.1');return(await cache.keys()).length})).toBeGreaterThan(20);
  const urls=await page.evaluate(async()=>{const cache=await caches.open('pensefit-static-2.1.1');return(await cache.keys()).map(r=>r.url)});
  expect(urls.every(url=>new URL(url).origin==='http://localhost:3000')).toBe(true);
  expect(urls.some(url=>/\/auth\/|\/rest\/|\/storage\/|documents|photos|\.pdf/.test(url))).toBe(false);
  await context.setOffline(true);await page.reload();await expect(page.locator('#authScreen')).toBeVisible();
});
