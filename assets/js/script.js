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

const LEVEL_ORDER = {
  FATAL_ERROR: 0,
  ERROR: 1,
  WARNING: 2,
  INFORMATION: 3,
  INFO: 3
};

const LANGUAGE_STORAGE_KEY = 'precheck-doc-language';
const VIEW_STORAGE_KEY = 'precheck-doc-view-mode';
const DEFAULT_VIEW_MODE = 'grid-comfort';
const SUPPORTED_VIEW_MODES = new Set(['grid-dense', 'grid-comfort', 'list']);

const DOM_PARSER = new DOMParser();
const LANGUAGE_LISTENERS = new Set();

const normalize = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function getPreferredLanguage() {
  try {
    const stored = window.localStorage ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
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
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  } catch (error) {
    console.warn('Unable to persist language preference', error);
  }
}

function applyLanguage(lang) {
  document.documentElement.setAttribute('lang', lang);

  const textTargets = document.querySelectorAll('[data-fr][data-en]');
  textTargets.forEach((element) => {
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

  const titleTargets = document.querySelectorAll('[data-fr-title][data-en-title]');
  titleTargets.forEach((element) => {
    const label = element.getAttribute(lang === 'fr' ? 'data-fr-title' : 'data-en-title');
    if (label) {
      element.setAttribute('title', label);
      element.setAttribute('aria-label', label);
    }
  });

  document.querySelectorAll('.language-toggle').forEach((button) => {
    button.classList.toggle('active', button.dataset.lang === lang);
  });
}

function notifyLanguageChange(lang) {
  LANGUAGE_LISTENERS.forEach((listener) => {
    try {
      listener(lang);
    } catch (error) {
      console.warn('Language listener error', error);
    }
  });
}

function onLanguageChange(listener) {
  if (typeof listener === 'function') {
    LANGUAGE_LISTENERS.add(listener);
  }
}

function switchLanguage(lang) {
  applyLanguage(lang);
  setPreferredLanguage(lang);
  notifyLanguageChange(lang);
}

function getStoredViewMode() {
  try {
    const stored = window.localStorage ? localStorage.getItem(VIEW_STORAGE_KEY) : null;
    if (stored && SUPPORTED_VIEW_MODES.has(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('Unable to read stored view mode', error);
  }
  return DEFAULT_VIEW_MODE;
}

function setStoredViewMode(view) {
  try {
    if (window.localStorage && SUPPORTED_VIEW_MODES.has(view)) {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    }
  } catch (error) {
    console.warn('Unable to persist view mode', error);
  }
}

function normalizeLevel(level) {
  const value = (level || '').toString().trim().toUpperCase().replace(/\s+/g, '_');
  if (value === 'FATAL') {
    return 'FATAL_ERROR';
  }
  if (value === 'INFO') {
    return 'INFORMATION';
  }
  if (LEVEL_STYLES[value]) {
    return value;
  }
  return 'INFORMATION';
}

function extractLocalizedText(element, fallback = '') {
  if (!element) {
    return { fr: fallback, en: fallback };
  }
  const dataset = element.dataset || {};
  const pick = (keys, defaultValue) => {
    for (const key of keys) {
      const value = dataset[key];
      if (value) {
        return value.trim();
      }
    }
    return defaultValue;
  };
  const baseText = element.textContent ? element.textContent.trim() : fallback;
  const frValue = pick(['fr', 'frFr'], baseText);
  const enValue = pick(['en', 'enUs', 'enUk', 'enGb'], baseText);
  return { fr: frValue, en: enValue };
}

function extractIdentifierFromDocument(doc) {
  const rows = Array.from(doc.querySelectorAll('.info-table tr'));
  for (const row of rows) {
    const header = row.querySelector('th');
    const headerTexts = [
      header ? header.textContent || '' : '',
      header?.dataset?.fr || '',
      header?.dataset?.en || ''
    ]
      .map((value) => value.toLowerCase())
      .join(' ');
    if (headerTexts.includes('identifiant') || headerTexts.includes('identifier') || headerTexts.includes('check id')) {
      const cell = row.querySelector('td');
      if (cell) {
        return cell.textContent.trim();
      }
    }
  }
  return '';
}

function parseCheckDocument(filename, html) {
  const doc = DOM_PARSER.parseFromString(html, 'text/html');

  const title = extractLocalizedText(doc.querySelector('.page-title'));
  const descriptionElement = doc.querySelector('.content-section p');
  const description = extractLocalizedText(descriptionElement);

  const remediationSection = doc.querySelectorAll('.content-section p')[1];
  const remediation = remediationSection
    ? extractLocalizedText(remediationSection)
    : { ...description };

  const levelElement = doc.querySelector('.level-pill');
  let level = 'INFORMATION';
  if (levelElement) {
    const classLevel = Array.from(levelElement.classList).find((className) => className.startsWith('level-') && className !== 'level-pill');
    if (classLevel) {
      level = classLevel.replace('level-', '');
    } else {
      level = levelElement.textContent || level;
    }
  }
  level = normalizeLevel(level);

  const identifier = extractIdentifierFromDocument(doc);

  return {
    file: filename,
    title,
    description,
    remediation,
    identifier,
    level,
    normalized: {
      fr: normalize([title.fr, description.fr, remediation.fr, identifier].join(' ')),
      en: normalize([title.en, description.en, remediation.en, identifier].join(' '))
    }
  };
}

async function discoverCheckFiles() {
  try {
    const response = await fetch('checks/');
    if (!response.ok) {
      throw new Error(`Unable to list checks directory: ${response.status}`);
    }
    const directoryHtml = await response.text();
    const doc = DOM_PARSER.parseFromString(directoryHtml, 'text/html');
    const anchors = Array.from(doc.querySelectorAll('a[href]'));
    const hrefs = anchors.map((anchor) => anchor.getAttribute('href') || '');
    let files = hrefs
      .filter((href) => href && href.toLowerCase().endsWith('.html'))
      .map((href) => href.split('/').filter(Boolean).pop())
      .filter(Boolean);

    if (!files.length) {
      const matches = Array.from(directoryHtml.matchAll(/href\s*=\s*"([^"]+\.html)"/gi));
      files = matches.map((match) => match[1].split('/').filter(Boolean).pop()).filter(Boolean);
    }

    const unique = Array.from(new Set(files));
    return unique;
  } catch (error) {
    console.error('Failed to discover check files', error);
    throw error;
  }
}

async function loadCheckData(files) {
  const checks = [];
  for (const file of files) {
    try {
      const response = await fetch(`checks/${file}`);
      if (!response.ok) {
        console.warn(`Skipping ${file}: HTTP ${response.status}`);
        continue;
      }
      const html = await response.text();
      const parsed = parseCheckDocument(file, html);
      checks.push(parsed);
    } catch (error) {
      console.warn(`Unable to parse ${file}`, error);
    }
  }
  return checks;
}

function formatStatusMessage(state, lang) {
  if (state.type === 'error') {
    return lang === 'fr'
      ? "Impossible de charger les contrôles."
      : 'Unable to load the checks.';
  }
  if (state.type === 'loading') {
    return lang === 'fr'
      ? 'Chargement des contrôles...'
      : 'Loading checks...';
  }
  const count = state.count || 0;
  const total = state.total || 0;
  if (total === 0) {
    return lang === 'fr' ? 'Aucun contrôle disponible.' : 'No check available.';
  }
  const countLabelFr = count > 1 ? 'contrôles affichés' : 'contrôle affiché';
  const countLabelEn = count === 1 ? 'check displayed' : 'checks displayed';
  return lang === 'fr'
    ? `${count} ${countLabelFr} sur ${total}.`
    : `${count} ${countLabelEn} out of ${total}.`;
}

function applyFilters(checks, term, criticality, lang) {
  const normalizedTerm = normalize(term);
  return checks.filter((check) => {
    const matchesLevel = criticality === 'all' || check.level === criticality;
    if (!matchesLevel) {
      return false;
    }
    if (!normalizedTerm) {
      return true;
    }
    const haystack = check.normalized[lang] || check.normalized.fr;
    return haystack.includes(normalizedTerm);
  });
}

function sortChecks(checks, sortState, lang) {
  const collator = new Intl.Collator(lang === 'fr' ? 'fr-FR' : 'en-US', {
    sensitivity: 'base',
    numeric: true
  });
  const direction = sortState.direction === 'desc' ? -1 : 1;
  return [...checks].sort((a, b) => {
    const aTitle = a.title[lang] || a.title.fr || a.title.en;
    const bTitle = b.title[lang] || b.title.fr || b.title.en;
    switch (sortState.key) {
      case 'description': {
        const aDesc = a.description[lang] || a.description.fr || a.description.en;
        const bDesc = b.description[lang] || b.description.fr || b.description.en;
        return collator.compare(aDesc, bDesc) * direction;
      }
      case 'level': {
        const levelDiff = (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99);
        if (levelDiff !== 0) {
          return levelDiff * direction;
        }
        return collator.compare(aTitle, bTitle) * direction;
      }
      case 'identifier': {
        return collator.compare(a.identifier || '', b.identifier || '') * direction;
      }
      case 'title':
      default:
        return collator.compare(aTitle, bTitle) * direction;
    }
  });
}

function buildLevelPill(level, lang) {
  const span = document.createElement('span');
  const normalized = normalizeLevel(level);
  span.className = `level-pill ${LEVEL_STYLES[normalized] || LEVEL_STYLES.INFORMATION}`;
  const label = LEVEL_LABELS[normalized] ? LEVEL_LABELS[normalized][lang] : normalized;
  span.textContent = label || normalized;
  return span;
}

function renderGrid(viewContainer, checks, viewMode, lang, openModal) {
  const grid = document.createElement('div');
  grid.className = `card-grid ${viewMode === 'grid-dense' ? 'card-grid--dense' : 'card-grid--comfortable'}`;

  checks.forEach((check) => {
    const card = document.createElement('article');
    card.className = 'check-card';
    card.tabIndex = 0;
    card.dataset.level = check.level;

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const front = document.createElement('div');
    front.className = 'card-front';

    const levelPill = buildLevelPill(check.level, lang);
    front.appendChild(levelPill);

    if (check.identifier) {
      const identifier = document.createElement('p');
      identifier.className = 'identifier';
      identifier.textContent = check.identifier;
      front.appendChild(identifier);
    }

    const title = document.createElement('h3');
    title.textContent = check.title[lang] || check.title.fr || check.title.en;
    front.appendChild(title);

    const summary = document.createElement('p');
    summary.className = 'check-summary';
    summary.textContent = check.description[lang] || check.description.fr || check.description.en || '';
    front.appendChild(summary);

    const back = document.createElement('div');
    back.className = 'card-back';

    const backTitle = document.createElement('p');
    backTitle.className = 'card-back-title';
    backTitle.textContent = lang === 'fr' ? 'Résumé' : 'Overview';
    back.appendChild(backTitle);

    const backDescription = document.createElement('p');
    backDescription.className = 'card-back-description';
    backDescription.textContent = check.remediation[lang] || check.description[lang] || check.remediation.fr || check.description.fr;
    back.appendChild(backDescription);

    const backAction = document.createElement('button');
    backAction.type = 'button';
    backAction.className = 'card-back-action';
    backAction.textContent = lang === 'fr' ? 'Ouvrir le détail' : 'Open details';
    backAction.addEventListener('click', (event) => {
      event.stopPropagation();
      openModal(check);
    });
    back.appendChild(backAction);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.addEventListener('click', () => openModal(check));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(check);
      }
    });

    grid.appendChild(card);
  });

  viewContainer.innerHTML = '';
  viewContainer.appendChild(grid);
}

function buildListActions(lang, copyHandler, exportHandler) {
  const wrapper = document.createElement('div');
  wrapper.className = 'list-actions';

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.textContent = lang === 'fr' ? 'Copier le tableau' : 'Copy table';
  copyButton.addEventListener('click', copyHandler);

  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.textContent = lang === 'fr' ? 'Exporter en CSV' : 'Export CSV';
  exportButton.addEventListener('click', exportHandler);

  wrapper.appendChild(copyButton);
  wrapper.appendChild(exportButton);

  return wrapper;
}

function renderList(viewContainer, checks, sortState, lang, openModal, updateSort) {
  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper';

  const actions = buildListActions(
    lang,
    () => copyChecksToClipboard(checks, lang),
    () => exportChecksToCsv(checks, lang)
  );
  wrapper.appendChild(actions);

  const table = document.createElement('table');
  table.className = 'data-table';

  const columns = [
    { key: 'title', label: { fr: 'Nom du check', en: 'Check name' } },
    { key: 'description', label: { fr: 'Description', en: 'Description' } },
    { key: 'level', label: { fr: 'Criticité', en: 'Criticality' } },
    { key: 'identifier', label: { fr: 'Identifiant', en: 'Identifier' } }
  ];

  const thead = table.createTHead();
  const headRow = thead.insertRow();
  columns.forEach((column) => {
    const th = document.createElement('th');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sortKey = column.key;
    button.textContent = column.label[lang];
    if (sortState.key === column.key) {
      const indicator = document.createElement('span');
      indicator.className = 'sort-indicator';
      indicator.textContent = sortState.direction === 'asc' ? '↑' : '↓';
      button.appendChild(indicator);
    }
    button.addEventListener('click', () => updateSort(column.key));
    th.appendChild(button);
    headRow.appendChild(th);
  });

  const tbody = table.createTBody();
  checks.forEach((check) => {
    const row = tbody.insertRow();
    row.dataset.file = check.file;
    row.addEventListener('click', () => openModal(check));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(check);
      }
    });
    row.tabIndex = 0;
    row.setAttribute('role', 'button');

    const titleCell = row.insertCell();
    titleCell.textContent = check.title[lang] || check.title.fr || check.title.en;

    const descriptionCell = row.insertCell();
    descriptionCell.textContent = check.description[lang] || check.description.fr || check.description.en;

    const levelCell = row.insertCell();
    levelCell.appendChild(buildLevelPill(check.level, lang));

    const identifierCell = row.insertCell();
    identifierCell.textContent = check.identifier;
  });

  wrapper.appendChild(table);
  viewContainer.innerHTML = '';
  viewContainer.appendChild(wrapper);
}

