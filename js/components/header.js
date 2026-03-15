// ============================================
// Header Component
// ============================================

import { state, setState, subscribe, subscribeMultiple } from '../store.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { toggleTheme, getCurrentTheme } from '../utils/theme.js';

const VIEW_TITLES = {
  inbox: { title: 'Caixa de Entrada', emoji: '📥' },
  today: { title: 'Hoje', emoji: '☀️' },
  tomorrow: { title: 'Amanhã', emoji: '🌅' },
  week: { title: 'Próximos 7 dias', emoji: '📅' },
  all: { title: 'Tudo', emoji: '📋' },
  completed: { title: 'Concluídas', emoji: '✅' },
  calendar: { title: 'Calendário', emoji: '📆' },
  kanban: { title: 'Kanban', emoji: '📊' },
  pomodoro: { title: 'Pomodoro', emoji: '🍅' },
  habits: { title: 'Hábitos', emoji: '🎯' },
  eisenhower: { title: 'Eisenhower', emoji: '🎯' },
  stats: { title: 'Estatísticas', emoji: '📈' },
  search: { title: 'Busca', emoji: '🔍' },
};

function renderHeader() {
  const el = document.getElementById('main-header');
  if (!el) return;

  const view = state.currentView;
  let viewInfo = VIEW_TITLES[view];

  if (!viewInfo && view.startsWith('list:')) {
    const listId = view.split(':')[1];
    const list = state.lists.find(l => l.id === listId);
    viewInfo = list ? { title: list.name, emoji: list.emoji || '📝' } : { title: 'Lista', emoji: '📝' };
  }
  
  if (!viewInfo && view.startsWith('tag:')) {
    const tagId = view.split(':')[1];
    const tag = state.tags.find(t => t.id === tagId);
    viewInfo = tag ? { title: tag.name, emoji: '🏷️' } : { title: 'Tag', emoji: '🏷️' };
  }

  if (!viewInfo) viewInfo = { title: '', emoji: '' };

  const taskCount = state.tasks.filter(t => {
    if (view === 'completed') return t.isCompleted;
    if (view.startsWith('tag:')) {
      const tagId = view.split(':')[1];
      return !t.isCompleted && (t.tags || []).includes(tagId);
    }
    return !t.isCompleted;
  }).length;

  // Show view switch (list <-> kanban) only when in a named list
  const isInList = view.startsWith('list:');
  const isTaskView = !['calendar', 'kanban', 'pomodoro', 'habits', 'stats', 'eisenhower'].includes(view) || isInList;
  const isDark = getCurrentTheme() === 'dark';

  el.innerHTML = `
    <div class="main-header-left">
      <button class="btn-icon sidebar-open-btn" id="sidebar-open-btn" style="${state.sidebarOpen ? 'display:none' : ''}">
        ${icon('menu')}
      </button>
      <div class="main-header-title">
        <span class="emoji">${viewInfo.emoji}</span>
        <span>${escapeHtml(viewInfo.title)}</span>
        ${isTaskView ? `<span class="main-header-count">${taskCount}</span>` : ''}
      </div>
    </div>
    <div class="main-header-right">
      ${isTaskView ? `
        <div class="view-toggle">
          <button class="view-toggle-btn ${(!isInList || view.startsWith('list:')) && view !== 'kanban' ? 'active' : ''}"
                  data-header-view="list" title="Lista">${icon('listView')}</button>
          ${isInList ? `<button class="view-toggle-btn ${view === 'kanban' ? 'active' : ''}"
                  data-header-view="kanban" title="Kanban">${icon('kanban')}</button>` : ''}
          <button class="view-toggle-btn ${view === 'calendar' ? 'active' : ''}"
                  data-header-view="calendar" title="Calendário">${icon('calendar')}</button>
        </div>
        <button class="header-btn" id="sort-btn" title="Ordenar">${icon('sort')}</button>
      ` : ''}
      <button class="header-btn" id="search-open-btn" title="Buscar (Ctrl+F)">
        ${icon('search')}
      </button>
      <button class="header-btn" id="theme-toggle" title="${isDark ? 'Modo claro' : 'Modo escuro'}">
        ${isDark ? icon('sun') : icon('moon')}
      </button>
      <button class="header-btn" id="add-task-btn" title="Nova tarefa (N)">
        ${icon('plus')}
      </button>
    </div>
  `;

  bindHeaderEvents();
}

function bindHeaderEvents() {
  // Sidebar open (mobile)
  document.getElementById('sidebar-open-btn')?.addEventListener('click', () => {
    setState({ sidebarOpen: true });
  });

  // Search
  document.getElementById('search-open-btn')?.addEventListener('click', () => {
    setState({ searchOpen: true, searchQuery: '' });
  });

  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', async () => {
    await toggleTheme();
    renderHeader();
  });

  // Add task
  document.getElementById('add-task-btn')?.addEventListener('click', () => {
    setState({ modalOpen: 'addTask', modalData: null });
  });

  // View toggle
  document.querySelectorAll('[data-header-view]').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.dataset.headerView;
      if (view === 'list') {
        // Return to the list that was being viewed (preserve currentListId)
        const listId = state.currentListId;
        if (listId && listId !== 'kanban' && listId !== 'calendar' && state.lists.find(l => l.id === listId)) {
          setState({ currentView: 'list:' + listId });
        } else {
          setState({ currentView: state.currentListId || 'inbox' });
        }
      } else if (view === 'kanban') {
        // Switch to kanban with current list pre-selected as filter
        setState({ currentView: 'kanban', kanbanListFilter: state.currentListId || 'all' });
      } else {
        setState({ currentView: view });
      }
    });
  });

  // Sort dropdown
  document.getElementById('sort-btn')?.addEventListener('click', (e) => {
    showSortDropdown(e.currentTarget);
  });
}

function showSortDropdown(anchor) {
  const existing = document.querySelector('.dropdown');
  if (existing) { existing.remove(); return; }

  const rect = anchor.getBoundingClientRect();
  const dd = document.createElement('div');
  dd.className = 'dropdown';
  dd.style.position = 'fixed';
  dd.style.top = rect.bottom + 4 + 'px';
  dd.style.right = (window.innerWidth - rect.right) + 'px';
  dd.style.left = 'auto';

  const sorts = [
    { value: 'sortOrder', label: 'Ordem personalizada' },
    { value: 'dueDate', label: 'Data de vencimento' },
    { value: 'priority', label: 'Prioridade' },
    { value: 'title', label: 'Título' },
    { value: 'createdAt', label: 'Data de criação' },
  ];

  dd.innerHTML = sorts.map(s => `
    <div class="context-menu-item ${state.sortBy === s.value ? 'active' : ''}" data-sort="${s.value}" style="${state.sortBy === s.value ? 'color:var(--primary);font-weight:500' : ''}">
      ${s.label}
    </div>
  `).join('');

  document.body.appendChild(dd);

  dd.addEventListener('click', (e) => {
    const sortVal = e.target.closest('[data-sort]')?.dataset.sort;
    if (sortVal) {
      const newDir = state.sortBy === sortVal && state.sortDir === 'asc' ? 'desc' : 'asc';
      setState({ sortBy: sortVal, sortDir: newDir });
      dd.remove();
    }
  });

  setTimeout(() => {
    const close = (e) => {
      if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', close); }
    };
    document.addEventListener('click', close);
  }, 10);
}

function initHeader() {
  subscribeMultiple(['currentView', 'tasks', 'lists', 'sortBy', 'sortDir', 'sidebarOpen'], () => {
    renderHeader();
  });
}

export { renderHeader, initHeader };
