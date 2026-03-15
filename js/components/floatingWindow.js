// ============================================
// Floating Window Component
// ============================================

import { state, setState, subscribe, subscribeMultiple } from '../store.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { formatTime } from '../utils/date.js';
import { dbUpdate, dbGetAll } from '../db.js';

function makeDraggable(el, handle) {
  let isDragging = false, startX, startY, origLeft, origTop;
  handle.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    const rect = el.getBoundingClientRect();
    origLeft = rect.left; origTop = rect.top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    el.style.left = (origLeft + e.clientX - startX) + 'px';
    el.style.top = (origTop + e.clientY - startY) + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  });
  document.addEventListener('mouseup', () => { isDragging = false; });
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
    el.style.opacity = opacity;
    document.body.appendChild(el);
  } else {
    el.style.opacity = opacity;
  }

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
      <textarea class="floating-task-desc" id="float-task-desc" placeholder="Descrição...">${escapeHtml(task.description || '')}</textarea>
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
      <label style="font-size:var(--fs-xs);color:var(--text-tertiary);display:flex;align-items:center;gap:4px;">
        Opacidade
        <input type="range" id="float-task-opacity" min="20" max="100" value="${Math.round(opacity * 100)}" style="width:80px;" />
      </label>
    </div>
  `;

  const handle = el.querySelector('#floating-task-handle');
  makeDraggable(el, handle);

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

  const descInput = el.querySelector('#float-task-desc');
  if (descInput) {
    descInput.style.height = 'auto';
    descInput.style.height = descInput.scrollHeight + 'px';
    descInput.addEventListener('input', e => {
      task.description = e.target.value;
      descInput.style.height = 'auto';
      descInput.style.height = descInput.scrollHeight + 'px';
    });
    descInput.addEventListener('blur', async e => {
      task.description = e.target.value;
      await dbUpdate('tasks', task);
      const tasks = await dbGetAll('tasks');
      setState({ tasks });
    });
  }

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
    el.style.opacity = opacity;
    document.body.appendChild(el);
  } else {
    el.style.opacity = opacity;
  }

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
      ${focusedTask ? `<div style="font-size:var(--fs-xs);color:var(--text-tertiary);text-align:center;">🎯 ${escapeHtml(focusedTask.title.substring(0, 30))}</div>` : ''}
      <div style="display:flex;gap:var(--space-2);align-items:center;">
        <button class="pomodoro-btn pomodoro-btn-secondary" id="float-pom-reset" style="width:36px;height:36px;" title="Reiniciar">${icon('stop')}</button>
        <button class="pomodoro-btn pomodoro-btn-primary" id="float-pom-toggle" style="width:44px;height:44px;">
          ${isRunning ? icon('pause') : icon('play')}
        </button>
        <button class="pomodoro-btn pomodoro-btn-secondary" id="float-pom-skip" style="width:36px;height:36px;" title="Pular">${icon('skip')}</button>
      </div>
    </div>
    <div class="floating-window-footer">
      <label style="font-size:var(--fs-xs);color:var(--text-tertiary);display:flex;align-items:center;gap:4px;">
        Opacidade
        <input type="range" id="float-pom-opacity" min="20" max="100" value="${Math.round(opacity * 100)}" style="width:80px;" />
      </label>
    </div>
  `;

  const handle = el.querySelector('#floating-pom-handle');
  makeDraggable(el, handle);

  bindFloatingPomodoroEvents(el);
}

function bindFloatingPomodoroEvents(el) {
  el.querySelector('#float-pom-restore')?.addEventListener('click', () => {
    setState({ floatingPomodoro: false, currentView: 'pomodoro' });
  });

  el.querySelector('#float-pom-close')?.addEventListener('click', () => {
    setState({ floatingPomodoro: false });
  });

  el.querySelector('#float-pom-toggle')?.addEventListener('click', () => {
    if (state.pomodoroState === 'running') {
      setState({ pomodoroState: 'paused' });
    } else {
      setState({ pomodoroState: 'running' });
      // The pomodoro component manages its own timer interval
      // We need to trigger it — dispatch a synthetic event via state
      startFloatingTimer();
    }
  });

  el.querySelector('#float-pom-reset')?.addEventListener('click', () => {
    setState({ pomodoroState: 'idle' });
  });

  el.querySelector('#float-pom-skip')?.addEventListener('click', () => {
    setState({ pomodoroState: 'idle', pomodoroTimeLeft: 0 });
  });

  el.querySelector('#float-pom-opacity')?.addEventListener('input', e => {
    const val = parseInt(e.target.value) / 100;
    setState({ floatingPomodoroOpacity: val });
    el.style.opacity = val;
  });
}

// Manage timer for floating pomodoro (reuse same interval pattern)
let floatTimerInterval = null;

function startFloatingTimer() {
  clearInterval(floatTimerInterval);
  floatTimerInterval = setInterval(() => {
    if (state.pomodoroState !== 'running') {
      clearInterval(floatTimerInterval);
      return;
    }
    if (state.pomodoroTimeLeft <= 0) {
      clearInterval(floatTimerInterval);
      setState({ pomodoroState: 'idle' });
    } else {
      setState({ pomodoroTimeLeft: state.pomodoroTimeLeft - 1 });
    }
  }, 1000);
}

function initFloatingWindows() {
  // Add float button to task detail panel (delegated via document since panel re-renders)
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
