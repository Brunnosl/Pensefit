const {test,expect}=require('@playwright/test');
const {backend}=require('./backend.cjs');

test('importação valida o arquivo inteiro antes de gravar e não inventa métricas ausentes',async({page})=>{
 const server=await backend(page,{signedIn:true});await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>window.PensePlatform?.store.loading)).toBe(false);
 await page.evaluate(()=>window.PenseFit.navigate('integrations'));
 await page.locator('[data-action="integration-import"]').click();
 const valid={externalId:'first',name:'Atividade',date:'2026-10-19',distanceMeters:1000,durationSeconds:600};
 for(const invalid of [{...valid,externalId:'missing',distanceMeters:undefined},{...valid,date:'2026-02-31'}]){
  await page.locator('#pf-activities-file').setInputFiles({name:'activities.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([valid,invalid]))});
  await page.locator('#platformDialog [type="submit"]').click();
  await expect(page.locator('.dialog-error')).toBeVisible();expect(server.entities.integrations||[]).toHaveLength(0);
 }
});

test('GPX rejeita coordenadas ausentes e horários ausentes, aceita atividade completa',async({page})=>{
 const server=await backend(page,{signedIn:true});await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>window.PensePlatform?.store.loading)).toBe(false);
 await page.evaluate(()=>window.PenseFit.navigate('integrations'));await page.locator('[data-action="integration-import"]').click();
 for(const content of ['<gpx><trk><trkseg><trkpt lon="-46.63"/></trkseg></trk></gpx>','<gpx><trk><trkseg><trkpt lat="-23.55" lon="-46.63"/><trkpt lat="-23.5505" lon="-46.63"/></trkseg></trk></gpx>']){
  await page.locator('#pf-activities-file').setInputFiles({name:'activity.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(content)});
  await page.locator('#platformDialog [type="submit"]').click();await expect(page.locator('.dialog-error')).toBeVisible();expect(server.entities.integrations||[]).toHaveLength(0);
 }
 const content='<gpx><trk><name>Atividade real de teste</name><trkseg><trkpt lat="-23.55" lon="-46.63"><time>2026-10-19T10:00:00Z</time></trkpt><trkpt lat="-23.5505" lon="-46.63"><time>2026-10-19T10:00:20Z</time></trkpt></trkseg></trk></gpx>';
 await page.locator('#pf-activities-file').setInputFiles({name:'activity.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(content)});await page.locator('#platformDialog [type="submit"]').click();
 await expect.poll(()=>server.entities.integrations?.length).toBe(1);expect(server.entities.integrations[0].data.durationSeconds).toBe(20);expect(server.entities.integrations[0].data.distanceMeters).toBeGreaterThan(50);
});
