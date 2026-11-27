# Catalogue SOMACOS 2027/2028 — intégré au site

- Données : build/data/products.json (16 catégories, 223 produits, 1217 références), tirées du PDF.
- Photos produits : site/assets/img/products/cat-*.webp (extraites du PDF).
- Catégories / familles / produits mis en avant : build/site.mjs.
- Prix : colonne PRIX présente dans les données mais masquée. Pour l'afficher : SHOW_PRICES = true dans build/site.mjs, puis `node build/build.mjs`.
- Pour corriger une référence : modifier build/data/products.json puis `node build/build.mjs`.
- Scripts d'extraction (tools/) : extract.py → assemble.py → build_data.py (OCR) → make_site_data.py (+ fixes.py = 77 tableaux corrigés à la main).
