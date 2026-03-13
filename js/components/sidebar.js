// ============================================
// Sidebar Component
// ============================================

import { state, setState, subscribe, subscribeMultiple } from '../store.js';
import { dbGetAll, dbAdd, dbUpdate, dbDelete, dbClear, exportData, importData } from '../db.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { isToday, isTomorrow, isWithinDays, isPast } from '../utils/date.js';

const SMART_LISTS = [
  { id: 'inbox', name: 'Caixa de Entrada', icon: 'inbox', color: '#4772fa' },
  { id: 'today', name: 'Hoje', icon: 'today', color: '#ff8c22' },
  { id: 'tomorrow', name: 'Amanhã', icon: 'tomorrow', color: '#faad14' },
  { id: 'week', name: 'Próximos 7 dias', icon: 'week', color: '#52c41a' },
  { id: 'all', name: 'Tudo', icon: 'all', color: '#6b7280' },
  { id: 'completed', name: 'Concluídas', icon: 'completed', color: '#52c41a' },
];

function getSmartListCount(smartId, tasks) {
  switch (smartId) {
    case 'inbox':
      return tasks.filter(t => t.listId === 'inbox' && !t.isCompleted).length;
    case 'today':
      return tasks.filter(t => !t.isCompleted && t.dueDate && isToday(t.dueDate)).length;
    case 'tomorrow':
      return tasks.filter(t => !t.isCompleted && t.dueDate && isTomorrow(t.dueDate)).length;
    case 'week':
      return tasks.filter(t => !t.isCompleted && t.dueDate && isWithinDays(t.dueDate, 7)).length;
    case 'all':
      return tasks.filter(t => !t.isCompleted).length;
    case 'completed':
      return tasks.filter(t => t.isCompleted).length;
    default:
      return 0;
  }
}

function getListCount(listId, tasks) {
  return tasks.filter(t => t.listId === listId && !t.isCompleted).length;
}

