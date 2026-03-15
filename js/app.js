// ============================================
// App Entry Point
// ============================================

import { openDB, dbGetAll, seedDefaults } from './db.js';
import { state, setState, subscribe, subscribeMultiple } from './store.js';
import { initTheme } from './utils/theme.js';
import { initShortcuts } from './utils/shortcuts.js';
import { renderSidebar, initSidebar } from './components/sidebar.js';
import { renderHeader, initHeader } from './components/header.js';
import { renderTaskList, initTaskList } from './components/taskList.js';
import { renderTaskDetail, initTaskDetail } from './components/taskDetail.js';
import { renderModal, initModal } from './components/modal.js';
import { renderCalendar, initCalendar } from './components/calendar.js';
import { renderKanban, initKanban } from './components/kanban.js';
import { renderPomodoro, initPomodoro } from './components/pomodoro.js';
import { renderHabits, initHabits } from './components/habits.js';
import { renderStats, initStats } from './components/stats.js';
import { renderEisenhower, initEisenhower } from './components/eisenhower.js';
import { initSearch } from './components/search.js';
import { initFloatingWindows } from './components/floatingWindow.js';

async function init() {
  try {
    // Initialize database
    await openDB();
    await seedDefaults();

    // Load all data
    const [tasks, lists, folders, tags, habits] = await Promise.all([
      dbGetAll('tasks'),
      dbGetAll('lists'),
      dbGetAll('folders'),
      dbGetAll('tags'),
      dbGetAll('habits'),
    ]);

    // Set initial state
    setState({ tasks, lists, folders, tags, habits });

    // Initialize theme
    await initTheme();

    // Initialize all components
    initSidebar();
    initHeader();
    initTaskList();
    initTaskDetail();
    initModal();
    initCalendar();
    initKanban();
    initPomodoro();
    initHabits();
    initStats();
    initEisenhower();
    initSearch();
    initFloatingWindows();
    initShortcuts();

    // Initial render
    renderSidebar();
    renderHeader();
    renderMainView();

    // Subscribe to view changes for main content
    subscribe('currentView', () => {
      renderMainView();
    });

    console.log('✅ TaskFlow initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize:', error);
  }
}

function renderMainView() {
  const view = state.currentView;

  switch (view) {
    case 'calendar':
      renderCalendar();
      break;
    case 'kanban':
      renderKanban();
      break;
    case 'pomodoro':
      renderPomodoro();
      break;
    case 'habits':
      renderHabits();
      break;
    case 'stats':
      renderStats();
      break;
    case 'eisenhower':
      renderEisenhower();
      break;
    default:
      renderTaskList();
      break;
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
