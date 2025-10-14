const LEVEL_STYLES = {
  FATAL: 'level-FATAL',
  ERROR: 'level-ERROR',
  WARNING: 'level-WARNING',
  INFO: 'level-INFO'
};

const STORAGE_KEY = 'precheck-doc-language';

function getPreferredLanguage() {
  try {
    const stored = window.localStorage ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'en' || stored === 'fr') {
      return stored;
    }
  } catch (error) {
    console.warn('Unable to read stored language', error);
  }
  return 'fr';
}

function setPreferredLanguage(lang) {
  try {
    if (window.localStorage) {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  } catch (error) {
    console.warn('Unable to persist language preference', error);
  }
}

function applyLanguage(lang) {
  document.documentElement.setAttribute('lang', lang);
  const targets = document.querySelectorAll('[data-fr][data-en]');
  targets.forEach((element) => {
    const text = element.getAttribute(`data-${lang}`);
    if (text === null) {
      return;
    }
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.placeholder = text;
    } else {
      element.textContent = text;
    }
  });

  document.querySelectorAll('.language-toggle').forEach((button) => {
    button.classList.toggle('active', button.dataset.lang === lang);
  });
}

function switchLanguage(lang) {
  applyLanguage(lang);
  setPreferredLanguage(lang);
}

document.addEventListener('DOMContentLoaded', () => {
  const initialLang = getPreferredLanguage();
  applyLanguage(initialLang);

  document.querySelectorAll('.language-toggle').forEach((button) => {
    button.addEventListener('click', () => switchLanguage(button.dataset.lang));
  });

  const manifestContainer = document.querySelector('[data-manifest-container]');
  if (!manifestContainer) {
    return;
  }

  const searchInput = document.querySelector('[data-search]');
  const filterButtons = Array.from(document.querySelectorAll('[data-filter-level]'));

  function setupCardInteractions(card) {
    const mediaQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(hover: none)') : null;

    card.addEventListener('click', (event) => {
      if (mediaQuery && !mediaQuery.matches) {
        return;
      }
      if (!mediaQuery) {
        return;
      }
      if (event.target.closest('.btn')) {
        return;
      }
      card.classList.toggle('is-flipped');
    });
  }

  function renderChecks(checks) {
    manifestContainer.innerHTML = '';

    if (!checks.length) {
      const empty = document.createElement('p');
      empty.setAttribute('data-fr', 'Aucun résultat ne correspond à votre recherche.');
      empty.setAttribute('data-en', 'No results match your search.');
      manifestContainer.appendChild(empty);
      applyLanguage(getPreferredLanguage());
      return;
    }

    checks.forEach((check) => {
      const card = document.createElement('article');
      card.className = 'check-card';

      const cardInner = document.createElement('div');
      cardInner.className = 'card-inner';
      card.appendChild(cardInner);

      const front = document.createElement('div');
      front.className = 'card-front';
      cardInner.appendChild(front);

      const levelPill = document.createElement('span');
      levelPill.className = `level-pill ${LEVEL_STYLES[check.level] || ''}`;
      levelPill.textContent = check.level;
      front.appendChild(levelPill);

      const title = document.createElement('h3');
      title.setAttribute('data-fr', check.title_fr);
      title.setAttribute('data-en', check.title_en);
      front.appendChild(title);

      const scriptInfo = document.createElement('p');
      scriptInfo.setAttribute('data-fr', `Script : ${check.script}`);
      scriptInfo.setAttribute('data-en', `Script: ${check.script}`);
      front.appendChild(scriptInfo);

      const back = document.createElement('div');
      back.className = 'card-back';
      cardInner.appendChild(back);

      const summary = document.createElement('p');
      summary.setAttribute(
        'data-fr',
        `Ce contrôle vérifie « ${check.title_fr} ». Consultez la fiche détaillée pour les actions recommandées.`
      );
      summary.setAttribute(
        'data-en',
        `This check verifies "${check.title_en}". Review the full sheet for recommended actions.`
      );
      back.appendChild(summary);

      const button = document.createElement('a');
      button.className = 'btn';
      button.href = check.file;
      button.setAttribute('data-fr', 'Consulter la documentation');
      button.setAttribute('data-en', 'View documentation');
      back.appendChild(button);

      manifestContainer.appendChild(card);
      setupCardInteractions(card);
    });

    applyLanguage(getPreferredLanguage());
  }

  function handleFiltering(checks) {
    const sorted = checks.slice().sort((a, b) => a.title_fr.localeCompare(b.title_fr));
    renderChecks(sorted);

    function filterChecks() {
      const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
      const activeLevels = filterButtons
        .filter((button) => button.classList.contains('active'))
        .map((button) => button.dataset.filterLevel);

      const filtered = sorted.filter((check) => {
        const matchesQuery =
          !query ||
          check.title_fr.toLowerCase().includes(query) ||
          check.title_en.toLowerCase().includes(query) ||
          check.script.toLowerCase().includes(query);

        const matchesLevel = !activeLevels.length || activeLevels.includes(check.level);
        return matchesQuery && matchesLevel;
      });

      renderChecks(filtered);
    }

    if (searchInput) {
      searchInput.addEventListener('input', filterChecks);
    }

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        button.classList.toggle('active');
        filterChecks();
      });
    });
  }

  function loadManifest() {
    function onData(data) {
      handleFiltering(Array.isArray(data) ? data : []);
    }

    fetch('manifest.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(onData)
      .catch(() => {
        const request = new XMLHttpRequest();
        request.overrideMimeType('application/json');
        request.open('GET', 'manifest.json', true);
        request.onreadystatechange = function () {
          if (request.readyState === 4) {
            if (request.status === 200 || request.status === 0) {
              onData(JSON.parse(request.responseText));
            } else {
              manifestContainer.innerHTML = '';
              const error = document.createElement('p');
              error.setAttribute('data-fr', 'Impossible de charger la liste des contrôles.');
              error.setAttribute('data-en', 'Unable to load the list of checks.');
              manifestContainer.appendChild(error);
              applyLanguage(getPreferredLanguage());
            }
          }
        };
        request.send(null);
      });
  }

  loadManifest();
});
