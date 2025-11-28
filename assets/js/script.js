const LEVEL_STYLES = {
  FATAL: 'level-FATAL',
  FATAL_ERROR: 'level-FATAL',
  ERROR: 'level-ERROR',
  WARNING: 'level-WARNING',
  INFO: 'level-INFO',
  INFORMATION: 'level-INFO'
};

const LEVEL_LABELS = {
  FATAL: { fr: 'FATAL', en: 'FATAL' },
  FATAL_ERROR: { fr: 'FATAL', en: 'FATAL ERROR' },
  ERROR: { fr: 'ERREUR', en: 'ERROR' },
  WARNING: { fr: 'AVERTISSEMENT', en: 'WARNING' },
  INFO: { fr: 'INFO', en: 'INFO' },
  INFORMATION: { fr: 'INFO', en: 'INFORMATION' }
};

const SIDEBAR_GROUPS = [
  { key: 'all', label: { fr: 'Tous', en: 'All' } },
  { key: 'fatal_error', label: { fr: 'Fatal', en: 'Fatal' } },
  { key: 'error', label: { fr: 'Erreur', en: 'Error' } },
  { key: 'warning', label: { fr: 'Avertissement', en: 'Warning' } },
  { key: 'information', label: { fr: 'Info', en: 'Info' } }
];

function getLevelGroup(level) {
  switch (level) {
    case 'FATAL':
    case 'FATAL_ERROR':
      return 'fatal_error';
    case 'ERROR':
      return 'error';
    case 'WARNING':
      return 'warning';
    case 'INFO':
    case 'INFORMATION':
      return 'information';
    default:
      return (level || '').toLowerCase();
  }
}

const STORAGE_KEY = 'precheck-doc-language';
const DISPLAY_MODE_STORAGE_KEY = 'precheck-display-mode';
const DISPLAY_MODES = new Set(['grid-6x6', 'grid-4x4', 'grid-list']);
const LEGACY_DISPLAY_MODES = {
  'grid-8x8': 'grid-6x6',
  list: 'grid-list'
};
const DEFAULT_DISPLAY_MODE = 'grid-4x4';

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

function updateLanguageToggle(lang) {
  const toggle = document.querySelector('[data-language-toggle]');
  if (!toggle) {
    return;
  }

  toggle.setAttribute('data-active-lang', lang);
  toggle.setAttribute('aria-checked', lang === 'en' ? 'true' : 'false');

  const label =
    lang === 'fr'
      ? toggle.dataset.ariaLabelToEn || ''
      : toggle.dataset.ariaLabelToFr || '';

  if (label) {
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
  }
}

function getPreferredDisplayMode() {
  try {
    if (!window.localStorage) {
      return DEFAULT_DISPLAY_MODE;
    }
    const stored = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
    const normalized = LEGACY_DISPLAY_MODES[stored] || stored;
    if (DISPLAY_MODES.has(normalized)) {
      return normalized;
    }
  } catch (error) {
    console.warn('Unable to read stored display mode', error);
  }
  return DEFAULT_DISPLAY_MODE;
}

function setPreferredDisplayMode(mode) {
  try {
    if (window.localStorage) {
      localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, mode);
    }
  } catch (error) {
    console.warn('Unable to persist display mode preference', error);
  }
}

function applyLanguage(lang) {
  document.documentElement.setAttribute('lang', lang);
  const targets = document.querySelectorAll('[data-fr][data-en]');
  targets.forEach((element) => {
    const html = element.getAttribute(`data-${lang}-html`);
    const text = element.getAttribute(`data-${lang}`);
    if (html !== null) {
      element.innerHTML = html;
      return;
    }
    if (text === null) {
      return;
    }
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.placeholder = text;
    } else {
      element.textContent = text;
    }
  });

  updateLanguageToggle(lang);
}

function switchLanguage(lang) {
  applyLanguage(lang);
  setPreferredLanguage(lang);
}