function copyChecksToClipboard(checks, lang) {
  if (!checks.length) {
    return;
  }
  const columns = [
    lang === 'fr' ? 'Nom du check' : 'Check name',
    lang === 'fr' ? 'Description' : 'Description',
    lang === 'fr' ? 'Criticité' : 'Criticality',
    lang === 'fr' ? 'Identifiant' : 'Identifier'
  ];
  const rows = checks.map((check) => [
    check.title[lang] || check.title.fr || check.title.en,
    check.description[lang] || check.description.fr || check.description.en,
    LEVEL_LABELS[check.level] ? LEVEL_LABELS[check.level][lang] : check.level,
    check.identifier
  ]);
  const text = [columns.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch((error) => {
      console.warn('Clipboard copy failed', error);
      window.alert(lang === 'fr' ? 'Impossible de copier le tableau.' : 'Unable to copy the table.');
    });
  } else {
    window.alert(lang === 'fr' ? 'La copie n\'est pas supportée par ce navigateur.' : 'Copy is not supported by this browser.');
  }
}

function exportChecksToCsv(checks, lang) {
  if (!checks.length) {
    return;
  }
  const headers = [
    lang === 'fr' ? 'Nom du check' : 'Check name',
    lang === 'fr' ? 'Description' : 'Description',
    lang === 'fr' ? 'Criticité' : 'Criticality',
    lang === 'fr' ? 'Identifiant' : 'Identifier'
  ];
  const escapeCsv = (value) => {
    const stringValue = (value || '').toString();
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };
  const rows = checks.map((check) => [
    escapeCsv(check.title[lang] || check.title.fr || check.title.en),
    escapeCsv(check.description[lang] || check.description.fr || check.description.en),
    escapeCsv(LEVEL_LABELS[check.level] ? LEVEL_LABELS[check.level][lang] : check.level),
    escapeCsv(check.identifier)
  ]);
  const csvContent = [headers.map(escapeCsv).join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `consistency-checks-${lang}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function initHomePage(initialLang) {
  const searchInput = document.querySelector('[data-search]');
  const criticalitySelect = document.querySelector('[data-filter-criticality]');
  const viewButtons = Array.from(document.querySelectorAll('[data-view-mode]'));
  const viewContainer = document.querySelector('[data-view-container]');
  const loadingIndicator = document.querySelector('[data-loading-indicator]');
  const emptyState = document.querySelector('[data-empty-state]');
  const statusElement = document.querySelector('[data-status-count]');
  const modal = document.querySelector('[data-check-modal]');
  const modalTitle = modal ? modal.querySelector('.modal-title') : null;
  const modalFrame = modal ? modal.querySelector('.modal-frame') : null;
  const modalClose = modal ? modal.querySelector('[data-modal-close]') : null;

  let checks = [];
  let searchTerm = '';
  let selectedCriticality = 'all';
  let currentView = getStoredViewMode();
  let currentLanguage = initialLang;
  let sortState = { key: 'title', direction: 'asc' };
  let statusState = { type: 'loading', count: 0, total: 0 };

  const updateStatus = () => {
    if (statusElement) {
      statusElement.textContent = formatStatusMessage(statusState, currentLanguage);
    }
  };

  const setViewButtonsState = () => {
    viewButtons.forEach((button) => {
      const isActive = button.dataset.viewMode === currentView;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.classList.toggle('is-active', isActive);
    });
  };

  const openModal = (check) => {
    if (!modal || !modalTitle || !modalFrame) {
      window.open(`checks/${check.file}`, '_blank');
      return;
    }
    const targetTitle = check.title[currentLanguage] || check.title.fr || check.title.en;
    modalTitle.textContent = targetTitle;
    modalFrame.setAttribute('src', `checks/${check.file}`);
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      window.open(`checks/${check.file}`, '_blank');
    }
  };

  if (modal && modalClose) {
    modalClose.addEventListener('click', () => {
      modal.close();
    });
    modal.addEventListener('close', () => {
      if (modalFrame) {
        modalFrame.setAttribute('src', 'about:blank');
      }
    });
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.close();
      }
    });
  }

  const updateSort = (key) => {
    if (sortState.key === key) {
      sortState = { key, direction: sortState.direction === 'asc' ? 'desc' : 'asc' };
    } else {
      sortState = { key, direction: 'asc' };
    }
    render();
  };

  const render = () => {
    if (!viewContainer) {
      return;
    }
    if (statusState.type === 'loading') {
      if (loadingIndicator) {
        loadingIndicator.hidden = false;
      }
      if (emptyState) {
        emptyState.hidden = true;
      }
      viewContainer.innerHTML = '';
      return;
    }

    if (statusState.type === 'error') {
      if (loadingIndicator) {
        loadingIndicator.hidden = true;
      }
      if (emptyState) {
        emptyState.hidden = false;
      }
      viewContainer.innerHTML = '';
      updateStatus();
      return;
    }

    if (loadingIndicator) {
      loadingIndicator.hidden = true;
    }

    const filtered = applyFilters(checks, searchTerm, selectedCriticality, currentLanguage);
    const sorted = sortChecks(filtered, sortState, currentLanguage);
    statusState = { type: 'ready', count: sorted.length, total: checks.length };
    updateStatus();

    if (!sorted.length) {
      viewContainer.innerHTML = '';
      if (emptyState) {
        emptyState.hidden = false;
      }
      return;
    }

    if (emptyState) {
      emptyState.hidden = true;
    }

    if (currentView === 'list') {
      renderList(viewContainer, sorted, sortState, currentLanguage, openModal, updateSort);
    } else {
      renderGrid(viewContainer, sorted, currentView, currentLanguage, openModal);
    }
  };

  const performSearch = (event) => {
    searchTerm = event.target.value || '';
    render();
  };

  const changeCriticality = (event) => {
    selectedCriticality = event.target.value || 'all';
    render();
  };

  const changeView = (event) => {
    const mode = event.currentTarget.dataset.viewMode;
    if (!mode || mode === currentView) {
      return;
    }
    currentView = mode;
    setStoredViewMode(currentView);
    setViewButtonsState();
    render();
  };

  onLanguageChange((lang) => {
    currentLanguage = lang;
    updateStatus();
    render();
  });

  if (searchInput) {
    searchInput.addEventListener('input', performSearch);
  }

  if (criticalitySelect) {
    criticalitySelect.addEventListener('change', changeCriticality);
  }

  viewButtons.forEach((button) => {
    button.addEventListener('click', changeView);
  });

  setViewButtonsState();
  statusState = { type: 'loading', count: 0, total: 0 };
  updateStatus();
  if (loadingIndicator) {
    loadingIndicator.hidden = false;
  }
  if (emptyState) {
    emptyState.hidden = true;
  }

  discoverCheckFiles()
    .then((files) => loadCheckData(files))
    .then((loadedChecks) => {
      checks = sortChecks(loadedChecks, { key: 'title', direction: 'asc' }, currentLanguage);
      statusState = { type: 'ready', count: checks.length, total: checks.length };
      render();
    })
    .catch(() => {
      statusState = { type: 'error', count: 0, total: 0 };
      updateStatus();
      if (loadingIndicator) {
        loadingIndicator.hidden = true;
      }
      if (emptyState) {
        emptyState.hidden = false;
        const message = emptyState.querySelector('[data-fr][data-en]');
        if (message) {
          message.setAttribute('data-fr', 'Aucun contrôle n\'a pu être chargé.');
          message.setAttribute('data-en', 'No check could be loaded.');
          message.textContent = message.getAttribute(`data-${currentLanguage}`) || '';
        }
      }
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const initialLang = getPreferredLanguage();
  applyLanguage(initialLang);

  document.querySelectorAll('.language-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const lang = button.dataset.lang;
      if (lang === 'en' || lang === 'fr') {
        switchLanguage(lang);
      }
    });
  });

  const pageType = document.body ? document.body.getAttribute('data-page') : null;
  if (pageType === 'index') {
    initHomePage(initialLang);
  }
});
