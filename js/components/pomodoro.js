// ============================================
// Pomodoro Timer Component
// ============================================

import { state, setState, subscribe, subscribeMultiple } from '../store.js';
import { dbAdd, dbGetAll, getSetting, setSetting } from '../db.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { formatTime } from '../utils/date.js';

let timerInterval = null;
let pomodoroTaskSearch = '';
let pomodoroSettingsOpen = false;

async function getSettings() {
  return await getSetting('pomodoro', {
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    sessionsBeforeLongBreak: 4
  });
}

function renderPomodoro() {
  const container = document.getElementById('task-list-content');
  if (!container || state.currentView !== 'pomodoro') return;

  const timeStr = formatTime(state.pomodoroTimeLeft);
  const isRunning = state.pomodoroState === 'running';
  const isPaused = state.pomodoroState === 'paused';
  const pomType = state.pomodoroType;

  // Use cached settings for ring progress; fall back to defaults
  const pomSettings = state._pomodoroSettings || { workDuration: 25, shortBreak: 5, longBreak: 15, sessionsBeforeLongBreak: 4 };
  const totalTime = pomType === 'work' ? pomSettings.workDuration * 60
    : pomType === 'shortBreak' ? pomSettings.shortBreak * 60
    : pomSettings.longBreak * 60;
  const progress = 1 - (state.pomodoroTimeLeft / totalTime);
  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference * (1 - progress);

  const sessionDots = [];
  for (let i = 0; i < 4; i++) {
    if (i < state.pomodoroSession) sessionDots.push('completed');
    else if (i === state.pomodoroSession && isRunning && pomType === 'work') sessionDots.push('active');
    else sessionDots.push('');
  }

  const focusedTask = state.pomodoroTaskId ? state.tasks.find(t => t.id === state.pomodoroTaskId) : null;

  // Build task search results
  const pendingTasks = state.tasks.filter(t => !t.isCompleted && !t.isCanceled);
  const searchResults = pomodoroTaskSearch.trim()
    ? pendingTasks.filter(t => t.title.toLowerCase().includes(pomodoroTaskSearch.toLowerCase())).slice(0, 6)
    : [];

  container.innerHTML = `
    <div class="pomodoro-view">

      <!-- Float button -->
      <div style="width:100%;max-width:420px;margin:0 auto;display:flex;justify-content:flex-end;">
        <button id="pomodoro-float-btn" class="btn btn-secondary btn-sm" title="Abrir em janela flutuante" style="font-size:13px;">⊡ Janela Flutuante</button>
      </div>

      <!-- Task Focus Section -->
      <div style="width:100%;max-width:420px;margin:0 auto var(--space-3) auto;">
        ${focusedTask ? `
          <div style="display:flex;align-items:center;justify-content:center;gap:var(--space-2);padding:var(--space-2) var(--space-3);background:var(--primary-alpha);border-radius:var(--radius-lg);border:1px solid var(--primary)44;">
            <span style="font-size:var(--fs-sm);font-weight:var(--fw-semibold);color:var(--primary)">🎯 ${escapeHtml(focusedTask.title)}</span>
            <button class="btn-icon" id="pom-clear-task" title="Limpar foco" style="color:var(--text-tertiary);width:20px;height:20px;">${icon('x')}</button>
          </div>
        ` : `
          <div style="position:relative;">
            <input type="text" id="pom-task-search" class="input" placeholder="🔍 Vincular tarefa ao Pomodoro..." value="${pomodoroTaskSearch}" style="width:100%;box-sizing:border-box;" />
            ${searchResults.length > 0 ? `
              <div style="position:absolute;top:100%;left:0;right:0;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-md);box-shadow:var(--shadow-md);z-index:100;max-height:200px;overflow-y:auto;">
                ${searchResults.map(t => {
                  const list = state.lists.find(l => l.id === t.listId);
                  return `<div class="context-menu-item" data-pom-task-select="${t.id}" style="cursor:pointer;display:flex;flex-direction:column;gap:2px;">
                    <span style="font-size:var(--fs-sm);font-weight:var(--fw-medium)">${escapeHtml(t.title)}</span>
                    ${list ? `<span style="font-size:var(--fs-xs);color:var(--text-tertiary)">${escapeHtml(list.emoji || '')} ${escapeHtml(list.name)}</span>` : ''}
                  </div>`;
                }).join('')}
              </div>
            ` : (pomodoroTaskSearch.trim() && searchResults.length === 0 ? `
              <div style="position:absolute;top:100%;left:0;right:0;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;font-size:var(--fs-sm);color:var(--text-tertiary);z-index:100;">
                Nenhuma tarefa encontrada
              </div>
            ` : '')}
          </div>
        `}
      </div>

      <div class="pomodoro-tabs">
        <div class="pomodoro-tab ${pomType === 'work' ? 'active' : ''}" data-pom-type="work">Foco</div>
        <div class="pomodoro-tab ${pomType === 'shortBreak' ? 'active' : ''}" data-pom-type="shortBreak">Pausa Curta</div>
        <div class="pomodoro-tab ${pomType === 'longBreak' ? 'active' : ''}" data-pom-type="longBreak">Pausa Longa</div>
      </div>

      <div class="pomodoro-timer">
        <div class="pomodoro-timer-circle">
          <svg viewBox="0 0 250 250">
            <circle class="timer-bg" cx="125" cy="125" r="120" />
            <circle class="timer-progress ${pomType !== 'work' ? 'break' : ''}"
                    cx="125" cy="125" r="120"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${dashOffset}" />
          </svg>
          <div class="pomodoro-timer-display">
            <div class="pomodoro-time">${timeStr}</div>
            <div class="pomodoro-session-label">
              ${pomType === 'work' ? `Sessão ${state.pomodoroSession + 1}` :
                pomType === 'shortBreak' ? 'Pausa Curta' : 'Pausa Longa'}
            </div>
          </div>
        </div>
      </div>

      <div class="pomodoro-sessions">
        ${sessionDots.map(s => `<div class="pomodoro-session-dot ${s}"></div>`).join('')}
      </div>

      <div class="pomodoro-controls">
        <button class="pomodoro-btn pomodoro-btn-secondary" id="pom-reset" title="Reiniciar">
          ${icon('stop')}
        </button>
        <button class="pomodoro-btn pomodoro-btn-primary" id="pom-toggle">
          ${isRunning ? icon('pause') : icon('play')}
        </button>
        <button class="pomodoro-btn pomodoro-btn-secondary" id="pom-skip" title="Pular">
          ${icon('skip')}
        </button>
      </div>

      <div class="pomodoro-stats">
        <div class="pomodoro-stat">
          <div class="pomodoro-stat-value" id="pom-stat-today">0</div>
          <div class="pomodoro-stat-label">Sessões Hoje</div>
        </div>
        <div class="pomodoro-stat">
          <div class="pomodoro-stat-value" id="pom-stat-time">0min</div>
          <div class="pomodoro-stat-label">Foco Hoje</div>
        </div>
        <div class="pomodoro-stat">
          <div class="pomodoro-stat-value" id="pom-stat-total">0</div>
          <div class="pomodoro-stat-label">Total de Sessões</div>
        </div>
      </div>

      <!-- Settings Panel -->
      <div style="width:100%;max-width:380px;margin:var(--space-4) auto 0 auto;">
        <button id="pom-settings-toggle" class="btn btn-secondary btn-sm" style="width:100%;display:flex;align-items:center;justify-content:center;gap:var(--space-2);">
          ⚙️ ${pomodoroSettingsOpen ? 'Ocultar configurações' : 'Configurações do Timer'}
        </button>
        ${pomodoroSettingsOpen ? `
          <div style="margin-top:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3);">
            <div style="font-size:var(--fs-sm);font-weight:var(--fw-semibold);color:var(--text-primary)">Durações (em minutos)</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
              <div>
                <label style="font-size:var(--fs-xs);color:var(--text-tertiary);display:block;margin-bottom:4px;">🍅 Foco</label>
                <input type="number" class="input input-sm" id="pom-set-work" value="${pomSettings.workDuration}" min="1" max="120" style="width:100%;" />
              </div>
              <div>
                <label style="font-size:var(--fs-xs);color:var(--text-tertiary);display:block;margin-bottom:4px;">☕ Pausa Curta</label>
                <input type="number" class="input input-sm" id="pom-set-short" value="${pomSettings.shortBreak}" min="1" max="60" style="width:100%;" />
              </div>
              <div>
                <label style="font-size:var(--fs-xs);color:var(--text-tertiary);display:block;margin-bottom:4px;">🌴 Pausa Longa</label>
                <input type="number" class="input input-sm" id="pom-set-long" value="${pomSettings.longBreak}" min="1" max="120" style="width:100%;" />
              </div>
              <div>
                <label style="font-size:var(--fs-xs);color:var(--text-tertiary);display:block;margin-bottom:4px;">🔁 Sessões até pausa longa</label>
                <input type="number" class="input input-sm" id="pom-set-sessions" value="${pomSettings.sessionsBeforeLongBreak}" min="1" max="10" style="width:100%;" />
              </div>
            </div>
            <button id="pom-settings-save" class="btn btn-primary btn-sm">Salvar Configurações</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  loadPomodoroStats();
  bindPomodoroEvents();
}

