// ============================================
// Eisenhower Matrix Component
// ============================================

import { state, setState, subscribeMultiple } from '../store.js';
import { dbUpdate, dbGetAll } from '../db.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { formatDate, getDateClass } from '../utils/date.js';

const QUADRANTS = [
  { id: 'urgent-important',     priority: 3, label: 'Urgente e Importante',         color: '#ff4d4f', icon: '🔥', desc: 'Fazer agora' },
  { id: 'not-urgent-important', priority: 2, label: 'Importante mas Não Urgente',   color: '#ff8c22', icon: '📋', desc: 'Agendar' },
  { id: 'urgent-not-important', priority: 1, label: 'Urgente mas Não Importante',   color: '#4772fa', icon: '👥', desc: 'Delegar' },
  { id: 'not-urgent-not-important', priority: 0, label: 'Nem Urgente nem Importante', color: '#6b7280', icon: '🗑️', desc: 'Eliminar' },
];

function filterByList(task, filter) {
  if (filter === 'all') return true;
  return task.listId === filter;
}

function getQuadrantTasks(priority) {
  const filter = state.eisenhowerListFilter || 'all';
  return state.tasks.filter(t =>
    !t.isCompleted && !t.isCanceled &&
    (t.priority || 0) === priority &&
    filterByList(t, filter)
  );
}

function renderEisenhower() {
  const container = document.getElementById('task-list-content');
  if (!container || state.currentView !== 'eisenhower') return;

  const listFilter = state.eisenhowerListFilter || 'all';

  container.innerHTML = `
    <div class="eisenhower-view">
      <div class="eisenhower-header">
        <div>
          <h2 style="font-size:var(--fs-xl);font-weight:var(--fw-semibold)">🎯 Matriz de Eisenhower</h2>
          <span style="font-size:var(--fs-sm);color:var(--text-tertiary)">Arraste tarefas entre quadrantes para alterar a prioridade</span>
        </div>
        <select id="eis-list-filter" class="select" style="height:32px;font-size:var(--fs-sm);padding:0 8px;min-width:150px;">
          <option value="all" ${listFilter === 'all' ? 'selected' : ''}>Todas as Listas</option>
          <option value="inbox" ${listFilter === 'inbox' ? 'selected' : ''}>📥 Caixa de Entrada</option>
          ${state.lists.filter(l => !l.isDefault).map(l =>
            `<option value="${l.id}" ${listFilter === l.id ? 'selected' : ''}>${escapeHtml(l.emoji || '📝')} ${escapeHtml(l.name)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="eisenhower-grid">
        ${QUADRANTS.map(q => {
          const tasks = getQuadrantTasks(q.priority);
          return `
            <div class="eisenhower-quadrant" data-eisenhower-drop="${q.priority}" style="border-color: ${q.color}22">
              <div class="eisenhower-quadrant-header" style="background: ${q.color}12; border-bottom: 2px solid ${q.color}">
                <span class="eisenhower-quadrant-title">
                  <span>${q.icon}</span>
                  <span style="color:${q.color};font-weight:var(--fw-semibold)">${q.label}</span>
                </span>
                <span style="font-size:var(--fs-xs);color:var(--text-tertiary)">${q.desc}</span>
                <span class="eisenhower-quadrant-count" style="background:${q.color};color:white">${tasks.length}</span>
              </div>
              <div class="eisenhower-quadrant-body" data-eisenhower-drop="${q.priority}">
                ${tasks.length === 0 ? `
                  <div style="text-align:center;padding:var(--space-6);color:var(--text-tertiary);font-size:var(--fs-sm)">
                    Arraste tarefas aqui
                  </div>
                ` : ''}
                ${tasks.map(t => renderEisenhowerCard(t, q.color)).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  bindEisenhowerEvents();
}

function renderEisenhowerCard(task, quadrantColor) {
  const list = state.lists.find(l => l.id === task.listId);
  const taskTags = (task.tags || []).map(id => state.tags.find(t => t.id === id)).filter(Boolean);
  const subtasks = task.subtasks || [];
  const completedSubs = subtasks.filter(s => s.completed).length;

  return `
    <div class="eisenhower-card" data-task-id="${task.id}" draggable="true">
      <div class="eisenhower-card-title">${escapeHtml(task.title)}</div>
      <div class="eisenhower-card-meta">
        ${task.dueDate ? `<span class="task-item-due ${getDateClass(task.dueDate)}">${icon('calendar')} ${formatDate(task.dueDate)}</span>` : ''}
        ${subtasks.length > 0 ? `<span>${icon('subtask')} ${completedSubs}/${subtasks.length}</span>` : ''}
        ${list ? `<span><span class="task-item-list-dot" style="background:${list.color}"></span>${escapeHtml(list.emoji || '')} ${escapeHtml(list.name)}</span>` : ''}
        ${taskTags.map(t => `<span class="task-item-tag" style="background:${t.color}"></span>`).join('')}
      </div>
    </div>
  `;
}

function bindEisenhowerEvents() {
  let draggedTaskId = null;

  // List filter
  document.getElementById('eis-list-filter')?.addEventListener('change', (e) => {
    setState({ eisenhowerListFilter: e.target.value });
  });

  // Card click to open detail
  document.querySelectorAll('.eisenhower-card[data-task-id]').forEach(el => {
    el.addEventListener('click', () => {
      setState({ selectedTaskId: el.dataset.taskId, detailOpen: true });
    });
  });

  // Drag start
  document.querySelectorAll('.eisenhower-card[draggable]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      draggedTaskId = el.dataset.taskId;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedTaskId);
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      document.querySelectorAll('.eisenhower-quadrant-body.drag-over').forEach(d => d.classList.remove('drag-over'));
    });
  });

  // Drop zones
  document.querySelectorAll('[data-eisenhower-drop]').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const body = zone.classList.contains('eisenhower-quadrant-body') ? zone : zone.querySelector('.eisenhower-quadrant-body');
      if (body) body.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('drag-over');
      }
    });

    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const targetPriority = parseInt(zone.dataset.eisenhowerDrop);

      if (draggedTaskId && !isNaN(targetPriority)) {
        const task = state.tasks.find(t => t.id === draggedTaskId);
        if (task && task.priority !== targetPriority) {
          task.priority = targetPriority;
          await dbUpdate('tasks', task);
          setState({ tasks: await dbGetAll('tasks') });
        }
      }
    });
  });
}

function initEisenhower() {
  subscribeMultiple(['currentView', 'eisenhowerListFilter', 'tasks', 'lists', 'tags'], () => {
    if (state.currentView === 'eisenhower') {
      renderEisenhower();
    }
  });
}

export { renderEisenhower, initEisenhower };
