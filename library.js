// ============================================================
// PLATAFORMA LEITURA.DIGITAL — Biblioteca
// Camada: Frontend
// Depende de: supabase-client.js
// ============================================================

let allBooks     = [];   // catálogo completo
let ownedBookIds = new Set(); // IDs de livros comprados pelo usuário

// ── CARREGAR BIBLIOTECA ─────────────────────────────────────
async function loadLibrary() {
  const grid = document.getElementById('books-grid');
  grid.innerHTML = '<div class="loading-state">Carregando sua biblioteca…</div>';

  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  // Busca catálogo e compras em paralelo
  const [booksRes, purchasesRes] = await Promise.all([
    db.from('books').select('*').eq('is_active', true).order('created_at'),
    db.from('purchases').select('book_id').eq('user_id', user.id).eq('status', 'confirmed')
  ]);

  allBooks     = booksRes.data  || [];
  ownedBookIds = new Set((purchasesRes.data || []).map(p => p.book_id));

  renderGrid();
}

// ── RENDERIZAR GRID ─────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('books-grid');
  grid.innerHTML = '';

  if (!allBooks.length) {
    grid.innerHTML = '<div class="loading-state">Nenhum livro encontrado.</div>';
    return;
  }

  allBooks.forEach(book => {
    const owned = ownedBookIds.has(book.id);
    const card  = buildBookCard(book, owned);
    grid.appendChild(card);
  });
}

// ── MONTAR CARD DE LIVRO ────────────────────────────────────
function buildBookCard(book, owned) {
  const div = document.createElement('div');
  div.className = 'book-card';
  div.onclick   = () => owned ? openReader(book) : openPurchaseModal(book);

  div.innerHTML = `
    <div class="book-cover ${book.cover_color || 'c1'}">
      ${book.title}
      <span class="book-badge">${owned ? '✓' : '🔒'}</span>
    </div>
    <div class="book-info">
      <h4>${book.title}</h4>
      <span class="category">${book.category || ''}</span>
      ${owned
        ? '<div class="book-owned">✓ Na sua biblioteca</div>'
        : `<div class="book-price">R$ ${Number(book.price_brl).toFixed(2).replace('.',',')}</div>`
      }
    </div>
  `;
  return div;
}

// ── ABRIR LEITOR (livros comprados) ─────────────────────────
async function openReader(book) {
  showToast('Gerando link seguro de download…');

  // Solicita URL assinada ao backend (15 minutos de validade)
  const res = await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId: book.id }),
    credentials: 'include'
  });

  if (!res.ok) {
    showToast('Erro ao gerar download. Tente novamente.');
    return;
  }

  const { url } = await res.json();
  window.open(url, '_blank');
}

// ── VER CATÁLOGO ─────────────────────────────────────────────
function openCatalog() {
  // Exibe todos os livros (já está exibindo, rola para o topo)
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Você já está vendo o catálogo completo!');
}
