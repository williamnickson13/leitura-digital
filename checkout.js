// ============================================================
// PLATAFORMA LEITURA.DIGITAL — Checkout
// Camada: Frontend
// Depende de: supabase-client.js, library.js
// ============================================================

let selectedBook = null; // livro selecionado para compra

// ── ABRIR MODAL DE COMPRA ────────────────────────────────────
function openPurchaseModal(book) {
  selectedBook = book;

  document.getElementById('modal-title').textContent = book.title;
  document.getElementById('modal-price').innerHTML =
    `R$ ${Number(book.price_brl).toFixed(2).replace('.',',')} <em>pagamento único</em>`;

  const btn = document.getElementById('btn-buy');
  btn.disabled    = false;
  btn.textContent = 'Comprar agora com segurança';

  document.getElementById('modal-overlay').classList.add('open');
}

// ── FECHAR MODAL ─────────────────────────────────────────────
function closeModal(event) {
  // Fecha ao clicar no overlay, não no card interno
  if (event && event.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
  selectedBook = null;
}

// ── INICIAR CHECKOUT ─────────────────────────────────────────
// Chama o backend que cria a preferência no Mercado Pago / Stripe
async function startCheckout() {
  if (!selectedBook) return;

  const btn = document.getElementById('btn-buy');
  btn.disabled    = true;
  btn.textContent = 'Redirecionando…';

  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
      showToast('Faça login para comprar.');
      btn.disabled    = false;
      btn.textContent = 'Comprar agora com segurança';
      return;
    }

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ bookId: selectedBook.id })
    });

    if (!res.ok) throw new Error('Falha ao criar checkout');

    const { checkoutUrl } = await res.json();
    window.location.href = checkoutUrl; // redireciona para MP ou Stripe

  } catch (err) {
    console.error(err);
    showToast('Erro ao iniciar pagamento. Tente novamente.');
    btn.disabled    = false;
    btn.textContent = 'Comprar agora com segurança';
  }
}

// ── PÁGINA DE SUCESSO ────────────────────────────────────────
// Chamada pela página success.html após retorno do gateway
async function handlePurchaseSuccess(bookId) {
  showToast('✓ Compra realizada! Atualizando sua biblioteca…');
  await loadLibrary(); // recarrega com o novo livro desbloqueado
}
