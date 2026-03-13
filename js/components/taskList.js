// ============================================
// Task List & Task Item Components
// ============================================

import { state, setState, subscribe, subscribeMultiple } from '../store.js';
import { dbAdd, dbUpdate, dbGetAll, dbDelete } from '../db.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { formatDate, getDateClass, isToday, isTomorrow, isWithinDays, extractNaturalDate, parseLocal, isPast } from '../utils/date.js';
import { renderTaskDetail } from './taskDetail.js';

function getTasksForView() {
  let tasks = [...state.tasks];
  const view = state.currentView;

  // Search filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.tags || []).some(tagId => {
        const tag = state.tags.find(tg => tg.id === tagId);
        return tag && tag.name.toLowerCase().includes(q);
      })
    );
  }

  // Tag filter
  if (state.filterTags.length > 0) {
    tasks = tasks.filter(t => (t.tags || []).some(tagId => state.filterTags.includes(tagId)));
  }

  // Priority filter
  if (state.filterPriority !== null && state.filterPriority !== undefined) {
    tasks = tasks.filter(t => t.priority === state.filterPriority);
  }

  // View-specific filtering
  switch (view) {
    case 'inbox':
      tasks = tasks.filter(t => t.listId === 'inbox');
      break;
    case 'today':
      tasks = tasks.filter(t => t.dueDate && (isToday(t.dueDate) || (!t.isCompleted && isPast(t.dueDate))));
      break;
    case 'tomorrow':
      tasks = tasks.filter(t => t.dueDate && isTomorrow(t.dueDate));
      break;
    case 'week':
      tasks = tasks.filter(t => t.dueDate && isWithinDays(t.dueDate, 7));
      break;
    case 'all':
      break;
    case 'completed':
      return tasks.filter(t => t.isCompleted).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    default:
      if (view.startsWith('list:')) {
        const listId = view.split(':')[1];
        tasks = tasks.filter(t => t.listId === listId);
      } else if (view.startsWith('tag:')) {
        // tag view: filterTags already set, no additional filter needed
        // but we show all (active+completed) tasks matching the tag
      } else if (view === 'search') {
        // search already handled above
      }
  }

  // Separate completed and active
  const active = tasks.filter(t => !t.isCompleted && !t.isCanceled);
  const completed = tasks.filter(t => t.isCompleted || t.isCanceled);

  // Sort active tasks
  active.sort((a, b) => {
    switch (state.sortBy) {
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return state.sortDir === 'asc'
          ? parseLocal(a.dueDate) - parseLocal(b.dueDate)
          : parseLocal(b.dueDate) - parseLocal(a.dueDate);
      case 'priority':
        return state.sortDir === 'asc' ? (b.priority || 0) - (a.priority || 0) : (a.priority || 0) - (b.priority || 0);
      case 'title':
        return state.sortDir === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      case 'createdAt':
        return state.sortDir === 'asc'
          ? new Date(a.createdAt) - new Date(b.createdAt)
          : new Date(b.createdAt) - new Date(a.createdAt);
      default: // sortOrder
        return (a.sortOrder || 0) - (b.sortOrder || 0);
    }
  });

  return { active, completed };
}

function getPriorityColor(priority) {
  switch (priority) {
    case 3: return 'var(--priority-high)';
    case 2: return 'var(--priority-medium)';
    case 1: return 'var(--priority-low)';
    default: return '';
  }
}

function getPriorityClass(priority) {
  switch (priority) {
    case 3: return 'priority-high';
    case 2: return 'priority-medium';
    case 1: return 'priority-low';
    default: return '';
  }
}