function renderSidebar() {
  const el = document.getElementById('sidebar');
  const tasks = state.tasks;
  const lists = state.lists.filter(l => !l.isDefault);
  const folders = state.folders;

  const listsWithoutFolder = lists.filter(l => !l.folderId).sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedFolders = [...folders].sort((a, b) => a.sortOrder - b.sortOrder);

  el.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        ${icon('completed')}
        <span>TaskFlow</span>
      </div>
      <button class="sidebar-toggle" id="sidebar-toggle-btn" title="Fechar barra lateral">
        ${icon('menu')}
      </button>
    </div>

    <div class="sidebar-search">
      <div class="sidebar-search-wrapper">
        ${icon('search')}
        <input type="text" class="sidebar-search-input" placeholder="Buscar..." id="sidebar-search" value="${state.searchQuery}" />
      </div>
    </div>

    <div class="sidebar-content">
      <!-- Smart Lists -->
      <div class="sidebar-section">
        ${SMART_LISTS.map(sl => `
          <div class="nav-item ${state.currentView === sl.id ? 'active' : ''}" data-view="${sl.id}">
            <div class="nav-item-icon" style="color: ${sl.color}">
              ${icon(sl.icon)}
            </div>
            <span class="nav-item-label">${sl.name}</span>
            <span class="nav-item-count">${getSmartListCount(sl.id, tasks) || ''}</span>
          </div>
        `).join('')}
      </div>

      <div class="sidebar-section" style="margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--border-light);">
        <div class="nav-item ${state.currentView === 'calendar' ? 'active' : ''}" data-view="calendar">
          <div class="nav-item-icon" style="color: #13c2c2">${icon('calendar')}</div>
          <span class="nav-item-label">Calendário</span>
        </div>
        <div class="nav-item ${state.currentView === 'kanban' ? 'active' : ''}" data-view="kanban">
          <div class="nav-item-icon" style="color: #4772fa">${icon('kanban')}</div>
          <span class="nav-item-label">Kanban</span>
        </div>
        <div class="nav-item ${state.currentView === 'pomodoro' ? 'active' : ''}" data-view="pomodoro">
          <div class="nav-item-icon" style="color: #ff4d4f">${icon('timer')}</div>
          <span class="nav-item-label">Pomodoro</span>
        </div>
        <div class="nav-item ${state.currentView === 'habits' ? 'active' : ''}" data-view="habits">
          <div class="nav-item-icon" style="color: #52c41a">${icon('habit')}</div>
          <span class="nav-item-label">Hábitos</span>
        </div>
        <div class="nav-item ${state.currentView === 'eisenhower' ? 'active' : ''}" data-view="eisenhower">
          <div class="nav-item-icon" style="color: #722ed1">${icon('move')}</div>
          <span class="nav-item-label">Eisenhower</span>
        </div>
        <div class="nav-item ${state.currentView === 'stats' ? 'active' : ''}" data-view="stats">
          <div class="nav-item-icon" style="color: #ff8c22">${icon('stats')}</div>
          <span class="nav-item-label">Estatísticas</span>
        </div>
      </div>

      <!-- User Lists -->
      <div class="sidebar-section" style="margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--border-light);">
        <div class="sidebar-section-header">
          <span class="sidebar-section-title">Listas</span>
          <button class="sidebar-section-btn" id="add-list-btn" title="Adicionar lista">
            ${icon('plus')}
          </button>
        </div>

        ${sortedFolders.map(folder => {
          const folderLists = lists.filter(l => l.folderId === folder.id).sort((a, b) => a.sortOrder - b.sortOrder);
          const isExpanded = folder.isExpanded !== false;
          return `
            <div class="folder-item" data-folder-id="${folder.id}">
              <div class="folder-header" data-folder-toggle="${folder.id}">
                <span class="folder-chevron ${isExpanded ? 'expanded' : ''}">${icon('chevronRight')}</span>
                <span class="nav-item-icon" style="color: var(--text-tertiary)">${icon('folder')}</span>
                <span class="nav-item-label">${escapeHtml(folder.name)}</span>
              </div>
              <div class="folder-lists" style="max-height: ${isExpanded ? '1000px' : '0'}">
                ${folderLists.map(l => {
                  const isActive = state.currentView === 'list:' + l.id ||
                    (state.currentView === 'kanban' && state.kanbanListFilter === l.id);
                  return `
                  <div class="nav-item ${isActive ? 'active' : ''}" data-view="list:${l.id}" data-list-id="${l.id}" data-context="list" draggable="true" data-list-id-drag="${l.id}" data-folder-id-drag="${l.folderId || ''}">
                    <div class="nav-item-color" style="background: ${l.color}"></div>
                    <span class="nav-item-label">${escapeHtml(l.emoji || '')} ${escapeHtml(l.name)}</span>
                    <span class="nav-item-count">${getListCount(l.id, tasks) || ''}</span>
                  </div>`;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}

        ${listsWithoutFolder.map(l => {
          const isActive = state.currentView === 'list:' + l.id ||
            (state.currentView === 'kanban' && state.kanbanListFilter === l.id);
          return `
          <div class="nav-item ${isActive ? 'active' : ''}" data-view="list:${l.id}" data-list-id="${l.id}" data-context="list" draggable="true" data-list-id-drag="${l.id}" data-folder-id-drag="">
            <div class="nav-item-color" style="background: ${l.color}"></div>
            <span class="nav-item-label">${escapeHtml(l.emoji || '')} ${escapeHtml(l.name)}</span>
            <span class="nav-item-count">${getListCount(l.id, tasks) || ''}</span>
          </div>`;
        }).join('')}
      </div>

      <!-- Tags -->
      <div class="sidebar-section" style="margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--border-light);">
        <div class="sidebar-section-header">
          <span class="sidebar-section-title">Tags</span>
          <button class="sidebar-section-btn" id="add-tag-btn" title="Adicionar tag">
            ${icon('plus')}
          </button>
        </div>
        ${state.tags.map(t => `
          <div class="nav-item ${state.currentView === 'tag:' + t.id ? 'active' : ''}" data-tag-view="${t.id}" data-tag-id="${t.id}" data-context="tag">
            <div class="tag-dot" style="background: ${t.color}; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"></div>
            <span class="nav-item-label">${escapeHtml(t.name)}</span>
            <span class="nav-item-count">${state.tasks.filter(tk => !tk.isCompleted && (tk.tags||[]).includes(t.id)).length || ''}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="sidebar-add-btn" id="add-folder-btn" style="flex:1">
        ${icon('folder')}
        <span>Nova Pasta</span>
      </button>
      <div style="display:flex; gap: 4px;">
        <button class="header-btn" id="export-data-btn" title="Exportar Dados" style="width:36px;height:36px">
          ${icon('download')}
        </button>
        <button class="header-btn" id="import-data-btn" title="Importar Dados" style="width:36px;height:36px">
          ${icon('upload')}
        </button>
        <button class="header-btn" id="clear-tasks-btn" title="Limpar todas as tarefas" style="width:36px;height:36px;color:var(--danger,#ff4d4f)">
          ${icon('trash')}
        </button>
        <input type="file" id="import-file-input" accept=".json" style="display:none" />
      </div>
    </div>
  `;

  bindSidebarEvents();
}

function bindSidebarEvents() {
  // Nav item clicks
  document.querySelectorAll('#sidebar .nav-item[data-view]').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.dataset.view;
      if (view === 'kanban') {
        setState({
          currentView: 'kanban',
          kanbanListFilter: 'all',
          selectedTaskId: null,
          detailOpen: false,
          searchQuery: '',
          filterTags: []
        });
      } else {
        setState({
          currentView: view,
          currentListId: view.startsWith('list:') ? view.split(':')[1] : view,
          selectedTaskId: null,
          detailOpen: false,
          searchQuery: '',
          filterTags: []
        });
      }
    });
  });

  // Sidebar toggle
  document.getElementById('sidebar-toggle-btn')?.addEventListener('click', () => {
    setState({ sidebarOpen: !state.sidebarOpen });
  });

  // Search
  document.getElementById('sidebar-search')?.addEventListener('input', (e) => {
    setState({ searchQuery: e.target.value, currentView: e.target.value ? 'search' : state.currentView });
  });

  // Add list
  document.getElementById('add-list-btn')?.addEventListener('click', () => {
    setState({ modalOpen: 'addList', modalData: null });
  });

  // Add folder
  document.getElementById('add-folder-btn')?.addEventListener('click', () => {
    setState({ modalOpen: 'addFolder', modalData: null });
  });

  // Export Data (with security warning)
  document.getElementById('export-data-btn')?.addEventListener('click', async () => {
    const proceed = confirm(
      '⚠️ AVISO DE SEGURANÇA\n\n' +
      'O arquivo exportado conterá TODOS os seus dados (tarefas, notas, descrições) em texto plano.\n\n' +
      'Se houver informações sensíveis, proteja o arquivo após o download.\n\n' +
      'Deseja continuar?'
    );
    if (!proceed) return;

    const json = await exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import Data (with race condition protection + size limit)
  const importInput = document.getElementById('import-file-input');
  let importInProgress = false;
  document.getElementById('import-data-btn')?.addEventListener('click', () => {
    if (importInProgress) { alert('Importação em andamento, aguarde.'); return; }
    if (confirm('Importar um backup IRÁ SUBSTITUIR todos os seus dados atuais. Tem certeza?')) {
      importInput?.click();
    }
  });

  importInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || importInProgress) return;
    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande. Limite: 50 MB.');
      return;
    }
    importInProgress = true;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const success = await importData(evt.target.result);
        if (success) {
          alert('Dados importados com sucesso! O aplicativo será recarregado.');
          window.location.reload();
        } else {
          alert('Erro ao importar dados. Arquivo inválido ou corrompido.');
        }
      } finally {
        importInProgress = false;
        importInput.value = '';
      }
    };
    reader.readAsText(file);
  });

  // Clear all tasks
  document.getElementById('clear-tasks-btn')?.addEventListener('click', async () => {
    if (!confirm('⚠️ Atenção: Isso irá APAGAR PERMANENTEMENTE todas as tarefas. Tem certeza?')) return;
    if (!confirm('Esta ação não pode ser desfeita. Confirma a exclusão de TODAS as tarefas?')) return;
    await dbClear('tasks');
    setState({
      tasks: [],
      selectedTaskId: null,
      detailOpen: false,
    });
  });

  // Add tag
  document.getElementById('add-tag-btn')?.addEventListener('click', () => {
    setState({ modalOpen: 'addTag', modalData: null });
  });

  // Folder toggle
  document.querySelectorAll('[data-folder-toggle]').forEach(el => {
    el.addEventListener('click', async () => {
      const folderId = el.dataset.folderToggle;
      const folder = state.folders.find(f => f.id === folderId);
      if (folder) {
        folder.isExpanded = !folder.isExpanded;
        await dbUpdate('folders', folder);
        renderSidebar();
      }
    });
  });

  // Tag view navigation (clicking a tag navigates to its task list view)
  document.querySelectorAll('[data-tag-view]').forEach(el => {
    el.addEventListener('click', () => {
      const tagId = el.dataset.tagView;
      setState({
        currentView: 'tag:' + tagId,
        currentListId: null,
        filterTags: [tagId],
        selectedTaskId: null,
        detailOpen: false,
        searchQuery: ''
      });
    });
  });

  // List drag-and-drop reorder
  let dragListId = null;
  let dragFolderId = null;
  document.querySelectorAll('[data-list-id-drag]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      dragListId = el.dataset.listIdDrag;
      dragFolderId = el.dataset.folderIdDrag;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragListId);
      setTimeout(() => el.style.opacity = '0.4', 0);
    });

    el.addEventListener('dragend', () => {
      el.style.opacity = '';
      document.querySelectorAll('[data-list-id-drag].drag-over-list').forEach(d => {
        d.classList.remove('drag-over-list');
        d.style.borderTop = '';
      });
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (el.dataset.listIdDrag !== dragListId && el.dataset.folderIdDrag === dragFolderId) {
        el.classList.add('drag-over-list');
        el.style.borderTop = '2px solid var(--primary)';
      }
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove('drag-over-list');
      el.style.borderTop = '';
    });

    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      el.classList.remove('drag-over-list');
      el.style.borderTop = '';
      const targetListId = el.dataset.listIdDrag;
      if (!dragListId || dragListId === targetListId) return;
      if (el.dataset.folderIdDrag !== dragFolderId) return; // only same group

      const srcList = state.lists.find(l => l.id === dragListId);
      const tgtList = state.lists.find(l => l.id === targetListId);
      if (!srcList || !tgtList) return;

      // Swap sortOrder
      const tmp = srcList.sortOrder;
      srcList.sortOrder = tgtList.sortOrder;
      tgtList.sortOrder = tmp;
      await dbUpdate('lists', srcList);
      await dbUpdate('lists', tgtList);
      setState({ lists: await dbGetAll('lists') });
    });
  });

  // Context menu for lists
  document.querySelectorAll('[data-context="list"]').forEach(el => {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const listId = el.dataset.listId;
      showListContextMenu(e.clientX, e.clientY, listId);
    });
  });

  // Context menu for tags
  document.querySelectorAll('[data-context="tag"]').forEach(el => {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showTagContextMenu(e.clientX, e.clientY, el.dataset.tagId);
    });
  });
}

function showListContextMenu(x, y, listId) {
  const existing = document.querySelector('.context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.innerHTML = `
    <div class="context-menu-item" data-action="edit">${icon('edit')} Editar Lista</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item danger" data-action="delete">${icon('trash')} Excluir Lista</div>
  `;

  document.body.appendChild(menu);

  // Ensure menu stays in viewport
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';

  menu.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'edit') {
      const list = state.lists.find(l => l.id === listId);
      setState({ modalOpen: 'editList', modalData: list });
    } else if (action === 'delete') {
      if (confirm('Tem certeza que deseja excluir esta lista? As tarefas serão movidas para a Caixa de Entrada.')) {
        // Move tasks to inbox
        const tasks = state.tasks.filter(t => t.listId === listId);
        for (const task of tasks) {
          task.listId = 'inbox';
          await dbUpdate('tasks', task);
        }
        await dbDelete('lists', listId);
        const updatedLists = await dbGetAll('lists');
        const updatedTasks = await dbGetAll('tasks');
        setState({
          lists: updatedLists,
          tasks: updatedTasks,
          currentView: 'inbox',
          currentListId: 'inbox'
        });
      }
    }
    menu.remove();
  });

  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

function showTagContextMenu(x, y, tagId) {
  const existing = document.querySelector('.context-menu');
  if (existing) existing.remove();

  const tag = state.tags.find(t => t.id === tagId);
  if (!tag) return;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.innerHTML = `
    <div class="context-menu-item" data-action="edit">${icon('edit')} Editar Tag</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item danger" data-action="delete">${icon('trash')} Excluir Tag</div>
  `;

  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';

  menu.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'edit') {
      setState({ modalOpen: 'editTag', modalData: tag });
    } else if (action === 'delete') {
      if (confirm(`Excluir a tag "${tag.name}"? Ela será removida de todas as tarefas.`)) {
        const tasksWithTag = state.tasks.filter(t => (t.tags || []).includes(tagId));
        for (const task of tasksWithTag) {
          task.tags = task.tags.filter(id => id !== tagId);
          await dbUpdate('tasks', task);
        }
        await dbDelete('tags', tagId);
        const updatedState = {
          tags: await dbGetAll('tags'),
          tasks: await dbGetAll('tasks'),
        };
        if (state.currentView === 'tag:' + tagId) {
          updatedState.currentView = 'inbox';
          updatedState.currentListId = 'inbox';
        }
        setState(updatedState);
      }
    }
    menu.remove();
  });

  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

function initSidebar() {
  subscribeMultiple(['currentView', 'kanbanListFilter', 'tasks', 'lists', 'folders', 'tags', 'filterTags', 'searchQuery'], () => {
    renderSidebar();
  });

  subscribe('sidebarOpen', (open) => {
    document.getElementById('sidebar')?.classList.toggle('collapsed', !open);
  });
}

export { renderSidebar, initSidebar };
