# TaskFlow — Referência de Desenvolvimento

**Stack:** Vanilla JS + CSS + IndexedDB · Single-file HTML · Offline-first
**Versão:** 1.2 (Session 4)

---

## Comandos

```bash
node build.js        # Gera TaskFlow.html (350 KB)
node serve.js        # Servidor dev em localhost:3456
```

**Regra:** Sempre edite `js/` e `css/`, nunca edite `TaskFlow.html` diretamente.

---

## Arquitetura

```
index.html  +  js/  +  css/
       ↓ build.js
   TaskFlow.html          ← único arquivo distribuível
```

**Estado:** `store.js` — Pub/Sub reativo (`setState` / `subscribe` / `subscribeMultiple`)
**DB:** `db.js` — IndexedDB wrapper (8 stores: tasks, lists, folders, tags, habits, habitLogs, pomodoroSessions, settings)
**Build:** `build.js` — remove imports/exports, envolve em IIFE, injeta CSS+JS no HTML

---

## Estrutura de Arquivos

```
js/
  app.js                  ← entry point (init + renderMainView)
  store.js                ← estado global
  db.js                   ← IndexedDB (dbAdd/dbGet/dbGetAll/dbUpdate/dbBulkUpdate/dbDelete)
  components/
    sidebar.js            ← navegação, listas, tags, drag reorder
    header.js             ← título, view toggle, sort, search, add
    taskList.js           ← lista de tarefas, quick add, drag reorder
    taskDetail.js         ← painel lateral de detalhes, rich text, subtarefas
    modal.js              ← nova tarefa/lista/tag/hábito/coluna kanban
    calendar.js           ← visão mensal + semanal, filtro lista+tag
    kanban.js             ← colunas customizáveis, drag entre colunas
    pomodoro.js           ← timer reativo via state, skip/reset via pomodoroCommand
    habits.js             ← rastreador de hábitos
    stats.js              ← estatísticas e gráficos
    eisenhower.js         ← matriz 2x2, filtro por lista
    search.js             ← busca global com highlight, searchReturnView
    floatingWindow.js     ← janelas flutuantes (task + pomodoro), makeDraggable
  utils/
    richText.js           ← editor contenteditable (toolbar, sanitize, strip, truncate)
    date.js               ← formatDate, formatTime, NLP de datas, helpers
    icons.js              ← SVGs + escapeHtml
    shortcuts.js          ← atalhos de teclado
    theme.js              ← dark/light mode

css/
  variables.css           ← design tokens
  base/layout/components/task/calendar/kanban/pomodoro/habits/stats/eisenhower/search/floating.css
  ux.css                  ← tema corporativo (Fluent/glassmorphism, sidebar escura)
```

---

## Padrões Principais

**Componente padrão:**
```js
function renderX() { /* innerHTML */ }
function bindXEvents() { /* listeners */ }
function initX() {
  subscribeMultiple(['key1','key2'], () => renderX());
}
export { renderX, initX };
```

**Salvar e atualizar estado:**
```js
await dbUpdate('tasks', task);
setState({ tasks: await dbGetAll('tasks') });
```

**Batch update (múltiplos itens):**
```js
await dbBulkUpdate('tasks', changedTasksArray);
```

**Pomodoro — timer reativo:**
```js
// Qualquer componente pode iniciar/pausar:
setState({ pomodoroState: 'running' | 'paused' });
// Comandos especiais:
setState({ pomodoroCommand: 'skip' | 'reset' });
// pomodoro.js escuta e executa no subscribe
```

**Rich text:**
```js
// Renderizar campo
renderRichTextEditor({ value, placeholder, compact, allowExpand })
// Bindar eventos
bindRichTextEditor(rootEl, { initialValue, onChange, onSave })
// Extrair texto puro (para busca/preview)
stripRichText(html)       // → string
truncateRichText(html, n) // → string
```

**Drag-and-drop (floating windows):**
```js
// el._drag guarda estado para evitar listeners duplicados
makeDraggable(el, handleEl);
```

---

## Schema IndexedDB (resumido)

| Store | Campos-chave |
|-------|-------------|
| tasks | id, title, description (HTML), listId, priority(0-3), dueDate, tags[], subtasks[], isCompleted, isCanceled, recurRule, kanbanStatus, sortOrder |
| lists | id, name, color, emoji, folderId, type(tasks\|notes), kanbanColumns[], sortOrder |
| folders | id, name, isExpanded, sortOrder |
| tags | id, name, color |
| habits | id, name, icon, color, frequency, frequencyDays[], goalCount |
| habitLogs | id, habitId, date, completed, currentProgress |
| pomodoroSessions | id, taskId, date, duration, completedAt |
| settings | key, value (theme, pomodoro settings) |

---

## State Global (store.js) — chaves relevantes

```js
currentView        // 'inbox'|'today'|'tomorrow'|'week'|'all'|'completed'|'list:<id>'|'tag:<id>'|'calendar'|'kanban'|'pomodoro'|'habits'|'stats'|'eisenhower'|'search'
currentListId      // id da lista ativa
searchReturnView   // view anterior à busca (para fechar e voltar)
sortBy / sortDir   // 'sortOrder'|'dueDate'|'priority'|'title'|'createdAt' + 'asc'|'desc'
pomodoroState      // 'idle'|'running'|'paused'
pomodoroCommand    // null|'skip'|'reset'
pomodoroType       // 'work'|'shortBreak'|'longBreak'
floatingTask / floatingPomodoro  // boolean
calendarListFilter / calendarTagFilter
kanbanListFilter / eisenhowerListFilter
allListFilter
```

---

## Funcionalidades Implementadas

- CRUD tarefas, listas, pastas, tags, hábitos
- Rich text editor na descrição (bold, italic, headings, listas, checklists, links, code, quotes, timestamp)
- Duplicar tarefa
- Subtarefas com progresso
- Recorrência (daily/weekdays/weekly/monthly/yearly + after_completion)
- Kanban com colunas customizáveis e drag-and-drop
- Calendário mensal + semanal com time-blocking
- Eisenhower matrix
- Pomodoro com sessões, som, floating window, task linking
- Rastreador de hábitos com metas de contagem
- Estatísticas (7 dias, por lista, por prioridade)
- Busca global com scoring e highlight
- Janelas flutuantes (tarefa + pomodoro), draggable, opacidade
- Export/Import JSON com checksum SHA-256
- Drag reorder de listas na sidebar
- Drag reorder de tarefas na lista (apenas sortBy=sortOrder)
- Dark/light mode
- Atalhos: N (nova tarefa), Ctrl+Shift+A (quick add global), Ctrl+B (toggle sidebar), Esc (fechar)
- UX theme (Fluent/glassmorphism via ux.css)

---

## Pendências

- Kanban: reorder dentro da coluna (atualmente só move entre colunas)

---

## Debug (console do navegador)

```js
state                           // estado atual
dbGetAll('tasks').then(console.log)
setState({ currentView: 'kanban' })
```
