const state = {
  rootHandle: null,
  checksHandle: null,
  manifestHandle: null,
  manifest: [],
  checks: [],
  editing: null,
};

const ui = {
  rootPath: document.getElementById('root-path'),
  selectRoot: document.getElementById('select-root'),
  refresh: document.getElementById('refresh'),
  search: document.getElementById('search'),
  add: document.getElementById('add-check'),
  tbody: document.getElementById('checks-body'),
  rowTemplate: document.getElementById('row-template'),
  overlay: document.getElementById('editor-overlay'),
  editorTitle: document.getElementById('editor-title'),
  editorForm: document.getElementById('editor-form'),
  formError: document.getElementById('form-error'),
  tabs: document.querySelectorAll('.lang-tab[data-lang]'),
  panels: document.querySelectorAll('.lang-panel[data-lang]'),
  editorTabs: document.querySelectorAll('.lang-tab[data-editor-lang]'),
  editorPanels: document.querySelectorAll('.lang-panel[data-editor-lang]'),
  inputs: {
    id: document.getElementById('check-id'),
    level: document.getElementById('check-level'),
    script: document.getElementById('check-script'),
    file: document.getElementById('check-file'),
    titleFr: document.getElementById('title-fr'),
    titleEn: document.getElementById('title-en'),
    descriptionFr: document.getElementById('description-fr'),
    descriptionEn: document.getElementById('description-en'),
    fileContentFr: document.getElementById('file-content-fr'),
    fileContentEn: document.getElementById('file-content-en'),
  },
  closeBtn: document.querySelector('#editor-overlay .close-btn'),
  cancelBtn: document.getElementById('cancel-edit'),
  saveBtn: document.getElementById('save-check'),
};

if (!('showDirectoryPicker' in window)) {
  ui.selectRoot.disabled = true;
  ui.rootPath.textContent =
    "Votre navigateur ne supporte pas l'API File System Access. Utilisez la dernière version de Chrome ou Edge.";
  document.querySelector('.table-wrapper table tbody').innerHTML =
    '<tr class="empty"><td colspan="5">Cette interface nécessite un navigateur compatible (Chrome/Edge) et doit être utilisée en local.</td></tr>';
}

function formatPath(handle) {
  return handle?.name ?? '';
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
}

async function verifyPermission(handle, mode = 'readwrite') {
  if (!handle) return false;
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if ((await handle.requestPermission(opts)) === 'granted') return true;
  return false;
}

function renderEmpty(message) {
  ui.tbody.innerHTML = '';
  const row = document.createElement('tr');
  row.className = 'empty';
  const cell = document.createElement('td');
  cell.colSpan = 5;
  cell.textContent = message;
  row.appendChild(cell);
  ui.tbody.appendChild(row);
}

function renderTable() {
  const query = ui.search.value.toLowerCase();
  const filtered = !query
    ? state.checks
    : state.checks.filter((item) => {
        return [
          item.manifest?.id,
          item.manifest?.title_fr,
          item.manifest?.title_en,
          item.file,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      });

  if (!filtered.length) {
    renderEmpty(query ? 'Aucun résultat pour cette recherche.' : 'Aucun check trouvé.');
    return;
  }

  ui.tbody.innerHTML = '';
  filtered
    .sort((a, b) => (a.manifest?.id || a.file).localeCompare(b.manifest?.id || b.file))
    .forEach((item) => {
      const row = ui.rowTemplate.content.firstElementChild.cloneNode(true);
      row.dataset.file = item.file;
      row.querySelector('[data-col="id"]').textContent = item.manifest?.id || '—';
      row.querySelector('[data-col="title-fr"]').textContent = item.manifest?.title_fr || '—';
      row.querySelector('[data-col="title-en"]').textContent = item.manifest?.title_en || '—';
      row.querySelector('[data-col="file"]').textContent = item.file;
      ui.tbody.appendChild(row);
    });
}

async function loadChecks() {
  if (!state.checksHandle || !state.manifestHandle) return;
  state.checks = [];
  state.manifest = await readManifest();
  for await (const entry of state.checksHandle.entries()) {
    const [name, handle] = entry;
    if (handle.kind !== 'file') continue;
    if (!name.endsWith('.html')) continue;
    const manifestEntry = state.manifest.find((item) => item.file === `checks/${name}`);
    state.checks.push({
      file: name,
      handle,
      manifest: manifestEntry || null,
    });
  }
  renderTable();
}

async function readManifest() {
  const file = await state.manifestHandle.getFile();
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Impossible de parser manifest.json', error);
    return [];
  }
}

