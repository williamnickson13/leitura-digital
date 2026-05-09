// ============================================================
// PLATAFORMA LEITURA.DIGITAL — Autenticação
// Camada: Frontend
// Depende de: supabase-client.js
// ============================================================

// ── INICIALIZAÇÃO ───────────────────────────────────────────
// Ao carregar a página, verifica se há sessão ativa
db.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    const meta = session.user.user_metadata;
    enterLibrary(meta?.name || session.user.email.split('@')[0]);
  }
});

// ── NAVEGAÇÃO ENTRE ABAS ────────────────────────────────────
function showSection(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  document.getElementById('form-login').style.display    = isLogin ? 'block' : 'none';
  document.getElementById('form-register').style.display = isLogin ? 'none'  : 'block';
}

// ── LOGIN ────────────────────────────────────────────────────
async function doLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const msgEl    = document.getElementById('msg-login');

  msgEl.className = 'msg';
  msgEl.textContent = '';

  if (!email || !password) {
    msgEl.textContent = 'Preencha e-mail e senha.';
    return;
  }

  const btn = document.querySelector('#form-login .btn-full');
  btn.disabled = true;
  btn.textContent = 'Entrando…';

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = 'Entrar na minha conta';

  if (error) {
    msgEl.textContent = traduzirErro(error.message);
    return;
  }

  const name = data.user.user_metadata?.name || email.split('@')[0];
  enterLibrary(name);
}

// ── CADASTRO ────────────────────────────────────────────────
async function doRegister() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const msgEl    = document.getElementById('msg-register');

  msgEl.className = 'msg';
  msgEl.textContent = '';

  if (!name || !email || !password) {
    msgEl.textContent = 'Preencha todos os campos.';
    return;
  }
  if (password.length < 6) {
    msgEl.textContent = 'Senha deve ter pelo menos 6 caracteres.';
    return;
  }

  const btn = document.querySelector('#form-register .btn-full');
  btn.disabled = true;
  btn.textContent = 'Criando conta…';

  const { error } = await db.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });

  btn.disabled = false;
  btn.textContent = 'Criar conta grátis';

  if (error) {
    msgEl.textContent = traduzirErro(error.message);
    return;
  }

  // Se confirmação de e-mail estiver ativada no Supabase:
  msgEl.className = 'msg success';
  msgEl.textContent = '✓ Conta criada! Confirme seu e-mail para entrar.';
  // Se desabilitada, o onAuthStateChange já redireciona automaticamente.
}

// ── ESQUECI A SENHA ─────────────────────────────────────────
async function doForgotPassword() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) {
    document.getElementById('msg-login').textContent = 'Digite seu e-mail primeiro.';
    return;
  }
  await db.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/reset-password.html`
  });
  document.getElementById('msg-login').className = 'msg success';
  document.getElementById('msg-login').textContent = '✓ E-mail de redefinição enviado!';
}

// ── LOGOUT ──────────────────────────────────────────────────
async function doLogout() {
  await db.auth.signOut();
  document.getElementById('nav-logged-out').style.display = 'flex';
  document.getElementById('nav-logged-in').style.display  = 'none';
  document.getElementById('screen-library').classList.remove('active');
  document.getElementById('screen-hero').classList.add('active');
}

// ── ENTRAR NA BIBLIOTECA ────────────────────────────────────
function enterLibrary(name) {
  const display = capitalize(name);
  document.getElementById('nav-logged-out').style.display = 'none';
  document.getElementById('nav-logged-in').style.display  = 'flex';
  document.getElementById('nav-name').textContent = display;
  document.getElementById('lib-greeting').textContent = `Bem-vindo de volta, ${display} 👋`;
  document.getElementById('screen-hero').classList.remove('active');
  document.getElementById('screen-library').classList.add('active');
  loadLibrary();
}

// ── UTILS ────────────────────────────────────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function traduzirErro(msg) {
  const map = {
    'Invalid login credentials':          'E-mail ou senha incorretos.',
    'Email not confirmed':                'Confirme seu e-mail antes de entrar.',
    'User already registered':            'Este e-mail já está cadastrado.',
    'Password should be at least 6 characters': 'Senha muito curta (mínimo 6 caracteres).',
  };
  return map[msg] || `Erro: ${msg}`;
}
