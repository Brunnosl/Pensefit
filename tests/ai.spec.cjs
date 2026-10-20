const {test,expect}=require('@playwright/test');
const {backend}=require('./backend.cjs');
test.use({baseURL:process.env.PENSEFIT_TEST_URL||'http://localhost:3000',isMobile:true,hasTouch:true});
for(const width of [360,390])test(`Pense AI ${width}px: atalho não cobre Enviar e reaparece nas outras áreas`,async({page})=>{
 await page.setViewportSize({width,height:844});await backend(page,{signedIn:true});await page.goto('/');await expect.poll(()=>page.evaluate(()=>window.PensePlatform?.store.loading)).toBe(false);await expect(page.locator('.ai-fab')).toBeVisible();await page.locator('.ai-fab').tap();await expect(page.locator('#aiPage')).toBeVisible();await expect(page.locator('.ai-fab')).toBeHidden();
 const submit=page.locator('#aiComposer [type="submit"]');await submit.scrollIntoViewIfNeeded();
 expect(await submit.evaluate(button=>{const r=button.getBoundingClientRect();return button.contains(document.elementFromPoint(r.right-8,r.bottom-8))})).toBe(true);
 await page.locator('#aiComposer textarea').fill('Teste de interface');await submit.tap();await expect(page.locator('#toast')).toContainText('OPENAI_API_KEY');
 await page.screenshot({path:`test-results/ai-send-${width}.png`});await page.locator('#mobileNav [data-page="dashboard"]').tap();await expect(page.locator('.ai-fab')).toBeVisible();
});
