require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ pagos: [], suscripciones: [] }).write();

const app = express();
app.use(express.json());

const PLANS = {
  pro: { name: 'Pro', usd: 4.99 },
  premium: { name: 'Premium', usd: 12.99 },
};

const NP_API = 'https://api.nowpayments.io/v1';
const HEADERS = {
  'x-api-key': process.env.NOWPAYMENTS_API_KEY,
  'Content-Type': 'application/json',
};

app.post('/api/crear-pago', async (req, res) => {
  try {
    const { userId, planId } = req.body;
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Plan inválido' });

    const orderId = `${userId}-${planId}-${Date.now()}`;

    const response = await fetch(`${NP_API}/payment`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        price_amount: plan.usd,
        price_currency: 'usd',
        pay_currency: 'usdttrc20',
        order_id: orderId,
        order_description: `Suscripción ${plan.name} - usuario ${userId}`,
        ipn_callback_url: `${process.env.PUBLIC_URL}/api/webhook`,
      }),
    });

    const data = await response.json();
    if (data.payment_id) {
      db.get('pagos').push({
        orderId,
        userId,
        planId,
        paymentId: data.payment_id,
        estado: 'esperando',
        creado: new Date().toISOString(),
      }).write();
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo crear el pago' });
  }
});

app.post('/api/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-nowpayments-sig'];
  const sorted = JSON.stringify(sortObject(req.body));
  const expected = crypto
    .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET)
    .update(sorted)
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).json({ error: 'Firma inválida' });
  }

  const { order_id, payment_status } = req.body;

  if (payment_status === 'finished' || payment_status === 'confirmed') {
    const pago = db.get('pagos').find({ orderId: order_id }).value();
    if (pago) {
      db.get('pagos').find({ orderId: order_id }).assign({ estado: 'pagado' }).write();
      db.get('suscripciones').push({
        userId: pago.userId,
        planId: pago.planId,
        activaDesde: new Date().toISOString(),
        vigenteHasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).write();
      console.log(`✅ Suscripción activada: usuario ${pago.userId}, plan ${pago.planId}`);
    }
  }

  res.sendStatus(200);
});

app.get('/api/suscripcion/:userId', (req, res) => {
  const sub = db.get('suscripciones')
    .filter({ userId: req.params.userId })
    .sortBy('activaDesde')
    .last()
    .value();

  if (!sub) return res.json({ plan: 'basico' });

  const vigente = new Date(sub.vigenteHasta) > new Date();
  res.json({ plan: vigente ? sub.planId : 'basico', detalle: sub });
});

function sortObject(obj) {
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {});
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Marketa backend corriendo en puerto ${PORT}`));
