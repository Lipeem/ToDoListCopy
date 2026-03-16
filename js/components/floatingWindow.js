// ============================================
// Floating Window Component
// ============================================

import { state, setState, subscribe, subscribeMultiple } from '../store.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { formatTime } from '../utils/date.js';
import { dbUpdate, dbGetAll } from '../db.js';
import { bindRichTextEditor, renderRichTextEditor } from '../utils/richText.js';

// ── Draggable logic (document listeners added once per element) ──

function makeDraggable(el, handle) {
  // Store drag state on the element to avoid duplicate document listeners
  if (!el._drag) {
    el._drag = { active: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 };

    document.addEventListener('mousemove', (e) => {
      if (!el._drag.active) return;
      el.style.left = (el._drag.origLeft + e.clientX - el._drag.startX) + 'px';
      el.style.top = (el._drag.origTop + e.clientY - el._drag.startY) + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      el._drag.active = false;
    });
  }

  // Handle mousedown is added to each new handle (old handle is destroyed by innerHTML)
  handle.addEventListener('mousedown', (e) => {
    el._drag.active = true;
    el._drag.startX = e.clientX;
    el._drag.startY = e.clientY;
    const rect = el.getBoundingClientRect();
    el._drag.origLeft = rect.left;
    el._drag.origTop = rect.top;
    e.preventDefault();
  });
}

// ── Floating Task Detail ──

function renderFloatingTask() {
  let el = document.getElementById('floating-task-window');
  if (!state.floatingTask || !state.selectedTaskId) {
    if (el) el.remove();
    return;
  }

  const task = state.tasks.find(t => t.id === state.selectedTaskId);
  if (!task) {
    if (el) el.remove();
    return;
  }

  const opacity = state.floatingTaskOpacity !== undefined ? state.floatingTaskOpacity : 1.0;
  const subtasks = task.subtasks || [];
  const completedSubs = subtasks.filter(s => s.completed).length;
  const list = state.lists.find(l => l.id === task.listId);

  if (!el) {
    el = document.createElement('div');
    el.id = 'floating-task-window';
    el.className = 'floating-window';
    el.style.right = '24px';
    el.style.top = '80px';
    el.style.left = 'auto';
    document.body.appendChild(el);
  }
  el.style.opacity = opacity;

  el.innerHTML = `
    <div class="floating-window-titlebar" id="floating-task-handle">
      <span class="floating-window-title">
        <span class="floating-window-icon">${icon('description')}</span>
        ${escapeHtml(task.title.substring(0, 40))}${task.title.length > 40 ? '...' : ''}
      </span>
      <div class="floating-window-actions">
        <button class="floating-action-btn" id="float-task-restore" title="Restaurar para painel lateral">⊟</button>
        <button class="floating-action-btn" id="float-task-close" title="Fechar">${icon('x')}</button>
      </div>
    </div>
    <div class="floating-window-body">
      <input type="text" class="floating-task-title" id="float-task-title" value="${escapeHtml(task.title)}" />
      <div id="float-task-desc-root">
        ${renderRichTextEditor({
          value: task.description || '',
          placeholder: 'Descrição...',
          compact: true,
          allowExpand: true
        })}
      </div>
      ${subtasks.length > 0 ? `
        <div class="floating-subtasks">
          <div class="floating-subtasks-header">${icon('subtask')} Subtarefas (${completedSubs}/${subtasks.length})</div>
          ${subtasks.map((s, i) => `
            <div class="floating-subtask-item">
              <div class="checkbox ${s.completed ? 'checked' : ''}" data-float-subtask="${i}" style="width:14px;height:14px;border-width:1.5px;flex-shrink:0;">
                ${s.completed ? icon('check') : ''}
              </div>
              <span style="font-size:var(--fs-sm);${s.completed ? 'text-decoration:line-through;color:var(--text-tertiary)' : ''}">${escapeHtml(s.title)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="floating-meta">
        ${list ? `<span style="font-size:var(--fs-xs);color:var(--text-tertiary)">📋 ${escapeHtml(list.emoji || '')} ${escapeHtml(list.name)}</span>` : ''}
        ${task.dueDate ? `<span style="font-size:var(--fs-xs);color:var(--text-tertiary)">${icon('calendar')} ${task.dueDate}</span>` : ''}
      </div>
    </div>
    <div class="floating-window-footer">
      <label class="floating-opacity-control">
        <span>Opacidade</span>
        <input type="range" id="float-task-opacity" min="20" max="100" value="${Math.round(opacity * 100)}" />
      </label>
    </div>
  `;

  makeDraggable(el, el.querySelector('#floating-task-handle'));
  bindFloatingTaskEvents(task, el);
}

function bindFloatingTaskEvents(task, el) {
  el.querySelector('#float-task-restore')?.addEventListener('click', () => {
    setState({ floatingTask: false, detailOpen: true, selectedTaskId: task.id });
  });

  el.querySelector('#float-task-close')?.addEventListener('click', () => {
    setState({ floatingTask: false, selectedTaskId: null, detailOpen: false });
  });

  const titleInput = el.querySelector('#float-task-title');
  titleInput?.addEventListener('input', e => { task.title = e.target.value; });
  titleInput?.addEventListener('blur', async e => {
    task.title = e.target.value;
    await dbUpdate('tasks', task);
    const tasks = await dbGetAll('tasks');
    setState({ tasks });
  });

  bindRichTextEditor(el.querySelector('#float-task-desc-root'), {
    initialValue: task.description || '',
    onChange: (html) => {
      task.description = html;
    },
    onSave: async (html) => {
      task.description = html;
      await dbUpdate('tasks', task);
      const tasks = await dbGetAll('tasks');
      setState({ tasks });
    }
  });

  el.querySelectorAll('[data-float-subtask]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.floatSubtask);
      if (task.subtasks && task.subtasks[idx]) {
        task.subtasks[idx].completed = !task.subtasks[idx].completed;
        await dbUpdate('tasks', task);
        const tasks = await dbGetAll('tasks');
        setState({ tasks });
      }
    });
  });

  el.querySelector('#float-task-opacity')?.addEventListener('input', e => {
    const val = parseInt(e.target.value) / 100;
    setState({ floatingTaskOpacity: val });
    el.style.opacity = val;
  });
}

