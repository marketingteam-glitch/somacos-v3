<?php
/**
 * SOMACOS — espace admin : messages de contact et demandes de devis reçus depuis le site.
 * Adresse : https://votre-site/admin/
 * Première visite : création du mot de passe administrateur.
 */
declare(strict_types=1);
require __DIR__ . '/../api/storage.php';

const ADMIN_FILE = SOMACOS_DATA_DIR . '/admin.php';
const LOCK_FILE  = SOMACOS_DATA_DIR . '/tentatives.php';

session_name('somacos_admin');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Strict', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();
header('X-Frame-Options: DENY');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function admin_conf(): ?array { return somacos_read_file(ADMIN_FILE); }
function save_conf(array $c): void { somacos_write_file(ADMIN_FILE, $c); }
function csrf(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(16)); }
function csrf_ok(): bool { return hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['csrf'] ?? '')); }
function go(string $qs = ''): void { header('Location: ./' . ($qs ? "?$qs" : '')); exit; }
function flash(string $m): void { $_SESSION['flash'] = $m; }

// ---------------------------------------------------------------- anti-force brute (5 essais / 15 min par IP)
function attempts(): array { return somacos_read_file(LOCK_FILE) ?: []; }
function locked(string $ip): bool { $a = attempts()[$ip] ?? null; return $a && $a['n'] >= 5 && time() - $a['t'] < 900; }
function fail(string $ip): void { $a = attempts(); $cur = $a[$ip] ?? ['n' => 0, 't' => time()]; if (time() - $cur['t'] > 900) $cur = ['n' => 0, 't' => time()]; $cur['n']++; $cur['t'] = time(); $a[$ip] = $cur; somacos_write_file(LOCK_FILE, $a); }
function clear_fail(string $ip): void { $a = attempts(); unset($a[$ip]); somacos_write_file(LOCK_FILE, $a); }

$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$conf = admin_conf();
$action = $_POST['action'] ?? '';
$error = '';

// ---------------------------------------------------------------- création du mot de passe (1re visite)
if (!$conf) {
  if ($action === 'setup' && csrf_ok()) {
    $p1 = (string)($_POST['pass'] ?? ''); $p2 = (string)($_POST['pass2'] ?? '');
    if (mb_strlen($p1) < 8) $error = 'Le mot de passe doit contenir au moins 8 caractères.';
    elseif ($p1 !== $p2) $error = 'Les deux mots de passe ne correspondent pas.';
    else { save_conf(['hash' => password_hash($p1, PASSWORD_DEFAULT)]); session_regenerate_id(true); $_SESSION['admin'] = true; go(); }
  }
  page_auth('setup', $error); exit;
}

// ---------------------------------------------------------------- connexion / déconnexion
if ($action === 'login') {
  if (locked($ip)) $error = 'Trop de tentatives. Réessayez dans 15 minutes.';
  elseif (csrf_ok() && password_verify((string)($_POST['pass'] ?? ''), $conf['hash'])) { clear_fail($ip); session_regenerate_id(true); $_SESSION['admin'] = true; go(); }
  else { fail($ip); sleep(1); $error = 'Mot de passe incorrect.'; }
}
if (isset($_GET['logout'])) { $_SESSION = []; session_destroy(); go(); }
if (empty($_SESSION['admin'])) { page_auth('login', $error); exit; }

