// Contenu vérifié, extrait de https://somacos.ma (pages Accueil, À propos, Contact, catalogue WooCommerce).
// Ne rien ajouter ici qui ne figure pas sur le site d'origine.

export const SITE = {
  // URL publique du nouveau site (utilisée pour les balises canonical, Open Graph et le sitemap).
  url: 'https://somacos.ma',
  name: 'SOCIETE MAROCAINE DE COMMERCE ET SERVICE SARL.AU',
  legalName: 'SOCIETE MAROCAINE DE COMMERCE ET SERVICE SARL.AU',
  city: 'Meknès',
  address: ['Coop Al Khayrate', 'Commune rurale Sidi Slimane Moul Kifan', 'Meknès, Maroc'],
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=SOMACOS+Meknes+Maroc',
  phones: [
    { label: '+212 535 466 455', href: 'tel:+212535466455' },
    { label: '+212 535 522 196', href: 'tel:+212535522196' },
  ],
  emails: ['info@somacos.ma', 'somacos-delta@hotmail.com'],
  hours: [
    ['Lundi – vendredi', '8h30 – 17h30'],
    ['Samedi', '8h30 – 13h30'],
  ],
  team: [
    { name: 'Morad Chahhou', role: 'Directeur technique', tel: '06 61 44 63 19', telHref: 'tel:+212661446319', email: 'morad-chahhou@somacos.ma' },
    { name: 'Mohamed Chahhou', role: 'Directeur commercial', tel: '06 61 44 63 18', telHref: 'tel:+212661446318', email: 'mohamed-chahhou@somacos.ma' },
  ],
};

// Texte de la page d'accueil d'origine.
export const HOME_INTRO = "Les systèmes d’irrigation que nous fournissons proviennent des meilleurs fabricants mondiaux, que ce soit les pompes, les tuyaux, les systèmes localisés, pivots ou enrouleurs.";
export const HOME_PARTNER = "Nos ingénieurs vous apportent leur expertise, des solutions techniques adaptées, une mise en œuvre et un suivi de vos installations des plus performantes.";

// Texte de la page « À propos » d'origine.
export const ABOUT = [
  "La SOCIETE MAROCAINE DE COMMERCE ET SERVICE SARL.AU s’est spécialisée depuis 2014 dans la distribution de matériels agricoles, d’irrigation, de revêtement de bassins, ainsi que dans l’étude et la réalisation de projets d’irrigation, auprès des professionnels du domaine ainsi que des particuliers à la recherche de conseils techniques.",
  "La SOCIETE MAROCAINE DE COMMERCE ET SERVICE SARL.AU s’appuie sur des vendeurs et technico-commerciaux très confirmés sur l’information des nouveaux produits et services.",
];

export const VALUES = [
  { title: 'Ambition', text: "La SOCIETE MAROCAINE DE COMMERCE ET SERVICE SARL.AU a la volonté de participer activement au développement de l’irrigation agricole moderne et responsable." },
  { title: 'Fierté', text: "Depuis 12 ans, les produits et les services de la société sont reconnus dans tout le Maroc, pour leur qualité et le développement de leur expertise." },
  { title: 'Innovation', text: "Notre mission est de participer au développement agricole et de répondre ainsi aux besoins de mise en culture, même de grands périmètres. Son objectif : l’autosuffisance alimentaire." },
];

// Services : uniquement ceux mentionnés sur le site d'origine.
export const SERVICES = [
  { id: 'distribution', title: 'Distribution de matériel agricole et d’irrigation', text: "Pompes, tuyaux, systèmes localisés, pivots ou enrouleurs : des systèmes d’irrigation issus des meilleurs fabricants mondiaux, disponibles à Meknès.", link: 'catalogue/' },
  { id: 'bassins', title: 'Revêtement de bassins', text: "Géomembrane et géotextile pour le revêtement de vos bassins." },
  { id: 'etude', title: 'Étude et réalisation de projets d’irrigation', text: "Nos ingénieurs vous apportent leur expertise et des solutions techniques adaptées à votre projet." },
  { id: 'suivi', title: 'Mise en œuvre et suivi des installations', text: "Une mise en œuvre et un suivi de vos installations des plus performantes." },
  { id: 'conseil', title: 'Conseil technique', text: "Pour les professionnels du domaine comme pour les particuliers à la recherche de conseils techniques, avec des vendeurs et technico-commerciaux confirmés." },
];

export const PROCESS = [
  { title: 'Étude', text: 'Étude de votre projet d’irrigation par nos ingénieurs.' },
  { title: 'Solution technique', text: 'Des solutions techniques adaptées et le matériel des meilleurs fabricants.' },
  { title: 'Mise en œuvre', text: 'La réalisation de votre installation.' },
  { title: 'Suivi', text: 'Un suivi de vos installations dans la durée.' },
];

// Marques présentes sur la page d'accueil d'origine (bandeau partenaires).
export const PARTNERS = [
  { file: 'partner-1', name: 'Arangül Plastik' },
  { file: 'partner-2', name: 'Sertsan' },
  { file: 'partner-3', name: 'Serdrip' },
  { file: 'partner-4', name: 'Onur Plas' },
  { file: 'partner-5', name: 'Hepworth' },
  { file: 'partner-6', name: 'GreenPlains' },
  { file: 'partner-7', name: 'MPI' },
  { file: 'partner-8', name: 'Sunstream' },
];