// ── Floating Pomodoro ──
// No separate timer here — all timer logic is reactive in pomodoro.js
// This component only renders state and dispatches commands via setState

function renderFloatingPomodoro() {
  let el = document.getElementById('floating-pomodoro-window');
  if (!state.floatingPomodoro) {
    if (el) el.remove();
    return;
  }

  const opacity = state.floatingPomodoroOpacity !== undefined ? state.floatingPomodoroOpacity : 1.0;
  const timeStr = formatTime(state.pomodoroTimeLeft);
  const isRunning = state.pomodoroState === 'running';
  const pomType = state.pomodoroType;
  const focusedTask = state.pomodoroTaskId ? state.tasks.find(t => t.id === state.pomodoroTaskId) : null;

  const typeLabel = pomType === 'work' ? '🍅 Foco' : pomType === 'shortBreak' ? '☕ Pausa Curta' : '🌴 Pausa Longa';
  const typeColor = pomType === 'work' ? 'var(--priority-high)' : 'var(--accent-green)';

  if (!el) {
    el = document.createElement('div');
    el.id = 'floating-pomodoro-window';
    el.className = 'floating-window floating-window--compact';
    el.style.right = '24px';
    el.style.bottom = '24px';
    el.style.left = 'auto';
    el.style.top = 'auto';
    document.body.appendChild(el);
  }
  el.style.opacity = opacity;

  el.innerHTML = `
    <div class="floating-window-titlebar" id="floating-pom-handle">
      <span class="floating-window-title">
        <span style="color:${typeColor}">${typeLabel}</span>
      </span>
      <div class="floating-window-actions">
        <button class="floating-action-btn" id="float-pom-restore" title="Voltar ao Pomodoro">⊟</button>
        <button class="floating-action-btn" id="float-pom-close" title="Fechar">${icon('x')}</button>
      </div>
    </div>
    <div class="floating-window-body" style="align-items:center;gap:var(--space-3);">
      <div class="floating-pom-time" style="font-size:2.5rem;font-weight:var(--fw-bold);color:var(--text-primary);font-variant-numeric:tabular-nums;letter-spacing:-0.02em;">${timeStr}</div>
      ${focusedTask ? `
        <div class="floating-pom-task">
          Tarefa em foco
          <strong>${escapeHtml(focusedTask.title)}</strong>
        </div>
      ` : `
        <div class="floating-pom-task is-empty">
          Nenhuma tarefa vinculada ao foco atual
        </div>
      `}
      <div style="display:flex;gap:var(--space-2);align-items:center;">
        <button class="pomodoro-btn pomodoro-btn-secondary" id="float-pom-reset" style="width:36px;height:36px;" title="Reiniciar">${icon('stop')}</button>
        <button class="pomodoro-btn pomodoro-btn-primary" id="float-pom-toggle" style="width:44px;height:44px;">
          ${isRunning ? icon('pause') : icon('play')}
        </button>
        <button class="pomodoro-btn pomodoro-btn-secondary" id="float-pom-skip" style="width:36px;height:36px;" title="Pular">${icon('skip')}</button>
      </div>
    </div>
    <div class="floating-window-footer">
      <label class="floating-opacity-control">
        <span>Opacidade</span>
        <input type="range" id="float-pom-opacity" min="20" max="100" value="${Math.round(opacity * 100)}" />
      </label>
    </div>
  `;

  makeDraggable(el, el.querySelector('#floating-pom-handle'));
  bindFloatingPomodoroEvents(el);
}

