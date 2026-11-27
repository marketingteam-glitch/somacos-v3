// SOMACOS — serveur local : site + formulaires + espace admin, comme sur Vercel.
// Usage : node local.mjs   →   http://localhost:8080   ·   admin : http://localhost:8080/admin/
// Mot de passe admin en local : somacos (ou variable ADMIN_PASSWORD). Données locales : .local-data.json
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const DATA = path.join(ROOT, '.local-data.json');

// --- mini « Redis » local (même API REST qu'Upstash), sauvegardé dans .local-data.json
const db = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : { kv: {}, lists: {} };
const save = () => fs.writeFileSync(DATA, JSON.stringify(db));
function run([cmd, ...a]) {
  const { kv, lists } = db;
  switch (cmd.toUpperCase()) {
    case 'SET': kv[a[0]] = String(a[1]); save(); return 'OK';
    case 'GET': return kv[a[0]] ?? null;
    case 'DEL': { let n = 0; a.forEach((k) => { if (k in kv) { delete kv[k]; n++; } }); save(); return n; }
    case 'MGET': return a.map((k) => kv[k] ?? null);
    case 'INCR': kv[a[0]] = String((Number(kv[a[0]]) || 0) + 1); save(); return Number(kv[a[0]]);
    case 'EXPIRE': setTimeout(() => { delete kv[a[0]]; save(); }, Number(a[1]) * 1000).unref(); return 1;
    case 'LPUSH': { const l = lists[a[0]] ||= []; l.unshift(...a.slice(1).map(String)); save(); return l.length; }
    case 'LRANGE': { const l = lists[a[0]] || []; const end = Number(a[2]); return l.slice(Number(a[1]), end === -1 ? undefined : end + 1); }
    case 'LREM': lists[a[0]] = (lists[a[0]] || []).filter((x) => x !== String(a[2])); save(); return 1;
    default: throw new Error(`Commande non gérée : ${cmd}`);
  }
}
process.env.KV_REST_API_URL = `http://localhost:${PORT}/__redis`;
process.env.KV_REST_API_TOKEN = 'local';
process.env.ADMIN_PASSWORD ||= 'somacos';

const send = (await import(pathToFileURL(path.join(ROOT, 'api/send.js')))).default;
const admin = (await import(pathToFileURL(path.join(ROOT, 'api/admin.js')))).default;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg' };

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/__redis') || u.pathname.startsWith('/api/')) {
    let b = '';
    req.on('data', (d) => { b += d; });
    req.on('end', async () => {
      try {
        if (u.pathname.startsWith('/__redis')) {
          const j = JSON.parse(b);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(u.pathname.endsWith('/pipeline') ? j.map((c) => ({ result: run(c) })) : { result: run(j) }));
        }
        const ct = req.headers['content-type'] || '';
        req.body = ct.includes('json') ? JSON.parse(b || '{}') : ct.includes('urlencoded') ? Object.fromEntries(new URLSearchParams(b)) : b;
        if (u.pathname === '/api/send') return await send(req, res);
        if (u.pathname === '/api/admin') return await admin(req, res);
        res.statusCode = 404; res.end('404');
      } catch (e) { console.error(e); res.statusCode = 500; res.end('Erreur'); }
    });
    return;
  }
  let p = decodeURIComponent(u.pathname);
  let f = path.join(ROOT, 'site', p);
  if (!f.startsWith(path.join(ROOT, 'site'))) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
    if (!p.endsWith('/')) { res.statusCode = 301; res.setHeader('Location', `${p}/${u.search}`); return res.end(); }
    f = path.join(f, 'index.html');
  }
  if (!fs.existsSync(f)) { res.statusCode = 404; f = path.join(ROOT, 'site', '404.html'); }
  res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => {
  console.log(`\n  Site  : http://localhost:${PORT}`);
  console.log(`  Admin : http://localhost:${PORT}/admin/   (mot de passe local : ${process.env.ADMIN_PASSWORD})`);
  console.log('  Fermez cette fenêtre pour arrêter.\n');
});
