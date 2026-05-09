import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Token inválido' });

  const { bookId } = req.body;
  if (!bookId) return res.status(400).json({ error: 'bookId obrigatório' });

  const { data: book } = await supabaseAdmin
    .from('books')
    .select('id, storage_path')
    .eq('id', bookId)
    .single();

  if (!book) return res.status(404).json({ error: 'Livro não encontrado' });

  const { count } = await supabaseAdmin
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .eq('status', 'confirmed');

  if (!count) return res.status(403).json({ error: 'Acesso não autorizado' });

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from('ebooks')
    .createSignedUrl(book.storage_path, 900);

  if (signError) return res.status(500).json({ error: 'Erro ao gerar download' });

  await supabaseAdmin.from('download_tokens').insert({
    user_id:    user.id,
    book_id:    bookId,
    expires_at: new Date(Date.now() + 900_000).toISOString()
  });

  return res.status(200).json({ url: signed.signedUrl });
}