async function loadPomodoroStats() {
  const sessions = await dbGetAll('pomodoroSessions');
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === todayStr);

  const todayCount = todaySessions.length;
  const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration || 25), 0);
  const totalCount = sessions.length;

  const elToday = document.getElementById('pom-stat-today');
  const elTime = document.getElementById('pom-stat-time');
  const elTotal = document.getElementById('pom-stat-total');

  if (elToday) elToday.textContent = todayCount;
  if (elTime) elTime.textContent = `${todayMinutes}min`;
  if (elTotal) elTotal.textContent = totalCount;
}

function bindPomodoroEvents() {
  // Toggle (start/pause) — just set state, the reactive subscriber handles the interval
  document.getElementById('pom-toggle')?.addEventListener('click', () => {
    if (state.pomodoroState === 'running') {
      setState({ pomodoroState: 'paused' });
    } else {
      setState({ pomodoroState: 'running' });
    }
  });

  // Reset — use command so floating window can also trigger this
  document.getElementById('pom-reset')?.addEventListener('click', () => {
    setState({ pomodoroCommand: 'reset' });
  });

  // Skip — use command so floating window can also trigger this
  document.getElementById('pom-skip')?.addEventListener('click', () => {
    setState({ pomodoroCommand: 'skip' });
  });

  // Type tabs
  document.querySelectorAll('[data-pom-type]').forEach(el => {
    el.addEventListener('click', async () => {
      clearInterval(timerInterval);
      const type = el.dataset.pomType;
      const settings = await getSettings();
      const duration = type === 'work' ? settings.workDuration
        : type === 'shortBreak' ? settings.shortBreak
        : settings.longBreak;
      setState({
        pomodoroType: type,
        pomodoroTimeLeft: duration * 60,
        pomodoroState: 'idle'
      });
    });
  });

  document.getElementById('pom-clear-task')?.addEventListener('click', () => {
    setState({ pomodoroTaskId: null });
  });

  // Task search input
  document.getElementById('pom-task-search')?.addEventListener('input', (e) => {
    pomodoroTaskSearch = e.target.value;
    renderPomodoro();
  });

  // Task selection from search results
  document.querySelectorAll('[data-pom-task-select]').forEach(el => {
    el.addEventListener('click', () => {
      const taskId = el.dataset.pomTaskSelect;
      pomodoroTaskSearch = '';
      setState({ pomodoroTaskId: taskId });
    });
  });

  // Float button
  document.getElementById('pomodoro-float-btn')?.addEventListener('click', () => {
    setState({ floatingPomodoro: true });
  });

  // Settings toggle
  document.getElementById('pom-settings-toggle')?.addEventListener('click', () => {
    pomodoroSettingsOpen = !pomodoroSettingsOpen;
    renderPomodoro();
  });

  // Save settings
  document.getElementById('pom-settings-save')?.addEventListener('click', async () => {
    const workDuration = parseInt(document.getElementById('pom-set-work')?.value) || 25;
    const shortBreak   = parseInt(document.getElementById('pom-set-short')?.value) || 5;
    const longBreak    = parseInt(document.getElementById('pom-set-long')?.value) || 15;
    const sessionsBeforeLongBreak = parseInt(document.getElementById('pom-set-sessions')?.value) || 4;

    const newSettings = { workDuration, shortBreak, longBreak, sessionsBeforeLongBreak };
    await setSetting('pomodoro', newSettings);

    // If timer is idle, reset to new duration for current type
    let newTimeLeft = state.pomodoroTimeLeft;
    if (state.pomodoroState === 'idle') {
      if (state.pomodoroType === 'work') newTimeLeft = workDuration * 60;
      else if (state.pomodoroType === 'shortBreak') newTimeLeft = shortBreak * 60;
      else newTimeLeft = longBreak * 60;
    }

    setState({ _pomodoroSettings: newSettings, pomodoroTimeLeft: newTimeLeft });
    pomodoroSettingsOpen = false;
    renderPomodoro();
  });
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (state.pomodoroTimeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimerComplete();
    } else {
      setState({ pomodoroTimeLeft: state.pomodoroTimeLeft - 1 });
    }
  }, 1000);
}

