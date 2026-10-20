const {test,expect}=require('@playwright/test');
const {backend,id}=require('./backend.cjs');
test.use({baseURL:process.env.PENSEFIT_TEST_URL||'http://localhost:3000'});
const row=data=>({id:require('node:crypto').randomUUID(),user_id:id,date:'2026-10-19',revision:0,data});
let catalog;
test.beforeAll(async()=>{catalog=await import('../src/platform/catalog.mjs')});
async function boot(page,preferences={}){const server=await backend(page,{signedIn:true,entities:{preferences:[row({onboarded:true,primaryGoal:'Reduzir gordura',...preferences})]}});await page.goto('/');await expect.poll(()=>page.evaluate(()=>window.PensePlatform?.store.loading)).toBe(false);await page.evaluate(()=>window.PenseFit.navigate('nutrition'));await page.locator('[data-module="nutri"][data-tab="recipes"]').click();return server}
async function filter(page,goal='all',meal='all',query=''){await page.locator('#pf-recipe-goal').selectOption(goal);await page.locator('#pf-recipe-meal').selectOption(meal);await page.locator('#pf-recipe-search').fill(query);await page.locator('[data-action="recipe-filter"]').click()}
const details=page=>page.locator('#nutriHost [data-action="recipe-detail"]');

for(const width of [1280,360])test(`receitas ${width}px: perfil, objetivos, refeições e busca selecionam o catálogo`,async({page})=>{
 await page.setViewportSize({width,height:844});await boot(page);if(width<600)expect((await page.locator('#pf-recipe-goal').boundingBox()).width).toBeGreaterThan(300);
 await expect(details(page)).toHaveCount(catalog.RECIPES.filter(r=>r.goals.includes('loss')).length);
 for(const goal of ['gain','loss','maintain']){await filter(page,goal);await expect(details(page)).toHaveCount(catalog.RECIPES.filter(r=>r.goals.includes(goal)).length)}
 await filter(page,'gain','breakfast');await expect(details(page)).toHaveCount(catalog.RECIPES.filter(r=>r.goals.includes('gain')&&r.meals.includes('breakfast')).length);
 await filter(page,'all','all','lentilha');await expect(details(page)).toHaveCount(catalog.RECIPES.filter(r=>r.name.toLowerCase().includes('lentilha')).length);
 await filter(page,'all','all','não existe');await expect(page.locator('#nutriHost')).toContainText('Nenhuma receita nesta seleção');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await filter(page);await page.screenshot({path:`test-results/recipes-${width}.png`});
});

test('28 receitas abrem ingredientes, preparo e composição; favoritar não duplica',async({page})=>{
 const server=await boot(page);await filter(page);await expect(details(page)).toHaveCount(28);
 for(const recipe of catalog.RECIPES){await page.locator(`[data-action="recipe-detail"][data-id="${recipe.id}"]`).click();const dialog=page.locator('#platformDialog');await expect(dialog).toContainText(recipe.name);await expect(dialog).toContainText('Preparo');await expect(dialog).toContainText('USDA');for(const item of recipe.ingredients)await expect(dialog).toContainText(item.name);await dialog.locator('[data-action="close-dialog"]').first().click()}
 await page.locator('[data-action="recipe-favorite"][data-id="chicken-beans"]').click();await expect.poll(()=>server.entities.recipes?.length).toBe(1);await expect(details(page)).toHaveCount(28);await expect(page.locator('[data-action="recipe-favorite"][data-id="chicken-beans"]')).toHaveText('Favorita');
 await page.locator('[data-action="recipe-favorite"][data-id="chicken-beans"]').click();await expect(page.locator('[data-action="recipe-favorite"][data-id="chicken-beans"]')).toHaveText('Favoritar');
});

test('planejamento semanal respeita objetivo, refeição e restrições alimentares',async({page})=>{
 const server=await boot(page,{foodPreferences:'vegana',foodRestrictions:'amêndoas'});
 await page.locator('[data-module="nutri"][data-tab="planner"]').click();await page.locator('[data-action="planner-suggest"]').click();await page.locator('#pf-suggest-goal').selectOption('gain');await page.locator('#pf-suggest-meal').selectOption('breakfast');await page.locator('#platformDialog [type="submit"]').click();
 await expect.poll(()=>server.entities.meal_plans?.length).toBe(1);const entries=server.entities.meal_plans[0].data.entries;expect(entries).toHaveLength(7);expect(new Set(entries.map(e=>e.recipeId)).size).toBeGreaterThan(1);
 for(const entry of entries){const recipe=catalog.RECIPES.find(r=>r.id===entry.recipeId);expect(recipe.goals).toContain('gain');expect(recipe.meals).toContain('breakfast');expect(catalog.recipeAllowed(recipe,{foodPreferences:'vegana',foodRestrictions:'amêndoas'})).toBe(true)}
});
