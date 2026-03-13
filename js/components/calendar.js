// ============================================
// Calendar View Component
// ============================================

import { state, setState, subscribe, subscribeMultiple } from '../store.js';
import { icon } from '../utils/icons.js';
import { MONTHS_PT, DAYS_SHORT_PT, getCalendarDays, isSameDay, isToday, formatDate, addDays } from '../utils/date.js';
import { dbUpdate, dbGetAll } from '../db.js';

function filterByList(task, filter) {
  if (filter === 'all') return true;
  return task.listId === filter;
}

function renderListFilterSelect(filterId, currentFilter) {
  return `
    <select id="${filterId}" class="select" style="height:30px;font-size:var(--fs-sm);padding:0 8px;min-width:150px;">
      <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>Todas as Listas</option>
      <option value="inbox" ${currentFilter === 'inbox' ? 'selected' : ''}>📥 Caixa de Entrada</option>
      ${state.lists.filter(l => !l.isDefault).map(l =>
        `<option value="${l.id}" ${currentFilter === l.id ? 'selected' : ''}>${l.emoji || '📝'} ${l.name}</option>`
      ).join('')}
    </select>
  `;
}

function renderTagFilterSelect(filterId, currentFilter) {
  return `
    <select id="${filterId}" class="select" style="height:30px;font-size:var(--fs-sm);padding:0 8px;min-width:130px;">
      <option value="" ${!currentFilter ? 'selected' : ''}>Todas as Tags</option>
      ${state.tags.map(t =>
        `<option value="${t.id}" ${currentFilter === t.id ? 'selected' : ''}>${t.name}</option>`
      ).join('')}
    </select>
  `;
}

function renderCalendar() {
  const container = document.getElementById('task-list-content');
  if (!container || state.currentView !== 'calendar') return;

  const date = state.calendarDate || new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const mode = state.calendarMode || 'month';
  const listFilter = state.calendarListFilter || 'all';
  const tagFilter = state.calendarTagFilter || '';

  container.innerHTML = `
    <div class="calendar-view">
      <div class="calendar-header">
        <div class="calendar-nav">
          <button class="calendar-nav-btn" id="cal-prev">${icon('chevronLeft')}</button>
          <span class="calendar-month-year">${MONTHS_PT[month]} ${year}</span>
          <button class="calendar-nav-btn" id="cal-next">${icon('chevronRight')}</button>
          <button class="calendar-today-btn" id="cal-today">Hoje</button>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          ${renderListFilterSelect('cal-list-filter', listFilter)}
          ${renderTagFilterSelect('cal-tag-filter', tagFilter)}
          <div class="calendar-view-toggle">
            <button class="calendar-view-btn ${mode === 'month' ? 'active' : ''}" data-cal-mode="month">Mês</button>
            <button class="calendar-view-btn ${mode === 'week' ? 'active' : ''}" data-cal-mode="week">Semana</button>
          </div>
        </div>
      </div>
      ${mode === 'month' ? renderMonthView(year, month, listFilter, tagFilter) : renderWeekView(date, listFilter, tagFilter)}
    </div>
  `;

  bindCalendarEvents();
}

