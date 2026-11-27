// SOMACOS — API de l'espace admin (/admin/). Mot de passe : variable d'environnement ADMIN_PASSWORD.
import crypto from 'node:crypto';
import { allDemandes, updateDemande, deleteDemande, body, json, clientIp, redis, storeReady } from './_store.js';

const PASS = process.env.ADMIN_PASSWORD || '';
const SECRET = crypto.createHash('sha256').update(`somacos|${PASS}|${process.env.ADMIN_SECRET || ''}`).digest();
const COOKIE = 'somacos_admin';
const DAYS = 7;

const sign = (exp) => crypto.createHmac('sha256', SECRET).update(String(exp)).digest('hex');
function authed(req) {
  const m = String(req.headers.cookie || '').match(new RegExp(`${COOKIE}=(\\d+)\\.([a-f0-9]{64})`));
  if (!m || Number(m[1]) < Date.now()) return false;
  const a = Buffer.from(m[2], 'hex'); const b = Buffer.from(sign(m[1]), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const cookie = (val, maxAge) => `${COOKIE}=${val}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.VERCEL ? '; Secure' : ''}`;
const same = (x, y) => { const a = crypto.createHash('sha256').update(x).digest(); const b = crypto.createHash('sha256').update(y).digest(); return crypto.timingSafeEqual(a, b); };

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const action = url.searchParams.get('action') || '';
  const b = req.method === 'POST' ? body(req) : {};

  if (action === 'status') return json(res, 200, { ok: true, configured: Boolean(PASS) && storeReady(), password: Boolean(PASS), store: storeReady(), authed: PASS ? authed(req) : false });

  if (action === 'login' && req.method === 'POST') {
    if (!PASS) return json(res, 503, { ok: false, error: 'ADMIN_PASSWORD n’est pas défini sur Vercel.' });
    const ip = clientIp(req); const k = `somacos:login:${ip}`;
    let tries = 0;
    if (storeReady()) tries = Number(await redis('GET', k)) || 0;
    if (tries >= 5) return json(res, 429, { ok: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    if (!same(String(b.password || ''), PASS)) {
      if (storeReady()) { await redis('INCR', k); await redis('EXPIRE', k, 900); }
      await new Promise((r) => setTimeout(r, 800));
      return json(res, 401, { ok: false, error: 'Mot de passe incorrect.' });
    }
    if (storeReady()) await redis('DEL', k);
    const exp = Date.now() + DAYS * 864e5;
    res.setHeader('Set-Cookie', cookie(`${exp}.${sign(exp)}`, DAYS * 86400));
    return json(res, 200, { ok: true });
  }
  if (action === 'logout') { res.setHeader('Set-Cookie', cookie('', 0)); return json(res, 200, { ok: true }); }

  if (!PASS || !authed(req)) return json(res, 401, { ok: false, error: 'Non connecté.' });
  if (!storeReady()) return json(res, 503, { ok: false, error: 'Base Redis non connectée.' });

  try {
    if (action === 'list') return json(res, 200, { ok: true, items: await allDemandes() });
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Méthode non autorisée.' });
    const id = String(b.id || '');
    if (action === 'update') {
      const ch = {};
      if (['nouveau', 'en_cours', 'traite'].includes(b.statut)) ch.statut = b.statut;
      if (typeof b.lu === 'boolean') ch.lu = b.lu;
      if (typeof b.note === 'string') ch.note = b.note.slice(0, 3000);
      const item = await updateDemande(id, ch);
      return item ? json(res, 200, { ok: true, item }) : json(res, 404, { ok: false, error: 'Introuvable.' });
    }
    if (action === 'readall') {
      const items = await allDemandes();
      await Promise.all(items.filter((i) => !i.lu && (!b.type || i.type === b.type)).map((i) => updateDemande(i.id, { lu: true })));
      return json(res, 200, { ok: true });
    }
    if (action === 'delete') { await deleteDemande(id); return json(res, 200, { ok: true }); }
    return json(res, 400, { ok: false, error: 'Action inconnue.' });
  } catch (e) {
    console.error('SOMACOS admin', e);
    return json(res, 500, { ok: false, error: 'Erreur serveur.' });
  }
}
