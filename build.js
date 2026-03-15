// Build script: consolidates all CSS and JS into a single HTML file
const fs = require('fs');
const path = require('path');

const BASE = __dirname;

// Read all CSS files in order
const cssFiles = [
  'css/variables.css', 'css/base.css', 'css/layout.css', 'css/components.css',
  'css/task.css', 'css/calendar.css', 'css/kanban.css', 'css/pomodoro.css',
  'css/habits.css', 'css/stats.css', 'css/eisenhower.css',
  'css/search.css', 'css/floating.css'
];

let allCSS = '';
for (const f of cssFiles) {
  allCSS += fs.readFileSync(path.join(BASE, f), 'utf-8') + '\n';
}

// Read all JS files in dependency order and strip import/export statements
const jsFiles = [
  'js/utils/icons.js',
  'js/utils/date.js',
  'js/db.js',
  'js/store.js',
  'js/utils/theme.js',
  'js/utils/shortcuts.js',
  'js/components/taskDetail.js',
  'js/components/sidebar.js',
  'js/components/taskList.js',
  'js/components/header.js',
  'js/components/modal.js',
  'js/components/calendar.js',
  'js/components/kanban.js',
  'js/components/pomodoro.js',
  'js/components/habits.js',
  'js/components/stats.js',
  'js/components/eisenhower.js',
  'js/components/search.js',
  'js/components/floatingWindow.js',
  'js/app.js',
];

let allJS = '';
for (const f of jsFiles) {
  let content = fs.readFileSync(path.join(BASE, f), 'utf-8');
  // Remove import statements
  content = content.replace(/^import\s+.*?;\s*$/gm, '');
  // Remove export statements (but keep the content)
  content = content.replace(/^export\s*\{[^}]*\};\s*$/gm, '');
  content = content.replace(/^export\s+/gm, '');
  allJS += `// ── ${f} ──\n${content}\n`;
}

// Fix the dynamic import in taskDetail.js
allJS = allJS.replace(
  /const\s*\{\s*dbDelete,\s*dbGetAll\s*\}\s*=\s*await\s+import\([^)]+\);/g,
  '// dbDelete and dbGetAll already available from db.js'
);

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="TaskFlow — Gerenciador de tarefas completo, inspirado no TickTick." />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';" />
  <title>TaskFlow — Gerenciador de Tarefas</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>✅</text></svg>" />
  <style>
${allCSS}
    .app-loading {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 16px;
      background: var(--bg-primary); z-index: 9999; transition: opacity 0.3s ease;
    }
    .app-loading.hidden { opacity: 0; pointer-events: none; }
    .loading-spinner {
      width: 40px; height: 40px;
      border: 3px solid var(--border-color); border-top-color: var(--primary);
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    .loading-text { font-family: 'Inter', sans-serif; font-size: 14px; color: var(--text-tertiary); }
    .icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .icon svg { width: 1em; height: 1em; }
  </style>
</head>
<body>
  <div class="app-loading" id="app-loading">
    <div class="loading-spinner"></div>
    <div class="loading-text">Carregando TaskFlow...</div>
  </div>
  <div class="app">
    <aside class="sidebar" id="sidebar"></aside>
    <main class="main">
      <header class="main-header" id="main-header"></header>
      <div class="content-wrapper">
        <div class="main-content" id="task-list-content"></div>
        <aside class="detail-panel" id="detail-panel"></aside>
      </div>
    </main>
  </div>
  <div class="modal-overlay" id="modal-overlay"></div>
  <div class="toast-container" id="toast-container"></div>
  <script>
(function() {
${allJS}

  // Hide loading screen
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.getElementById('app-loading');
      if (loader) { loader.classList.add('hidden'); setTimeout(() => loader.remove(), 300); }
    }, 500);
  });
})();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(BASE, 'TaskFlow.html'), html, 'utf-8');
console.log('✅ TaskFlow.html created successfully! (' + Math.round(html.length / 1024) + ' KB)');
