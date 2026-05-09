import { createClient }  from '@supabase/supabase-js';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Token inválido' });

  const { bookId } = req.body;
  if (!bookId) return res.status(400).json({ error: 'bookId obrigatório' });

  const { data: book, error: bookError } = await supabaseAdmin
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('is_active', true)
    .single();

  if (bookError || !book) return res.status(404).json({ error: 'Livro não encontrado' });

  const { count } = await supabaseAdmin
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .eq('status', 'confirmed');

  if (count > 0) return res.status(400).json({ error: 'Você já possui este livro.' });

  const preference = new Preference(mp);

  const { body } = await preference.create({
    body: {
      items: [{
        id:          book.id,
        title:       book.title,
        quantity:    1,
        unit_price:  Number(book.price_brl),
        currency_id: 'BRL'
      }],
      payer: { email: user.email },
      external_reference: `${user.id}::${book.id}`,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/success.html?book=${book.id}`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/library.html`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/pending.html`
      },
      auto_return:         'approved',
      notification_url:    `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook-mp`,
      statement_descriptor: 'LEITURA DIGITAL',
      installments:         3
    }
  });

  return res.status(200).json({ checkoutUrl: body.init_point });
}
