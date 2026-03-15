// ============================================
// Global Search Component
// ============================================

import { state, setState, subscribe, subscribeMultiple } from '../store.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { formatDate } from '../utils/date.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(escapedQuery, 'gi'), m =>
    `<mark style="background:var(--primary)33;color:var(--primary);border-radius:2px;">${m}</mark>`
  );
}

function scoreTask(task, query) {
  const q = query.toLowerCase();
  let score = 0;
  if (task.title.toLowerCase().includes(q)) score += 3;
  if (task.description && task.description.toLowerCase().includes(q)) score += 1;
  const taskTags = (task.tags || []).map(id => state.tags.find(t => t.id === id)).filter(Boolean);
  if (taskTags.some(t => t.name.toLowerCase().includes(q))) score += 2;
  return score;
}

function getSearchResults() {
  const query = state.searchQuery || '';
  const filter = state.searchFilter || 'all';

  let tasks = [...state.tasks];

  // Status filter
  if (filter === 'pending') tasks = tasks.filter(t => !t.isCompleted && !t.isCanceled);
  else if (filter === 'completed') tasks = tasks.filter(t => t.isCompleted);

  if (!query.trim()) return [];

  // Score and filter
  const scored = tasks
    .map(t => ({ task: t, score: scoreTask(t, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ task }) => task);

  return scored.slice(0, 30);
}

function renderSearch() {
  // Only render the search overlay if it should be open
  let overlay = document.getElementById('search-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    document.body.appendChild(overlay);
  }

  if (!state.searchOpen) {
    overlay.innerHTML = '';
    overlay.style.display = 'none';
    return;
  }

  overlay.style.display = 'flex';
  const query = state.searchQuery || '';
  const filter = state.searchFilter || 'all';
  const results = getSearchResults();

  overlay.innerHTML = `
    <div class="search-modal" id="search-modal">
      <div class="search-modal-header">
        <div class="search-input-wrapper">
          <span class="search-input-icon">${icon('search')}</span>
          <input type="text" id="search-global-input" class="search-input" placeholder="Buscar tarefas, descrições, tags..." value="${escapeHtml(query)}" autocomplete="off" />
          ${query ? `<button class="search-clear-btn" id="search-clear-btn">${icon('x')}</button>` : ''}
        </div>
        <button class="search-close-btn" id="search-close-btn">${icon('x')}</button>
      </div>

      <div class="search-filters">
        <button class="search-filter-tab ${filter === 'all' ? 'active' : ''}" data-search-filter="all">Todas</button>
        <button class="search-filter-tab ${filter === 'pending' ? 'active' : ''}" data-search-filter="pending">Pendentes</button>
        <button class="search-filter-tab ${filter === 'completed' ? 'active' : ''}" data-search-filter="completed">Concluídas</button>
      </div>

      <div class="search-results" id="search-results">
        ${!query.trim() ? `
          <div class="search-empty">
            <div class="search-empty-icon">${icon('search')}</div>
            <div class="search-empty-title">Buscar tarefas</div>
            <div class="search-empty-desc">Digite para buscar por título, descrição ou tags</div>
          </div>
        ` : results.length === 0 ? `
          <div class="search-empty">
            <div class="search-empty-icon">${icon('empty')}</div>
            <div class="search-empty-title">Nenhum resultado</div>
            <div class="search-empty-desc">Nenhuma tarefa encontrada para "${escapeHtml(query)}"</div>
          </div>
        ` : results.map(task => {
          const list = state.lists.find(l => l.id === task.listId);
          const taskTags = (task.tags || []).map(id => state.tags.find(t => t.id === id)).filter(Boolean);
          return `
            <div class="search-result-item" data-search-task-id="${task.id}">
              <div class="search-result-main">
                <div class="search-result-title ${task.isCompleted ? 'completed-text' : ''}">${highlight(task.title, query)}</div>
                ${task.description ? `<div class="search-result-desc">${highlight(task.description.substring(0, 120), query)}${task.description.length > 120 ? '...' : ''}</div>` : ''}
              </div>
              <div class="search-result-meta">
                ${list ? `
                  <span class="search-result-list">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${list.color};margin-right:3px;"></span>
                    ${escapeHtml(list.emoji || '')} ${escapeHtml(list.name)}
                  </span>
                ` : ''}
                ${task.dueDate ? `<span class="search-result-date">${icon('calendar')} ${formatDate(task.dueDate)}</span>` : ''}
                ${taskTags.map(t => `
                  <span class="search-result-tag" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}44;">
                    <span style="width:6px;height:6px;border-radius:50%;background:${t.color};display:inline-block;margin-right:3px;"></span>
                    ${escapeHtml(t.name)}
                  </span>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${results.length > 0 && query.trim() ? `
        <div class="search-footer">
          ${results.length} resultado${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}
        </div>
      ` : ''}
    </div>
  `;

  bindSearchEvents();
}

function bindSearchEvents() {
  const input = document.getElementById('search-global-input');
  if (input) {
    input.focus();
    // Put cursor at end
    const len = input.value.length;
    input.setSelectionRange(len, len);

    input.addEventListener('input', (e) => {
      setState({ searchQuery: e.target.value });
    });
  }

  document.getElementById('search-clear-btn')?.addEventListener('click', () => {
    setState({ searchQuery: '' });
  });

  document.getElementById('search-close-btn')?.addEventListener('click', () => {
    closeSearch();
  });

  // Overlay click outside to close
  const overlay = document.getElementById('search-overlay');
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeSearch();
  });

  // Filter tabs
  document.querySelectorAll('[data-search-filter]').forEach(el => {
    el.addEventListener('click', () => {
      setState({ searchFilter: el.dataset.searchFilter });
    });
  });

  // Result click
  document.querySelectorAll('[data-search-task-id]').forEach(el => {
    el.addEventListener('click', () => {
      const taskId = el.dataset.searchTaskId;
      setState({ selectedTaskId: taskId, detailOpen: true, searchOpen: false, searchQuery: '' });
    });
  });
}

function closeSearch() {
  setState({ searchOpen: false, searchQuery: '' });
}

function initSearch() {
  subscribeMultiple(['searchOpen', 'searchQuery', 'searchFilter', 'tasks', 'lists', 'tags'], () => {
    renderSearch();
  });
}

export { renderSearch, initSearch, closeSearch };
