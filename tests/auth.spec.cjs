const { test, expect } = require('@playwright/test');
const { backend, login, signup, id, fitness } = require('./backend.cjs');
test('login público não mostra registros e traduz erro de credenciais',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await backend(page);await page.goto('/');
  await expect(page.locator('#loginForm')).toBeVisible();await expect(page.locator('#appShell')).toBeHidden();
  await login(page,'brunno@example.test','wrong-pass');await expect(page.locator('#authMessage')).toContainText('E-mail ou senha incorretos');expect(errors).toEqual([]);
  await page.screenshot({path:'test-results/login-desktop.png',fullPage:true});
});
test('cadastro valida senhas e idade, e pede confirmação de e-mail',async({page})=>{
  const server=await backend(page);await page.goto('/');await signup(page);
  await page.locator('#signupPasswordConfirm').fill('Different123');await page.locator('#signupForm [type="submit"]').click();await expect(page.locator('#authMessage')).toContainText('As senhas não coincidem');expect(server.signups).toHaveLength(0);
  await page.locator('#signupPasswordConfirm').fill('StrongPass123');await page.locator('#signupBirthDate').fill('2015-01-01');await page.locator('#signupForm [type="submit"]').click();await expect(page.locator('#authMessage')).toContainText('maiores de 18');expect(server.signups).toHaveLength(0);
  await page.locator('#signupBirthDate').fill('1998-06-10');await page.locator('#signupForm [type="submit"]').click();await expect(page.locator('#confirmationView')).toBeVisible();await expect(page.locator('#appShell')).toBeHidden();expect(server.signups[0].data.pensefit_profile.fullName).toBe('Brunno Teste');expect(server.signups[0].data.pensefit_profile.height).toBe(1.87);
});
test('login, treino de outro dia, sincronização e logout isolam dados',async({page})=>{
  const server=await backend(page);await page.goto('/');await login(page);await expect(page.locator('#appShell')).toBeVisible();await expect(page.locator('#greeting')).toContainText('BRUNNO');
  await page.locator('#desktopNav [data-page="workout"]').click();await page.locator('[data-module="training"][data-tab="legacy"]').click();await page.locator('[data-day="3"]').click();await page.locator('[data-ex="0"]').check();
  await expect(page.locator('#workoutDay')).toHaveText('QUINTA');await expect(page.locator('[data-day="3"]')).toHaveClass('active');await expect(page.locator('#syncStatus')).toContainText('salvos na sua conta');expect(server.account.done['3-0']).toBe(true);
  await page.locator('#logoutBtn').click();await expect(page.locator('#loginForm')).toBeVisible();await expect(page.locator('#appShell')).toBeHidden();expect(await page.evaluate(()=>window.PenseFit.snapshot().done)).toEqual({});
  server.account=fitness();server.account.profile.fullName='Outro Usuário';await login(page,'outro@example.test');await expect(page.locator('#greeting')).toContainText('OUTRO');expect(await page.evaluate(()=>window.PenseFit.snapshot().done)).toEqual({});
});
test('restaura sessão e lê registros da nuvem após recarregar',async({page})=>{
  const state=fitness();state.profile.weight=83;const server=await backend(page,{signedIn:true,account:state});await page.goto('/');await expect(page.locator('#appShell')).toBeVisible();await expect(page.locator('#metricWeight')).toHaveText('83,0');await page.reload();await expect(page.locator('#appShell')).toBeVisible();expect(server.writes).toHaveLength(0);
});
test('primeiro login cria perfil personalizado a partir do cadastro',async({page})=>{
  const server=await backend(page,{signedIn:true,account:null});await page.goto('/');await expect(page.locator('#appShell')).toBeVisible();expect(server.account.profile.fullName).toBe('Brunno Teste');expect(server.account.profile.birthDate).toBe('1998-06-10');
});
test('recuperação e alteração de senha',async({page})=>{
  const server=await backend(page);await page.goto('/');await page.locator('#loginForm [data-auth-view="forgot"]').click();await page.locator('#forgotEmail').fill('brunno@example.test');await page.locator('#forgotForm [type="submit"]').click();await expect(page.locator('#authMessage')).toContainText('link de recuperação');expect(server.recovery).toHaveLength(1);
  await page.locator('#forgotForm [data-auth-view="login"]').click();await login(page);await expect(page.locator('#appShell')).toBeVisible();await page.locator('#desktopNav [data-page="profile"]').click();await page.locator('#changePassword').click();await page.locator('#newPassword').fill('AnotherPass456');await page.locator('#newPasswordConfirm').fill('AnotherPass456');await page.locator('#passwordForm [type="submit"]').click();await expect(page.locator('#appShell')).toBeVisible();expect(server.passwordChanges[0].password).toBe('AnotherPass456');
});
test('link de recuperação abre nova senha e limpa a URL',async({page})=>{
  await backend(page,{signedIn:true});await page.goto('/?flow=recovery');await expect(page.locator('#passwordForm')).toBeVisible();await expect(page.locator('#appShell')).toBeHidden();await page.locator('#newPassword').fill('AnotherPass456');await page.locator('#newPasswordConfirm').fill('AnotherPass456');await page.locator('#passwordForm [type="submit"]').click();await expect(page.locator('#appShell')).toBeVisible();await expect(page).toHaveURL('http://localhost:3000/');
});
test('falha ao salvar guarda pendências só para a conta e permite repetir',async({page})=>{
  const server=await backend(page,{signedIn:true,failedWrite:true});await page.goto('/');await expect(page.locator('#appShell')).toBeVisible();await page.locator('#desktopNav [data-page="nutrition"]').click();await page.locator('[data-module="nutri"][data-tab="legacy"]').click();await page.locator('[data-meal="0"]').check();await expect(page.locator('#syncStatus')).toContainText('Sem sincronização');expect(await page.evaluate(id=>!!localStorage.getItem(`pensefit-pending-v2:${id}`),id)).toBe(true);
  server.failedWrite=false;await page.locator('#retrySync').click();await expect(page.locator('#syncStatus')).toContainText('salvos na sua conta');expect(server.account.meals['0']).toBe(true);expect(await page.evaluate(id=>localStorage.getItem(`pensefit-pending-v2:${id}`),id)).toBeNull();
});
test('conflito entre dispositivos não sobrescreve registros silenciosamente',async({page})=>{
  const server=await backend(page,{signedIn:true,conflicted:true});await page.goto('/');await expect(page.locator('#appShell')).toBeVisible();await page.locator('#desktopNav [data-page="nutrition"]').click();await page.locator('[data-module="nutri"][data-tab="legacy"]').click();await page.locator('[data-meal="0"]').check();await expect(page.locator('#syncStatus')).toContainText('outro dispositivo');expect(server.account.meals).toEqual({});
  await page.locator('#reloadCloud').click();await page.locator('#dialogConfirm').click();await expect(page.locator('#syncStatus')).toContainText('nuvem foram carregados');await expect(page.locator('[data-meal="0"]')).not.toBeChecked();
});
test('celular tem login legível, cadastro e acesso ao perfil',async({page})=>{
  await page.setViewportSize({width:390,height:844});await backend(page);await page.goto('/');await expect(page.locator('#loginForm')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/login-mobile.png',fullPage:true});
  await signup(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/signup-mobile.png',fullPage:true});
  await page.locator('#authTabs [data-auth-view="login"]').click();await login(page);await expect(page.locator('#appShell')).toBeVisible();await page.locator('#mobileNav [data-page="profile"]').click();await expect(page.locator('#profilePage')).toBeVisible();await expect(page.locator('#profileName')).toHaveValue('Brunno Teste');
});
