import { createClient } from '@supabase/supabase-js';
import crypto           from 'crypto';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret     = process.env.MP_WEBHOOK_SECRET;
  const signature  = req.headers['x-signature'] || '';
  const xRequestId = req.headers['x-request-id'] || '';
  const dataId     = req.query.id || req.body?.data?.id || '';

  if (secret) {
    const manifest = `id:${dataId};request-id:${xRequestId};`;
    const hmac     = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    if (!signature.includes(hmac)) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }
  }

  const { type, data } = req.body;
  if (type !== 'payment') return res.status(200).json({ ok: true });

  const paymentId = data?.id;
  if (!paymentId) return res.status(400).json({ error: 'payment id ausente' });

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
  });

  const payment = await mpRes.json();
  if (payment.status !== 'approved') return res.status(200).json({ ok: true, status: payment.status });

  const [userId, bookId] = (payment.external_reference || '').split('::');
  if (!userId || !bookId) return res.status(400).json({ error: 'Referência inválida' });

  const { count } = await supabaseAdmin
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .eq('payment_id', String(paymentId));

  if (count > 0) return res.status(200).json({ ok: true, msg: 'já processado' });

  const { error } = await supabaseAdmin.from('purchases').insert({
    user_id:         userId,
    book_id:         bookId,
    amount_paid_brl: payment.transaction_amount,
    payment_id:      String(paymentId),
    payment_method:  payment.payment_type_id,
    status:          'confirmed'
  });

  if (error) return res.status(500).json({ error: 'Erro interno' });

  return res.status(200).json({ ok: true });
}

export const config = { api: { bodyParser: true } };
