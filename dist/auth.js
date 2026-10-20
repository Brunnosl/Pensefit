(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const app = window.PenseFit;
  const config = window.PENSEFIT_CONFIG;
  const table = 'pensefit_accounts';
  const goals = ['Ganho de massa + definição', 'Ganho de massa', 'Definição'];
  let client, user = null, loadedUserId = null, loadingTask = null;
  let epoch = 0, revision = 0, pending = null, flushing = null, conflict = false;
  let recovery = new URL(location.href).searchParams.get('flow') === 'recovery';
  let confirmationEmail = '', authBusy = false;
  const initialHash = new URLSearchParams(location.hash.slice(1));
  if (initialHash.get('type') === 'recovery') recovery = true;

  function message(text = '', success = false) {
    $('#authMessage').textContent = text;
    $('#authMessage').hidden = !text;
    $('#authMessage').classList.toggle('success', success);
  }
  function view(name, keepMessage = false) {
    const views = { loading: 'authLoading', login: 'loginForm', signup: 'signupForm', forgot: 'forgotForm', password: 'passwordForm', confirmation: 'confirmationView', connection: 'connectionView' };
    document.querySelectorAll('.auth-view').forEach(element => { element.hidden = element.id !== views[name]; });
    $('#authTabs').hidden = !['login', 'signup'].includes(name);
    document.querySelectorAll('#authTabs button').forEach(button => {
      const active = button.dataset.authView === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#authScreen').hidden = false;
    $('#appShell').hidden = true;
    $('#mobileNav').hidden = true;
    if (!keepMessage) message();
    if (['login', 'signup', 'forgot', 'password'].includes(name)) {
      const field = document.querySelector(`#${views[name]} input`);
      if (field) field.focus({ preventScroll: true });
    }
  }
  function openApp() {
    $('#authScreen').hidden = true;
    $('#appShell').hidden = false;
    $('#mobileNav').hidden = false;
    $('#accountEmail').textContent = user.email || '';
    app.authorize(true);
    if(window.PenseFitServices?.user?.id!==user.id){window.PenseFitServices={client,user,signOut:performSignOut};window.dispatchEvent(new CustomEvent('pensefit:session',{detail:{client,user}}))}
  }
  function syncStatus(text, error = false) {
    $('#syncStatus').textContent = text;
    $('#syncBanner').classList.toggle('error', error);
    $('#retrySync').hidden = !pending || conflict;
    $('#reloadCloud').hidden = !conflict;
    $('#keepLocal').hidden = !conflict;
  }
  function errorText(error) {
    const messages = {
      invalid_credentials: 'E-mail ou senha incorretos.',
      email_not_confirmed: 'Confirme seu e-mail antes de entrar. Verifique também a caixa de spam.',
      user_already_exists: 'Não foi possível cadastrar este e-mail. Tente entrar ou recuperar sua senha.',
      email_exists: 'Não foi possível cadastrar este e-mail. Tente entrar ou recuperar sua senha.',
      over_email_send_rate_limit: 'Aguarde alguns minutos antes de solicitar outro e-mail.',
      over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      weak_password: 'Escolha uma senha mais forte, com letras e números.',
      same_password: 'Escolha uma senha diferente da senha atual.',
      otp_expired: 'Este link expirou ou já foi usado. Solicite um novo link.',
      session_not_found: 'Sua sessão expirou. Entre novamente.',
      signup_disabled: 'O cadastro está indisponível no momento.',
      email_address_invalid: 'Informe um endereço de e-mail válido.',
      email_address_not_authorized: 'O serviço de e-mail ainda não permite enviar para esse endereço. Configure o SMTP do projeto Supabase.',
      captcha_failed: 'Não foi possível validar o acesso. Tente novamente.'
    };
    return messages[error?.code] || 'Não foi possível concluir agora. Confira sua conexão e tente novamente.';
  }
  function requireClient() {
    if (!client) throw new Error('Serviço de autenticação indisponível. Recarregue a página.');
    if (!['http:', 'https:'].includes(location.protocol)) throw new Error('Abra o app pelo servidor local em http://localhost:3000 para entrar e cadastrar sua conta.');
  }
  function redirectURL(password = false) {
    const url = new URL(location.href);
    url.hash = '';
    url.search = '';
    if (password) url.searchParams.set('flow', 'recovery');
    return url.href;
  }
  function validPassword(password) {
    return password.length >= 8 && password.length <= 128 && /[A-Za-z]/.test(password) && /\d/.test(password);
  }
  function pendingKey(id) { return `pensefit-pending-v2:${id}`; }
  function persistPending() {
    if (!user) return;
    try {
      if (pending) localStorage.setItem(pendingKey(user.id), JSON.stringify({ state: pending, revision }));
      else localStorage.removeItem(pendingKey(user.id));
      return true;
    } catch { return false; }
  }
  function readPending(id) {
    try {
      const saved = JSON.parse(localStorage.getItem(pendingKey(id)) || 'null');
      if (saved && Number.isSafeInteger(saved.revision) && saved.revision >= 0 && saved.state?.profile) return saved;
    } catch {}
    return null;
  }
  function clearAccount() {
    epoch++;
    user = null;
    window.PenseFitServices={client,user:null,signOut:performSignOut};
    window.dispatchEvent(new CustomEvent('pensefit:session',{detail:null}));
    loadedUserId = null;
    loadingTask = null;
    pending = null;
    conflict = false;
    revision = 0;
    app.authorize(false);
    $('#appShell').inert = false;
    $('#accountEmail').textContent = '';
    document.querySelectorAll('input[autocomplete="current-password"],input[autocomplete="new-password"]').forEach(input => { input.value = ''; input.type = 'password'; });
    document.querySelectorAll('[data-password]').forEach(button => { button.textContent = 'Mostrar'; button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-label', 'Mostrar senha'); });
    view('login');
  }
  function seedState(authUser) {
    const state = app.normalizeState(null);
    const info = authUser.user_metadata?.pensefit_profile;
    if (info && typeof info === 'object') {
      Object.assign(state.profile, info);
      const age = app.ageFromBirthDate(info.birthDate || '');
      if (Number.isFinite(age)) state.profile.age = age;
    }
    return app.normalizeState(state);
  }
  async function loadAccount(authUser, token) {
    const { data, error } = await client.from(table).select('state,revision').eq('user_id', authUser.id).maybeSingle();
    if (error) throw error;
    if (token !== epoch || user?.id !== authUser.id) return;
    let account = data;
    if (!account) {
      const created = await client.from(table).insert({ user_id: authUser.id, state: seedState(authUser) }).select('state,revision').single();
      if (created.error?.code === '23505') {
        const existing = await client.from(table).select('state,revision').eq('user_id', authUser.id).single();
        if (existing.error) throw existing.error;
        account = existing.data;
      } else {
        if (created.error) throw created.error;
        account = created.data;
      }
    }
    if (token !== epoch || user?.id !== authUser.id) return;
    revision = Number(account.revision);
    const saved = readPending(authUser.id);
    pending = saved ? app.normalizeState(saved.state) : null;
    conflict = !!saved && saved.revision !== revision;
    app.hydrate(pending || account.state);
    loadedUserId = authUser.id;
    if (recovery) view('password');
    else openApp();
    if (conflict) syncStatus('Existem alterações neste navegador e em outro dispositivo. Escolha quais dados manter.', true);
    else if (pending) await flush();
    else syncStatus('Todos os seus registros estão salvos na sua conta.');
  }
  async function handleSession(session, isRecovery = false) {
    if (isRecovery) recovery = true;
    if (!session?.user) { recovery = false; clearAccount(); return; }
    if (loadedUserId === session.user.id) {
      user = session.user;
      if (recovery) view('password');
      return;
    }
    if (loadingTask && user?.id === session.user.id) return loadingTask;
    clearAccount();
    user = session.user;
    const token = epoch;
    view('loading');
    const task = (async () => {
      try {
        const verified = await client.auth.getUser();
        if (verified.error || !verified.data.user) throw verified.error || new Error('Sessão inválida');
        if (token !== epoch) return;
        user = verified.data.user;
        await loadAccount(user, token);
      } catch (error) {
        if (token !== epoch) return;
        if(!navigator.onLine&&session.expires_at>Date.now()/1000&&window.PenseActive){try{const cached=await window.PenseActive.offlineSession(session.user);if(cached&&token===epoch){user=session.user;app.hydrate(cached);loadedUserId=user.id;openApp();syncStatus('Modo offline: sessão anterior recuperada. As pendências serão sincronizadas ao reconectar.',true);return}}catch{}}
        app.authorize(false);
        view('connection');
        message(errorText(error));
      }
    })();
    loadingTask = task;
    await task;
    if (loadingTask === task) loadingTask = null;
  }
  function queueSave(state) {
    if (!user || loadedUserId !== user.id) throw new Error('Entre na sua conta para salvar.');
    pending = state;
    const persisted = persistPending();
    syncStatus(persisted ? 'Salvando suas alterações…' : 'Salvando… mantenha esta página aberta até concluir.');
    if (conflict) syncStatus('Há alterações em outro dispositivo. Escolha quais dados manter.', true);
    else void flush();
  }
  async function flush() {
    if (flushing) return flushing;
    if (!pending || !user || conflict || loadedUserId !== user.id) return;
    const token = epoch, id = user.id;
    const task = (async () => {
      while (pending && !conflict && token === epoch) {
        const snapshot = pending;
        syncStatus('Salvando suas alterações…');
        try {
          const result = await client.from(table).update({ state: snapshot }).eq('user_id', id).eq('revision', revision).select('revision').maybeSingle();
          if (token !== epoch) return;
          if (result.error) throw result.error;
          if (!result.data) {
            conflict = true;
            syncStatus('Seus dados mudaram em outro dispositivo. Escolha quais registros manter.', true);
            return;
          }
          revision = Number(result.data.revision);
          if (pending === snapshot) pending = null;
          const persisted = persistPending();
          if (!pending) syncStatus(persisted ? 'Todos os seus registros estão salvos na sua conta.' : 'Registros salvos. O armazenamento local está indisponível.');
        } catch {
          if (token !== epoch) return;
          const persisted = persistPending();
          syncStatus(persisted ? 'Sem sincronização. As alterações estão guardadas neste navegador; tente salvar novamente.' : 'Não foi possível salvar. Mantenha a página aberta e tente novamente.', true);
          return;
        }
      }
    })();
    flushing = task;
    await task;
    if (flushing === task) flushing = null;
    // Uma nova conta pode ter carregado enquanto a requisição anterior terminava.
    if (token !== epoch && pending && !conflict) void flush();
  }
  async function resolveConflict(keepLocal) {
    if (!user || !conflict) return;
    const token = epoch;
    $('#appShell').inert = true;
    try {
      const result = await client.from(table).select('state,revision').eq('user_id', user.id).single();
      if (token !== epoch) return;
      if (result.error) throw result.error;
      revision = Number(result.data.revision);
      conflict = false;
      if (keepLocal) { persistPending(); await flush(); }
      else { pending = null; persistPending(); app.hydrate(result.data.state); syncStatus('Os registros da nuvem foram carregados.'); }
    } catch { if (token === epoch) syncStatus('Não foi possível resolver agora. Confira sua conexão e tente novamente.', true); }
    finally { $('#appShell').inert = false; }
  }
  async function signOut() {
    if (!client) { clearAccount(); return; }
    if (pending && !conflict) await flush();
    if (pending) {
      app.confirmAction('Sair com alterações pendentes?', 'As alterações ainda não estão salvas na nuvem. Ao sair, elas permanecerão neste navegador para esta conta. Você quer sair mesmo assim?', () => { void performSignOut(); });
      return;
    }
    await performSignOut();
  }
  async function performSignOut() {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) { app.notify('Não foi possível sair. Tente novamente.'); return; }
    recovery = false;
    clearRecoveryURL();
    clearAccount();
    message('Você saiu da sua conta.', true);
  }
  function clearRecoveryURL() {
    const url = new URL(location.href);
    url.searchParams.delete('flow');
    url.hash = '';
    history.replaceState(null, '', url.pathname + url.search);
  }
  function formHandler(id, action) {
    $(id).addEventListener('submit', async event => {
      event.preventDefault();
      if (authBusy || !event.currentTarget.reportValidity()) return;
      authBusy = true;
      const form = event.currentTarget;
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      message();
      try { requireClient(); await action(); }
      catch (error) { message(error instanceof Error && !error.code ? error.message : errorText(error)); }
      finally { authBusy = false; button.disabled = false; }
    });
  }

  document.querySelectorAll('[data-auth-view]').forEach(button => button.addEventListener('click', () => { if (!authBusy) view(button.dataset.authView); }));
  document.querySelectorAll('[data-password]').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.password);
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    button.textContent = visible ? 'Ocultar' : 'Mostrar';
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
  }));
  formHandler('#loginForm', async () => {
    const result = await client.auth.signInWithPassword({ email: $('#loginEmail').value.trim(), password: $('#loginPassword').value });
    if (result.error) { message(errorText(result.error)); return; }
    $('#loginPassword').value = '';
    await handleSession(result.data.session);
  });
  formHandler('#signupForm', async () => {
    const fullName = $('#signupName').value.trim(), phone = $('#signupPhone').value.trim();
    const birthDate = $('#signupBirthDate').value, age = app.ageFromBirthDate(birthDate);
    const password = $('#signupPassword').value;
    if (fullName.length < 3 || fullName.length > 120 || !/\S+\s+\S+/.test(fullName)) throw new Error('Informe seu nome completo.');
    if (!Number.isFinite(age) || age < 18 || age > 120) throw new Error('Informe uma data de nascimento válida. O cadastro é para maiores de 18 anos.');
    if (phone && !/^[+()\d\s-]{8,25}$/.test(phone)) throw new Error('Informe um celular válido ou deixe o campo vazio.');
    if (!validPassword(password)) throw new Error('Use pelo menos 8 caracteres, com letras e números.');
    if (password !== $('#signupPasswordConfirm').value) throw new Error('As senhas não coincidem.');
    const height = Number($('#signupHeight').value) / 100, weight = Number($('#signupWeight').value), goal = $('#signupGoal').value;
    if (!Number.isFinite(height) || height < .5 || height > 2.5 || !Number.isFinite(weight) || weight < 30 || weight > 250 || !goals.includes(goal)) throw new Error('Revise a altura, o peso e o objetivo.');
    const email = $('#signupEmail').value.trim();
    const result = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectURL(), data: { pensefit_profile: { fullName, phone, birthDate, age, height, weight, goal, gender: $('#signupGender').value, modality: document.getElementById('pf-signup-modality')?.value || 'Musculação', experience: document.getElementById('pf-signup-experience')?.value || 'Iniciante' } } } });
    if (result.error) { message(errorText(result.error)); return; }
    $('#signupPassword').value = '';
    $('#signupPasswordConfirm').value = '';
    $('#loginEmail').value = email;
    if (result.data.session) await handleSession(result.data.session);
    else { confirmationEmail = email; $('#confirmationEmail').textContent = email; view('confirmation'); }
  });
  formHandler('#forgotForm', async () => {
    const result = await client.auth.resetPasswordForEmail($('#forgotEmail').value.trim(), { redirectTo: redirectURL(true) });
    if (result.error) { message(errorText(result.error)); return; }
    message('Se houver uma conta para este endereço, você receberá um link de recuperação. Verifique seu e-mail e a caixa de spam.', true);
  });
  formHandler('#passwordForm', async () => {
    const password = $('#newPassword').value;
    if (!validPassword(password)) throw new Error('Use pelo menos 8 caracteres, com letras e números.');
    if (password !== $('#newPasswordConfirm').value) throw new Error('As senhas não coincidem.');
    const result = await client.auth.updateUser({ password });
    if (result.error) { message(errorText(result.error)); return; }
    recovery = false;
    clearRecoveryURL();
    $('#newPassword').value = '';
    $('#newPasswordConfirm').value = '';
    if (loadedUserId) { openApp(); app.notify('Senha atualizada.'); }
    else { view('login'); message('Senha atualizada. Entre para continuar.', true); }
  });
  $('#cancelPassword').addEventListener('click', () => { if (recovery) void signOut(); else if (loadedUserId) openApp(); else view('login'); });
  $('#resendConfirmation').addEventListener('click', async () => {
    if (authBusy) return;
    authBusy = true;
    $('#resendConfirmation').disabled = true;
    try {
      requireClient();
      const result = await client.auth.resend({ type: 'signup', email: confirmationEmail, options: { emailRedirectTo: redirectURL() } });
      if (result.error) message(errorText(result.error));
      else message('Se o endereço puder ser confirmado, um novo link será enviado.', true);
    } catch { message('Não foi possível enviar agora. Tente novamente.'); }
    finally { authBusy = false; $('#resendConfirmation').disabled = false; }
  });
  $('#retryConnection').addEventListener('click', async () => {
    if (!client || loadingTask) return;
    view('loading');
    const result = await client.auth.getSession();
    if (result.error) { view('connection'); message(errorText(result.error)); return; }
    await handleSession(result.data.session);
  });
  $('#logoutBtn').addEventListener('click', () => { void signOut(); });
  $('#connectionLogout').addEventListener('click', () => { void signOut(); });
  $('#changePassword').addEventListener('click', () => { recovery = false; view('password'); });
  $('#importLegacy').addEventListener('click', () => app.importLegacy());
  $('#retrySync').addEventListener('click', () => { void flush(); });
  $('#reloadCloud').addEventListener('click', () => app.confirmAction('Usar registros da nuvem?', 'As alterações pendentes deste navegador serão substituídas pelos registros salvos na sua conta.', () => { void resolveConflict(false); }));
  $('#keepLocal').addEventListener('click', () => app.confirmAction('Manter os registros deste navegador?', 'Os registros da nuvem serão substituídos pelos dados que você está vendo neste navegador.', () => { void resolveConflict(true); }));
  window.addEventListener('online', () => { void flush(); });
  window.addEventListener('beforeunload', event => { if (pending) { event.preventDefault(); event.returnValue = ''; } });
  app.onSave = queueSave;

  async function init() {
    view('loading');
    try {
      if (!window.pensefitCreateClient || !config?.url || !config?.publishableKey) throw new Error('Não foi possível carregar o serviço de autenticação. Recarregue a página.');
      requireClientProtocol();
      client = window.pensefitCreateClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'pensefit-auth-v2' } });
      client.auth.onAuthStateChange((event, session) => {
        // O callback não aguarda chamadas Supabase: evita bloquear o lock de autenticação.
        if (event === 'INITIAL_SESSION') return;
        if (event === 'SIGNED_OUT') { recovery = false; clearAccount(); return; }
        if (event === 'TOKEN_REFRESHED' && loadedUserId === session?.user.id) { user = session.user; return; }
        if (event === 'PASSWORD_RECOVERY') recovery = true;
        setTimeout(() => { void handleSession(session, event === 'PASSWORD_RECOVERY'); }, 0);
      });
      const result = await client.auth.getSession();
      if (result.error) throw result.error;
      await handleSession(result.data.session);
      if (!result.data.session && (initialHash.has('error') || initialHash.has('error_code'))) {
        recovery = false;
        clearRecoveryURL();
        view('forgot');
        message('Este link expirou ou já foi usado. Solicite um novo link.');
      }
    } catch (error) {
      view('login');
      message(error instanceof Error && !error.code ? error.message : errorText(error));
    }
  }
  function requireClientProtocol() {
    if (!['http:', 'https:'].includes(location.protocol)) throw new Error('Para usar sua conta, inicie o servidor local e acesse http://localhost:3000.');
  }
  void init();
})();