// ---------------------------------------------------------------- actions (connecté)
if ($action && csrf_ok()) {
  $id = (string)($_POST['id'] ?? '');
  $back = (string)($_POST['back'] ?? '');
  switch ($action) {
    case 'status': somacos_update($id, ['statut' => in_array($_POST['statut'] ?? '', ['nouveau', 'en_cours', 'traite'], true) ? $_POST['statut'] : 'nouveau']); flash('Statut mis à jour.'); break;
    case 'note': somacos_update($id, ['note' => mb_substr(trim((string)($_POST['note'] ?? '')), 0, 3000)]); flash('Note enregistrée.'); break;
    case 'unread': somacos_update($id, ['lu' => false]); flash('Marqué comme non lu.'); go(preg_replace('/(^|&)voir=[^&]*/', '', $back)); break;
    case 'delete': somacos_delete($id); flash('Demande supprimée.'); go(preg_replace('/(^|&)voir=[^&]*/', '', $back)); break;
    case 'readall': somacos_with_store(function ($items) { foreach ($items as &$it) $it['lu'] = true; return ['__save' => $items]; }); flash('Tout est marqué comme lu.'); break;
    case 'password':
      if (!password_verify((string)($_POST['old'] ?? ''), $conf['hash'])) flash('Ancien mot de passe incorrect.');
      elseif (mb_strlen((string)($_POST['new'] ?? '')) < 8) flash('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      else { save_conf(['hash' => password_hash((string)$_POST['new'], PASSWORD_DEFAULT)]); flash('Mot de passe modifié.'); }
      go('reglages=1');
  }
  go($back);
}

$all = somacos_all();

// ---------------------------------------------------------------- export CSV
if (isset($_GET['export'])) {
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename="somacos-demandes-' . date('Y-m-d') . '.csv"');
  $out = fopen('php://output', 'w');
  fwrite($out, "\xEF\xBB\xBF");
  $cols = ['date', 'type', 'statut', 'nom', 'societe', 'email', 'telephone', 'ville', 'profil', 'sujet', 'produits', 'message', 'note'];
  fputcsv($out, $cols, ';');
  foreach ($all as $it) fputcsv($out, array_map(fn($c) => $it[$c] ?? '', $cols), ';');
  exit;
}

// ---------------------------------------------------------------- filtres
$f = $_GET['f'] ?? 'tous';
$q = trim((string)($_GET['q'] ?? ''));
$list = array_values(array_filter($all, function ($it) use ($f, $q) {
  if ($f === 'devis' && $it['type'] !== 'devis') return false;
  if ($f === 'contact' && $it['type'] !== 'contact') return false;
  if ($f === 'nonlus' && !empty($it['lu'])) return false;
  if ($f === 'traites' && ($it['statut'] ?? '') !== 'traite') return false;
  if ($q !== '') {
    $hay = mb_strtolower(implode(' ', array_map(fn($k) => (string)($it[$k] ?? ''), ['nom', 'societe', 'email', 'telephone', 'ville', 'sujet', 'message', 'produits'])));
    if (mb_strpos($hay, mb_strtolower($q)) === false) return false;
  }
  return true;
}));
$count = [
  'tous' => count($all),
  'nonlus' => count(array_filter($all, fn($i) => empty($i['lu']))),
  'devis' => count(array_filter($all, fn($i) => $i['type'] === 'devis')),
  'contact' => count(array_filter($all, fn($i) => $i['type'] === 'contact')),
  'traites' => count(array_filter($all, fn($i) => ($i['statut'] ?? '') === 'traite')),
];
$voir = (string)($_GET['voir'] ?? '');
$cur = null;
foreach ($all as $it) if ($it['id'] === $voir) $cur = $it;
if ($cur && empty($cur['lu'])) { somacos_update($cur['id'], ['lu' => true]); $cur['lu'] = true; $count['nonlus']--; foreach ($list as &$l) if ($l['id'] === $cur['id']) $l['lu'] = true; unset($l); }
$qsBase = http_build_query(array_filter(['f' => $f !== 'tous' ? $f : null, 'q' => $q ?: null]));
$flash = $_SESSION['flash'] ?? ''; unset($_SESSION['flash']);
$STATUTS = ['nouveau' => 'Nouveau', 'en_cours' => 'En cours', 'traite' => 'Traité'];

function fdate(string $iso): string { $t = strtotime($iso); return $t ? date('d/m/Y H:i', $t) : $iso; }
function wa(string $tel): string { $d = preg_replace('/\D/', '', $tel); if (str_starts_with($d, '00')) $d = substr($d, 2); if (str_starts_with($d, '0')) $d = '212' . substr($d, 1); return $d; }

head('Demandes' . ($count['nonlus'] ? " ({$count['nonlus']})" : ''));
?>
<header class="top">
  <div class="brand"><?= logo() ?><span><b>SOMACOS</b> · Espace admin</span></div>
  <nav>
    <a href="../" target="_blank" rel="noopener">Voir le site ↗</a>
    <a href="?reglages=1">Réglages</a>
    <a href="?logout=1">Déconnexion</a>
  </nav>
</header>

<main class="wrap">
  <?php if ($flash): ?><p class="flash"><?= h($flash) ?></p><?php endif; ?>

  <?php if (isset($_GET['reglages'])): ?>
    <section class="card narrow">
      <h1>Réglages</h1>
      <h2>Changer le mot de passe</h2>
      <form method="post" class="stack">
        <input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="password">
        <label>Mot de passe actuel<input type="password" name="old" required autocomplete="current-password"></label>
        <label>Nouveau mot de passe (8 caractères min.)<input type="password" name="new" required minlength="8" autocomplete="new-password"></label>
        <button class="btn">Enregistrer</button>
      </form>
      <p class="muted">Mot de passe oublié ? Supprimez le fichier <code>api/data/admin.php</code> sur l’hébergement : la page vous proposera d’en créer un nouveau.</p>
      <p><a href="./">← Retour aux demandes</a></p>
    </section>
  <?php else: ?>

  <section class="stats">
    <div><b><?= $count['nonlus'] ?></b><span>Non lus</span></div>
    <div><b><?= $count['devis'] ?></b><span>Demandes de devis</span></div>
    <div><b><?= $count['contact'] ?></b><span>Messages</span></div>
    <div><b><?= $count['traites'] ?></b><span>Traités</span></div>
  </section>

  <div class="toolbar">
    <nav class="tabs">
      <?php foreach (['tous' => 'Tous', 'nonlus' => 'Non lus', 'devis' => 'Devis', 'contact' => 'Messages', 'traites' => 'Traités'] as $k => $l): ?>
        <a class="<?= $f === $k ? 'on' : '' ?>" href="?<?= h(http_build_query(array_filter(['f' => $k !== 'tous' ? $k : null, 'q' => $q ?: null]))) ?>"><?= $l ?> <span><?= $count[$k] ?></span></a>
      <?php endforeach; ?>
    </nav>
    <form class="search" method="get">
      <?php if ($f !== 'tous'): ?><input type="hidden" name="f" value="<?= h($f) ?>"><?php endif; ?>
      <input type="search" name="q" value="<?= h($q) ?>" placeholder="Rechercher nom, téléphone, produit…">
    </form>
    <div class="tools">
      <form method="post"><input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="readall"><input type="hidden" name="back" value="<?= h($qsBase) ?>"><button class="btn ghost">Tout marquer lu</button></form>
      <a class="btn ghost" href="?export=1">Exporter (Excel/CSV)</a>
    </div>
  </div>

  <div class="layout<?= $cur ? ' has-detail' : '' ?>">
    <section class="list">
      <?php if (!$list): ?>
        <p class="empty"><?= $all ? 'Aucune demande ne correspond.' : 'Aucune demande pour le moment. Les messages et demandes de devis envoyés depuis le site apparaîtront ici.' ?></p>
      <?php endif; ?>
      <?php foreach ($list as $it):
        $qs = http_build_query(array_filter(['f' => $f !== 'tous' ? $f : null, 'q' => $q ?: null, 'voir' => $it['id']]));
        $preview = $it['type'] === 'devis' ? ($it['produits'] ? preg_replace('/(^|\n)- /', '$1', $it['produits']) : $it['message']) : ($it['sujet'] ? $it['sujet'] . ' — ' : '') . $it['message'];
        $nprod = $it['produits'] ? count(array_filter(explode("\n", $it['produits']))) : 0; ?>
        <a class="row<?= empty($it['lu']) ? ' unread' : '' ?><?= $cur && $cur['id'] === $it['id'] ? ' active' : '' ?>" href="?<?= h($qs) ?>">
          <span class="badge <?= $it['type'] ?>"><?= $it['type'] === 'devis' ? 'Devis' : 'Message' ?></span>
          <span class="who"><b><?= h($it['nom']) ?></b><?= $it['societe'] ? ' · ' . h($it['societe']) : '' ?><small><?= h($it['telephone'] ?: $it['email']) ?></small></span>
          <span class="prev"><?= $nprod ? "<em>$nprod produit" . ($nprod > 1 ? 's' : '') . '</em> · ' : '' ?><?= h(mb_strimwidth(preg_replace('/\s+/', ' ', (string)$preview), 0, 110, '…')) ?></span>
          <span class="meta"><span class="st <?= h($it['statut']) ?>"><?= $STATUTS[$it['statut']] ?? '' ?></span><time><?= fdate($it['date']) ?></time></span>
        </a>
      <?php endforeach; ?>
    </section>

    <?php if ($cur): $back = http_build_query(array_filter(['f' => $f !== 'tous' ? $f : null, 'q' => $q ?: null, 'voir' => $cur['id']])); ?>
    <aside class="detail card">
      <a class="close" href="?<?= h($qsBase) ?>" aria-label="Fermer">×</a>
      <p class="eyebrow"><span class="badge <?= $cur['type'] ?>"><?= $cur['type'] === 'devis' ? 'Demande de devis' : 'Message de contact' ?></span> <time><?= fdate($cur['date']) ?></time></p>
      <h1><?= h($cur['nom']) ?></h1>
      <dl>
        <?php foreach (['societe' => 'Société', 'email' => 'E-mail', 'telephone' => 'Téléphone', 'ville' => 'Ville', 'profil' => 'Profil', 'sujet' => 'Sujet'] as $k => $l): if (!empty($cur[$k])): ?>
          <dt><?= $l ?></dt><dd><?php
            if ($k === 'email') echo '<a href="mailto:' . h($cur[$k]) . '">' . h($cur[$k]) . '</a>';
            elseif ($k === 'telephone') echo '<a href="tel:' . h(preg_replace('/[^+\d]/', '', $cur[$k])) . '">' . h($cur[$k]) . '</a>';
            else echo h($cur[$k]); ?></dd>
        <?php endif; endforeach; ?>
      </dl>
      <div class="actions">
        <?php if ($cur['email']): ?><a class="btn" href="mailto:<?= h($cur['email']) ?>?subject=<?= rawurlencode($cur['type'] === 'devis' ? 'Votre demande de devis — SOMACOS' : 'Re : ' . ($cur['sujet'] ?: 'votre message')) ?>">Répondre par e-mail</a><?php endif; ?>
        <?php if ($cur['telephone']): ?><a class="btn ghost" href="tel:<?= h(preg_replace('/[^+\d]/', '', $cur['telephone'])) ?>">Appeler</a>
        <a class="btn ghost" href="https://wa.me/<?= h(wa($cur['telephone'])) ?>" target="_blank" rel="noopener">WhatsApp</a><?php endif; ?>
      </div>
      <?php if ($cur['produits']): ?>
        <h2>Produits demandés</h2>
        <ul class="prods"><?php foreach (array_filter(explode("\n", $cur['produits'])) as $line): ?><li><?= h(ltrim($line, '- ')) ?></li><?php endforeach; ?></ul>
      <?php endif; ?>
      <?php if ($cur['message']): ?>
        <h2><?= $cur['type'] === 'devis' ? 'Projet' : 'Message' ?></h2>
        <p class="msg"><?= nl2br(h($cur['message'])) ?></p>
      <?php endif; ?>

      <h2>Suivi</h2>
      <form method="post" class="inline">
        <input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="status"><input type="hidden" name="id" value="<?= h($cur['id']) ?>"><input type="hidden" name="back" value="<?= h($back) ?>">
        <?php foreach ($STATUTS as $k => $l): ?>
          <button name="statut" value="<?= $k ?>" class="chip <?= $cur['statut'] === $k ? 'on ' . $k : '' ?>"><?= $l ?></button>
        <?php endforeach; ?>
      </form>
      <form method="post" class="stack">
        <input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="note"><input type="hidden" name="id" value="<?= h($cur['id']) ?>"><input type="hidden" name="back" value="<?= h($back) ?>">
        <label>Note interne<textarea name="note" rows="3" placeholder="Ex. devis envoyé le …, rappeler lundi"><?= h($cur['note'] ?? '') ?></textarea></label>
        <button class="btn ghost">Enregistrer la note</button>
      </form>
      <div class="foot">
        <form method="post"><input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="unread"><input type="hidden" name="id" value="<?= h($cur['id']) ?>"><input type="hidden" name="back" value="<?= h($back) ?>"><button class="link">Marquer non lu</button></form>
        <form method="post" onsubmit="return confirm('Supprimer définitivement cette demande ?')"><input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= h($cur['id']) ?>"><input type="hidden" name="back" value="<?= h($back) ?>"><button class="link danger">Supprimer</button></form>
      </div>
      <?php if (!empty($cur['page'])): ?><p class="muted small">Envoyé depuis : <?= h($cur['page']) ?></p><?php endif; ?>
    </aside>
    <?php endif; ?>
  </div>
  <?php endif; ?>
</main>
</body></html>
<?php
// ---------------------------------------------------------------- gabarits
function logo(): string {
  return '<svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true"><path d="M20 4c7 9.2 11 15.4 11 21a11 11 0 0 1-22 0C9 19.4 13 13.2 20 4z" fill="currentColor"/><path d="M14.5 26.5c1.6 3 5.4 4.3 8.6 2.8" fill="none" stroke="#f4f3ed" stroke-width="2.2" stroke-linecap="round"/></svg>';
}
function head(string $title): void { ?>
<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title><?= h($title) ?> · Admin SOMACOS</title>
<link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
<style>
@font-face{font-family:"Schibsted Grotesk";font-weight:400 900;font-display:swap;src:url("../assets/fonts/schibsted-grotesk-latin-wght-normal.woff2") format("woff2")}
:root{--f9:#0a2a20;--f8:#0d3a2c;--f7:#14493a;--f1:#e4ece6;--lime:#c3e65e;--lime50:#f2f8dc;--paper:#f4f3ed;--paper2:#ecebe3;--ink:#1a201d;--ink2:#444d48;--ink3:#6f7873;--line:#e0dfd5;--danger:#b3261e;--ok:#1f6b45;--amber:#9a6200}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 "Schibsted Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--f7)}code{background:var(--paper2);padding:1px 5px;border-radius:4px}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px clamp(16px,3vw,32px);background:var(--f9);color:#fff;position:sticky;top:0;z-index:5}
.brand{display:flex;align-items:center;gap:10px;color:var(--lime)}.brand span{color:#fff}.top nav{display:flex;gap:18px;flex-wrap:wrap}.top nav a{color:#dfe8e2;text-decoration:none;font-size:14px}.top nav a:hover{color:var(--lime)}
.wrap{max-width:1320px;margin:0 auto;padding:24px clamp(16px,3vw,32px) 60px}
.flash{background:var(--lime50);border:1px solid #d7e9a3;padding:10px 14px;border-radius:10px;margin:0 0 16px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.stats div{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px}.stats b{display:block;font-size:28px;line-height:1.1}.stats span{color:var(--ink3);font-size:13px}
.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:14px}
.tabs{display:flex;gap:4px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px;flex-wrap:wrap}.tabs a{padding:7px 14px;border-radius:999px;text-decoration:none;color:var(--ink2);font-size:14px}.tabs a span{color:var(--ink3);font-size:12px;margin-left:3px}.tabs a.on{background:var(--f8);color:#fff}.tabs a.on span{color:var(--lime)}
.search{flex:1;min-width:200px}.search input{width:100%}
.tools{display:flex;gap:8px}.tools form{margin:0}
input,textarea,select{font:inherit;padding:10px 12px;border:1px solid #cfcec3;border-radius:10px;background:#fff;color:var(--ink);width:100%}
input:focus,textarea:focus{outline:2px solid var(--lime);border-color:var(--f7)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border-radius:999px;background:var(--f8);color:#fff;border:1px solid var(--f8);font:inherit;font-weight:600;font-size:14px;text-decoration:none;cursor:pointer;white-space:nowrap}.btn:hover{background:var(--f7)}
.btn.ghost{background:#fff;color:var(--f8);border-color:#cfcec3}.btn.ghost:hover{border-color:var(--f8)}
.layout{display:grid;grid-template-columns:1fr;gap:16px;align-items:start}.layout.has-detail{grid-template-columns:minmax(0,1fr) minmax(340px,480px)}
.list{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden}
.row{display:grid;grid-template-columns:78px minmax(150px,220px) 1fr auto;gap:14px;align-items:center;padding:13px 16px;border-bottom:1px solid var(--line);text-decoration:none;color:var(--ink)}
.row:last-child{border-bottom:0}.row:hover{background:var(--paper)}.row.active{background:var(--f1)}
.row.unread{box-shadow:inset 3px 0 0 var(--lime)}.row.unread .who b::after{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#7fb11a;margin-left:6px;vertical-align:middle}
.row:not(.unread) .who b{font-weight:500}
.who small{display:block;color:var(--ink3);font-size:13px}.prev{color:var(--ink2);font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.prev em{font-style:normal;color:var(--f7);font-weight:600}
.meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px}.meta time{font-size:12px;color:var(--ink3);white-space:nowrap}
.badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:6px;text-align:center}.badge.devis{background:var(--lime);color:var(--f9)}.badge.contact{background:var(--f1);color:var(--f7)}
.st{font-size:12px;padding:2px 8px;border-radius:999px;background:var(--paper2);color:var(--ink2)}.st.nouveau{background:#fff3d6;color:var(--amber)}.st.en_cours{background:#e3eefc;color:#1d4f91}.st.traite{background:#dff1e6;color:var(--ok)}
.empty{padding:40px 20px;text-align:center;color:var(--ink3)}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px}.narrow{max-width:520px}
.detail{position:sticky;top:84px;max-height:calc(100vh - 100px);overflow:auto}
.close{position:absolute;right:18px;top:12px;font-size:26px;text-decoration:none;color:var(--ink3)}.detail{position:sticky}
.eyebrow{display:flex;gap:10px;align-items:center;margin:0 0 6px;color:var(--ink3);font-size:13px}
h1{font-size:24px;margin:0 0 12px;line-height:1.2}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);margin:22px 0 8px}
dl{display:grid;grid-template-columns:110px 1fr;gap:6px 12px;margin:0}dt{color:var(--ink3);font-size:14px}dd{margin:0;word-break:break-word}
.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.prods{margin:0;padding:0;list-style:none;border:1px solid var(--line);border-radius:12px}.prods li{padding:9px 12px;border-bottom:1px solid var(--line);font-size:14px}.prods li:last-child{border:0}
.msg{background:var(--paper);border-radius:12px;padding:12px 14px;margin:0;white-space:normal}
.inline{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}.chip{font:inherit;font-size:14px;padding:7px 14px;border-radius:999px;border:1px solid #cfcec3;background:#fff;cursor:pointer}.chip.on.nouveau{background:#fff3d6;border-color:#f0d68a}.chip.on.en_cours{background:#e3eefc;border-color:#a9c6ef}.chip.on.traite{background:#dff1e6;border-color:#9fd0b2}
.stack{display:grid;gap:10px}.stack label{display:grid;gap:6px;font-size:14px;color:var(--ink2)}
.foot{display:flex;justify-content:space-between;margin-top:20px;padding-top:12px;border-top:1px solid var(--line)}.foot form{margin:0}
.link{background:none;border:0;font:inherit;color:var(--f7);cursor:pointer;padding:0;text-decoration:underline}.link.danger{color:var(--danger)}
.muted{color:var(--ink3)}.small{font-size:12px;word-break:break-all;margin-top:12px}
.auth{min-height:100vh;display:grid;place-items:center;padding:20px;background:var(--f9)}.auth .card{width:100%;max-width:400px}.auth .brand{color:var(--f8);margin-bottom:18px}.auth .brand span{color:var(--ink)}.err{color:var(--danger);margin:0}
@media (max-width:960px){.layout.has-detail{grid-template-columns:1fr}.detail{position:static;max-height:none;order:-1}.row{grid-template-columns:70px 1fr auto}.prev{display:none}.stats{grid-template-columns:repeat(2,1fr)}}
</style></head><body>
<?php }
function page_auth(string $mode, string $error): void {
  head($mode === 'setup' ? 'Créer le mot de passe' : 'Connexion'); ?>
<main class="auth"><section class="card">
  <div class="brand"><?= logo() ?><span><b>SOMACOS</b> · Espace admin</span></div>
  <?php if ($mode === 'setup'): ?>
    <h1>Créer le mot de passe</h1>
    <p class="muted">Première connexion : choisissez le mot de passe qui protégera l’espace admin.</p>
  <?php else: ?>
    <h1>Connexion</h1>
    <p class="muted">Messages et demandes de devis reçus depuis le site.</p>
  <?php endif; ?>
  <?php if ($error): ?><p class="err"><?= h($error) ?></p><?php endif; ?>
  <form method="post" class="stack" style="margin-top:14px">
    <input type="hidden" name="csrf" value="<?= h(csrf()) ?>">
    <input type="hidden" name="action" value="<?= $mode ?>">
    <label>Mot de passe<input type="password" name="pass" required <?= $mode === 'setup' ? 'minlength="8" autocomplete="new-password"' : 'autocomplete="current-password" autofocus' ?>></label>
    <?php if ($mode === 'setup'): ?><label>Confirmer le mot de passe<input type="password" name="pass2" required minlength="8" autocomplete="new-password"></label><?php endif; ?>
    <button class="btn"><?= $mode === 'setup' ? 'Créer et entrer' : 'Se connecter' ?></button>
  </form>
</section></main></body></html>
<?php }
