# OPIC — Open Integrated Cosmos (Cosmos Intégré Ouvert)

<div align="center">
  <img src="../public/LOGO/logolwBG.svg" alt="OPIC Logo" width="300">
</div>

**Un système de visualisation de l'univers multi-échelles et d'intégration de données astronomiques basé sur le Web**

[English](../README_EN.md) | [中文](../README.md) | [日本語](./README_JA.md) | [한국어](./README_KO.md) | [Deutsch](./README_DE.md) | [Español](./README_ES.md) | [Русский](./README_RU.md)

---

## Introduction au Projet

OPIC est une application interactive de visualisation de l'univers construite avec Three.js, Cesium et Next.js. Grâce à des données astronomiques réelles et des calculs orbitaux précis, elle présente une simulation dynamique de la surface de la Terre jusqu'au bord de l'univers observable.

Le projet évolue vers une architecture de plugins modulaire (MOD Manager), permettant de charger, configurer et basculer les fonctionnalités de manière indépendante à l'exécution, sans redémarrage de l'application.

### Démonstration

<div align="center">
  <img src="./images/earth-to-universe-zoom.gif" alt="Démonstration du zoom de la Terre à l'univers" width="300">
  <p><em>Expérience de zoom sans interruption des bâtiments à la surface terrestre au panorama de l'univers</em></p>
</div>

## Fonctionnalités Principales

### Visualisation de la Terre (Intégration Cesium)

- Terre haute précision avec tuiles : rendu global du terrain et des images basé sur Cesium
- Changement de cartes multi-sources : support de Bing Maps, OpenStreetMap, ArcGIS, Tianditu et autres sources d'images
- Données réelles d'élévation du terrain terrestre
- Adaptation automatique selon la distance : tuiles Cesium à courte distance, passage à la sphère Three.js à longue distance, transition fluide
- Synchronisation en temps réel de l'état de la caméra entre Three.js et Cesium

### Simulation du Système Solaire

- Système d'éphémérides haute précision : basé sur les données d'éphémérides NASA JPL DE440
- 27 corps célestes : calcul précis des positions de 8 planètes principales + 19 satellites principaux
- Contrôle du temps : plage de temps haute précision 2009-2109, support de l'avance rapide et du retour en arrière
- Source de données dynamique : basculement automatique entre éphémérides haute précision ↔ modèle analytique

### Suivi des Satellites Artificiels

- Suivi en temps réel : basé sur les données TLE de CelesTrak et le modèle orbital SGP4
- Recherche de satellites : explorer et rechercher des satellites artificiels en orbite
- Visualisation des orbites : afficher les trajectoires orbitales et le mouvement des satellites
- Informations détaillées : voir les paramètres des satellites, les éléments orbitaux et l'état

<div align="center">
  <img src="./images/satellite-tracking-demo.gif" alt="Démonstration du suivi de satellites" width="300">
  <p><em>Suivi des orbites de satellites en temps réel et affichage des informations</em></p>
</div>

### Visualisation de l'Univers Multi-Échelles

Explorez 9 niveaux d'échelle de l'univers par zoom :

| Échelle | Plage de Distance | Source de Données |
|---------|-------------------|-------------------|
| Terre | 0 - 100 000 km | Tuiles Cesium |
| Système Solaire | 0,1 - 100 UA | NASA JPL DE440 |
| Étoiles Proches | 0 - 100 années-lumière | ESA Gaia DR3 |
| Voie Lactée | 100 - 50 000 années-lumière | ESA Gaia |
| Groupe Local | 50k - 1M années-lumière | McConnachie 2012 |
| Groupes de Galaxies Proches | 1M - 10M années-lumière | Karachentsev 2013 |
| Superamas de la Vierge | 10M - 50M années-lumière | 2MRS Survey |
| Superamas Laniakea | 50M - 500M années-lumière | Cosmicflows-3 |
| Univers Observable | 500M+ années-lumière | Structure du Réseau Cosmique |

### Système MOD Manager (En Développement)

Architecture de plugins modulaire qui maintient le système central léger tout en permettant de charger dynamiquement des fonctionnalités optionnelles à l'exécution :

- Manifeste MOD déclaratif avec support du versionnage sémantique
- Gestion complète du cycle de vie : registered → loaded → enabled → disabled → unloaded
- Résolution automatique des dépendances avec détection des dépendances circulaires
- Couche API versionnée : Time, Camera, Celestial, Satellite, Render API
- Isolation des erreurs : les défaillances de MOD n'affectent pas le système central
- Persistance de la configuration entre les sessions

