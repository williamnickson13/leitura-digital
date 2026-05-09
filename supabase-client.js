// ============================================================
// PLATAFORMA LEITURA.DIGITAL — Supabase Client
// Camada: Frontend
// Substitua os valores abaixo com as suas credenciais:
//   Supabase Dashboard > Project Settings > API
// ============================================================

const SUPABASE_URL  = 'https://SEU_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'SUA_ANON_KEY_AQUI';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// Utilitário de toast
function showToast(msg, duration = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}
