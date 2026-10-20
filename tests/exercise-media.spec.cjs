const {test,expect}=require('@playwright/test');
const {backend}=require('./backend.cjs');
const media=require('../src/platform/exercise-media.json');

test('todos os exercícios têm fotos ou diagramas locais e abrem todas as etapas',async({page})=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await backend(page,{signedIn:true});await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>window.PensePlatform?.store.loading)).toBe(false);await page.evaluate(()=>window.PenseFit.navigate('library'));
 const previews=page.locator('#libraryHost .exercise-preview');await expect(previews).toHaveCount(Object.keys(media).length);
 const ids=await previews.evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
 for(const id of ids){await page.locator(`#libraryHost .exercise-preview[data-id="${id}"]`).click();await expect(page.locator('#platformDialog .exercise-frames img').first()).toBeVisible();await expect.poll(()=>page.locator('#platformDialog .exercise-frames img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);expect(await page.locator('#platformDialog').textContent()).not.toContain('ainda não tem demonstração');await page.locator('#platformDialog [data-action="close-dialog"]').first().click()}
 expect(errors).toEqual([]);
});

test('demonstração no treino e habilidades distinguem barra e argolas',async({page})=>{
 await backend(page,{signedIn:true});await page.goto('/');await expect.poll(()=>page.evaluate(()=>window.PensePlatform?.store.loading)).toBe(false);
 await page.evaluate(()=>window.PenseFit.navigate('workout'));await page.locator('[data-module="training"][data-tab="legacy"]').click();await expect(page.locator('#workoutLegacy [data-visual]').first()).toHaveAttribute('style',/assets\/exercises\//);await page.locator('[data-module="training"][data-tab="plans"]').click();
 await page.evaluate(()=>window.PenseFit.navigate('workout'));await page.locator('[data-action="session-start"]:visible').first().click();await expect(page.locator('.runner-card .exercise-preview img')).toBeVisible();await page.locator('.runner-card .exercise-preview').click();await expect(page.locator('#platformDialog .exercise-frames img')).toHaveCount(2);await page.locator('#platformDialog [data-action="close-dialog"]').first().click();
 await page.evaluate(()=>window.PenseFit.navigate('wod'));await page.locator('[data-module="wod"][data-tab="skills"]').click();
 for(const [name,equipment]of [['Bar Muscle-up','Barra fixa'],['Ring Muscle-up','Argolas'],['Handstand','Parede']]){const card=page.locator('#wodHost .card').filter({has:page.getByRole('heading',{name,exact:true})});await card.locator('[data-action="exercise-detail"]').click();await expect(page.locator('#platformDialog h2')).toHaveText(name);await expect(page.locator('#platformDialog .pf-badge')).toContainText([equipment]);await expect(page.locator('#platformDialog .exercise-frames img').first()).toBeVisible();await page.locator('#platformDialog [data-action="close-dialog"]').first().click()}
});

test('biblioteca filtra equipamentos e grupo corretamente e demonstrações cabem no celular',async({page})=>{
 await page.setViewportSize({width:390,height:844});await backend(page,{signedIn:true});await page.goto('/');await expect.poll(()=>page.evaluate(()=>window.PensePlatform?.store.loading)).toBe(false);await page.evaluate(()=>window.PenseFit.navigate('library'));
 await page.locator('#pf-library-equipment').selectOption('Cabo');await page.locator('[data-action="library-search"]:visible').click();await expect(page.locator('#libraryHost')).toContainText('Face pull');
 await page.locator('#pf-library-equipment').selectOption('Todos');await page.locator('#pf-library-group').selectOption('Glúteos');await page.locator('[data-action="library-search"]:visible').click();await expect(page.locator('#libraryHost')).toContainText('Cadeira abdutora');await expect(page.locator('#libraryHost .exercise-preview')).toHaveCount(1);
 await page.locator('#pf-library-group').selectOption('Todos');await page.locator('#pf-library-query').fill('Rosca cabo');await page.locator('[data-action="library-search"]:visible').click();await page.locator('.exercise-preview:visible').click();await expect(page.locator('#platformDialog .exercise-frames img')).toHaveCount(4);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('#platformDialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'test-results/exercise-mobile.png',fullPage:true});
});
