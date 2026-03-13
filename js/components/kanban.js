// ============================================
// Kanban Board Component
// ============================================

import { state, setState, subscribeMultiple } from '../store.js';
import { dbUpdate, dbGetAll, dbAdd } from '../db.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { formatDate, getDateClass } from '../utils/date.js';

const KANBAN_COLUMNS = [
  { id: 'todo', title: 'A Fazer', color: '#6b7280' },
  { id: 'doing', title: 'Em Progresso', color: '#4772fa' },
  { id: 'done', title: 'Concluído', color: '#52c41a' },
];

// Bug B fix: validate kanbanStatus against actual column IDs
function getKanbanStatus(task, columns) {
  if (task.isCompleted) return columns[columns.length - 1].id;
  const validIds = columns.map(c => c.id);
  if (task.kanbanStatus && validIds.includes(task.kanbanStatus)) return task.kanbanStatus;
  return columns[0].id; // first column = default
}

function renderKanban() {
  const container = document.getElementById('task-list-content');
  if (!container || state.currentView !== 'kanban') return;

  const kanbanFilter = state.kanbanListFilter || 'all';

  // Determine active list (for column config)
  let activeList = null;
  if (kanbanFilter !== 'all') {
    activeList = state.lists.find(l => l.id === kanbanFilter) || null;
  }
  const columns = activeList?.kanbanColumns || KANBAN_COLUMNS;

  // Bug A fix: filter tasks by selected list
  const allTasks = state.tasks.filter(t => !t.isCanceled);
  const listTasks = kanbanFilter === 'all'
    ? allTasks
    : allTasks.filter(t => t.listId === kanbanFilter);

  container.innerHTML = `
    <div class="kanban-view" style="flex-direction:column;gap:0;overflow:hidden;">
      <div class="kanban-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border-light);background:var(--bg-secondary);flex-shrink:0;">
        <div>
          <h2 style="font-size:var(--fs-xl);font-weight:var(--fw-semibold)">📊 Kanban</h2>
          <span style="font-size:var(--fs-sm);color:var(--text-tertiary)">Arraste tarefas entre colunas</span>
        </div>
        <select id="kanban-list-filter" class="select" style="height:32px;font-size:var(--fs-sm);padding:0 8px;min-width:150px;">
          <option value="all" ${kanbanFilter === 'all' ? 'selected' : ''}>Todas as Listas</option>
          <option value="inbox" ${kanbanFilter === 'inbox' ? 'selected' : ''}>📥 Caixa de Entrada</option>
          ${state.lists.filter(l => !l.isDefault).map(l =>
            `<option value="${l.id}" ${kanbanFilter === l.id ? 'selected' : ''}>${l.emoji || '📝'} ${l.name}</option>`
          ).join('')}
        </select>
      </div>
      <div class="kanban-columns-wrapper" style="display:flex;flex-direction:row;gap:var(--space-4);overflow-x:auto;overflow-y:hidden;flex:1;padding:16px;">
        ${columns.map(col => {
          const colTasks = listTasks.filter(t => getKanbanStatus(t, columns) === col.id);
          return `
            <div class="kanban-column" data-kanban-col="${col.id}">
              <div class="kanban-column-header">
                <div class="kanban-column-title" style="display:flex;align-items:center;justify-content:space-between;width:100%">
                  <span>
                    <span class="kanban-column-dot" style="background: ${col.color}"></span>
                    ${col.title}
                    <span class="kanban-column-count">${colTasks.length}</span>
                  </span>
                  ${activeList ? `<button class="btn-icon btn-sm kanban-col-edit" data-edit-col="${col.id}" style="opacity:0.5">${icon('moreH')}</button>` : ''}
                </div>
              </div>
              <div class="kanban-column-body" data-kanban-drop="${col.id}">
                ${colTasks.map(t => renderKanbanCard(t)).join('')}
              </div>
              <div class="kanban-add-card" data-kanban-add="${col.id}">
                ${icon('plus')} Adicionar tarefa
              </div>
            </div>
          `;
        }).join('')}
        <div class="kanban-column" style="background:transparent; border: 2px dashed var(--border-color); display:flex; align-items:center; justify-content:center; cursor:pointer; min-width:200px; flex-shrink:0;" id="kanban-add-column-btn">
          <div style="color:var(--text-tertiary); font-weight:var(--fw-medium)">${icon('plus')} Adicionar Coluna</div>
        </div>
      </div>
    </div>
  `;

  bindKanbanEvents(activeList, columns);
}