async function writeManifest(entries) {
  const writer = await state.manifestHandle.createWritable();
  await writer.write(JSON.stringify(entries, null, 2) + '\n');
  await writer.close();
}

async function writeFile(handle, contents) {
  const writer = await handle.createWritable();
  await writer.truncate(0);
  await writer.write(contents);
  await writer.close();
}

function upsertManifestEntry(entry, previousFile) {
  let index = state.manifest.findIndex((item) => item.file === entry.file);
  if (index < 0 && previousFile) {
    index = state.manifest.findIndex((item) => item.file === previousFile);
  }
  if (index < 0 && entry.id) {
    index = state.manifest.findIndex((item) => item.id === entry.id);
  }
  if (index >= 0) {
    state.manifest[index] = entry;
  } else {
    state.manifest.push(entry);
  }
  state.manifest.sort((a, b) => {
    const left = (a.id || a.file || '').toLowerCase();
    const right = (b.id || b.file || '').toLowerCase();
    return left.localeCompare(right);
  });
}

function openEditor({ mode, item }) {
  state.editing = { mode, item };
  ui.formError.textContent = '';
  ui.editorForm.reset();
  ui.inputs.fileContentFr.value = '';
  ui.inputs.fileContentEn.value = '';

  if (mode === 'create') {
    ui.editorTitle.textContent = 'Ajouter un check';
    ui.inputs.id.value = '';
    ui.inputs.level.value = 'FATAL_ERROR';
    ui.inputs.script.value = 'N/A';
    ui.inputs.file.value = 'nouveau_check.html';
    ui.inputs.titleFr.value = '';
    ui.inputs.titleEn.value = '';
    ui.inputs.descriptionFr.value = '';
    ui.inputs.descriptionEn.value = '';
    const template = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nom du check · Consistency Checker</title>
    <link rel="stylesheet" href="../assets/css/style.css" />
  </head>
  <body data-page="detail">
    <!-- Ajoutez votre contenu ici -->
  </body>
</html>`;
    ui.inputs.fileContentFr.value = template;
    ui.inputs.fileContentEn.value = template;
  } else if (mode === 'edit' && item) {
    ui.editorTitle.textContent = 'Modifier un check';
    const manifest = item.manifest || {};
    ui.inputs.id.value = manifest.id || '';
    ui.inputs.level.value = manifest.level || '';
    ui.inputs.script.value = manifest.script || 'N/A';
    ui.inputs.file.value = item.file || '';
    ui.inputs.titleFr.value = manifest.title_fr || '';
    ui.inputs.titleEn.value = manifest.title_en || '';
    ui.inputs.descriptionFr.value = manifest.description_fr || '';
    ui.inputs.descriptionEn.value = manifest.description_en || '';
    item.handle.getFile().then((file) => file.text()).then((content) => {
      ui.inputs.fileContentFr.value = content;
      ui.inputs.fileContentEn.value = content;
    });
  }

  setActiveTab('fr');
  setActiveEditorTab('fr');
  ui.overlay.classList.add('active');
  ui.overlay.setAttribute('aria-hidden', 'false');
}

function closeEditor() {
  ui.overlay.classList.remove('active');
  ui.overlay.setAttribute('aria-hidden', 'true');
  state.editing = null;
}

function setActiveTab(lang) {
  ui.tabs.forEach((tab) => {
    const isActive = tab.dataset.lang === lang;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  ui.panels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.lang === lang);
  });
}

function setActiveEditorTab(lang) {
  ui.editorTabs.forEach((tab) => {
    const isActive = tab.dataset.editorLang === lang;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  ui.editorPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.editorLang === lang);
  });
}

async function handleSave() {
  if (!state.editing) return;
  const mode = state.editing.mode;
  const manifestEntry = {
    id: ui.inputs.id.value.trim(),
    script: ui.inputs.script.value.trim() || 'N/A',
    level: ui.inputs.level.value.trim() || 'FATAL_ERROR',
    title_fr: ui.inputs.titleFr.value.trim(),
    title_en: ui.inputs.titleEn.value.trim(),
    description_fr: ui.inputs.descriptionFr.value.trim(),
    description_en: ui.inputs.descriptionEn.value.trim(),
    file: '',
  };

  let fileName = ui.inputs.file.value.trim();
  if (!fileName) {
    ui.formError.textContent = 'Le nom de fichier est obligatoire.';
    return;
  }
  if (!fileName.endsWith('.html')) {
    fileName += '.html';
  }
  fileName = sanitizeFileName(fileName);

  const htmlContent = ui.inputs.fileContentFr.value;
  if (!htmlContent.trim()) {
    ui.formError.textContent = 'Le contenu du fichier ne peut pas être vide.';
    return;
  }

  try {
    if (mode === 'create') {
      const newHandle = await state.checksHandle.getFileHandle(fileName, { create: true });
      await writeFile(newHandle, htmlContent);
      manifestEntry.file = `checks/${fileName}`;
      upsertManifestEntry(manifestEntry);
      await writeManifest(state.manifest);
    } else if (mode === 'edit') {
      const { item } = state.editing;
      let fileHandle = item.handle;
      const originalName = item.file;
      if (fileName !== originalName) {
        const newHandle = await state.checksHandle.getFileHandle(fileName, { create: true });
        await writeFile(newHandle, htmlContent);
        await state.checksHandle.removeEntry(originalName);
        fileHandle = newHandle;
        item.handle = newHandle;
        item.file = fileName;
      } else {
        await writeFile(fileHandle, htmlContent);
      }

      manifestEntry.file = `checks/${fileName}`;
      upsertManifestEntry(manifestEntry, `checks/${originalName}`);
      await writeManifest(state.manifest);
    }

    await loadChecks();
    closeEditor();
  } catch (error) {
    console.error(error);
    ui.formError.textContent = `Impossible de sauvegarder le check : ${error.message}`;
  }
}

async function handleDelete(item) {
  if (!confirm(`Supprimer le fichier ${item.file} ? Cette action est irréversible.`)) {
    return;
  }
  try {
    await state.checksHandle.removeEntry(item.file);
    state.manifest = state.manifest.filter((entry) => entry.file !== `checks/${item.file}`);
    await writeManifest(state.manifest);
    await loadChecks();
  } catch (error) {
    alert(`Impossible de supprimer ce check : ${error.message}`);
  }
}

async function openRootDirectory() {
  try {
    const handle = await window.showDirectoryPicker({ id: 'docs-cc-root', mode: 'readwrite' });
    if (!(await verifyPermission(handle, 'readwrite'))) {
      alert('Impossible d\'obtenir les permissions sur ce dossier.');
      return;
    }
    state.rootHandle = handle;
    ui.rootPath.textContent = formatPath(handle);
    ui.search.value = '';
    try {
      state.checksHandle = await handle.getDirectoryHandle('checks');
    } catch (error) {
      throw new Error('Le dossier sélectionné ne contient pas de sous-dossier "checks".');
    }
    try {
      state.manifestHandle = await handle.getFileHandle('manifest.json');
    } catch (error) {
      throw new Error('Le fichier manifest.json est introuvable à la racine du dossier sélectionné.');
    }
    await loadChecks();
    ui.refresh.disabled = false;
    ui.add.disabled = false;
    ui.search.disabled = false;
  } catch (error) {
    if (error?.name !== 'AbortError') {
      alert(`Impossible d'ouvrir le dossier : ${error.message}`);
    }
  }
}

