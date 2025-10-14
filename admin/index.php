<?php
declare(strict_types=1);

$rootDir = realpath(__DIR__ . '/..');
if ($rootDir === false) {
    http_response_code(500);
    echo 'Impossible de déterminer le répertoire racine du projet.';
    exit;
}

$manifestPath = $rootDir . '/manifest.json';
$checksDir = $rootDir . '/checks';

function loadManifest(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $contents = file_get_contents($path);
    if ($contents === false) {
        return [];
    }
    $data = json_decode($contents, true);
    return is_array($data) ? $data : [];
}

function sanitizeFileName(string $name): string
{
    $name = trim($name);
    $name = str_replace(['\\', '/'], '', $name);
    $name = preg_replace('/\s+/', '_', $name);
    $name = preg_replace('/[^A-Za-z0-9._-]/', '_', $name);
    $name = preg_replace('/_+/', '_', $name);
    $name = ltrim($name, '.-_');
    return $name;
}

function endsWithHtml(string $name): bool
{
    return (bool) preg_match('/\.html$/i', $name);
}

function normalizeNewlines(string $content): string
{
    $content = str_replace(["\r\n", "\r"], "\n", $content);
    return $content;
}

function createDomDocument(string $htmlContent): ?DOMDocument
{
    $document = new DOMDocument();
    $document->preserveWhiteSpace = false;
    $document->formatOutput = true;

    libxml_use_internal_errors(true);
    $loaded = $document->loadHTML($htmlContent, LIBXML_HTML_NODEFDTD | LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();

    if ($loaded === false) {
        return null;
    }

    return $document;
}

function getFirstNode(DOMXPath $xpath, string $query, ?DOMNode $context = null): ?DOMElement
{
    $nodeList = $xpath->query($query, $context);
    if (!$nodeList instanceof DOMNodeList || $nodeList->length === 0) {
        return null;
    }

    $item = $nodeList->item(0);
    return $item instanceof DOMElement ? $item : null;
}

function updateCheckHtml(string $htmlContent, array $data): string
{
    $document = createDomDocument($htmlContent);
    if (!$document instanceof DOMDocument) {
        return $htmlContent;
    }

    $xpath = new DOMXPath($document);

    $titleFr = trim((string) ($data['title_fr'] ?? ''));
    if ($titleFr !== '') {
        $titleNodes = $document->getElementsByTagName('title');
        if ($titleNodes->length > 0) {
            $titleNodes->item(0)->textContent = $titleFr . ' · Consistency Checker';
        }
    }

    $pageTitle = getFirstNode($xpath, "//h1[contains(concat(' ', normalize-space(@class), ' '), ' page-title ')]");
    if ($pageTitle) {
        if ($titleFr !== '') {
            $pageTitle->setAttribute('data-fr', $titleFr);
            $pageTitle->textContent = $titleFr;
        }
        $titleEn = trim((string) ($data['title_en'] ?? ''));
        if ($titleEn !== '') {
            $pageTitle->setAttribute('data-en', $titleEn);
        }
    }

    $identifier = trim((string) ($data['id'] ?? ''));
    if ($identifier !== '') {
        $identifierCell = getFirstNode(
            $xpath,
            "//table[contains(concat(' ', normalize-space(@class), ' '), ' info-table ')]//tr[th[@data-fr='Identifiant' or @data-en='Identifier']]/td"
        );
        if ($identifierCell) {
            $identifierCell->textContent = $identifier;
        }
    }

    $level = trim((string) ($data['level'] ?? ''));
    if ($level !== '') {
        $levelSpan = getFirstNode($xpath, "//span[contains(concat(' ', normalize-space(@class), ' '), ' level-pill ')]");
        if ($levelSpan) {
            $normalizedLevel = preg_replace('/[^A-Za-z0-9_-]/', '', strtoupper($level));
            $levelSpan->setAttribute('class', 'level-pill' . ($normalizedLevel !== '' ? ' level-' . $normalizedLevel : ''));
            $levelSpan->textContent = $level;
        }
    }

    $explanationFr = trim((string) ($data['explanation_fr'] ?? ''));
    $explanationEn = trim((string) ($data['explanation_en'] ?? ''));
    if ($explanationFr !== '' || $explanationEn !== '') {
        $paragraph = getFirstNode(
            $xpath,
            "//section[contains(concat(' ', normalize-space(@class), ' '), ' content-section ')]"
            . "[h2[contains(@data-fr, 'Explications') or contains(@data-en, 'Overview')]]"
            . "//p[@data-fr or @data-en]"
        );
        if ($paragraph) {
            if ($explanationFr !== '') {
                $paragraph->setAttribute('data-fr', $explanationFr);
                $paragraph->textContent = $explanationFr;
            }
            if ($explanationEn !== '') {
                $paragraph->setAttribute('data-en', $explanationEn);
            }
        }
    }

    $metaDescription = getFirstNode($xpath, "//meta[@name='description']");
    if ($metaDescription) {
        $metaDescription->setAttribute('content', $explanationFr !== '' ? $explanationFr : $explanationEn);
    }

    $resolutionFr = trim((string) ($data['resolution_fr'] ?? ''));
    $resolutionEn = trim((string) ($data['resolution_en'] ?? ''));
    if ($resolutionFr !== '' || $resolutionEn !== '') {
        $resolutionParagraph = getFirstNode(
            $xpath,
            "//section[contains(concat(' ', normalize-space(@class), ' '), ' content-section ')]"
            . "[h2[contains(@data-fr, 'Résolution') or contains(@data-en, 'Remediation')]]"
            . "//p[@data-fr or @data-en]"
        );
        if ($resolutionParagraph) {
            if ($resolutionFr !== '') {
                $resolutionParagraph->setAttribute('data-fr', $resolutionFr);
                $resolutionParagraph->textContent = $resolutionFr;
            }
            if ($resolutionEn !== '') {
                $resolutionParagraph->setAttribute('data-en', $resolutionEn);
            }
        }
    }

    return (string) $document->saveHTML();
}

function extractExplanationTexts(string $htmlContent): array
{
    $document = createDomDocument($htmlContent);
    if (!$document instanceof DOMDocument) {
        return ['fr' => '', 'en' => ''];
    }

    $xpath = new DOMXPath($document);
    $paragraph = getFirstNode(
        $xpath,
        "//section[contains(concat(' ', normalize-space(@class), ' '), ' content-section ')]"
        . "[h2[contains(@data-fr, 'Explications') or contains(@data-en, 'Overview')]]"
        . "//p[@data-fr or @data-en]"
    );

    if (!$paragraph) {
        return ['fr' => '', 'en' => ''];
    }

    $fr = trim((string) $paragraph->getAttribute('data-fr'));
    if ($fr === '') {
        $fr = trim($paragraph->textContent);
    }

    $en = trim((string) $paragraph->getAttribute('data-en'));
    if ($en === '') {
        $en = $fr;
    }

    return ['fr' => $fr, 'en' => $en];
}

function extractResolutionTexts(string $htmlContent): array
{
    $document = createDomDocument($htmlContent);
    if (!$document instanceof DOMDocument) {
        return ['fr' => '', 'en' => ''];
    }

    $xpath = new DOMXPath($document);
    $paragraph = getFirstNode(
        $xpath,
        "//section[contains(concat(' ', normalize-space(@class), ' '), ' content-section ')]"
        . "[h2[contains(@data-fr, 'Résolution') or contains(@data-en, 'Remediation')]]"
        . "//p[@data-fr or @data-en]"
    );

    if (!$paragraph) {
        return ['fr' => '', 'en' => ''];
    }

    $fr = trim((string) $paragraph->getAttribute('data-fr'));
    if ($fr === '') {
        $fr = trim($paragraph->textContent);
    }

    $en = trim((string) $paragraph->getAttribute('data-en'));
    if ($en === '') {
        $en = $fr;
    }

    return ['fr' => $fr, 'en' => $en];
}

$manifest = loadManifest($manifestPath);
$manifestByFile = [];
foreach ($manifest as $entry) {
    if (!is_array($entry) || !isset($entry['file'])) {
        continue;
    }
    $manifestByFile[$entry['file']] = $entry;
}

$checksIndex = [];
if (is_dir($checksDir)) {
    $files = glob($checksDir . '/*.html');
    if ($files !== false) {
        foreach ($files as $path) {
            $fileName = basename($path);
            $checksIndex[$fileName] = [
                'file' => $fileName,
                'path' => $path,
                'manifest' => $manifestByFile['checks/' . $fileName] ?? null,
                'exists' => true,
            ];
        }
    }
}

foreach ($manifestByFile as $file => $entry) {
    $fileName = basename($file);
    if (!isset($checksIndex[$fileName])) {
        $checksIndex[$fileName] = [
            'file' => $fileName,
            'path' => $checksDir . '/' . $fileName,
            'manifest' => $entry,
            'exists' => is_file($checksDir . '/' . $fileName),
        ];
    } else {
        $checksIndex[$fileName]['manifest'] = $checksIndex[$fileName]['manifest'] ?? $entry;
    }
}

$checks = array_values($checksIndex);
usort($checks, function (array $a, array $b): int {
    $left = $a['manifest']['id'] ?? $a['file'];
    $right = $b['manifest']['id'] ?? $b['file'];
    return strcasecmp($left, $right);
});

$selectedFile = isset($_GET['file']) ? basename((string) $_GET['file']) : '';
$normalizedNotice = isset($_GET['normalized']);
$renamedNotice = isset($_GET['renamed']);
$successNotice = isset($_GET['saved']);
$hasPost = $_SERVER['REQUEST_METHOD'] === 'POST';
$errors = [];
$originalFile = '';
$formData = [
    'file' => $selectedFile,
    'id' => '',
    'level' => 'FATAL_ERROR',
    'script' => 'N/A',
    'title_fr' => '',
    'title_en' => '',
    'explanation_fr' => '',
    'explanation_en' => '',
    'resolution_fr' => '',
    'resolution_en' => '',
    'content' => '',
];

if ($hasPost) {
    $originalFile = basename((string) ($_POST['original_file'] ?? ''));
    $inputFileName = trim((string) ($_POST['file'] ?? ''));
    $id = trim((string) ($_POST['id'] ?? ''));
    $level = trim((string) ($_POST['level'] ?? ''));
    $script = trim((string) ($_POST['script'] ?? ''));
    $titleFr = trim((string) ($_POST['title_fr'] ?? ''));
    $titleEn = trim((string) ($_POST['title_en'] ?? ''));
    $explanationFr = trim((string) ($_POST['explanation_fr'] ?? ''));
    $explanationEn = trim((string) ($_POST['explanation_en'] ?? ''));
    $resolutionFr = trim((string) ($_POST['resolution_fr'] ?? ''));
    $resolutionEn = trim((string) ($_POST['resolution_en'] ?? ''));
    $htmlContent = (string) ($_POST['content'] ?? '');

    if ($explanationFr === '' && $resolutionFr !== '') {
        $explanationFr = $resolutionFr;
    }
    if ($explanationEn === '' && $resolutionEn !== '') {
        $explanationEn = $resolutionEn;
    }

    $fileWithExtension = $inputFileName;
    if ($fileWithExtension !== '' && !endsWithHtml($fileWithExtension)) {
        $fileWithExtension .= '.html';
    }
    $sanitizedFileName = sanitizeFileName($fileWithExtension);
    if ($sanitizedFileName === '') {
        $errors[] = 'Le nom du fichier est obligatoire et doit contenir des caractères valides.';
    }
    if ($sanitizedFileName !== '' && !endsWithHtml($sanitizedFileName)) {
        $sanitizedFileName .= '.html';
    }
    if ($sanitizedFileName !== '' && !preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*\.html$/', $sanitizedFileName)) {
        $errors[] = 'Le nom du fichier doit uniquement contenir des lettres, chiffres, points, tirets ou underscores.';
    }

    if (trim($htmlContent) === '') {
        $errors[] = 'Le contenu HTML ne peut pas être vide.';
    }

    if (!is_dir($checksDir) || !is_writable($checksDir)) {
        $errors[] = 'Le dossier « checks » est introuvable ou non accessible en écriture.';
    }

    if (!is_file($manifestPath) && !is_writable(dirname($manifestPath))) {
        $errors[] = 'Impossible de créer ou de mettre à jour le manifest.json.';
    }
    if (is_file($manifestPath) && !is_writable($manifestPath)) {
        $errors[] = 'Le fichier manifest.json n\'est pas accessible en écriture.';
    }

    $formData = [
        'file' => $sanitizedFileName,
        'id' => $id,
        'level' => $level !== '' ? $level : 'FATAL_ERROR',
        'script' => $script !== '' ? $script : 'N/A',
        'title_fr' => $titleFr,
        'title_en' => $titleEn,
        'explanation_fr' => $explanationFr,
        'explanation_en' => $explanationEn,
        'resolution_fr' => $resolutionFr,
        'resolution_en' => $resolutionEn,
        'content' => $htmlContent,
    ];
    $selectedFile = $sanitizedFileName;

    $updatedHtmlContent = updateCheckHtml($htmlContent, [
        'id' => $formData['id'],
        'level' => $formData['level'],
        'title_fr' => $formData['title_fr'],
        'title_en' => $formData['title_en'],
        'explanation_fr' => $formData['explanation_fr'],
        'explanation_en' => $formData['explanation_en'],
        'resolution_fr' => $formData['resolution_fr'],
        'resolution_en' => $formData['resolution_en'],
    ]);
    $formData['content'] = $updatedHtmlContent;

    if (!$errors) {
        $htmlToWrite = normalizeNewlines($updatedHtmlContent);
        $targetPath = $checksDir . '/' . $sanitizedFileName;
        if (file_put_contents($targetPath, $htmlToWrite) === false) {
            $errors[] = 'Impossible d\'écrire le fichier HTML.';
        } else {
            $existingIndex = null;
            $originalManifestFile = $originalFile !== '' ? 'checks/' . $originalFile : null;
            if ($originalManifestFile !== null) {
                foreach ($manifest as $index => $entry) {
                    if (!is_array($entry)) {
                        continue;
                    }
                    if (($entry['file'] ?? null) === $originalManifestFile) {
                        $existingIndex = $index;
                        break;
                    }
                }
            }
            if ($existingIndex === null && $id !== '') {
                foreach ($manifest as $index => $entry) {
                    if (!is_array($entry)) {
                        continue;
                    }
                    if (($entry['id'] ?? null) === $id) {
                        $existingIndex = $index;
                        break;
                    }
                }
            }

            $newEntry = $existingIndex !== null && isset($manifest[$existingIndex]) && is_array($manifest[$existingIndex])
                ? $manifest[$existingIndex]
                : [];

            $newEntry['id'] = $id;
            $newEntry['level'] = $level !== '' ? $level : 'FATAL_ERROR';
            $newEntry['script'] = $script !== '' ? $script : 'N/A';
            $newEntry['title_fr'] = $titleFr;
            $newEntry['title_en'] = $titleEn;
            $newEntry['description_fr'] = $explanationFr;
            $newEntry['description_en'] = $explanationEn !== '' ? $explanationEn : $explanationFr;
            $newEntry['file'] = 'checks/' . $sanitizedFileName;

            if ($existingIndex !== null) {
                $manifest[$existingIndex] = $newEntry;
            } else {
                $manifest[] = $newEntry;
            }

            $manifestJson = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if ($manifestJson === false || file_put_contents($manifestPath, $manifestJson . PHP_EOL) === false) {
                $errors[] = 'Impossible de mettre à jour manifest.json.';
            } else {
                if ($originalFile !== '' && $originalFile !== $sanitizedFileName) {
                    $previousPath = $checksDir . '/' . $originalFile;
                    if (is_file($previousPath)) {
                        @unlink($previousPath);
                    }
                }
                $query = [
                    'file' => $sanitizedFileName,
                    'saved' => 1,
                ];
                if ($sanitizedFileName !== $fileWithExtension) {
                    $query['normalized'] = 1;
                }
                if ($originalFile !== '' && $originalFile !== $sanitizedFileName) {
                    $query['renamed'] = 1;
                }
                header('Location: index.php?' . http_build_query($query));
                exit;
            }
        }
    }
}

if (!$hasPost && $selectedFile && isset($manifestByFile['checks/' . $selectedFile])) {
    $entry = $manifestByFile['checks/' . $selectedFile];
    $formData['id'] = (string) ($entry['id'] ?? '');
    $formData['level'] = (string) ($entry['level'] ?? 'FATAL_ERROR');
    $formData['script'] = (string) ($entry['script'] ?? 'N/A');
    $formData['title_fr'] = (string) ($entry['title_fr'] ?? '');
    $formData['title_en'] = (string) ($entry['title_en'] ?? '');
    $formData['explanation_fr'] = (string) ($entry['description_fr'] ?? $formData['explanation_fr']);
    $formData['explanation_en'] = (string) ($entry['description_en'] ?? $formData['explanation_en']);
    $formData['file'] = $selectedFile;
}

if ($selectedFile && is_file($checksDir . '/' . $selectedFile) && $formData['content'] === '') {
    $fileContent = file_get_contents($checksDir . '/' . $selectedFile);
    if ($fileContent !== false) {
        $formData['content'] = $fileContent;
        $explanations = extractExplanationTexts($fileContent);
        $formData['explanation_fr'] = $explanations['fr'];
        $formData['explanation_en'] = $explanations['en'];
        $resolutions = extractResolutionTexts($fileContent);
        $formData['resolution_fr'] = $resolutions['fr'];
        $formData['resolution_en'] = $resolutions['en'];
    }
}

$selectedEntry = $selectedFile ? ($manifestByFile['checks/' . $selectedFile] ?? null) : null;
$originalFileValue = $hasPost
    ? $originalFile
    : ($selectedEntry && isset($selectedEntry['file']) ? basename((string) $selectedEntry['file']) : $selectedFile);
$totalChecks = count($checks);
$checksPlural = ($totalChecks === 0 || $totalChecks > 1) ? 's' : '';

function h(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

?>
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Administration des checks · Consistency Checker</title>
    <link rel="stylesheet" href="./admin.css" />
  </head>
  <body>
    <header>
      <h1>Administration des checks</h1>
      <p>Page interne — non livrée au client</p>
    </header>
    <main>
      <div class="warning-banner">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
        <div>
          Cette interface est réservée aux équipes internes. Aucun lien public ne doit y mener.
        </div>
      </div>

      <?php if ($successNotice): ?>
        <div class="message success">Le check a été sauvegardé avec succès.</div>
      <?php endif; ?>

      <?php if ($normalizedNotice): ?>
        <div class="message info">Le nom du fichier a été normalisé afin de respecter le format attendu.</div>
      <?php endif; ?>

      <?php if ($renamedNotice): ?>
        <div class="message info">L'ancien fichier a été renommé pour refléter le nouveau nom indiqué.</div>
      <?php endif; ?>

      <?php if ($errors): ?>
        <div class="message error">
          <p>Impossible de sauvegarder le check :</p>
          <ul>
            <?php foreach ($errors as $error): ?>
              <li><?= h($error) ?></li>
            <?php endforeach; ?>
          </ul>
        </div>
      <?php endif; ?>

      <div class="layout">
        <section class="card card-table">
          <div class="card-header">
            <h2>Checks disponibles</h2>
            <p class="status"><?= $totalChecks ?> check<?= $checksPlural ?> détecté<?= $checksPlural ?> dans le dossier.</p>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Titre (FR)</th>
                  <th>Script</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <?php if (!$checks): ?>
                  <tr class="empty">
                    <td colspan="3">Aucun check n'a été trouvé dans le dossier « checks ».</td>
                  </tr>
                <?php else: ?>
                  <?php foreach ($checks as $item): ?>
                    <?php
                      $isSelected = $selectedFile !== '' && $selectedFile === $item['file'];
                      $entry = $item['manifest'] ?? null;
                    ?>
                    <tr<?= $isSelected ? ' class="selected"' : '' ?>>
                      <td><?= h($entry['title_fr'] ?? '—') ?></td>
                      <td>
                        <?= h($entry['script'] ?? '—') ?>
                        <?php if (!$item['exists']): ?>
                          <span class="tag warning">manquant</span>
                        <?php endif; ?>
                      </td>
                      <td>
                        <a class="ghost-btn" href="?file=<?= urlencode($item['file']) ?>">Modifier</a>
                      </td>
                    </tr>
                  <?php endforeach; ?>
                <?php endif; ?>
              </tbody>
            </table>
          </div>
        </section>

        <section class="card card-editor">
          <div class="card-header">
            <h2><?= $selectedFile ? 'Modifier le check' : 'Sélectionnez un check' ?></h2>
            <?php if ($selectedFile): ?>
              <p class="status">Édition du fichier <strong><?= h($selectedFile) ?></strong>.</p>
            <?php else: ?>
              <p class="status">Choisissez un check dans la liste pour afficher le formulaire d'édition.</p>
            <?php endif; ?>
          </div>

          <?php if ($selectedFile): ?>
            <form method="post" class="editor-form">
              <input type="hidden" name="original_file" value="<?= h($originalFileValue) ?>" />
              <div class="grid">
                <div class="field">
                  <label for="field-id">Identifiant</label>
                  <input id="field-id" name="id" type="text" value="<?= h($formData['id']) ?>" />
                </div>
                <div class="field">
                  <label for="field-level">Niveau</label>
                  <input id="field-level" name="level" type="text" value="<?= h($formData['level']) ?>" placeholder="FATAL_ERROR, WARNING..." />
                </div>
                <div class="field">
                  <label for="field-script">Script</label>
                  <input id="field-script" name="script" type="text" value="<?= h($formData['script']) ?>" placeholder="N/A" />
                </div>
                <div class="field">
                  <label for="field-file">Nom du fichier</label>
                  <input id="field-file" name="file" type="text" value="<?= h($formData['file']) ?>" required />
                </div>
              </div>

              <div class="grid">
                <div class="field">
                  <label for="field-title-fr">Titre (FR)</label>
                  <input id="field-title-fr" name="title_fr" type="text" value="<?= h($formData['title_fr']) ?>" />
                </div>
                <div class="field">
                  <label for="field-title-en">Titre (EN)</label>
                  <input id="field-title-en" name="title_en" type="text" value="<?= h($formData['title_en']) ?>" />
                </div>
              </div>

              <div class="grid">
                <div class="field">
                  <label for="field-explanation-fr">Explications (FR)</label>
                  <textarea id="field-explanation-fr" name="explanation_fr" rows="4"><?= h($formData['explanation_fr']) ?></textarea>
                </div>
                <div class="field">
                  <label for="field-explanation-en">Explications (EN)</label>
                  <textarea id="field-explanation-en" name="explanation_en" rows="4"><?= h($formData['explanation_en']) ?></textarea>
                </div>
              </div>

              <div class="grid">
                <div class="field">
                  <label for="field-resolution-fr">Résolution (FR)</label>
                  <textarea id="field-resolution-fr" name="resolution_fr" rows="4"><?= h($formData['resolution_fr']) ?></textarea>
                </div>
                <div class="field">
                  <label for="field-resolution-en">Resolution (EN)</label>
                  <textarea id="field-resolution-en" name="resolution_en" rows="4"><?= h($formData['resolution_en']) ?></textarea>
                </div>
              </div>

              <div class="field">
                <label for="field-content">Contenu du check (HTML)</label>
                <textarea id="field-content" name="content" rows="18" spellcheck="false"><?= h($formData['content']) ?></textarea>
                <p class="status">Modifiez le contenu HTML ci-dessus pour mettre à jour le check bilingue.</p>
              </div>

              <div class="form-actions">
                <a class="ghost-btn" href="index.php">Annuler</a>
                <button class="primary-btn" type="submit">Sauvegarder</button>
              </div>
            </form>
          <?php else: ?>
            <div class="empty">Sélectionnez un check dans la liste pour commencer l'édition.</div>
          <?php endif; ?>
        </section>
      </div>
    </main>
  </body>
</html>