function renderMonthView(year, month, listFilter, tagFilter) {
  const days = getCalendarDays(year, month);
  const tasks = state.tasks.filter(t =>
    !t.isCompleted &&
    t.dueDate &&
    filterByList(t, listFilter) &&
    (!tagFilter || (t.tags || []).includes(tagFilter))
  );

  return `
    <div class="calendar-grid">
      ${DAYS_SHORT_PT.map(d => `<div class="calendar-day-name">${d}</div>`).join('')}
      ${days.map(d => {
        const dayTasks = tasks.filter(t => isSameDay(t.dueDate, d.date));
        const isCurrentDay = isToday(d.date);
        const maxVisible = 3;

        return `
          <div class="calendar-day ${d.isCurrentMonth ? '' : 'other-month'} ${isCurrentDay ? 'today' : ''}"
               data-cal-date="${d.date.toISOString().split('T')[0]}">
            <div class="calendar-day-number">${d.date.getDate()}</div>
            <div class="calendar-day-tasks">
              ${dayTasks.slice(0, maxVisible).map(t => {
                const list = state.lists.find(l => l.id === t.listId);
                const color = (!list || list.id === 'inbox') ? '#6b7280' : list.color;
                const taskTags = (t.tags || []).map(id => state.tags.find(tg => tg.id === id)).filter(Boolean);
                const tagDots = taskTags.map(tg => `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${tg.color};margin-left:2px;flex-shrink:0"></span>`).join('');
                const descIcon = t.description ? '<span style="opacity:0.6;font-size:9px;margin-left:2px">💬</span>' : '';
                return `<div class="calendar-task" title="${t.description ? t.description.slice(0,80) : ''}" style="background:${color}22;color:${color};display:flex;align-items:center;gap:0" data-task-id="${t.id}">
                  <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</span>
                  ${tagDots}${descIcon}
                </div>`;
              }).join('')}
              ${dayTasks.length > maxVisible ? `<div class="calendar-day-more">+${dayTasks.length - maxVisible} mais</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderWeekView(date, listFilter, tagFilter) {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(start, i));
  }

  const tasks = state.tasks.filter(t =>
    !t.isCompleted &&
    t.dueDate &&
    filterByList(t, listFilter || 'all') &&
    (!tagFilter || (t.tags || []).includes(tagFilter))
  );
  const habits = state.habits.filter(h => h.showInCalendar !== false && h.notificationTime);

  // Helper to parse HH:MM into minutes from midnight
  const getMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const HOURS = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  const hourHeight = 60; // px per hour, can be zoomed

  return `
    <div style="flex:1; display:flex; flex-direction:column; overflow:hidden; background:var(--bg-primary);">
      <!-- Zoom controls -->
      <div style="display:flex; justify-content:flex-end; padding:4px 8px; border-bottom:1px solid var(--border-light); background:var(--bg-secondary); gap:6px;">
        <button id="cal-zoom-out" style="padding:2px 10px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-tertiary); cursor:pointer; font-size:18px;">&#8722;</button>
        <button id="cal-zoom-reset" style="padding:2px 10px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-tertiary); cursor:pointer; font-size:12px;">Zoom Reset</button>
        <button id="cal-zoom-in" style="padding:2px 10px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-tertiary); cursor:pointer; font-size:18px;">&#43;</button>
      </div>

      <!-- Header row (Days) -->
      <div style="display:grid; grid-template-columns: 60px repeat(7, 1fr); border-bottom:1px solid var(--border-light); background:var(--bg-secondary); position:sticky; top:0; z-index:10;">
        <div style="border-right:1px solid var(--border-color);"></div>
        ${weekDays.map(d => {
          const isCurrentDay = isToday(d);
          return `
            <div style="padding:var(--space-2); text-align:center; border-right:1px solid var(--border-light); background:${isCurrentDay ? 'var(--primary-alpha)' : 'transparent'};">
              <div style="font-size:var(--fs-xs);color:var(--text-tertiary);text-transform:uppercase">${DAYS_SHORT_PT[d.getDay()]}</div>
              <div style="font-size:var(--fs-lg);font-weight:var(--fw-semibold);color:${isCurrentDay ? 'var(--primary)' : 'var(--text-primary)'}">${d.getDate()}</div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- All-day tasks section -->
      <div style="display:grid; grid-template-columns: 60px repeat(7, 1fr); border-bottom:2px solid var(--border-color); background:var(--bg-primary);">
        <div style="border-right:1px solid var(--border-color); padding:var(--space-1); font-size:10px; color:var(--text-tertiary); text-align:right; line-height:1.2;">O Dia<br>Todo</div>
        ${weekDays.map(d => {
          const dayTasks = tasks.filter(t => isSameDay(t.dueDate, d) && !t.startTime);
          return `
            <div style="border-right:1px solid var(--border-light); padding:var(--space-1); display:flex; flex-direction:column; gap:2px; min-height:36px;">
              ${dayTasks.map(t => {
                const list = state.lists.find(l => l.id === t.listId);
                const color = (!list || list.id === 'inbox') ? '#6b7280' : list.color;
                return `<div class="calendar-task" style="background:${color}22;color:${color};font-size:11px;padding:2px 4px;border-radius:3px;cursor:pointer;" data-task-id="${t.id}">${t.title}</div>`;
              }).join('')}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Timeblocking grid -->
      <div style="flex:1; overflow-y:auto; position:relative;" id="calendar-time-grid">
        <div id="cal-week-inner" style="display:grid; grid-template-columns: 60px repeat(7, 1fr); position:relative;">
          
          <!-- Hours column -->
          <div style="border-right:1px solid var(--border-color); position:relative; z-index:1; background:var(--bg-secondary);">
            ${HOURS.map((h, i) => `
              <div class="cal-hour-cell" style="height:${hourHeight}px; box-sizing:border-box; border-bottom:1px solid var(--border-light); padding-right:8px; text-align:right; font-size:10px; color:var(--text-tertiary); display:flex; align-items:flex-start; justify-content:flex-end;">
                <span style="transform:translateY(-6px); display:inline-block">${h}</span>
              </div>
            `).join('')}
          </div>

          <!-- Day columns with horizontal grid lines and absolute events -->
          ${weekDays.map((d, colIndex) => {
            const dateStr = d.toISOString().split('T')[0];
            const dayScheduled = tasks.filter(t => isSameDay(t.dueDate, d) && t.startTime);
            const dayHabits = habits.filter(h => {
              if (h.frequency === 'daily') return true;
              if (h.frequency === 'custom' && h.frequencyDays?.includes(d.getDay())) return true;
              if (h.frequency === 'weekly' && d.getDay() === 1) return true;
              return false;
            });

            return `
              <div style="border-right:1px solid var(--border-light); position:relative;" class="cal-day-col" data-date="${dateStr}">
                ${HOURS.map(() => `<div class="cal-hour-cell" style="height:${hourHeight}px; border-bottom:1px solid var(--border-light); box-sizing:border-box;"></div>`).join('')}
                <!-- Absolute positioned events -->
                ${dayScheduled.map(t => {
                  const list = state.lists.find(l => l.id === t.listId);
                  const color = (!list || list.id === 'inbox') ? '#6b7280' : list.color;
                  const startMin = getMinutes(t.startTime);
                  const durMin = t.duration || 60;
                  const topPx = (startMin / 60) * hourHeight;
                  const heightPx = Math.max(20, (durMin / 60) * hourHeight - 2);
                  return `<div class="calendar-task" style="position:absolute; top:${topPx}px; height:${heightPx}px; left:2px; right:2px; background:${color}22; color:${color}; border-left:3px solid ${color}; z-index:5; overflow:hidden; border-radius:3px; padding:2px 4px; cursor:pointer;" data-task-id="${t.id}">
                    <div style="font-weight:600;font-size:10px;">${t.startTime}</div>
                    <div style="font-size:11px;line-height:1.2;">${t.title}</div>
                  </div>`;
                }).join('')}
                ${dayHabits.map(h => {
                  const startMin = getMinutes(h.notificationTime);
                  const durMin = 30;
                  const topPx = (startMin / 60) * hourHeight;
                  const heightPx = Math.max(18, (durMin / 60) * hourHeight - 2);
                  return `<div style="position:absolute; top:${topPx}px; height:${heightPx}px; left:2px; right:2px; background:${h.color}18; color:${h.color}; border:1px dashed ${h.color}; border-radius:3px; z-index:4; display:flex; align-items:center; gap:3px; overflow:hidden; padding:1px 3px;">
                    <span style="font-size:12px;">${h.icon || '💪'}</span>
                    <span style="font-size:10px;line-height:1;">${h.name}</span>
                  </div>`;
                }).join('')}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function bindCalendarEvents() {
  // List filter
  document.getElementById('cal-list-filter')?.addEventListener('change', (e) => {
    setState({ calendarListFilter: e.target.value });
  });

  // Tag filter
  document.getElementById('cal-tag-filter')?.addEventListener('change', (e) => {
    setState({ calendarTagFilter: e.target.value });
  });

  // Navigation
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    const d = new Date(state.calendarDate);
    if (state.calendarMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setState({ calendarDate: d });
  });

  document.getElementById('cal-next')?.addEventListener('click', () => {
    const d = new Date(state.calendarDate);
    if (state.calendarMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setState({ calendarDate: d });
  });

  document.getElementById('cal-today')?.addEventListener('click', () => {
    setState({ calendarDate: new Date() });
  });

  // Mode toggle
  document.querySelectorAll('[data-cal-mode]').forEach(el => {
    el.addEventListener('click', () => {
      setState({ calendarMode: el.dataset.calMode });
    });
  });

  // Click on task
  document.querySelectorAll('.calendar-task[data-task-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      setState({ selectedTaskId: el.dataset.taskId, detailOpen: true });
    });
  });

  // Click on day to add task
  document.querySelectorAll('[data-cal-date]').forEach(el => {
    el.addEventListener('dblclick', () => {
      const date = el.dataset.calDate;
      setState({
        modalOpen: 'addTask',
        modalData: { dueDate: date }
      });
    });
  });

  // Zoom controls for week view
  const grid = document.getElementById('calendar-time-grid');
  const inner = document.getElementById('cal-week-inner');
  if (grid && inner) {
    let hourHeight = parseInt(grid.dataset.hourHeight || '60');

    const applyZoom = (newH) => {
      hourHeight = Math.max(30, Math.min(180, newH));
      grid.dataset.hourHeight = hourHeight;
      inner.querySelectorAll('.cal-hour-cell').forEach(cell => {
        cell.style.height = hourHeight + 'px';
      });
    };

    document.getElementById('cal-zoom-in')?.addEventListener('click', () => applyZoom(hourHeight + 15));
    document.getElementById('cal-zoom-out')?.addEventListener('click', () => applyZoom(hourHeight - 15));
    document.getElementById('cal-zoom-reset')?.addEventListener('click', () => applyZoom(60));

    // Mouse wheel zoom (Ctrl+Wheel or trackpad pinch -> ctrlKey)
    grid.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        applyZoom(hourHeight + (e.deltaY < 0 ? 10 : -10));
      }
    }, { passive: false });
  }
}

function initCalendar() {
  subscribeMultiple(['currentView', 'calendarDate', 'calendarMode', 'calendarListFilter', 'calendarTagFilter', 'tasks', 'lists', 'habits', 'tags'], () => {
    if (state.currentView === 'calendar') {
      renderCalendar();
    }
  });
}

export { renderCalendar, initCalendar };