async function handleTimerComplete() {
  // Play completion sound
  playCompletionSound();

  const settings = await getSettings();

  if (state.pomodoroType === 'work') {
    // Save session
    await dbAdd('pomodoroSessions', {
      date: new Date().toISOString().split('T')[0],
      duration: settings.workDuration,
      completedAt: new Date().toISOString(),
      taskId: state.pomodoroTaskId || null
    });

    const newSession = state.pomodoroSession + 1;

    if (newSession >= settings.sessionsBeforeLongBreak) {
      // Long break
      setState({
        pomodoroState: 'idle',
        pomodoroType: 'longBreak',
        pomodoroTimeLeft: settings.longBreak * 60,
        pomodoroSession: 0
      });
    } else {
      // Short break
      setState({
        pomodoroState: 'idle',
        pomodoroType: 'shortBreak',
        pomodoroTimeLeft: settings.shortBreak * 60,
        pomodoroSession: newSession
      });
    }
  } else {
    // Break done, back to work
    setState({
      pomodoroState: 'idle',
      pomodoroType: 'work',
      pomodoroTimeLeft: settings.workDuration * 60
    });
  }
}

function playCompletionSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.5);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.5);
    });
  } catch (e) {
    // Audio not supported, silent
  }
}

async function initPomodoro() {
  // Cache pomodoro settings in state for synchronous ring progress rendering
  const settings = await getSettings();
  setState({
    _pomodoroSettings: settings,
    pomodoroTimeLeft: settings.workDuration * 60   // sync initial time with saved settings
  });

  // Reactive timer: any component (main or floating) can start/stop by setting pomodoroState
  subscribe('pomodoroState', (newState) => {
    if (newState === 'running') {
      startTimer();
    } else {
      clearInterval(timerInterval);
    }
  });

  // Command handler: any component can trigger skip/reset via pomodoroCommand
  subscribe('pomodoroCommand', async (cmd) => {
    if (!cmd) return;
    // Clear command immediately to avoid re-triggering
    setState({ pomodoroCommand: null });

    if (cmd === 'skip') {
      clearInterval(timerInterval);
      await handleTimerComplete();
    } else if (cmd === 'reset') {
      clearInterval(timerInterval);
      const s = await getSettings();
      const duration = state.pomodoroType === 'work' ? s.workDuration
        : state.pomodoroType === 'shortBreak' ? s.shortBreak
        : s.longBreak;
      setState({
        pomodoroState: 'idle',
        pomodoroTimeLeft: duration * 60
      });
    }
  });

  subscribeMultiple(['currentView', 'pomodoroState', 'pomodoroType', 'pomodoroTimeLeft', 'pomodoroSession', 'pomodoroTaskId'], () => {
    if (state.currentView === 'pomodoro') {
      renderPomodoro();
    }
  });
}

export { renderPomodoro, initPomodoro };
