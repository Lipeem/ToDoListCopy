// ============================================
// Task Detail Panel Component
// ============================================

import { state, setState, subscribe } from '../store.js';
import { dbUpdate, dbAdd, dbGetAll, dbGetByIndex, dbDelete } from '../db.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { formatDate, addDays, today } from '../utils/date.js';
import { bindRichTextEditor, renderRichTextEditor } from '../utils/richText.js';

function renderTaskDetail() {
  const panel = document.getElementById('detail-panel');
  if (!panel) return;

  const task = state.tasks.find(t => t.id === state.selectedTaskId);

  if (!task || !state.detailOpen) {
    panel.classList.remove('open');
    return;
  }

  panel.classList.add('open');

  const subtasks = task.subtasks || [];
  const completedSubs = subtasks.filter(s => s.completed).length;
  const list = state.lists.find(l => l.id === task.listId);
  const isNotesList = list?.type === 'notes';
  const taskTags = (task.tags || []).map(id => state.tags.find(t => t.id === id)).filter(Boolean);

  const PRIORITIES = [
    { value: 0, label: 'Nenhuma', color: 'var(--text-tertiary)' },
    { value: 1, label: 'Baixa', color: 'var(--priority-low)' },
    { value: 2, label: 'Média', color: 'var(--priority-medium)' },
    { value: 3, label: 'Alta', color: 'var(--priority-high)' },
  ];

  panel.innerHTML = `
    <div class="detail-panel-header">
      <div style="display:flex;align-items:center;gap:var(--space-2);${isNotesList ? 'visibility:hidden' : ''}">
        <div class="checkbox ${task.isCompleted ? 'checked' : ''} ${task.isCanceled ? 'canceled' : ''}" id="detail-checkbox" style="${task.isCanceled ? 'background:var(--bg-tertiary);border-color:var(--border-color);color:var(--text-tertiary);' : ''}">
          ${task.isCompleted ? icon('check') : (task.isCanceled ? icon('x') : '')}
        </div>
        <span style="font-size:var(--fs-sm);color:var(--text-tertiary)">
          ${task.isCompleted ? 'Concluída' : (task.isCanceled ? 'Cancelada' : 'Pendente')}
        </span>
      </div>
      <button class="btn-icon" id="detail-close">${icon('x')}</button>
    </div>

    <div class="detail-panel-content">
      <!-- Title -->
      <div class="detail-field">
        <input type="text" class="detail-title-input" value="${escapeHtml(task.title)}" id="detail-title" placeholder="Título da tarefa" />
      </div>

      <!-- Description -->
      <div class="detail-field">
        <div class="detail-field-label">${icon('description')} Descrição</div>
        <div id="detail-desc-root">
          ${renderRichTextEditor({
            value: task.description || '',
            placeholder: 'Adicionar descrição...',
            allowExpand: true
          })}
        </div>
      </div>

      <!-- List -->
      <div class="detail-field">
        <div class="detail-field-label">${icon('inbox')} Lista</div>
        <select class="select" id="detail-list" style="height:32px;font-size:var(--fs-sm)">
          ${state.lists.map(l => `
            <option value="${l.id}" ${l.id === task.listId ? 'selected' : ''}>${escapeHtml(l.emoji || '')} ${escapeHtml(l.name)}</option>
          `).join('')}
        </select>
      </div>

      <!-- Due Date & Time -->
      <div class="detail-field" style="${isNotesList ? 'display:none' : ''}">
        <div class="detail-field-label">${icon('calendar')} Data e Horário</div>
        <div style="display:flex; gap:var(--space-2)">
          <input type="date" class="input input-sm" id="detail-date" value="${task.dueDate || ''}" style="flex:2" />
          <input type="time" class="input input-sm" id="detail-start-time" value="${task.startTime || ''}" title="Horário de início" style="flex:1" />
          <input type="number" class="input input-sm" id="detail-duration" value="${task.duration || ''}" placeholder="Minutos" title="Duração (min)" style="flex:1; width:60px" min="5" step="5" />
        </div>
      </div>

      <!-- Priority -->
      <div class="detail-field" style="${isNotesList ? 'display:none' : ''}">
        <div class="detail-field-label">${icon('flag')} Prioridade</div>
        <div class="priority-selector" id="detail-priority">
          ${PRIORITIES.map(p => `
            <div class="priority-option ${task.priority === p.value ? 'selected' : ''}"
                 data-priority="${p.value}" style="color: ${p.color}">
              ${icon('flag')}
              <span>${p.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Tags -->
      <div class="detail-field">
        <div class="detail-field-label">${icon('tag')} Tags</div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-1)">
          ${state.tags.map(t => `
            <span class="tag ${taskTags.find(tt => tt.id === t.id) ? 'selected' : ''}"
                  data-tag-toggle="${t.id}"
                  style="${taskTags.find(tt => tt.id === t.id) ? `background: ${t.color}22; color: ${t.color}; border: 1px solid ${t.color}44` : ''}">
              <span class="tag-dot" style="background: ${t.color}"></span>
              ${escapeHtml(t.name)}
            </span>
          `).join('')}
        </div>
      </div>

      <!-- Recurring -->
      <div class="detail-field" style="${isNotesList ? 'display:none' : ''}">
        <div class="detail-field-label">${icon('repeat')} Recorrência</div>
        <select class="select" id="detail-recur" style="height:32px;font-size:var(--fs-sm)">
          <option value="" ${!task.recurRule ? 'selected' : ''}>Nenhuma</option>
          <option value="daily" ${task.recurRule === 'daily' ? 'selected' : ''}>Diária</option>
          <option value="weekdays" ${task.recurRule === 'weekdays' ? 'selected' : ''}>Dias úteis</option>
          <option value="weekly" ${task.recurRule === 'weekly' ? 'selected' : ''}>Semanal</option>
          <option value="monthly" ${task.recurRule === 'monthly' ? 'selected' : ''}>Mensal</option>
          <option value="yearly" ${task.recurRule === 'yearly' ? 'selected' : ''}>Anual</option>
        </select>
        ${task.recurRule ? `
        <div style="margin-top:var(--space-2);display:flex;align-items:center;gap:var(--space-2)">
          <label style="display:flex;align-items:center;gap:6px;font-size:var(--fs-sm);color:var(--text-secondary);cursor:pointer">
            <input type="checkbox" id="detail-recur-after" ${task.recurType === 'after_completion' ? 'checked' : ''} />
            Repetir após conclusão
          </label>
          ${task.recurType === 'after_completion' ? `
            <input type="number" class="input input-sm" id="detail-recur-days" value="${task.recurDaysAfter || 1}" min="1" style="width:60px" title="Dias após conclusão" />
            <span style="font-size:var(--fs-xs);color:var(--text-tertiary)">dias depois</span>
          ` : ''}
        </div>
        ` : ''}
      </div>

      <!-- Subtasks -->
      <div class="detail-field">
        <div class="detail-field-label">${icon('subtask')} Subtarefas</div>
        ${subtasks.length > 0 ? `
          <div class="subtask-progress">
            <div class="progress-bar" style="flex:1">
              <div class="progress-bar-fill" style="width: ${subtasks.length ? (completedSubs / subtasks.length * 100) : 0}%"></div>
            </div>
            <span class="subtask-progress-text">${completedSubs}/${subtasks.length}</span>
          </div>
        ` : ''}
        <div class="subtask-list" id="subtask-list">
          ${subtasks.map((s, i) => `
            <div class="subtask-item ${s.completed ? 'completed' : ''}">
              <div class="checkbox subtask-checkbox ${s.completed ? 'checked' : ''}" data-subtask-toggle="${i}">
                ${s.completed ? icon('check') : ''}
              </div>
              <input type="text" class="subtask-input" value="${escapeHtml(s.title)}" data-subtask-edit="${i}" />
              <span class="subtask-delete" data-subtask-delete="${i}">${icon('x')}</span>
            </div>
          `).join('')}
        </div>
        <div class="subtask-add-btn" id="add-subtask-btn">
          ${icon('plus')} Adicionar subtarefa
        </div>
      </div>

      <!-- Pomodoro Integration -->
      <div class="detail-field" style="${isNotesList ? 'display:none' : ''}">
        <div class="detail-field-label" style="color:var(--priority-high)">${icon('timer')} Sessões Pomodoro</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)">
          <span style="font-size:var(--fs-sm);color:var(--text-secondary)" id="detail-pomodoro-time">Carregando...</span>
          <button class="btn btn-primary btn-sm" id="detail-pomodoro-focus" style="display:flex;align-items:center;gap:4px">
            ${icon('play')} Focar
          </button>
        </div>
      </div>
    </div>

    <div class="detail-panel-footer">
      <span>Criado em ${formatDate(task.createdAt, 'short')}</span>
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn-secondary btn-sm" id="detail-duplicate" title="Duplicar tarefa">⧉ Duplicar</button>
        <button class="btn btn-secondary btn-sm" id="detail-cancel-task" title="Não será feita" style="${isNotesList ? 'display:none' : ''}">${icon('x')} ${task.isCanceled ? 'Restaurar' : 'Cancelar'}</button>
        <button class="btn btn-danger btn-sm" id="detail-delete" title="Excluir">${icon('trash')}</button>
      </div>
    </div>
  `;

  bindDetailEvents(task);
}

function bindDetailEvents(task) {
  // Close
  document.getElementById('detail-close')?.addEventListener('click', () => {
    setState({ detailOpen: false, selectedTaskId: null });
  });

  // Duplicate task
  document.getElementById('detail-duplicate')?.addEventListener('click', async () => {
    const newTask = {
      ...task,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title: 'Cópia de ' + task.title,
      isCompleted: false,
      isCanceled: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      subtasks: (task.subtasks || []).map(s => ({ ...s, completed: false })),
    };
    await dbAdd('tasks', newTask);
    const tasks = await dbGetAll('tasks');
    setState({ tasks, selectedTaskId: newTask.id });
  });

  // Toggle completed
  document.getElementById('detail-checkbox')?.addEventListener('click', async () => {
    task.isCompleted = !task.isCompleted;
    if (task.isCompleted) task.isCanceled = false;
    task.completedAt = task.isCompleted ? new Date().toISOString() : null;

    // Handle recurrence: create next occurrence when completing
    if (task.isCompleted && task.isRecurring && task.recurRule) {
      await handleRecurrence(task);
    }

    await saveTask(task);
  });

  // Toggle canceled (Won't do)
  document.getElementById('detail-cancel-task')?.addEventListener('click', async () => {
    task.isCanceled = !task.isCanceled;
    if (task.isCanceled) {
      task.isCompleted = false;
      task.completedAt = new Date().toISOString();
    } else {
      task.completedAt = null;
    }
    await saveTask(task);
  });

  // Title: update in memory while typing, save to DB on blur
  document.getElementById('detail-title')?.addEventListener('input', (e) => {
    task.title = e.target.value;
  });
  document.getElementById('detail-title')?.addEventListener('blur', async (e) => {
    task.title = e.target.value;
    await saveTask(task);
  });

  // Description rich text editor
  bindRichTextEditor(document.getElementById('detail-desc-root'), {
    initialValue: task.description || '',
    onChange: (html) => {
      task.description = html;
    },
    onSave: async (html) => {
      task.description = html;
      await saveTask(task);
    }
  });

  // List
  document.getElementById('detail-list')?.addEventListener('change', async (e) => {
    task.listId = e.target.value;
    await saveTask(task);
  });

  // Date & Time
  document.getElementById('detail-date')?.addEventListener('change', async (e) => {
    task.dueDate = e.target.value || null;
    await saveTask(task);
  });

  document.getElementById('detail-start-time')?.addEventListener('change', async (e) => {
    task.startTime = e.target.value || null;
    await saveTask(task);
  });

  document.getElementById('detail-duration')?.addEventListener('change', async (e) => {
    task.duration = e.target.value ? parseInt(e.target.value) : null;
    await saveTask(task);
  });

  // Priority
  document.querySelectorAll('#detail-priority [data-priority]').forEach(el => {
    el.addEventListener('click', async () => {
      task.priority = parseInt(el.dataset.priority);
      await saveTask(task);
    });
  });

  // Tags toggle
  document.querySelectorAll('[data-tag-toggle]').forEach(el => {
    el.addEventListener('click', async () => {
      const tagId = el.dataset.tagToggle;
      task.tags = task.tags || [];
      const idx = task.tags.indexOf(tagId);
      if (idx >= 0) task.tags.splice(idx, 1);
      else task.tags.push(tagId);
      await saveTask(task);
    });
  });

  // Recurring
  document.getElementById('detail-recur')?.addEventListener('change', async (e) => {
    task.recurRule = e.target.value || null;
    task.isRecurring = !!e.target.value;
    if (!task.recurRule) {
      task.recurType = null;
      task.recurDaysAfter = null;
    }
    await saveTask(task);
  });

  // Recurrence type: after completion
  document.getElementById('detail-recur-after')?.addEventListener('change', async (e) => {
    task.recurType = e.target.checked ? 'after_completion' : 'fixed';
    if (e.target.checked) {
      task.recurDaysAfter = task.recurDaysAfter || 1;
    }
    await saveTask(task);
  });

  document.getElementById('detail-recur-days')?.addEventListener('change', async (e) => {
    task.recurDaysAfter = parseInt(e.target.value) || 1;
    await saveTask(task);
  });

  // Subtask toggle
  document.querySelectorAll('[data-subtask-toggle]').forEach(el => {
    el.addEventListener('click', async () => {
      const idx = parseInt(el.dataset.subtaskToggle);
      if (task.subtasks && idx >= 0 && idx < task.subtasks.length) {
        task.subtasks[idx].completed = !task.subtasks[idx].completed;
        await saveTask(task);
      }
    });
  });

  // Subtask edit
  document.querySelectorAll('[data-subtask-edit]').forEach(el => {
    let timeout;
    el.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const idx = parseInt(el.dataset.subtaskEdit);
        if (task.subtasks && idx >= 0 && idx < task.subtasks.length) {
          task.subtasks[idx].title = el.value;
          await saveTask(task, false);
        }
      }, 500);
    });
  });

  // Subtask delete
  document.querySelectorAll('[data-subtask-delete]').forEach(el => {
    el.addEventListener('click', async () => {
      const idx = parseInt(el.dataset.subtaskDelete);
      if (task.subtasks && idx >= 0 && idx < task.subtasks.length) {
        task.subtasks.splice(idx, 1);
        await saveTask(task);
      }
    });
  });

  // Add subtask
  document.getElementById('add-subtask-btn')?.addEventListener('click', async () => {
    task.subtasks = task.subtasks || [];
    task.subtasks.push({ title: '', completed: false });
    await saveTask(task);
    // Focus the new subtask input
    setTimeout(() => {
      const inputs = document.querySelectorAll('[data-subtask-edit]');
      const last = inputs[inputs.length - 1];
      if (last) last.focus();
    }, 100);
  });

  // Delete task
  document.getElementById('detail-delete')?.addEventListener('click', async () => {
    if (confirm('Excluir esta tarefa?')) {
      await dbDelete('tasks', task.id);
      const tasks = await dbGetAll('tasks');
      setState({ tasks, selectedTaskId: null, detailOpen: false });
    }
  });

  // Focus on task
  document.getElementById('detail-pomodoro-focus')?.addEventListener('click', () => {
    setState({
      currentView: 'pomodoro',
      pomodoroTaskId: task.id,
      detailOpen: false
    });
  });

  // Load Pomodoro stats for task
  loadTaskPomodoroStats(task.id);
}

async function loadTaskPomodoroStats(taskId) {
  const sessions = await dbGetByIndex('pomodoroSessions', 'taskId', taskId);
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 25), 0);
  const el = document.getElementById('detail-pomodoro-time');
  if (el) {
    el.textContent = `Tempo Gasto: ${totalMinutes} min (${sessions.length} sessões)`;
  }
}

async function handleRecurrence(task) {
  const baseDate = task.dueDate ? new Date(task.dueDate + 'T12:00:00') : today();
  let nextDate;

  if (task.recurType === 'after_completion') {
    // Repeat X days after completion date
    const daysAfter = task.recurDaysAfter || 1;
    nextDate = addDays(today(), daysAfter);
  } else {
    // Fixed recurrence: calculate next date from due date
    switch (task.recurRule) {
      case 'daily':
        nextDate = addDays(baseDate, 1);
        break;
      case 'weekdays': {
        nextDate = addDays(baseDate, 1);
        while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
          nextDate = addDays(nextDate, 1);
        }
        break;
      }
      case 'weekly':
        nextDate = addDays(baseDate, 7);
        break;
      case 'monthly': {
        nextDate = new Date(baseDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      }
      case 'yearly': {
        nextDate = new Date(baseDate);
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      }
      default:
        nextDate = addDays(baseDate, 1);
    }
  }

  if (!nextDate) return;

  // Format next date as YYYY-MM-DD
  const nextDateStr = nextDate.toISOString().split('T')[0];

  // Create a new task instance for the next occurrence
  const nextTask = {
    ...task,
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    dueDate: nextDateStr,
    isCompleted: false,
    isCanceled: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    subtasks: (task.subtasks || []).map(s => ({ ...s, completed: false })),
  };

  await dbAdd('tasks', nextTask);
  const updatedTasks = await dbGetAll('tasks');
  setState({ tasks: updatedTasks });
}

async function saveTask(task, rerender = true) {
  await dbUpdate('tasks', task);
  const tasks = await dbGetAll('tasks');
  setState({ tasks });
}

function initTaskDetail() {
  subscribe('selectedTaskId', () => renderTaskDetail());
  subscribe('detailOpen', () => renderTaskDetail());
}

export { renderTaskDetail, initTaskDetail };