// Catégories du catalogue SOMACOS 2027/2028 (sections du PDF).
export const CATEGORIES = {
  'accessoires-de-compression-pp': { name: "Accessoires de compression PP", short: "Compression PP" },
  'accessoires-en-pvc': { name: "Accessoires en PVC", short: "Accessoires PVC" },
  'vannes-clapets': { name: "Vannes, clapets et hydrauliques", short: "Vannes & clapets" },
  'filtration-et-fertilisation': { name: "Filtration et fertilisation", short: "Filtration & fertilisation" },
  'instruments-de-mesure-et-manchette-anti-vibratoire': { name: "Instruments de mesure et manchette anti-vibratoire", short: "Instruments de mesure" },
  'colliers-de-prise-en-charge': { name: "Colliers de prise en charge", short: "Colliers de prise en charge" },
  'outillage': { name: "Outillage", short: "Outillage" },
  'aspersion': { name: "Aspersion", short: "Aspersion" },
  'divers-accessoires': { name: "Divers accessoires", short: "Divers accessoires" },
  'accessoires-micro-irrigation-pe': { name: "Accessoires micro-irrigation PE", short: "Accessoires PE" },
  'accessoires-micro-irrigation-pour-gaine': { name: "Accessoires micro-irrigation pour gaine", short: "Accessoires pour gaine" },
  'accessoires-micro-irrigation-vannettes': { name: "Accessoires micro-irrigation : vannettes", short: "Vannettes" },
  'accessoires-micro-irrigation-goutteurs': { name: "Accessoires micro-irrigation : goutteurs", short: "Goutteurs" },
  'canons-darrosage': { name: "Canons d’arrosage", short: "Canons d’arrosage" },
  'micro-irrigation-gaine-tuyau-pebd-goutteur-integre': { name: "Micro-irrigation : gaine, tuyau PEBD et goutteur intégré", short: "Gaine & tuyau PEBD" },
  'tubing-et-accessoires-tubing': { name: "Tubing et accessoires tubing", short: "Tubing" },
};

// Regroupement des catégories en familles (navigation uniquement).
export const FAMILIES = [
  { id: 'micro-irrigation', name: "Micro-irrigation", image: "gaine-somacos-vimi-400", cats: ["accessoires-micro-irrigation-pe", "accessoires-micro-irrigation-pour-gaine", "accessoires-micro-irrigation-vannettes", "accessoires-micro-irrigation-goutteurs", "micro-irrigation-gaine-tuyau-pebd-goutteur-integre", "tubing-et-accessoires-tubing"] },
  { id: 'raccords-tuyauterie', name: "Raccords & tuyauterie", image: "manchon-egale-pp-arangul", cats: ["accessoires-de-compression-pp", "accessoires-en-pvc", "colliers-de-prise-en-charge", "divers-accessoires"] },
  { id: 'vannes-clapets', name: "Vannes & clapets", image: "vanne-hydraulique-ama-green-plains", cats: ["vannes-clapets"] },
  { id: 'filtration-fertilisation', name: "Filtration & fertilisation", image: "filtre-a-disque-green-plains", cats: ["filtration-et-fertilisation"] },
  { id: 'aspersion', name: "Aspersion & canons", image: "canon-arrosage-aluminium-green-plains", cats: ["aspersion", "canons-darrosage"] },
  { id: 'mesure', name: "Mesure & contrôle", image: "compteur-deau", cats: ["instruments-de-mesure-et-manchette-anti-vibratoire"] },
  { id: 'outillage', name: "Outillage", image: "teflon-arangul", cats: ["outillage"] },
];

// Photographies d'ambiance (hors site d'origine) — licences libres, créditées dans le pied de page.
export const PHOTO_CREDITS = [
  { file: 'hero-drip', title: 'Chinakohl Bestand mit Tropfbewässerung', author: 'Josef Schlaghecken', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Chinakohl_Bestand_mit_Tropfbew%C3%A4sserung,_Josef_Schlaghecken.jpg' },
  { file: 'pivot', title: 'Center-pivot irrigation system - 1', author: 'Killarnee', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Center-pivot_irrigation_system_-_1.jpg' },
  { file: 'field-sprinklers', title: 'Agricultural field being irrigated with sprinklers', author: 'Kwameghana (Bright Kwame Ayisi)', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Agricultural_field_being_irrigated_with_sprinklers.jpg' },
  { file: 'olive-grove', title: 'Tarya.tafersit', author: 'Floppa ameqqran', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Tarya.tafersit.jpg' },
];

// Afficher la colonne PRIX du catalogue PDF sur le site (false = prix masqués, devis uniquement).
export const SHOW_PRICES = false;

// Produits mis en avant sur l'accueil (slugs du catalogue).
export const FEATURED = [
  'filtre-a-disque-green-plains',
  'vanne-hydraulique-ama-green-plains',
  'pompe-doseuse-green-plains',
  'manchon-egale-pp-arangul',
  'goutteur-reglable-green-plains',
  'canon-arrosage-aluminium-green-plains',
  'te-egale-pvc-pimtas',
  'gaine-somacos-vimi-400',
];