<div align="center">
  <img src="./images/mod-manager-interface.gif" alt="Interface du MOD Manager" width="300">
  <p><em>Interface du MOD Manager et démonstration de mods d'exemple</em></p>
</div>

### Caractéristiques Visuelles

- Textures planétaires de haute qualité (Solar System Scope)
- Rendu d'étoiles basé sur les données ESA Gaia
- Caméra interactive : rotation libre, zoom et focus sur les corps célestes
- Transitions visuelles sans interruption entre les échelles
- 4 niveaux de détail, ajustement dynamique selon la distance

## Stack Technologique

| Catégorie | Technologie |
|-----------|-------------|
| Framework Frontend | Next.js 16 / React 19 |
| Rendu 3D | Three.js 0.170 + Cesium 1.139 |
| Langage | TypeScript 5 |
| Styles | Tailwind CSS 4 |
| Gestion d'État | Zustand 5 |
| Calcul Orbital | satellite.js (SGP4) |
| Compression de Données | pako (gzip) |
| Tests | Jest + fast-check |

## Démarrage Rapide

### Prérequis

- Node.js 20+
- npm ou yarn

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/ChenXin-2009/OPIC.git
cd OPIC

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

Visitez `http://localhost:3000` pour voir l'application.

### Construire la Version de Production

```bash
npm run build
npm start
```

## Guide d'Utilisation