function renderKanbanCard(task) {
  const list = state.lists.find(l => l.id === task.listId);
  const priorityColor = task.priority === 3 ? 'var(--priority-high)'
    : task.priority === 2 ? 'var(--priority-medium)'
    : task.priority === 1 ? 'var(--priority-low)' : '';
  const taskTags = (task.tags || []).map(id => state.tags.find(t => t.id === id)).filter(Boolean);
  const subtasks = task.subtasks || [];
  const completedSubs = subtasks.filter(s => s.completed).length;

  return `
    <div class="kanban-card" data-task-id="${task.id}" draggable="true">
      ${priorityColor ? `<div class="kanban-card-priority" style="background: ${priorityColor}"></div>` : ''}
      <div class="kanban-card-title">${escapeHtml(task.title)}</div>
      <div class="kanban-card-meta">
        ${task.dueDate ? `<span class="task-item-due ${getDateClass(task.dueDate)}">${icon('calendar')} ${formatDate(task.dueDate)}</span>` : ''}
        ${subtasks.length > 0 ? `<span class="task-item-subtask-count">${icon('subtask')} ${completedSubs}/${subtasks.length}</span>` : ''}
        ${list ? `
          <span class="task-item-list-name">
            <span class="task-item-list-dot" style="background:${list.color}"></span>
            ${escapeHtml(list.name)}
          </span>
        ` : ''}
        ${taskTags.map(t => `<span class="task-item-tag" style="background:${t.color}"></span>`).join('')}
      </div>
    </div>
  `;
}

function bindKanbanEvents(activeList, columns) {
  let draggedTaskId = null;

  // List filter
  document.getElementById('kanban-list-filter')?.addEventListener('change', (e) => {
    setState({ kanbanListFilter: e.target.value });
  });

  // Card click
  document.querySelectorAll('.kanban-card[data-task-id]').forEach(el => {
    el.addEventListener('click', () => {
      setState({ selectedTaskId: el.dataset.taskId, detailOpen: true });
    });
  });

  // Drag
  document.querySelectorAll('.kanban-card[draggable]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      draggedTaskId = el.dataset.taskId;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedTaskId);
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      document.querySelectorAll('.kanban-column-body.drag-over').forEach(d => d.classList.remove('drag-over'));
    });
  });

  // Drop zone
  document.querySelectorAll('[data-kanban-drop]').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const targetStatus = zone.dataset.kanbanDrop;

      if (draggedTaskId) {
        const task = state.tasks.find(t => t.id === draggedTaskId);
        if (task) {
          task.kanbanStatus = targetStatus;
          // Check if target column is a "done" type
          const targetCol = columns.find(c => c.id === targetStatus);
          const colTitle = (targetCol?.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const isDoneColumn = targetStatus === 'done' || colTitle === 'concluido' || colTitle === 'done' || colTitle === 'finalizado';
          if (isDoneColumn) {
            task.isCompleted = true;
            task.completedAt = new Date().toISOString();
          } else {
            task.isCompleted = false;
            task.completedAt = null;
          }
          await dbUpdate('tasks', task);
          setState({ tasks: await dbGetAll('tasks') });
        }
      }
    });
  });

  // Add card
  document.querySelectorAll('[data-kanban-add]').forEach(el => {
    el.addEventListener('click', () => {
      const status = el.dataset.kanbanAdd;
      const kanbanFilter = state.kanbanListFilter || 'all';
      const modalData = { kanbanStatus: status };
      if (kanbanFilter !== 'all') modalData.listId = kanbanFilter;
      setState({ modalOpen: 'addTask', modalData });
    });
  });

  // Add column
  document.getElementById('kanban-add-column-btn')?.addEventListener('click', () => {
    if (activeList) {
      setState({ modalOpen: 'addKanbanColumn', modalData: { listId: activeList.id } });
    } else {
      alert("Selecione uma lista específica no filtro acima para adicionar colunas customizadas.");
    }
  });

  // Edit column
  document.querySelectorAll('.kanban-col-edit').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const colId = el.dataset.editCol;
      const col = columns.find(c => c.id === colId);
      if (col && activeList) {
        setState({ modalOpen: 'editKanbanColumn', modalData: { listId: activeList.id, column: col } });
      }
    });
  });
}

function initKanban() {
  subscribeMultiple(['currentView', 'kanbanListFilter', 'tasks', 'lists', 'tags'], () => {
    if (state.currentView === 'kanban') {
      renderKanban();
    }
  });
}

export { renderKanban, initKanban };
