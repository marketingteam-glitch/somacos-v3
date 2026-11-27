"# somacos" 
"# somacos-v2" 
"# somacos-v2" 


## Espace admin (messages et demandes de devis) — Vercel

Adresse : `https://votre-projet.vercel.app/admin/`

Chaque message de contact et chaque demande de devis envoyés depuis le site sont enregistrés
(fonction `api/send.js`) et apparaissent dans l'admin : liste, recherche, statut (Nouveau / En cours / Traité),
note interne, réponse par e-mail / appel / WhatsApp, export Excel (CSV).

Configuration sur Vercel (une seule fois) :
1. **Storage** → *Create Database* → **Upstash for Redis** (offre gratuite) → *Connect to project*.
   Les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` sont ajoutées automatiquement.
2. **Settings → Environment Variables** → ajouter `ADMIN_PASSWORD` = le mot de passe de l'admin.
3. **Deployments** → *Redeploy*.

Hébergement PHP classique (cPanel…) à la place de Vercel : voir le dossier `hebergement-php/`
(copier `admin/` et `api/` dans `site/`, puis mettre `formEndpoint: 'api/send.php'` dans `site/assets/js/config.js`).
"# somacos-v3" 
