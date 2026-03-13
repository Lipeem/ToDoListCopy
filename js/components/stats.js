// ============================================
// Statistics Dashboard Component
// ============================================

import { state, setState, subscribeMultiple } from '../store.js';
import { dbGetAll } from '../db.js';
import { icon } from '../utils/icons.js';
import { addDays, today, DAYS_SHORT_PT } from '../utils/date.js';

function renderStats() {
  const container = document.getElementById('task-list-content');
  if (!container || state.currentView !== 'stats') return;

  container.innerHTML = `
    <div class="stats-view">
      <h2 style="font-size:var(--fs-xl);font-weight:var(--fw-semibold);margin-bottom:var(--space-6)">📈 Estatísticas</h2>
      <div class="stats-grid" id="stats-overview"></div>
      <div id="stats-chart-completion" class="chart-container"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
        <div id="stats-by-list" class="chart-container"></div>
        <div id="stats-by-priority" class="chart-container"></div>
      </div>
    </div>
  `;

  loadStats();
}

async function loadStats() {
  const tasks = state.tasks;
  const pomodoroSessions = await dbGetAll('pomodoroSessions');
  const habitLogs = await dbGetAll('habitLogs');

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const canceledTasks = tasks.filter(t => t.isCanceled && !t.isCompleted).length;
  const pendingTasks = totalTasks - completedTasks - canceledTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalPomodoros = pomodoroSessions.length;
  const totalFocusMin = pomodoroSessions.reduce((sum, s) => sum + (s.duration || 25), 0);

  // Overview cards
  const overviewEl = document.getElementById('stats-overview');
  if (overviewEl) {
    overviewEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Tarefas Totais</span>
          <div class="stat-card-icon" style="background:var(--primary-alpha);color:var(--primary)">${icon('all')}</div>
        </div>
        <div class="stat-card-value">${totalTasks}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Concluídas</span>
          <div class="stat-card-icon" style="background:rgba(82,196,26,0.1);color:var(--accent-green)">${icon('completed')}</div>
        </div>
        <div class="stat-card-value">${completedTasks}</div>
        <div class="stat-card-change positive">Taxa: ${completionRate}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Pendentes</span>
          <div class="stat-card-icon" style="background:rgba(255,140,34,0.1);color:var(--accent-orange)">${icon('today')}</div>
        </div>
        <div class="stat-card-value">${pendingTasks}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Sessões Pomodoro</span>
          <div class="stat-card-icon" style="background:rgba(255,77,79,0.1);color:var(--accent-red)">${icon('timer')}</div>
        </div>
        <div class="stat-card-value">${totalPomodoros}</div>
        <div class="stat-card-change">${totalFocusMin}min de foco</div>
      </div>
    `;
  }

  // Completion chart (last 7 days)
  const chartEl = document.getElementById('stats-chart-completion');
  if (chartEl) {
    const last7Days = [];
    const todayDate = today();
    for (let i = 6; i >= 0; i--) {
      const d = addDays(todayDate, -i);
      last7Days.push(d);
    }

    const maxCompleted = Math.max(1, ...last7Days.map(d => {
      return tasks.filter(t =>
        t.isCompleted && t.completedAt &&
        new Date(t.completedAt).toISOString().split('T')[0] === d.toISOString().split('T')[0]
      ).length;
    }));

    chartEl.innerHTML = `
      <div class="chart-header">
        <span class="chart-title">Tarefas Concluídas (Últimos 7 dias)</span>
      </div>
      <div class="chart-bar-container">
        ${last7Days.map(d => {
          const dateStr = d.toISOString().split('T')[0];
          const count = tasks.filter(t =>
            t.isCompleted && t.completedAt &&
            new Date(t.completedAt).toISOString().split('T')[0] === dateStr
          ).length;
          const height = maxCompleted > 0 ? (count / maxCompleted * 100) : 0;

          return `
            <div class="chart-bar-wrapper">
              <div class="chart-bar" style="height: ${Math.max(height, 2)}%">
                <span class="chart-bar-value">${count}</span>
              </div>
              <span class="chart-bar-label">${DAYS_SHORT_PT[d.getDay()]}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Tasks by list
  const listStatsEl = document.getElementById('stats-by-list');
  if (listStatsEl) {
    const listCounts = {};
    tasks.forEach(t => {
      if (!listCounts[t.listId]) listCounts[t.listId] = { total: 0, completed: 0 };
      listCounts[t.listId].total++;
      if (t.isCompleted) listCounts[t.listId].completed++;
    });

    const listStats = Object.entries(listCounts).map(([listId, counts]) => {
      const list = state.lists.find(l => l.id === listId);
      return {
        name: list ? `${list.emoji || ''} ${list.name}` : 'Sem lista',
        color: list?.color || '#6b7280',
        ...counts
      };
    }).sort((a, b) => b.total - a.total).slice(0, 5);

    listStatsEl.innerHTML = `
      <div class="chart-header">
        <span class="chart-title">Tarefas por Lista</span>
      </div>
      <div class="stats-list">
        ${listStats.map(s => `
          <div class="stats-list-item">
            <div class="stats-list-item-label">
              <span class="stats-list-item-dot" style="background:${s.color}"></span>
              ${s.name}
            </div>
            <div class="stats-list-item-value">${s.completed}/${s.total}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Tasks by priority
  const prioStatsEl = document.getElementById('stats-by-priority');
  if (prioStatsEl) {
    const priorities = [
      { label: 'Alta', value: 3, color: 'var(--priority-high)' },
      { label: 'Média', value: 2, color: 'var(--priority-medium)' },
      { label: 'Baixa', value: 1, color: 'var(--priority-low)' },
      { label: 'Nenhuma', value: 0, color: 'var(--priority-none)' },
    ];

    prioStatsEl.innerHTML = `
      <div class="chart-header">
        <span class="chart-title">Tarefas por Prioridade</span>
      </div>
      <div class="stats-list">
        ${priorities.map(p => {
          const total = tasks.filter(t => (t.priority || 0) === p.value).length;
          const completed = tasks.filter(t => (t.priority || 0) === p.value && t.isCompleted).length;
          return `
            <div class="stats-list-item">
              <div class="stats-list-item-label">
                <span class="stats-list-item-dot" style="background:${p.color}"></span>
                ${p.label}
              </div>
              <div class="stats-list-item-value">${completed}/${total}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

function initStats() {
  subscribeMultiple(['currentView', 'tasks'], () => {
    if (state.currentView === 'stats') {
      renderStats();
    }
  });
}

export { renderStats, initStats };