function bindFloatingPomodoroEvents(el) {
  el.querySelector('#float-pom-restore')?.addEventListener('click', () => {
    setState({ floatingPomodoro: false, currentView: 'pomodoro' });
  });

  el.querySelector('#float-pom-close')?.addEventListener('click', () => {
    setState({ floatingPomodoro: false });
  });

  // Play/Pause — just toggle state; pomodoro.js reactive subscriber handles the timer
  el.querySelector('#float-pom-toggle')?.addEventListener('click', () => {
    if (state.pomodoroState === 'running') {
      setState({ pomodoroState: 'paused' });
    } else {
      setState({ pomodoroState: 'running' });
    }
  });

  // Reset — dispatch command to pomodoro.js (properly resets time to current type duration)
  el.querySelector('#float-pom-reset')?.addEventListener('click', () => {
    setState({ pomodoroCommand: 'reset' });
  });

  // Skip — dispatch command to pomodoro.js (saves session, plays sound, advances phase)
  el.querySelector('#float-pom-skip')?.addEventListener('click', () => {
    setState({ pomodoroCommand: 'skip' });
  });

  el.querySelector('#float-pom-opacity')?.addEventListener('input', e => {
    const val = parseInt(e.target.value) / 100;
    setState({ floatingPomodoroOpacity: val });
    el.style.opacity = val;
  });
}

// ── Init ──

function initFloatingWindows() {
  // Delegated click handlers for float buttons (they exist in other components' DOM)
  document.addEventListener('click', (e) => {
    if (e.target.closest('#detail-float-btn')) {
      const taskId = state.selectedTaskId;
      if (taskId) {
        setState({ floatingTask: true, detailOpen: false });
      }
    }
    if (e.target.closest('#pomodoro-float-btn')) {
      setState({ floatingPomodoro: true });
    }
  });

  // Inject float button into task detail header after it renders
  subscribe('detailOpen', () => {
    setTimeout(() => injectDetailFloatBtn(), 50);
  });
  subscribe('selectedTaskId', () => {
    setTimeout(() => injectDetailFloatBtn(), 50);
  });

  // Subscribe to floating state changes
  subscribeMultiple(['floatingTask', 'floatingTaskOpacity', 'selectedTaskId', 'tasks', 'lists'], () => {
    renderFloatingTask();
  });

  subscribeMultiple(['floatingPomodoro', 'floatingPomodoroOpacity', 'pomodoroState', 'pomodoroType', 'pomodoroTimeLeft', 'pomodoroTaskId', 'tasks'], () => {
    renderFloatingPomodoro();
  });
}

function injectDetailFloatBtn() {
  const header = document.querySelector('.detail-panel-header');
  if (!header) return;
  if (header.querySelector('#detail-float-btn')) return; // already injected
  const closeBtn = header.querySelector('#detail-close');
  if (!closeBtn) return;

  const floatBtn = document.createElement('button');
  floatBtn.id = 'detail-float-btn';
  floatBtn.className = 'btn-icon';
  floatBtn.title = 'Abrir em janela flutuante';
  floatBtn.style.cssText = 'font-size:16px;margin-right:4px;';
  floatBtn.textContent = '⊡';
  header.insertBefore(floatBtn, closeBtn);
}

export { initFloatingWindows, renderFloatingTask, renderFloatingPomodoro };
