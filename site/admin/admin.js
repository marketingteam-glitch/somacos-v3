/* SOMACOS — espace admin : messages de contact et demandes de devis (API : /api/admin). */
(function () {
  'use strict';
  const API = '/api/admin';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STATUTS = { nouveau: 'Nouveau', en_cours: 'En cours', traite: 'Traité' };
  const TABS = { tous: 'Tous', nonlus: 'Non lus', nouveau: 'Nouveaux', en_cours: 'En cours', traite: 'Traités' };
  const SECTIONS = { devis: { title: 'Commandes — demandes de devis', hash: '#commandes', file: 'commandes' }, contact: { title: 'Messages de contact', hash: '#messages', file: 'messages' } };
  const state = { items: [], sec: location.hash === '#messages' ? 'contact' : 'devis', f: 'tous', q: '', cur: null };

  async function api(action, data) {
    const opt = data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {};
    const r = await fetch(`${API}?action=${action}`, { credentials: 'same-origin', cache: 'no-store', ...opt });
    const j = await r.json().catch(() => ({ ok: false, error: `Erreur ${r.status}` }));
    if (r.status === 401 && action !== 'login') { showLogin(); throw new Error('auth'); }
    if (!j.ok) throw new Error(j.error || 'Erreur');
    return j;
  }
  const fdate = (iso) => { const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const tel = (t) => String(t).replace(/[^+\d]/g, '');
  const wa = (t) => { let d = String(t).replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = `212${d.slice(1)}`; return d; };
  const lines = (s) => String(s || '').split('\n').map((l) => l.replace(/^-\s*/, '').trim()).filter(Boolean);
  function flash(msg) { const el = $('#flash'); el.textContent = msg; el.classList.remove('hidden'); clearTimeout(flash.t); flash.t = setTimeout(() => el.classList.add('hidden'), 3000); }

  // ------------------------------------------------------------ vues
  async function showLogin() {
    $('#v-app').classList.add('hidden'); $('#v-login').classList.remove('hidden');
    try {
      const s = await (await fetch(`${API}?action=status`, { cache: 'no-store' })).json();
      const miss = [];
      if (!s.password) miss.push('Ajoutez la variable d’environnement <code>ADMIN_PASSWORD</code> (Vercel → Settings → Environment Variables).');
      if (!s.store) miss.push('Connectez une base Redis : Vercel → Storage → <b>Upstash for Redis</b> → Connect to project.');
      if (miss.length) { $('#setup').innerHTML = `<b>Configuration à terminer sur Vercel :</b><ol>${miss.map((m) => `<li>${m}</li>`).join('')}</ol><p style="margin:8px 0 0">Puis redéployez le projet.</p>`; $('#setup').classList.remove('hidden'); }
    } catch (e) { /* hors ligne */ }
  }
  function showApp() { $('#v-login').classList.add('hidden'); $('#v-app').classList.remove('hidden'); }

  const inSec = () => state.items.filter((i) => i.type === state.sec);
  const counts = () => {
    const l = inSec();
    return { tous: l.length, nonlus: l.filter((i) => !i.lu).length, nouveau: l.filter((i) => i.statut === 'nouveau').length, en_cours: l.filter((i) => i.statut === 'en_cours').length, traite: l.filter((i) => i.statut === 'traite').length };
  };
  function filtered() {
    const q = state.q.toLowerCase();
    return inSec().filter((it) => {
      if (state.f === 'nonlus' && it.lu) return false;
      if (['nouveau', 'en_cours', 'traite'].includes(state.f) && it.statut !== state.f) return false;
      if (q && !['nom', 'societe', 'email', 'telephone', 'ville', 'sujet', 'message', 'produits'].map((k) => it[k] || '').join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function render() {
    const c = counts();
    const unread = (t) => state.items.filter((i) => i.type === t && !i.lu).length;
    const totalUnread = unread('devis') + unread('contact');
    document.title = `${totalUnread ? `(${totalUnread}) ` : ''}Admin SOMACOS`;
    document.querySelectorAll('[data-sec]').forEach((a) => a.classList.toggle('on', a.dataset.sec === state.sec));
    document.querySelectorAll('[data-n]').forEach((e) => { const n = unread(e.dataset.n); e.textContent = n ? String(n) : ''; e.title = `${n} non lu(s)`; });
    $('#sec-title').textContent = SECTIONS[state.sec].title;
    const lbl = state.sec === 'devis' ? 'Commandes' : 'Messages';
    $('#stats').innerHTML = [['tous', lbl], ['nonlus', 'Non lus'], ['en_cours', 'En cours'], ['traite', 'Traités']].map(([k, l]) => `<div><b>${c[k]}</b><span>${l}</span></div>`).join('');
    $('#tabs').innerHTML = Object.entries(TABS).map(([k, l]) => `<a href="#" data-f="${k}" class="${state.f === k ? 'on' : ''}">${l} <span>${c[k]}</span></a>`).join('');
    const list = filtered();
    $('#list').innerHTML = list.length ? list.map((it) => {
      const n = lines(it.produits).length;
      const prev = it.type === 'devis' ? (n ? lines(it.produits).join(' · ') : it.message) : `${it.sujet ? `${it.sujet} — ` : ''}${it.message}`;
      return `<a href="#" class="row${it.lu ? '' : ' unread'}${state.cur === it.id ? ' active' : ''}" data-id="${esc(it.id)}">
        <span class="badge ${it.type}">${it.type === 'devis' ? 'Devis' : 'Message'}</span>
        <span class="who"><b>${esc(it.nom)}</b>${it.societe ? ` · ${esc(it.societe)}` : ''}<small>${esc(it.telephone || it.email)}</small></span>
        <span class="prev">${n ? `<em>${n} produit${n > 1 ? 's' : ''}</em> · ` : ''}${esc(String(prev).replace(/\s+/g, ' ').slice(0, 120))}</span>
        <span class="meta"><span class="st ${it.statut}">${STATUTS[it.statut] || ''}</span><time>${fdate(it.date)}</time></span></a>`;
    }).join('') : `<p class="empty">${inSec().length ? 'Aucun résultat pour ce filtre.' : (state.sec === 'devis' ? 'Aucune commande pour le moment. Les demandes de devis envoyées depuis le site apparaîtront ici.' : 'Aucun message pour le moment. Les messages du formulaire de contact apparaîtront ici.')}</p>`;
    renderDetail();
  }

  function renderDetail() {
    const it = state.items.find((i) => i.id === state.cur);
    $('#layout').classList.toggle('has-detail', Boolean(it));
    const d = $('#detail');
    if (!it) { d.classList.add('hidden'); return; }
    d.classList.remove('hidden');
    const rows = [['societe', 'Société'], ['email', 'E-mail'], ['telephone', 'Téléphone'], ['ville', 'Ville'], ['profil', 'Profil'], ['sujet', 'Sujet']].filter(([k]) => it[k]).map(([k, l]) => {
      let v = esc(it[k]);
      if (k === 'email') v = `<a href="mailto:${esc(it.email)}">${v}</a>`;
      if (k === 'telephone') v = `<a href="tel:${esc(tel(it.telephone))}">${v}</a>`;
      return `<dt>${l}</dt><dd>${v}</dd>`;
    }).join('');
    const subj = it.type === 'devis' ? 'Votre demande de devis — SOMACOS' : `Re : ${it.sujet || 'votre message'}`;
    const prods = lines(it.produits);
    d.innerHTML = `
      <a class="close" href="#" data-close aria-label="Fermer">×</a>
      <p class="eyebrow"><span class="badge ${it.type}">${it.type === 'devis' ? 'Demande de devis' : 'Message de contact'}</span> <time>${fdate(it.date)}</time></p>
      <h1>${esc(it.nom)}</h1>
      <dl>${rows}</dl>
      <div class="actions">
        ${it.email ? `<a class="btn" href="mailto:${esc(it.email)}?subject=${encodeURIComponent(subj)}">Répondre par e-mail</a>` : ''}
        ${it.telephone ? `<a class="btn ghost" href="tel:${esc(tel(it.telephone))}">Appeler</a><a class="btn ghost" href="https://wa.me/${esc(wa(it.telephone))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      </div>
      ${prods.length ? `<h2>Produits demandés</h2><ul class="prods">${prods.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      ${it.message ? `<h2>${it.type === 'devis' ? 'Projet' : 'Message'}</h2><p class="msg">${esc(it.message).replace(/\n/g, '<br>')}</p>` : ''}
      <h2>Suivi</h2>
      <div class="inline">${Object.entries(STATUTS).map(([k, l]) => `<button class="chip ${it.statut === k ? `on ${k}` : ''}" data-statut="${k}">${l}</button>`).join('')}</div>
      <form class="stack" data-note><label>Note interne<textarea name="note" rows="3" placeholder="Ex. devis envoyé le …, rappeler lundi">${esc(it.note || '')}</textarea></label><button class="btn ghost">Enregistrer la note</button></form>
      <div class="foot"><button class="link" data-unread>Marquer non lu</button><button class="link danger" data-delete>Supprimer</button></div>
      ${it.page ? `<p class="muted small">Envoyé depuis : ${esc(it.page)}</p>` : ''}`;
  }

  // ------------------------------------------------------------ données
  async function load(quiet) {
    const j = await api('list');
    state.items = j.items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    $('#updated').textContent = `Mis à jour à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · actualisation automatique chaque minute`;
    render();
    if (!quiet) showApp();
  }
  async function patch(id, data, msg) {
    const j = await api('update', { id, ...data });
    const i = state.items.findIndex((x) => x.id === id); if (i >= 0) state.items[i] = j.item;
    render(); if (msg) flash(msg);
  }
  async function open(id) {
    state.cur = id; render();
    const it = state.items.find((i) => i.id === id);
    if (it && !it.lu) patch(id, { lu: true }).catch(() => {});
    if (window.innerWidth < 960) $('#detail').scrollIntoView({ behavior: 'smooth' });
  }

  // ------------------------------------------------------------ évènements
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#login-err').textContent = '';
    const btn = e.target.querySelector('button'); btn.disabled = true;
    try { await api('login', { password: e.target.password.value }); e.target.reset(); await load(); }
    catch (err) { if (err.message !== 'auth') $('#login-err').textContent = err.message; }
    finally { btn.disabled = false; }
  });
  $('#logout').addEventListener('click', async (e) => { e.preventDefault(); await fetch(`${API}?action=logout`); state.items = []; state.cur = null; showLogin(); });
  function setSection(sec) { state.sec = sec; state.f = 'tous'; state.cur = null; state.q = ''; $('#search').q.value = ''; history.replaceState(null, '', SECTIONS[sec].hash); render(); }
  $('#sections').addEventListener('click', (e) => { const a = e.target.closest('[data-sec]'); if (!a) return; e.preventDefault(); setSection(a.dataset.sec); });
  window.addEventListener('hashchange', () => setSection(location.hash === '#messages' ? 'contact' : 'devis'));
  $('#tabs').addEventListener('click', (e) => { const a = e.target.closest('[data-f]'); if (!a) return; e.preventDefault(); state.f = a.dataset.f; render(); });
  $('#search').addEventListener('submit', (e) => e.preventDefault());
  $('#search').q.addEventListener('input', (e) => { state.q = e.target.value.trim(); render(); });
  $('#list').addEventListener('click', (e) => { const a = e.target.closest('[data-id]'); if (!a) return; e.preventDefault(); open(a.dataset.id); });
  $('#reload').addEventListener('click', () => load(true).then(() => flash('Liste actualisée.')).catch(() => {}));
  $('#readall').addEventListener('click', async () => { await api('readall', { type: state.sec }); inSec().forEach((i) => { i.lu = true; }); render(); flash('Tout est marqué comme lu.'); });
  $('#export').addEventListener('click', () => {
    const cols = [['date', 'Date', 17], ['type', 'Type', 10], ['statut', 'Statut', 10], ['nom', 'Nom', 22], ['societe', 'Société', 20], ['telephone', 'Téléphone', 15], ['email', 'E-mail', 28], ['ville', 'Ville', 14], ['profil', 'Profil', 18], ['sujet', 'Sujet', 22], ['produits', 'Produits demandés', 60], ['message', 'Message / projet', 50], ['note', 'Note interne', 30]];
    const val = (it, k) => (k === 'date' ? fdate(it.date) : k === 'statut' ? STATUTS[it.statut] : k === 'type' ? (it.type === 'devis' ? 'Devis' : 'Message') : k === 'produits' ? lines(it.produits).join('\n') : it[k] || '');
    const skip = state.sec === 'devis' ? ['type', 'sujet'] : ['type', 'produits', 'societe', 'ville', 'profil'];
    const use = cols.filter(([k]) => !skip.includes(k));
    const rows = [use.map((c) => c[1]), ...filtered().map((it) => use.map(([k]) => val(it, k)))];
    const blob = xlsx(rows, use.map((c) => c[2]));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `somacos-${SECTIONS[state.sec].file}-${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });

  // ------------------------------------------------------------ fichier Excel (.xlsx) sans dépendance
  function xlsx(rows, widths) {
    const x = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    const colName = (i) => { let n = ''; i++; while (i) { const m = (i - 1) % 26; n = String.fromCharCode(65 + m) + n; i = Math.floor((i - 1) / 26); } return n; };
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${
  rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => `<c r="${colName(ci)}${ri + 1}" t="inlineStr" s="${ri ? 2 : 1}"><is><t xml:space="preserve">${x(v)}</t></is></c>`).join('')}</row>`).join('')
}</sheetData><autoFilter ref="A1:${colName(rows[0].length - 1)}${rows.length}"/></worksheet>`;
    const files = {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Liste" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Liste!$A$1:$' + colName(rows[0].length - 1) + '$' + rows.length + '</definedName></definedNames></workbook>',
      'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0D3A2C"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
      'xl/worksheets/sheet1.xml': sheet,
    };
    return new Blob([zip(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function zip(files) {
    const enc = new TextEncoder();
    const crcT = zip.t || (zip.t = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }));
    const crc = (d) => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = crcT[(c ^ d[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    const parts = []; const central = []; let off = 0;
    const u16 = (v) => [v & 255, (v >>> 8) & 255]; const u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    for (const [name, content] of Object.entries(files)) {
      const n = enc.encode(name); const d = enc.encode(content); const c = crc(d);
      const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(d.length), ...u32(d.length), ...u16(n.length), ...u16(0)];
      const local = new Uint8Array([...u32(0x04034b50), ...common]);
      parts.push(local, n, d);
      central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), n);
      off += local.length + n.length + d.length;
    }
    const cSize = central.reduce((s, p) => s + p.length, 0);
    const count = Object.keys(files).length;
    const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(count), ...u16(count), ...u32(cSize), ...u32(off), ...u16(0)]);
    return new Blob([...parts, ...central, end]);
  }
  $('#detail').addEventListener('click', async (e) => {
    const id = state.cur;
    if (e.target.closest('[data-close]')) { e.preventDefault(); state.cur = null; render(); return; }
    const st = e.target.closest('[data-statut]');
    if (st) return patch(id, { statut: st.dataset.statut }, 'Statut mis à jour.');
    if (e.target.closest('[data-unread]')) { await patch(id, { lu: false }, 'Marqué comme non lu.'); state.cur = null; render(); return; }
    if (e.target.closest('[data-delete]') && confirm('Supprimer définitivement cette demande ?')) {
      await api('delete', { id }); state.items = state.items.filter((i) => i.id !== id); state.cur = null; render(); flash('Demande supprimée.');
    }
  });
  $('#detail').addEventListener('submit', (e) => { if (!e.target.matches('[data-note]')) return; e.preventDefault(); patch(state.cur, { note: e.target.note.value }, 'Note enregistrée.'); });

  setInterval(() => { if (!$('#v-app').classList.contains('hidden') && !document.hidden) load(true).catch(() => {}); }, 60000);
  load().catch(() => {});
})();
