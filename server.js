const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'leads.jsonl');
fs.mkdirSync(DATA_DIR, { recursive: true });

app.set('trust proxy', 1); // Render fica atrás de um proxy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ['https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(express.json({ limit: '10kb' }));

app.get('/healthz', (_req, res) => res.send('ok'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos. Tente novamente dentro de alguns minutos.' }
});

const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

app.post('/api/leads', limiter, async (req, res) => {
  const b = req.body || {};
  if (clean(b.website, 100)) return res.json({ ok: true }); // campo-armadilha para robôs

  const lead = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    name: clean(b.name, 80),
    shop: clean(b.shop, 80),
    phone: clean(b.phone, 25),
    note: clean(b.note, 500)
  };
  const digits = lead.phone.replace(/\D/g, '');
  if (lead.name.length < 2 || lead.shop.length < 2)
    return res.status(400).json({ error: 'Indique o seu nome e o nome da ótica.' });
  if (!/^[+\d\s()-]+$/.test(lead.phone) || digits.length < 8 || digits.length > 15)
    return res.status(400).json({ error: 'Indique um número de WhatsApp válido.' });

  let saved = false;
  try { fs.appendFileSync(FILE, JSON.stringify(lead) + '\n'); saved = true; }
  catch (e) { console.error('save', e.message); }

  const hook = process.env.LEAD_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(5000)
      });
      if (r.ok) saved = true; else console.error('webhook', r.status);
    } catch (e) { console.error('webhook', e.message); }
  }

  if (!saved) return res.status(503).json({ error: 'Não foi possível guardar o pedido. Fale connosco pelo WhatsApp.' });
  console.log('lead', lead.id);
  res.json({ ok: true });
});

app.get('/admin/leads', (req, res) => {
  const token = process.env.ADMIN_TOKEN || '';
  const got = (req.get('authorization') || '').replace(/^Bearer /, '');
  const a = Buffer.from(got), b = Buffer.from(token);
  res.set('Cache-Control', 'no-store');
  if (!token || a.length !== b.length || !crypto.timingSafeEqual(a, b))
    return res.status(401).json({ error: 'unauthorized' });
  let rows = [];
  try { rows = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map(JSON.parse); } catch {}
  res.json(rows.reverse());
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '1h' }));
app.use((_req, res) => res.status(404).send('Página não encontrada'));
app.use((_err, _req, res, _next) => res.status(400).json({ error: 'Pedido inválido.' }));

app.listen(PORT, () => console.log('NEXUSCALES a correr na porta ' + PORT));
