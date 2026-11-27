// SOMACOS — stockage des demandes dans Redis (Upstash, via son API REST : aucune dépendance npm).
// Variables d'environnement (ajoutées automatiquement par l'intégration « Upstash for Redis » de Vercel) :
//   KV_REST_API_URL + KV_REST_API_TOKEN   (ou UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
import crypto from 'node:crypto';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const IDS = 'somacos:ids';
const KEY = (id) => `somacos:d:${id}`;

export const storeReady = () => Boolean(URL_ && TOKEN);

async function call(path, body) {
  if (!storeReady()) throw new Error('STORE_MISSING');
  const r = await fetch(`${URL_}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `Redis HTTP ${r.status}`);
  return data;
}
export const redis = async (...cmd) => (await call('', cmd)).result;
export const pipeline = async (cmds) => (await call('/pipeline', cmds)).map((x) => x.result);

export async function addDemande(rec) {
  const id = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${crypto.randomBytes(3).toString('hex')}`;
  const item = { ...rec, id, date: new Date().toISOString(), statut: 'nouveau', lu: false, note: '' };
  await pipeline([['SET', KEY(id), JSON.stringify(item)], ['LPUSH', IDS, id]]);
  return item;
}
export async function allDemandes() {
  const ids = (await redis('LRANGE', IDS, 0, -1)) || [];
  if (!ids.length) return [];
  const raw = await redis('MGET', ...ids.map(KEY));
  return raw.filter(Boolean).map((s) => JSON.parse(s));
}
export async function updateDemande(id, changes) {
  const raw = await redis('GET', KEY(id));
  if (!raw) return null;
  const item = { ...JSON.parse(raw), ...changes, id };
  await redis('SET', KEY(id), JSON.stringify(item));
  return item;
}
export async function deleteDemande(id) {
  await pipeline([['DEL', KEY(id)], ['LREM', IDS, 0, id]]);
}

// ------------------------------------------------------------------ utilitaires HTTP
export function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return Object.fromEntries(new URLSearchParams(req.body)); } }
  return {};
}
export function json(res, code, data) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
export const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
