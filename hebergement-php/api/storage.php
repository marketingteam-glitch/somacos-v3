<?php
/**
 * SOMACOS — stockage des demandes (contact + devis) dans api/data/demandes.php.
 * Fichier JSON verrouillé (flock) : aucun base de données nécessaire.
 */
const SOMACOS_DATA_DIR = __DIR__ . '/data';
const SOMACOS_DATA_FILE = SOMACOS_DATA_DIR . '/demandes.php';
// Les fichiers de données commencent par cette ligne PHP : même si le serveur ignore .htaccess (nginx…),
// une ouverture depuis le web n'affiche rien.
const SOMACOS_GUARD = "<?php http_response_code(404); exit; ?>\n";
function somacos_decode(string $raw) { if (str_starts_with($raw, '<?php')) $raw = (string)substr($raw, strpos($raw, "\n") + 1); return $raw !== '' ? json_decode($raw, true) : null; }
function somacos_read_file(string $f) { return is_file($f) ? somacos_decode((string)file_get_contents($f)) : null; }
function somacos_write_file(string $f, $data): void { if (!is_dir(SOMACOS_DATA_DIR)) @mkdir(SOMACOS_DATA_DIR, 0750, true); file_put_contents($f, SOMACOS_GUARD . json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX); @chmod($f, 0640); }

function somacos_with_store(callable $fn) {
  if (!is_dir(SOMACOS_DATA_DIR)) @mkdir(SOMACOS_DATA_DIR, 0750, true);
  $fh = fopen(SOMACOS_DATA_FILE, 'c+');
  if (!$fh) throw new RuntimeException('Stockage indisponible');
  flock($fh, LOCK_EX);
  $raw = stream_get_contents($fh);
  $items = $raw ? (somacos_decode($raw) ?: []) : [];
  $result = $fn($items);           // $items passé par référence via tableau retourné
  if (is_array($result) && array_key_exists('__save', $result)) {
    ftruncate($fh, 0); rewind($fh);
    fwrite($fh, SOMACOS_GUARD . json_encode($result['__save'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fh);
    $result = $result['__return'] ?? null;
  }
  flock($fh, LOCK_UN); fclose($fh);
  return $result;
}

function somacos_all(): array {
  if (!is_file(SOMACOS_DATA_FILE)) return [];
  return somacos_with_store(fn($items) => $items);
}

function somacos_add(array $rec): string {
  $rec['id'] = date('YmdHis') . '-' . bin2hex(random_bytes(3));
  $rec['date'] = date('c');
  $rec['statut'] = 'nouveau';
  $rec['lu'] = false;
  $rec['note'] = '';
  somacos_with_store(function ($items) use ($rec) { array_unshift($items, $rec); return ['__save' => $items]; });
  return $rec['id'];
}

function somacos_update(string $id, array $changes): void {
  somacos_with_store(function ($items) use ($id, $changes) {
    foreach ($items as &$it) if ($it['id'] === $id) $it = array_merge($it, $changes);
    return ['__save' => $items];
  });
}

function somacos_delete(string $id): void {
  somacos_with_store(fn($items) => ['__save' => array_values(array_filter($items, fn($it) => $it['id'] !== $id))]);
}