document.addEventListener('DOMContentLoaded', () => {
  const initialLang = getPreferredLanguage();
  applyLanguage(initialLang);

  const languageToggle = document.querySelector('[data-language-toggle]');
  if (languageToggle) {
    languageToggle.addEventListener('click', () => {
      const currentLang = document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'fr';
      const nextLang = currentLang === 'fr' ? 'en' : 'fr';
      switchLanguage(nextLang);
    });
  }

  const manifestContainer = document.querySelector('[data-manifest-container]');
  if (!manifestContainer) {
    return;
  }

  const pageType = document.body ? document.body.getAttribute('data-page') : null;
  const searchInput = document.querySelector('[data-search]');
  const filterButtons = Array.from(document.querySelectorAll('[data-filter-level]'));
  const displayModeButtons = Array.from(
    document.querySelectorAll('[data-display-mode-button]')
  );
  let sidebarButtons = [];
  let activeSidebarLevel = 'all';
  let filterChecksRef = null;
  let sidebarState = null;

  function applyDisplayMode(mode, options = {}) {
    if (!document.body) {
      return;
    }

    const normalizedMode = DISPLAY_MODES.has(mode)
      ? mode
      : LEGACY_DISPLAY_MODES[mode] || DEFAULT_DISPLAY_MODE;
    document.body.setAttribute('data-display-mode', normalizedMode);

    const stateClasses = ['grid-6x6', 'grid-4x4', 'grid-list'];
    document.body.classList.remove(...stateClasses);
    if (stateClasses.includes(normalizedMode)) {
      document.body.classList.add(normalizedMode);
    }

    if (normalizedMode === 'grid-list') {
      const flippedCards = document.querySelectorAll('.check-card.is-flipped');
      flippedCards.forEach((card) => {
        card.classList.remove('is-flipped');
        card.setAttribute('aria-pressed', 'false');
      });
    }

    displayModeButtons.forEach((button) => {
      const isActive = button.dataset.mode === normalizedMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (!options.skipStorage) {
      setPreferredDisplayMode(normalizedMode);
    }
  }

  function collapseSidebarPanels() {
    if (!sidebarState) {
      return;
    }
    sidebarState.groups.forEach(({ toggle, panel }) => {
      toggle.classList.remove('is-active');
      if (panel) {
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function applySidebarState() {
    if (!sidebarState) {
      return;
    }

    collapseSidebarPanels();
    const current = sidebarState.groups.get(activeSidebarLevel);

    if (current) {
      current.toggle.classList.add('is-active');
      if (current.panel) {
        current.panel.hidden = false;
        current.toggle.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    const fallback = sidebarState.groups.get('all');
    if (fallback) {
      fallback.toggle.classList.add('is-active');
    }
    activeSidebarLevel = 'all';
  }

  function handleSidebarToggle(levelKey) {
    if (activeSidebarLevel === levelKey) {
      activeSidebarLevel = 'all';
    } else {
      activeSidebarLevel = levelKey;
    }
    applySidebarState();

    if (typeof filterChecksRef === 'function') {
      filterChecksRef();
    }
  }

  function createSidebar() {
    const sidebar = document.createElement('nav');
    sidebar.id = 'sidebar';
    sidebar.setAttribute('aria-label', 'Navigation par criticité');

    const title = document.createElement('h2');
    title.className = 'sidebar-title';
    title.setAttribute('data-fr', 'Criticité');
    title.setAttribute('data-en', 'Criticality');
    title.textContent = 'Criticité';
    sidebar.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'sidebar-groups';
    sidebar.appendChild(list);

    const groups = new Map();

    SIDEBAR_GROUPS.forEach((group) => {
      const listItem = document.createElement('li');
      listItem.className = 'sidebar-group';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'sidebar-toggle';
      toggle.dataset.level = group.key;
      toggle.dataset.hasPanel = group.key !== 'all' ? 'true' : 'false';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = `<span data-fr="${group.label.fr}" data-en="${group.label.en}">${group.label.fr}</span>`;
      listItem.appendChild(toggle);

      let panel = null;
      let linksList = null;
      if (group.key !== 'all') {
        panel = document.createElement('div');
        panel.className = 'sidebar-panel';
        panel.hidden = true;

        linksList = document.createElement('ul');
        linksList.className = 'sidebar-links';
        panel.appendChild(linksList);
        listItem.appendChild(panel);
      }

      list.appendChild(listItem);
      groups.set(group.key, { toggle, panel, linksList, definition: group });
    });

    document.body.appendChild(sidebar);
    sidebarButtons = Array.from(sidebar.querySelectorAll('.sidebar-toggle'));
    sidebarState = { sidebar, groups };

    sidebarButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const levelKey = button.dataset.level || 'all';
        handleSidebarToggle(levelKey);
      });
    });

    applySidebarState();
    applyLanguage(getPreferredLanguage());
  }

  if (pageType === 'index') {
    createSidebar();
  }

  if (displayModeButtons.length) {
    const storedMode = getPreferredDisplayMode();
    applyDisplayMode(storedMode, { skipStorage: true });

    displayModeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        applyDisplayMode(button.dataset.mode || DEFAULT_DISPLAY_MODE);
      });
    });
  } else {
    applyDisplayMode(DEFAULT_DISPLAY_MODE, { skipStorage: true });
  }

  function updateSidebar(checks) {
    if (!sidebarState) {
      return;
    }

    sidebarState.groups.forEach(({ linksList }, key) => {
      if (!linksList) {
        return;
      }

      linksList.innerHTML = '';
      const matches = checks
        .filter((check) => getLevelGroup(check.level) === key)
        .slice()
        .sort((a, b) => a.title_fr.localeCompare(b.title_fr));

      if (!matches.length) {
        const emptyItem = document.createElement('li');
        const emptyText = document.createElement('span');
        emptyText.className = 'sidebar-empty';
        emptyText.setAttribute('data-fr', 'Aucun contrôle disponible');
        emptyText.setAttribute('data-en', 'No checks available');
        emptyText.textContent = 'Aucun contrôle disponible';
        emptyItem.appendChild(emptyText);
        linksList.appendChild(emptyItem);
        return;
      }

      matches.forEach((check) => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'sidebar-link';
        link.setAttribute('data-fr', check.title_fr);
        link.setAttribute('data-en', check.title_en);
        link.textContent = check.title_fr;

        if (check.file) {
          link.href = check.file;
        } else {
          link.href = '#';
          link.classList.add('is-disabled');
          link.setAttribute('aria-disabled', 'true');
          link.addEventListener('click', (event) => event.preventDefault());
        }

        listItem.appendChild(link);
        linksList.appendChild(listItem);
      });
    });

    applySidebarState();
    applyLanguage(getPreferredLanguage());
  }

  function setupCardInteractions(card) {
    const updatePressedState = () => {
      card.setAttribute('aria-pressed', card.classList.contains('is-flipped') ? 'true' : 'false');
    };

    const shouldToggle = (event) => {
      if (event.target.closest('.btn')) {
        return false;
      }
      const mode = document.body ? document.body.getAttribute('data-display-mode') : null;
      return mode !== 'grid-list';
    };

    card.addEventListener('click', (event) => {
      if (!shouldToggle(event)) {
        return;
      }
      card.classList.toggle('is-flipped');
      updatePressedState();
    });

    card.addEventListener('keydown', (event) => {
      if (!shouldToggle(event)) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        card.classList.toggle('is-flipped');
        updatePressedState();
      }
    });
  }

  function renderChecks(checks) {
    manifestContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const entries = [];

    checks.forEach((check) => {
      const card = document.createElement('article');
      card.className = 'check-card';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-pressed', 'false');
      const levelGroup = getLevelGroup(check.level);
      card.dataset.level = levelGroup;

      const cardInner = document.createElement('div');
      cardInner.className = 'card-inner';
      card.appendChild(cardInner);

      const front = document.createElement('div');
      front.className = 'card-front';
      cardInner.appendChild(front);

      const levelPill = document.createElement('span');
      const levelStyle = LEVEL_STYLES[check.level] || '';
      levelPill.className = `level-pill ${levelStyle}`;
      const levelLabel = LEVEL_LABELS[check.level] || {
        fr: check.level || '',
        en: check.level || ''
      };
      levelPill.setAttribute('data-fr', levelLabel.fr);
      levelPill.setAttribute('data-en', levelLabel.en);
      levelPill.textContent = levelLabel.fr;
      front.appendChild(levelPill);

      const title = document.createElement('h3');
      title.setAttribute('data-fr', check.title_fr);
      title.setAttribute('data-en', check.title_en);
      front.appendChild(title);

      if (check.description_fr || check.description_en) {
        const description = document.createElement('p');
        description.className = 'card-description';
        description.setAttribute('data-fr', check.description_fr || '');
        description.setAttribute('data-en', check.description_en || check.description_fr || '');
        front.appendChild(description);
      }

      const back = document.createElement('div');
      back.className = 'card-back';
      cardInner.appendChild(back);

      const summary = document.createElement('p');
      summary.setAttribute('data-fr', check.description_fr || '');
      summary.setAttribute('data-en', check.description_en || check.description_fr || '');
      back.appendChild(summary);

      const button = document.createElement('a');
      button.className = 'btn';
      if (check.file) {
        button.href = check.file;
      } else {
        button.href = '#';
        button.setAttribute('aria-disabled', 'true');
        button.classList.add('is-disabled');
      }
      button.setAttribute('data-fr', 'Consulter la documentation');
      button.setAttribute('data-en', 'View documentation');
      back.appendChild(button);

      fragment.appendChild(card);
      setupCardInteractions(card);

      const searchableParts = [
        check.title_fr,
        check.title_en,
        check.script,
        check.id,
        check.description_fr,
        check.description_en
      ]
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
        levelGroup,
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
    updateSidebar(sorted);

    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-state';
    emptyMessage.setAttribute('data-fr', 'Aucun résultat ne correspond à votre recherche.');
    emptyMessage.setAttribute('data-en', 'No results match your search.');
    emptyMessage.style.display = 'none';
    manifestContainer.parentNode.insertBefore(emptyMessage, manifestContainer.nextSibling);
    applyLanguage(getPreferredLanguage());

    function setCardVisibility(element, shouldShow) {
      const EXIT_CLASS = 'is-hiding';
      const ENTER_CLASS = 'is-entering';
      const EXIT_ANIMATION = 'cardExit';
      const ENTER_ANIMATION = 'cardEnter';

      const detachHandler = (key) => {
        const handler = element[key];
        if (typeof handler === 'function') {
          element.removeEventListener('animationend', handler);
          delete element[key];
        }
      };

      if (shouldShow) {
        if (!element.hasAttribute('hidden') && !element.classList.contains(EXIT_CLASS)) {
          return;
        }

        detachHandler('__cardExitHandler');

        element.classList.remove(EXIT_CLASS);
        element.removeAttribute('hidden');

        // Force reflow before playing the enter animation
        void element.offsetWidth; // eslint-disable-line no-unused-expressions

        element.classList.add(ENTER_CLASS);

        const handleEnter = (event) => {
          if (event.target !== element || event.animationName !== ENTER_ANIMATION) {
            return;
          }
          element.classList.remove(ENTER_CLASS);
          detachHandler('__cardEnterHandler');
        };

        element.__cardEnterHandler = handleEnter;
        element.addEventListener('animationend', handleEnter);
        return;
      }

      if (element.hasAttribute('hidden') || element.classList.contains(EXIT_CLASS)) {
        return;
      }

      detachHandler('__cardEnterHandler');
      element.classList.add(EXIT_CLASS);

      const handleExit = (event) => {
        if (event.target !== element || event.animationName !== EXIT_ANIMATION) {
          return;
        }
        detachHandler('__cardExitHandler');
        element.classList.remove(EXIT_CLASS);
        element.setAttribute('hidden', '');
      };

      element.__cardExitHandler = handleExit;
      element.addEventListener('animationend', handleExit);
    }

    function filterChecks() {
      const rawQuery = searchInput ? searchInput.value : '';
      const normalizedQuery = normalize(rawQuery.trim());
      const fuzzyPrefix = normalizedQuery.slice(0, 3);
      const activeLevels = filterButtons
        .filter((button) => button.classList.contains('active'))
        .map((button) => button.dataset.filterLevel);

      let visibleCount = 0;

      entries.forEach(({ element, level, levelGroup, normalizedText, normalizedWords }) => {
        const matchesLevel = !activeLevels.length || activeLevels.includes(level);
        const matchesSidebar =
          activeSidebarLevel === 'all' || (levelGroup && levelGroup === activeSidebarLevel);

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
    filterChecksRef = filterChecks;

    if (searchInput) {
      searchInput.addEventListener('input', filterChecks);
    }

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        button.classList.toggle('active');
        filterChecks();
      });
    });

    applySidebarState();
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
