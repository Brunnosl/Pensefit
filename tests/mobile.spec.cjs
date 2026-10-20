const {test,expect}=require('@playwright/test');
const {backend,signup}=require('./backend.cjs');
test.use({isMobile:true,hasTouch:true,deviceScaleFactor:2});
const pages=['dashboard','workout','nutrition','progress','profile','wod','run','active','ai','library','loads','calendar','recovery','reports','community','integrations'];
async function boot(page){const errors=[];page.on('pageerror',e=>errors.push(e.message));await backend(page,{signedIn:true});await page.goto('/');await expect.poll(()=>page.evaluate(()=>window.PensePlatform?.store.loading)).toBe(false);return errors}
async function navigate(page,name){await page.locator('#mobileMenu').tap();await page.locator(`#platformDialog [data-action="mobile-navigate"][data-page="${name}"]`).tap();await expect(page.locator('#platformDialog')).toBeHidden();await expect(page.locator('#'+name+'Page')).toBeVisible()}

for(const width of [320,360,390,430])test(`celular ${width}px: menu alcança todas as áreas sem transbordamento`,async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width,height:844});const errors=await boot(page);await expect(page.locator('#mobileNav button')).toHaveCount(5);
 for(const name of pages){await navigate(page,name);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name).toBe(true)}
 await navigate(page,'wod');await expect(page.locator('#wodHost h2')).toHaveText('CrossFit');await page.locator('#mobileMenu').tap();await expect(page.locator('#platformDialog')).not.toContainText('Pense WOD');await expect(page.locator('#platformDialog [data-page="wod"]')).toHaveText('CrossFit');expect(errors).toEqual([]);await page.screenshot({path:`test-results/mobile-menu-${width}.png`,fullPage:true});
});

test('celular: abas internas podem ser tocadas, formulários são legíveis e ações cabem na tela',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:360,height:740});const errors=await boot(page);
 for(const [name,module]of [['workout','training'],['nutrition','nutri'],['wod','wod'],['run','run'],['community','community']]){
  await navigate(page,name);const tabs=await page.locator(`[data-module="${module}"][data-action="tab"]:visible`).evaluateAll(nodes=>nodes.map(n=>n.dataset.tab));
  for(const tab of tabs){await navigate(page,name);const button=page.locator(`[data-module="${module}"][data-tab="${tab}"]:visible`);await button.tap();expect(await button.count()?await button.evaluate(el=>el.getBoundingClientRect().height):44).toBeGreaterThanOrEqual(44);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+'/'+tab).toBe(true)}
 }
 await navigate(page,'profile');await page.locator('[data-action="onboarding-start"]:visible').tap();await expect(page.locator('#pf-weeklyFrequency')).toHaveCSS('font-size','16px');await expect(page.locator('#platformDialog [type="submit"]')).toBeInViewport();await page.screenshot({path:'test-results/mobile-form.png',fullPage:true});expect(await page.locator('#platformDialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);expect(errors).toEqual([]);
});

test('celular: cadastro mantém campos legíveis e botões acessíveis',async({page})=>{
 await page.setViewportSize({width:320,height:740});await backend(page);await page.goto('/');await signup(page);await expect(page.locator('#signupEmail')).toHaveCSS('font-size','16px');await page.locator('#signupForm [type="submit"]').tap();await expect(page.locator('#confirmationView')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