ui.selectRoot.addEventListener('click', openRootDirectory);
ui.refresh.addEventListener('click', loadChecks);
ui.add.addEventListener('click', () => openEditor({ mode: 'create' }));
ui.search.addEventListener('input', renderTable);

ui.tabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.lang));
});

ui.editorTabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveEditorTab(tab.dataset.editorLang));
});

ui.overlay.addEventListener('click', (event) => {
  if (event.target === ui.overlay) {
    closeEditor();
  }
});
ui.closeBtn.addEventListener('click', closeEditor);
ui.cancelBtn.addEventListener('click', closeEditor);
ui.saveBtn.addEventListener('click', handleSave);

ui.inputs.fileContentFr.addEventListener('input', (event) => {
  ui.inputs.fileContentEn.value = event.target.value;
});
ui.inputs.fileContentEn.addEventListener('input', (event) => {
  ui.inputs.fileContentFr.value = event.target.value;
});

ui.tbody.addEventListener('click', (event) => {
  const row = event.target.closest('tr');
  if (!row) return;
  const file = row.dataset.file;
  const item = state.checks.find((entry) => entry.file === file);
  if (!item) return;

  if (event.target.matches('button[data-action="edit"]')) {
    openEditor({ mode: 'edit', item });
  }
  if (event.target.matches('button[data-action="delete"]')) {
    handleDelete(item);
  }
});
    
