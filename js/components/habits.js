// ============================================
// Habit Tracker Component
// ============================================

import { state, setState, subscribeMultiple } from '../store.js';
import { dbAdd, dbGetAll, dbGetByIndex, dbDelete } from '../db.js';
import { icon } from '../utils/icons.js';
import { DAYS_MINI_PT, addDays, isSameDay, today } from '../utils/date.js';

function renderHabits() {
  const container = document.getElementById('task-list-content');
  if (!container || state.currentView !== 'habits') return;

  const habits = state.habits;
  const todayDate = today();
  const todayStr = todayDate.toISOString().split('T')[0];

  container.innerHTML = `
    <div class="habits-view">
      <div class="habits-header">
        <h2 style="font-size:var(--fs-xl);font-weight:var(--fw-semibold)">Meus Hábitos</h2>
        <button class="btn btn-primary btn-sm" id="add-habit-btn">${icon('plus')} Novo Hábito</button>
      </div>

      ${habits.length === 0 ? `
        <div class="empty-state">
          ${icon('empty')}
          <div class="empty-state-title">Nenhum hábito criado</div>
          <div class="empty-state-desc">Comece criando um novo hábito para acompanhar seu progresso diário</div>
        </div>
      ` : ''}

      <div class="habits-grid" id="habits-grid">
        ${habits.map(habit => renderHabitCard(habit, todayStr)).join('')}
      </div>
    </div>
  `;

  bindHabitEvents(todayStr);
  loadHabitData();
}

function renderHabitCard(habit, todayStr) {
  // Generate last 7 days
  const weekDays = [];
  const todayDate = today();
  for (let i = 6; i >= 0; i--) {
    weekDays.push(addDays(todayDate, -i));
  }

  return `
    <div class="habit-card" data-habit-id="${habit.id}">
      <div class="habit-icon" style="background: ${habit.color}22; color: ${habit.color}">
        ${habit.icon || '💪'}
      </div>
      <div class="habit-info">
        <div class="habit-name">${habit.name}</div>
        <div class="habit-streak">
          ${icon('fire')}
          <span data-habit-streak="${habit.id}">0 dias</span>
        </div>
      </div>
      <div class="habit-week">
        ${weekDays.map(d => {
          const dateStr = d.toISOString().split('T')[0];
          const dayOfWeek = DAYS_MINI_PT[d.getDay()];
          return `
            <div class="habit-day" data-habit-day="${habit.id}" data-date="${dateStr}"
                 style="cursor:pointer">
              <span class="habit-day-label">${dayOfWeek}</span>
              <span>${d.getDate()}</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="habit-check-btn" data-habit-check="${habit.id}" data-date="${todayStr}" title="Marcar hoje" data-goal-count="${habit.goalCount || 1}">
        ${habit.goalCount > 1 ? `<span class="habit-progress" data-habit-progress="${habit.id}">0/${habit.goalCount}</span>` : icon('check')}
      </div>
    </div>
  `;
}

async function loadHabitData() {
  const logs = await dbGetAll('habitLogs');

  state.habits.forEach(habit => {
    const habitLogs = logs.filter(l => l.habitId === habit.id);
    const goalCount = habit.goalCount || 1;

    // Group logs by date to count increments per day
    const logsByDate = {};
    habitLogs.forEach(log => {
      if (!logsByDate[log.date]) {
        logsByDate[log.date] = 0;
      }
      logsByDate[log.date]++;
    });

    // Update week day cells - a day is completed if logs >= goalCount
    document.querySelectorAll(`[data-habit-day="${habit.id}"]`).forEach(el => {
      const date = el.dataset.date;
      const count = logsByDate[date] || 0;
      const isCompleted = count >= goalCount;

      if (isCompleted) {
        el.classList.add('completed');
        el.style.background = habit.color;
        el.style.color = 'white';
      } else if (goalCount > 1 && count > 0) {
        // Partial progress for multi-goal habits
        el.classList.add('partial');
        el.style.background = habit.color;
        el.style.opacity = (count / goalCount) * 0.5 + 0.3;
        el.style.color = habit.color;
      }
    });

    // Update check button and progress counter
    const checkBtn = document.querySelector(`[data-habit-check="${habit.id}"]`);
    const todayStr = today().toISOString().split('T')[0];
    const todayCount = logsByDate[todayStr] || 0;
    const todayCompleted = todayCount >= goalCount;

    if (checkBtn) {
      if (todayCompleted) {
        checkBtn.classList.add('checked');
      }

      // Update progress counter for multi-goal habits
      if (goalCount > 1) {
        const progressEl = checkBtn.querySelector('[data-habit-progress]');
        if (progressEl) {
          progressEl.textContent = `${todayCount}/${goalCount}`;
        }
      }
    }

    // Calculate streak - a day counts if logs >= goalCount
    let streak = 0;
    let checkDate = today();
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const count = logsByDate[dateStr] || 0;
      if (count >= goalCount) {
        streak++;
        checkDate = addDays(checkDate, -1);
      } else {
        break;
      }
    }
    const streakEl = document.querySelector(`[data-habit-streak="${habit.id}"]`);
    if (streakEl) streakEl.textContent = `${streak} dias`;
  });
}

function bindHabitEvents(todayStr) {
  // Add habit
  document.getElementById('add-habit-btn')?.addEventListener('click', () => {
    setState({ modalOpen: 'addHabit', modalData: null });
  });

  // Check today
  document.querySelectorAll('[data-habit-check]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const habitId = el.dataset.habitCheck;
      const date = todayStr;
      const goalCount = parseInt(el.dataset.goalCount) || 1;

      const logs = await dbGetAll('habitLogs');
      const todayLogs = logs.filter(l => l.habitId === habitId && l.date === date);
      const currentCount = todayLogs.length;

      if (currentCount >= goalCount) {
        // At or past goal: remove all logs for today (reset)
        for (const log of todayLogs) {
          await dbDelete('habitLogs', log.id);
        }
      } else {
        // Below goal: add another log (increment)
        await dbAdd('habitLogs', { habitId, date });
      }

      renderHabits();
    });
  });

  // Click on day to toggle
  document.querySelectorAll('[data-habit-day]').forEach(el => {
    el.addEventListener('click', async () => {
      const habitId = el.dataset.habitDay;
      const date = el.dataset.date;
      const habit = state.habits.find(h => h.id === habitId);
      const goalCount = habit?.goalCount || 1;

      const logs = await dbGetAll('habitLogs');
      const dayLogs = logs.filter(l => l.habitId === habitId && l.date === date);
      const currentCount = dayLogs.length;

      if (currentCount >= goalCount) {
        // At or past goal: remove all logs for this day (reset)
        for (const log of dayLogs) {
          await dbDelete('habitLogs', log.id);
        }
      } else {
        // Below goal: add another log (increment)
        await dbAdd('habitLogs', { habitId, date });
      }

      renderHabits();
    });
  });

  // Edit habit (click card)
  document.querySelectorAll('.habit-card[data-habit-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-habit-check]') || e.target.closest('[data-habit-day]')) return;
      const habitId = el.dataset.habitId;
      const habit = state.habits.find(h => h.id === habitId);
      if (habit) {
        setState({ modalOpen: 'editHabit', modalData: habit });
      }
    });
  });
}

function initHabits() {
  subscribeMultiple(['currentView', 'habits'], () => {
    if (state.currentView === 'habits') {
      renderHabits();
    }
  });
}

export { renderHabits, initHabits };