function renderTaskItem(task) {
  const list = state.lists.find(l => l.id === task.listId);
  const isNotesList = list?.type === 'notes';
  const taskTags = (task.tags || []).map(id => state.tags.find(t => t.id === id)).filter(Boolean);
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const showListName = ['today', 'tomorrow', 'week', 'all', 'completed', 'search'].includes(state.currentView);

  return `
    <div class="task-item ${task.isCompleted && !isNotesList ? 'completed' : ''} ${task.isCanceled ? 'canceled' : ''} ${state.selectedTaskId === task.id ? 'selected' : ''}"
         data-task-id="${task.id}" draggable="true" style="${task.isCanceled ? 'opacity: 0.6;' : ''}">
      ${task.priority > 0 && !isNotesList ? `<div class="task-item-priority" style="background: ${getPriorityColor(task.priority)}"></div>` : ''}
      <div class="checkbox task-item-checkbox ${task.isCompleted ? 'checked' : ''} ${task.isCanceled ? 'canceled' : ''} ${getPriorityClass(task.priority)}"
           data-task-complete="${task.id}" style="${isNotesList ? 'display:none;' : ''} ${task.isCanceled ? 'background:var(--bg-tertiary);border-color:var(--border-color);color:var(--text-tertiary);' : ''}">
        ${task.isCompleted ? icon('check') : (task.isCanceled ? icon('x') : '')}
      </div>
      <div class="task-item-content">
        <div class="task-item-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-item-desc">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-item-meta">
          ${task.dueDate && !isNotesList ? `
            <span class="task-item-due ${getDateClass(task.dueDate)}">
              ${icon('calendar')}
              ${formatDate(task.dueDate)}
            </span>
          ` : ''}
          ${task.isRecurring ? `<span class="badge badge-gray">${icon('repeat')} Recorrente</span>` : ''}
          ${subtasks.length > 0 ? `
            <span class="task-item-subtask-count">
              ${icon('subtask')}
              ${completedSubtasks}/${subtasks.length}
            </span>
          ` : ''}
          ${showListName && list ? `
            <span class="task-item-list-name">
              <span class="task-item-list-dot" style="background: ${list.color}"></span>
              ${escapeHtml(list.emoji || '')} ${escapeHtml(list.name)}
            </span>
          ` : ''}
          ${taskTags.map(t => `
            <span class="task-item-tag" style="background: ${t.color}"></span>
          `).join('')}
        </div>
      </div>
      <div class="task-item-actions">
        <button class="btn-icon sm" data-task-delete="${task.id}" title="Excluir">
          ${icon('trash')}
        </button>
      </div>
    </div>
  `;
}

function renderTaskList() {
  const container = document.getElementById('task-list-content');
  if (!container) return;

  const view = state.currentView;

  // Don't render task list for non-task views
  if (['calendar', 'pomodoro', 'habits', 'stats', 'eisenhower'].includes(view)) return;

  // For kanban, only render if this is not the dedicated kanban view (handled by kanban.js)
  if (view === 'kanban') return;

  // 'completed' view returns a flat sorted array; all other views return { active, completed }
  const tasksResult = getTasksForView();
  let active, completed;
  if (view === 'completed') {
    active = [];
    completed = Array.isArray(tasksResult) ? tasksResult : [];
  } else {
    active = tasksResult.active || [];
    completed = tasksResult.completed || [];
  }

  const targetListId = view.startsWith('list:') ? view.split(':')[1] : (view === 'inbox' ? 'inbox' : null);

  let currentList = null;
  if (view.startsWith('list:')) {
    currentList = state.lists.find(l => l.id === view.split(':')[1]);
  }
  const isNotesList = currentList?.type === 'notes';

  container.innerHTML = `
    <!-- Quick Add (hidden on completed view) -->
    ${view !== 'completed' ? `
    <div class="quick-add">
      <span class="quick-add-icon">${isNotesList ? icon('tag') : icon('plus')}</span>
      <input type="text" class="quick-add-input" placeholder="${isNotesList ? 'Adicionar nova nota...' : 'Adicionar tarefa...'}" id="quick-add-input" />
      <div class="quick-add-actions">
        ${isNotesList ? '' : `
        <button class="btn-icon sm" id="quick-add-date-btn" title="Data">${icon('calendar')}</button>
        <button class="btn-icon sm" id="quick-add-priority-btn" title="Prioridade">${icon('flag')}</button>
        `}
      </div>
    </div>
    ` : ''}

    <!-- Active Tasks -->
    <div class="task-section">
      ${active.length > 0 ? `
        <div class="task-section-header" data-section-toggle="active">
          <span class="task-section-chevron">${icon('chevronDown')}</span>
          <span class="task-section-title">Tarefas</span>
          <span class="task-section-count">${active.length}</span>
        </div>
        <div class="task-section-body" id="active-tasks">
          ${active.map(t => renderTaskItem(t)).join('')}
        </div>
      ` : (completed.length === 0 ? `
        <div class="empty-state">
          ${icon('empty')}
          <div class="empty-state-title">${view === 'completed' ? 'Nenhuma tarefa concluída' : (isNotesList ? 'Nenhuma nota' : 'Nenhuma tarefa')}</div>
          <div class="empty-state-desc">${view === 'completed' ? 'As tarefas que você concluir aparecerão aqui.' : (isNotesList ? 'Crie notas para armazenar ideias e informações.' : 'Adicione uma nova tarefa usando o campo acima ou pressione N')}</div>
        </div>
      ` : '')}
    </div>

    <!-- Completed Tasks section -->
    ${completed.length > 0 ? `
      <div class="task-section">
        <div class="task-section-header" data-section-toggle="completed">
          <span class="task-section-chevron">${icon('chevronDown')}</span>
          <span class="task-section-title">Concluídas</span>
          <span class="task-section-count">${completed.length}</span>
        </div>
        <div class="task-section-body" id="completed-tasks">
          ${completed.map(t => renderTaskItem(t)).join('')}
        </div>
      </div>
    ` : ''}
  `;

  bindTaskListEvents(targetListId);
}

