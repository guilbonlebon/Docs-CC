# Centre MAESTRIA Consistency Checker Documentation

![Static Site](https://img.shields.io/badge/build-static%20site-success?style=flat-square)
![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue?style=flat-square)
![PHP 8.1+](https://img.shields.io/badge/php-8.1+-violet?style=flat-square)
![Status](https://img.shields.io/badge/status-production_ready-brightgreen?style=flat-square)
![Contributors](https://img.shields.io/badge/contributors-team-orange?style=flat-square)

Plateforme de documentation bilingue (FR/EN) présentant les contrôles préalables à l'installation de la solution Pre-Check du Centre MAESTRIA. Le projet combine un site statique ergonomique, un manifeste machine-readable et des outils d'édition pour accompagner l'équipe Delivery.

## 📜 Sommaire
- [🚀 Fonctionnalités principales](#-fonctionnalités-principales)
- [🧩 Architecture du projet](#-architecture-du-projet)
- [⚙️ Installation et exécution locale](#️-installation-et-exécution-locale)
- [🧠 Configuration et variables denvironnement](#-configuration-et-variables-denvironnement)
- [💻 Usage](#-usage)
- [🧪 Tests et validation](#-tests-et-validation)
- [🔒 Sécurité et bonnes pratiques](#-sécurité-et-bonnes-pratiques)
- [🧰 Technologies utilisées](#-technologies-utilisées)
- [🤝 Contributeurs  Maintainers](#-contributeurs--maintainers)
- [🗺️ Roadmap](#️-roadmap)
- [🪪 Licence](#-licence)
- [💬 Contact  Support](#-contact--support)

## 🚀 Fonctionnalités principales
- 🌐 **Bilingue FR/EN** : bascule instantanée des contenus grâce aux attributs `data-fr` / `data-en`. 
- 📚 **Catalogue de contrôles complet** : plus de 60 vérifications documentées avec niveaux de criticité, scripts associés et remédiations. 
- 🔍 **Recherche, filtrage et affichage dynamique** : filtres par sévérité, recherche plein texte et modes de vue multiples (grilles, liste). 
- 🛠️ **Génération automatisée** : scripts Python pour produire `manifest.json` et les pages détaillées à partir d'un modèle structuré. 
- 🧾 **Interface d'administration** : module PHP pour mettre à jour les fiches de contrôle en préservant la structure HTML. 
- 📦 **Distribution statique** : déploiement simple sur tout serveur web (Apache, Nginx, GitHub Pages, S3, etc.).

## 🧩 Architecture du projet
```
Docs-CC/
├── admin/                  # Interface PHP de gestion des fiches (DOMDocument)
│   ├── admin.css           # Styles spécifiques à l'éditeur
│   └── index.php           # Chargement du manifeste et mise à jour des HTML
├── assets/
│   ├── css/style.css       # Charte graphique et responsive design du portail
│   └── js/script.js        # Logique UI : langue, filtres, favoris, modes d'affichage
├── checks/                 # Pages HTML générées pour chaque contrôle
├── generate_docs.py        # Génération manifest + fiches à partir d'une liste Python
├── generate_checks_docs.py # Génération alternative depuis manifest enrichi
├── index.html              # Portail d'accueil (recherche, filtres, navigation)
├── manifest.json           # Référence JSON des contrôles consommée par le front
└── README.md               # Documentation du projet
```

### Points clés de l'architecture
- **Front statique riche** (`index.html`, `assets/css/style.css`, `assets/js/script.js`) : interface responsives, filtres et stockage local des préférences (`localStorage`).
- **Données maîtrisées** (`manifest.json`) : identifiants, scripts et niveaux de chaque contrôle pour alimenter l'interface et les exports internes.
- **Génération automatisée** (`generate_docs.py`, `generate_checks_docs.py`) : production cohérente des fiches à partir de définitions centralisées.
- **Back-office ciblé** (`admin/index.php`) : outil interne pour maintenir les contenus HTML existants en appliquant les normes (titres, attributs bilingues, classes CSS).

## ⚙️ Installation et exécution locale
### Pré-requis
- Python 3.10 ou supérieur (standard library uniquement).
- PHP 8.1+ avec extension DOM activée pour l'interface d'administration.
- Un serveur web statique ou un serveur PHP (Apache, Nginx, PHP built-in).

### Installation rapide
```bash
# Cloner le dépôt
git clone <repository-url>
cd Docs-CC

# (Optionnel) Créer un environnement virtuel
python -m venv .venv
source .venv/bin/activate  # Windows : .venv\Scripts\activate

# Générer le manifeste et les pages détail (si besoin)
python generate_docs.py
# ou
python generate_checks_docs.py
```

### Exécution locale
```bash
# Servir la version statique pour le front
python -m http.server 8080
# => http://localhost:8080/index.html

# Lancer l'interface d'administration (PHP 8.1+)
php -S localhost:8081 -t admin
# => http://localhost:8081/index.php
```

## 🧠 Configuration et variables d'environnement
Aucune variable d'environnement n'est utilisée. Les personnalisations se font via :
- Les fichiers Python (`generate_docs.py`, `generate_checks_docs.py`) pour enrichir ou corriger les contrôles.
- Le fichier `manifest.json` pour modifier manuellement un contrôle (titre, script, niveau) avant déploiement.
- Les attributs `data-fr` / `data-en` dans les templates HTML pour ajuster les traductions.

## 💻 Usage
### Mettre à jour / ajouter un contrôle
1. Ajouter la définition dans `generate_docs.py` ou `generate_checks_docs.py` (ID, slug, titres, descriptions, résolutions).
2. Exécuter le script Python correspondant pour régénérer `manifest.json` et la page HTML.
3. Vérifier le rendu dans `checks/<slug>.html`.
4. Déployer sur votre serveur statique.

### Exemple de requêtes JavaScript
Le front charge le manifeste et construit dynamiquement la grille :
```javascript
fetch('manifest.json')
  .then((response) => response.json())
  .then((checks) => renderChecks(checks));
```

### Bascule de langue côté client
```javascript
const toggle = document.querySelector('[data-language-toggle]');
toggle.addEventListener('click', () => {
  const currentLang = document.documentElement.lang === 'en' ? 'en' : 'fr';
  switchLanguage(currentLang === 'fr' ? 'en' : 'fr');
});
```

## 🧪 Tests et validation
Le projet ne fournit pas encore de suite de tests automatisés. Nous recommandons :
- ✅ **Validation HTML/CSS** via [W3C Validator](https://validator.w3.org/).
- ✅ **Linting JS** avec `eslint` (configuration à ajouter si nécessaire).
- ✅ **Revue manuelle** après génération (`python generate_docs.py`) pour confirmer la présence des nouvelles fiches.

## 🔒 Sécurité et bonnes pratiques
- Restreindre l'accès à `/admin` (authentification HTTP, VPN, IP whitelisting) : l'outil manipule des contenus sensibles.
- Déployer le front via HTTPS pour garantir l'intégrité des documentations.
- Versionner les scripts PowerShell associés et vérifier leur signature avant publication.
- Éviter toute modification manuelle dans `checks/` sans passer par les scripts afin de conserver une structure saine.

## 🧰 Technologies utilisées
| Technologie | Version recommandée | Rôle |
|-------------|--------------------|------|
| Python | 3.10+ | Génération du manifeste et des pages détail (`generate_docs.py`). |
| PHP | 8.1+ | Interface d'administration (`admin/index.php`) exploitant DOMDocument. |
| HTML5/CSS3 | N/A | Structure et styles du portail (`index.html`, `assets/css/style.css`). |
| JavaScript ES6 | N/A | Logique front (bascule de langue, filtres, localStorage) (`assets/js/script.js`). |
| PowerShell | 5.1+ | Scripts de diagnostic référencés par la documentation (via `manifest.json`). |

## 🤝 Contributeurs / Maintainers
| Nom | Rôle | Contact |
|-----|------|---------|
| Équipe Consistency Checker | Maintien fonctionnel & documentation | support@maestria.local |
| Delivery Engineering | Scripts et intégration CI/CD | delivery@maestria.local |

*Pour rejoindre l'équipe ou proposer des améliorations, ouvrez une issue ou soumettez une pull request.*

## 🗺️ Roadmap
- [ ] Ajouter des tests automatisés pour la cohérence du manifeste.
- [ ] Intégrer un export PDF des fiches de contrôle.
- [ ] Synchroniser automatiquement `manifest.json` avec un référentiel central (API interne).
- [ ] Mettre en place un thème sombre pour le portail front.

## 🪪 Licence
Projet interne MAESTRIA – utilisation réservée à l'équipe Consistency Checker. Contactez les maintainers pour toute diffusion externe.

## 💬 Contact / Support
- 📧 support@maestria.local
- 💼 Slack interne : `#consistency-checker`
- 🛠️ Issues Git : ouvrez une issue pour signaler un bug ou proposer une évolution.

---
**Astuce :** pensez à purger le cache du navigateur après chaque régénération pour charger le nouveau `manifest.json` et les fiches mises à jour.