| Opération | Fonction |
|-----------|----------|
| Glisser la souris | Faire pivoter la vue |
| Molette de la souris | Zoom (explorer différentes échelles de l'univers) |
| Clic sur planète/satellite | Focaliser la cible |
| Contrôle du temps | Ajuster la vitesse de simulation et la date |
| Changement de carte | Changer différentes sources d'images dans la vue de la Terre |
| Verrouillage Terre | Verrouiller la caméra au centre de la Terre |

## Sources de Données

### Données d'Éphémérides

| Corps Céleste | Source de Données | Plage de Temps | Précision |
|---------------|-------------------|----------------|-----------|
| Terre, Mars, Lune | NASA JPL DE440 | 2009-2109 | <0,1° |
| Autres Planètes | NASA JPL DE440 | 2009-2039 | <0,1° |
| Satellites de Jupiter | NASA JPL JUP365 | 2009-2039 | <0,01° |
| Satellites de Saturne | NASA JPL SAT441 | 2009-2039 | <0,01° |
| Satellites de Neptune | NASA JPL NEP097 | 2009-2039 | <0,01° |

### Données de l'Univers

- Données d'étoiles : ESA Gaia Mission (DR3)
- Groupe Local : McConnachie (2012) Local Group Catalog
- Groupes de galaxies proches : Karachentsev et al. (2013)
- Superamas de la Vierge : 2MRS Survey Data
- Superamas Laniakea : Cosmicflows-3 Dataset

### Données de Satellites

- Données orbitales TLE : CelesTrak (NORAD)
- Métadonnées de satellites : UCS (Union of Concerned Scientists) Base de données de satellites

### Ressources Visuelles

- Textures planétaires : Solar System Scope
- Images de la Voie Lactée : ESA/Gaia

## Structure du Projet

```
opic/
├── src/
│   ├── app/                    # Routes d'application Next.js
│   ├── components/             # Composants React
│   │   ├── canvas/            # Composants de canvas 3D
│   │   ├── cesium/            # Composants liés à Cesium
│   │   ├── satellite/         # UI de suivi de satellites
│   │   ├── mod-manager/       # UI du MOD Manager (en développement)
│   │   └── ...
│   ├── lib/
│   │   ├── 3d/                # Moteur de rendu Three.js
│   │   │   ├── SceneManager.ts
│   │   │   ├── Planet.ts
│   │   │   ├── GalaxyRenderer.ts
│   │   │   ├── LocalGroupRenderer.ts
│   │   │   ├── VirgoSuperclusterRenderer.ts
│   │   │   ├── LaniakeaSuperclusterRenderer.ts
│   │   │   ├── LODManager.ts
│   │   │   └── ...
│   │   ├── cesium/            # Intégration Cesium
│   │   │   ├── CesiumAdapter.ts
│   │   │   ├── CameraSynchronizer.ts
│   │   │   └── ...
│   │   ├── astronomy/         # Calculs astronomiques
│   │   ├── satellite/         # Suivi de satellites (SGP4)
│   │   ├── mod-manager/       # Noyau du MOD Manager (en développement)
│   │   │   ├── core/          # Registre, cycle de vie, résolution de dépendances
│   │   │   ├── api/           # Time/Camera/Celestial/Satellite/Render API
│   │   │   ├── persistence/   # Persistance de configuration
│   │   │   ├── error/         # Gestion et isolation des erreurs
│   │   │   └── performance/   # Surveillance des performances
│   │   ├── config/            # Fichiers de configuration
│   │   ├── data/              # Chargeurs de données
│   │   ├── state/             # Gestion d'état Zustand
│   │   ├── store/             # Hooks Zustand store
│   │   └── types/             # Types TypeScript
├── public/
│   ├── data/                  # Données astronomiques
│   │   ├── ephemeris/        # Données d'éphémérides NASA JPL
│   │   ├── gaia/             # Données d'étoiles Gaia
│   │   └── universe/         # Données de structure de l'univers
│   ├── textures/              # Ressources de textures
│   └── cesium/                # Ressources statiques Cesium
├── scripts/                   # Scripts de génération de données
└── docs/                      # Documentation du projet
```

## Références externes

| Répertoire | Description |
|------------|-------------|
| [references/](./references/README.md) | Archive de ressources externes téléchargées depuis Internet (articles, documentation API, analyses de projets de référence) |

## Développement

```bash
# Exécuter les tests
npm test

# Vérification du code
npm run lint
npm run lint:fix

# Vérification des types
npm run quality:check

# Couverture des tests
npm run test:coverage
```

## Optimisation des Performances

- 4 niveaux de détail, ajustement dynamique selon la distance
- Chargement à la demande des tuiles de la Terre, élimination automatique des tuiles à longue distance
- Tuiles Cesium à courte distance, sphère Three.js à longue distance
- Système de particules avec shaders personnalisés, support de millions de particules
- Rendu instancié pour réduire les appels de dessin
- Culling de frustum, ne rendre que les objets visibles
- Libération automatique des ressources à longue distance
- Web Workers pour traitement de données non bloquant

## Avertissement

Cette application est uniquement à des fins éducatives et de divertissement.

**Note sur la précision des données astronomiques :**

Dans la plage de temps haute précision (2009-2109 pour Terre/Mars/Lune, 2009-2039 pour les autres corps célestes), les données d'éphémérides NASA JPL sont utilisées avec une précision d'arcsecondes. En dehors de cette plage, le système bascule automatiquement vers des modèles analytiques avec une précision réduite.

Pour des données astronomiques précises pour la recherche scientifique ou la navigation, veuillez consulter le système NASA JPL HORIZONS ou d'autres institutions astronomiques professionnelles officielles.

**Note sur les données orbitales de satellites :**

Les données orbitales de satellites artificiels sont basées sur TLE (Two-Line Element) et le modèle SGP4, avec une précision affectée par des facteurs tels que la résistance atmosphérique et la pression de radiation solaire, à titre indicatif uniquement.

**Déclaration de responsabilité :**

Ce logiciel est fourni "tel quel", sans garantie expresse ou implicite. En aucun cas les auteurs ou les détenteurs de droits d'auteur ne seront responsables de toute réclamation, dommage ou autre responsabilité.

Ce logiciel n'est pas adapté aux environnements nécessitant des performances à tolérance de panne. L'utilisateur comprend et accepte expressément que l'auteur ne sera pas responsable de toute perte ou dommage causé par l'utilisation de ce logiciel dans des activités à haut risque.

## Guide de Contribution

Toutes les formes de contribution sont les bienvenues ! Nous accueillons la collaboration de développeurs humains et d'assistants IA.

- Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour savoir comment participer
- Soumettez des Issues pour signaler des bugs ou suggérer de nouvelles fonctionnalités
- Soumettez des Pull Requests pour contribuer du code
- **Contributions IA bienvenues** : Nous encourageons les contributions assistées par des outils et agents IA

## Licence

Ce projet est sous licence Apache License 2.0.

Caractéristiques principales :
- Permet l'utilisation commerciale, la modification et la distribution
- Nécessite de conserver les avis de droits d'auteur et de licence
- Fournit une concession explicite de brevets
- Inclut un avertissement et une limitation de responsabilité

Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## Contact

- **GitHub** : [@ChenXin-2009](https://github.com/ChenXin-2009)
- **Adresse du Projet** : [https://github.com/ChenXin-2009/OPIC](https://github.com/ChenXin-2009/OPIC)
- **Site Web** : [https://opic.cxin.tech](https://opic.cxin.tech)
