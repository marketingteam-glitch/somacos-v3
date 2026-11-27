// SOMACOS — réception des formulaires « Contact » et « Demande de devis » (fonction Vercel).
// Les demandes sont enregistrées et consultables dans l'espace admin : /admin/
import { addDemande, body, json, clientIp, redis, storeReady } from './_store.js';

const MAX = 5000;
const FIELDS = ['nom', 'societe', 'email', 'telephone', 'ville', 'profil', 'sujet', 'message', 'produits', 'page'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Méthode non autorisée.' });
  const b = body(req);
  if (b.site_web) return json(res, 200, { ok: true }); // robot (champ caché rempli)
  const v = (k) => String(b[k] ?? '').replace(/\r\n?/g, '\n').trim().slice(0, MAX);
  const type = v('type') === 'devis' ? 'devis' : 'contact';
  const rec = { type, ip: clientIp(req) };
  FIELDS.forEach((k) => { rec[k] = v(k); });

  if (!rec.nom || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rec.email)) return json(res, 422, { ok: false, error: 'Nom et e-mail valides requis.' });
  if (type === 'contact' && rec.message.length < 10) return json(res, 422, { ok: false, error: 'Message trop court.' });
  if (type === 'devis' && !rec.telephone) return json(res, 422, { ok: false, error: 'Téléphone requis.' });
  if (type === 'devis' && !rec.message && !rec.produits) return json(res, 422, { ok: false, error: 'Demande vide.' });
  if (!storeReady()) return json(res, 503, { ok: false, error: 'Stockage non configuré.' });

  try {
    // limitation simple : 5 envois / 10 min par adresse IP
    const k = `somacos:rate:${rec.ip}`;
    const n = await redis('INCR', k);
    if (n === 1) await redis('EXPIRE', k, 600);
    if (n > 5) return json(res, 429, { ok: false, error: 'Trop d’envois, réessayez dans quelques minutes.' });
    await addDemande(rec);
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('SOMACOS send', e);
    return json(res, 500, { ok: false, error: 'Enregistrement impossible.' });
  }
}