function bindTaskListEvents(targetListId) {
  // Quick add
  const quickAddInput = document.getElementById('quick-add-input');
  if (quickAddInput) {
    quickAddInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && quickAddInput.value.trim()) {
        const rawTitle = quickAddInput.value.trim();
        const extracted = extractNaturalDate(rawTitle);
        const title = extracted.cleanText || rawTitle;
        const listId = targetListId || 'inbox';

        let dueDate = state.currentView === 'today' ? new Date().toISOString().split('T')[0] : null;
        if (extracted.date) {
          dueDate = extracted.date.toISOString().split('T')[0];
        }

        const newTask = {
          title,
          description: '',
          listId,
          priority: 0,
          dueDate,
          tags: [],
          subtasks: [],
          isCompleted: false,
          completedAt: null,
          isRecurring: false,
          recurRule: null,
          sortOrder: state.tasks.length
        };

        await dbAdd('tasks', newTask);
        const updatedTasks = await dbGetAll('tasks');
        setState({ tasks: updatedTasks });
        quickAddInput.value = '';
      }
    });
  }

  // Task click (select)
  document.querySelectorAll('.task-item[data-task-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-task-complete]') || e.target.closest('[data-task-delete]')) return;
      const taskId = el.dataset.taskId;
      setState({ selectedTaskId: taskId, detailOpen: true });
    });
  });

  // Checkbox toggle
  document.querySelectorAll('[data-task-complete]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const taskId = el.dataset.taskComplete;
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        task.isCompleted = !task.isCompleted;
        task.completedAt = task.isCompleted ? new Date().toISOString() : null;
        await dbUpdate('tasks', task);
        const updatedTasks = await dbGetAll('tasks');
        setState({ tasks: updatedTasks });
      }
    });
  });

  // Delete
  document.querySelectorAll('[data-task-delete]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const taskId = el.dataset.taskDelete;
      await dbDelete('tasks', taskId);
      const updatedTasks = await dbGetAll('tasks');
      setState({
        tasks: updatedTasks,
        selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
        detailOpen: state.selectedTaskId === taskId ? false : state.detailOpen
      });
    });
  });

  // Section toggle
  document.querySelectorAll('[data-section-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const body = el.nextElementSibling;
      const chevron = el.querySelector('.task-section-chevron');
      if (body) {
        body.style.display = body.style.display === 'none' ? '' : 'none';
        chevron?.classList.toggle('collapsed');
      }
    });
  });

  // Drag and drop
  setupTaskDragDrop();
}

function setupTaskDragDrop() {
  let draggedTaskId = null;

  document.querySelectorAll('.task-item[draggable]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      draggedTaskId = el.dataset.taskId;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach(d => d.classList.remove('drag-over'));
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('drag-over');
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove('drag-over');
    });

    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const targetId = el.dataset.taskId;

      if (draggedTaskId && draggedTaskId !== targetId) {
        const tasks = [...state.tasks];
        const dragIdx = tasks.findIndex(t => t.id === draggedTaskId);
        const dropIdx = tasks.findIndex(t => t.id === targetId);

        if (dragIdx >= 0 && dropIdx >= 0) {
          const [moved] = tasks.splice(dragIdx, 1);
          tasks.splice(dropIdx, 0, moved);

          // Update sort orders
          tasks.forEach((t, i) => {
            t.sortOrder = i;
          });

          for (const t of tasks) {
            await dbUpdate('tasks', t);
          }

          setState({ tasks: await dbGetAll('tasks') });
        }
      }
    });
  });
}

function initTaskList() {
  subscribeMultiple([
    'currentView', 'tasks', 'lists', 'tags', 'selectedTaskId',
    'searchQuery', 'filterTags', 'filterPriority', 'sortBy', 'sortDir'
  ], () => {
    renderTaskList();
    if (state.detailOpen && state.selectedTaskId) {
      renderTaskDetail();
    }
  });
}

export { renderTaskList, initTaskList, getTasksForView };
