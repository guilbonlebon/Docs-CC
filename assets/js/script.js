const LEVEL_STYLES = {
  FATAL: 'level-FATAL',
  ERROR: 'level-ERROR',
  WARNING: 'level-WARNING',
  INFO: 'level-INFO'
};

const STORAGE_KEY = 'precheck-doc-language';

const normalize = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

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

  const pageType = document.body ? document.body.getAttribute('data-page') : null;
  const searchInput = document.querySelector('[data-search]');
  const filterButtons = Array.from(document.querySelectorAll('[data-filter-level]'));
  let sidebarButtons = [];
  let activeSidebarLevel = 'all';

  function createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'sidebar';
    sidebar.innerHTML = `
      <h4>Criticité</h4>
      <button class="filter-btn" data-level="all">Tous</button>
      <button class="filter-btn" data-level="fatal">Fatal</button>
      <button class="filter-btn" data-level="error">Erreur</button>
      <button class="filter-btn" data-level="warning">Avertissement</button>
      <button class="filter-btn" data-level="info">Info</button>
    `;
    document.body.appendChild(sidebar);
    sidebarButtons = Array.from(sidebar.querySelectorAll('.filter-btn'));
    const defaultButton = sidebarButtons[0];
    if (defaultButton) {
      defaultButton.classList.add('active');
      activeSidebarLevel = defaultButton.dataset.level || 'all';
    }
  }

  if (pageType === 'index') {
    createSidebar();
  }

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

    const fragment = document.createDocumentFragment();
    const entries = [];

    checks.forEach((check) => {
      const card = document.createElement('article');
      card.className = 'check-card visible';
      card.dataset.level = (check.level || '').toLowerCase();

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
      summary.setAttribute('data-fr', `Ce contrôle vérifie « ${check.title_fr} ».`);
      summary.setAttribute('data-en', `This check verifies "${check.title_en}".`);
      back.appendChild(summary);

      const button = document.createElement('a');
      button.className = 'btn';
      button.href = check.file;
      button.setAttribute('data-fr', 'Consulter la documentation');
      button.setAttribute('data-en', 'View documentation');
      back.appendChild(button);

      fragment.appendChild(card);
      setupCardInteractions(card);

      const searchableParts = [check.title_fr, check.title_en, check.script, check.id]
        .filter(Boolean)
        .join(' ');
      const normalizedText = normalize(searchableParts);
      const normalizedWords = normalizedText
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

      entries.push({
        element: card,
        level: check.level,
        normalizedText,
        normalizedWords
      });
    });

    manifestContainer.appendChild(fragment);
    applyLanguage(getPreferredLanguage());

    return entries;
  }

  function handleFiltering(checks) {
    const sorted = checks.slice().sort((a, b) => a.title_fr.localeCompare(b.title_fr));
    const entries = renderChecks(sorted);

    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-state';
    emptyMessage.setAttribute('data-fr', 'Aucun résultat ne correspond à votre recherche.');
    emptyMessage.setAttribute('data-en', 'No results match your search.');
    emptyMessage.style.display = 'none';
    manifestContainer.parentNode.insertBefore(emptyMessage, manifestContainer.nextSibling);
    applyLanguage(getPreferredLanguage());

    function setCardVisibility(element, shouldShow) {
      if (shouldShow) {
        element.classList.remove('hidden');
        element.classList.add('visible');
      } else {
        element.classList.remove('visible');
        element.classList.add('hidden');
      }
    }

    function filterChecks() {
      const rawQuery = searchInput ? searchInput.value : '';
      const normalizedQuery = normalize(rawQuery.trim());
      const fuzzyPrefix = normalizedQuery.slice(0, 3);
      const activeLevels = filterButtons
        .filter((button) => button.classList.contains('active'))
        .map((button) => button.dataset.filterLevel);

      let visibleCount = 0;

      entries.forEach(({ element, level, normalizedText, normalizedWords }) => {
        const matchesLevel = !activeLevels.length || activeLevels.includes(level);
        const matchesSidebar =
          activeSidebarLevel === 'all' || (level && level.toLowerCase() === activeSidebarLevel);

        let matchesQuery = !normalizedQuery;
        if (!matchesQuery) {
          const hasExact = normalizedText.includes(normalizedQuery);
          const hasPrefix =
            fuzzyPrefix.length >= 3 &&
            normalizedWords.some((word) => word.startsWith(fuzzyPrefix));
          matchesQuery = hasExact || hasPrefix;
        }

        const shouldShow = matchesQuery && matchesLevel && matchesSidebar;
        setCardVisibility(element, shouldShow);
        if (shouldShow) {
          visibleCount += 1;
        }
      });

      emptyMessage.style.display = visibleCount ? 'none' : 'block';
    }

    filterChecks();

    if (searchInput) {
      searchInput.addEventListener('input', filterChecks);
    }

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        button.classList.toggle('active');
        filterChecks();
      });
    });

    sidebarButtons.forEach((button) => {
      button.addEventListener('click', () => {
        sidebarButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        activeSidebarLevel = button.dataset.level || 'all';
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
