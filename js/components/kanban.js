// ============================================
// Kanban Board Component
// ============================================

import { state, setState, subscribeMultiple } from '../store.js';
import { dbUpdate, dbGetAll, dbAdd } from '../db.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { formatDate, getDateClass } from '../utils/date.js';

const DEFAULT_COLUMNS = [
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

// Get the union of all columns across all lists (deduplicated by id)
function getGlobalColumns() {
  const seen = new Map();
  for (const list of state.lists) {
    const cols = list.kanbanColumns || DEFAULT_COLUMNS;
    for (const col of cols) {
      if (!seen.has(col.id)) {
        seen.set(col.id, { ...col });
      }
    }
  }
  // Also add default columns if nothing found
  if (seen.size === 0) {
    for (const col of DEFAULT_COLUMNS) {
      seen.set(col.id, { ...col });
    }
  }
  return Array.from(seen.values());
}

// Returns which list IDs have a given column id
function listsWithColumn(colId) {
  return state.lists.filter(l => {
    const cols = l.kanbanColumns || DEFAULT_COLUMNS;
    return cols.some(c => c.id === colId);
  }).map(l => l.id);
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

  // Determine columns to show
  let columns;
  let ghostColumnIds = new Set();

  if (kanbanFilter === 'all') {
    // Show union of all columns
    columns = getGlobalColumns();
  } else if (activeList) {
    // Show this list's columns plus ghost columns for tasks that reference non-existent columns
    const listCols = activeList.kanbanColumns || DEFAULT_COLUMNS;
    const listColIds = new Set(listCols.map(c => c.id));
    columns = [...listCols];

    // Find tasks in this list that have a kanbanStatus pointing to a column not in this list
    const globalCols = getGlobalColumns();
    const listTasks = state.tasks.filter(t => t.listId === kanbanFilter && !t.isCanceled);
    for (const task of listTasks) {
      if (task.kanbanStatus && !listColIds.has(task.kanbanStatus)) {
        // Find the column definition in global columns
        const ghostCol = globalCols.find(c => c.id === task.kanbanStatus);
        if (ghostCol && !ghostColumnIds.has(ghostCol.id)) {
          ghostColumnIds.add(ghostCol.id);
          columns.push(ghostCol);
        }
      }
    }
  } else {
    columns = DEFAULT_COLUMNS;
  }

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
          const isGhost = ghostColumnIds.has(col.id);
          const colTasks = listTasks.filter(t => getKanbanStatus(t, columns) === col.id);

          // For "all" view, check if column exists in all lists or only some
          let colIndicator = '';
          if (kanbanFilter === 'all') {
            const listsHavingCol = listsWithColumn(col.id);
            if (listsHavingCol.length < state.lists.length) {
              colIndicator = `<span title="Coluna presente em ${listsHavingCol.length}/${state.lists.length} listas" style="font-size:10px;color:var(--text-tertiary);margin-left:4px;">⚠</span>`;
            }
          }

          return `
            <div class="kanban-column ${isGhost ? 'kanban-col--ghost' : ''}" data-kanban-col="${col.id}">
              <div class="kanban-column-header">
                <div class="kanban-column-title" style="display:flex;align-items:center;justify-content:space-between;width:100%">
                  <span>
                    <span class="kanban-column-dot" style="background: ${col.color}"></span>
                    ${escapeHtml(col.title)}
                    <span class="kanban-column-count">${colTasks.length}</span>
                    ${colIndicator}
                  </span>
                  <span style="display:flex;align-items:center;gap:4px;">
                    ${isGhost ? `
                      <button class="btn-icon btn-sm kanban-col-adopt" data-adopt-col-id="${col.id}" data-adopt-col-title="${escapeHtml(col.title)}" data-adopt-col-color="${col.color}" title="Adicionar à lista" style="font-size:11px;color:var(--primary)">✚</button>
                    ` : `
                      <button class="btn-icon btn-sm kanban-col-edit" data-edit-col="${col.id}" style="opacity:0.5">${icon('moreH')}</button>
                    `}
                  </span>
                </div>
                ${isGhost ? `<div style="font-size:10px;color:var(--text-tertiary);margin-top:2px;">Coluna não existe nesta lista</div>` : ''}
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

  bindKanbanEvents(activeList, columns, kanbanFilter);
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

function bindKanbanEvents(activeList, columns, kanbanFilter) {
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
      const modalData = { kanbanStatus: status };
      if (kanbanFilter !== 'all') modalData.listId = kanbanFilter;
      setState({ modalOpen: 'addTask', modalData });
    });
  });

  // Add column — works in both "all" mode and specific list mode
  document.getElementById('kanban-add-column-btn')?.addEventListener('click', () => {
    if (kanbanFilter === 'all') {
      setState({ modalOpen: 'addKanbanColumn', modalData: { listId: 'all' } });
    } else if (activeList) {
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
      if (col) {
        if (kanbanFilter === 'all') {
          setState({ modalOpen: 'editKanbanColumn', modalData: { listId: 'all', column: col } });
        } else if (activeList) {
          setState({ modalOpen: 'editKanbanColumn', modalData: { listId: activeList.id, column: col } });
        }
      }
    });
  });

  // Adopt ghost column (add it to the current list)
  document.querySelectorAll('.kanban-col-adopt').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!activeList) return;
      const colId = el.dataset.adoptColId;
      const colTitle = el.dataset.adoptColTitle;
      const colColor = el.dataset.adoptColColor;

      if (!activeList.kanbanColumns) {
        activeList.kanbanColumns = [...DEFAULT_COLUMNS];
      }
      // Add the column if not already present
      if (!activeList.kanbanColumns.find(c => c.id === colId)) {
        activeList.kanbanColumns.push({
          id: colId,
          title: colTitle,
          color: colColor,
          order: activeList.kanbanColumns.length
        });
        await dbUpdate('lists', activeList);
        setState({ lists: await dbGetAll('lists') });
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
