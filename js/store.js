// ============================================
// Reactive State Store (Pub/Sub)
// ============================================

const state = {
  // Navigation
  currentView: 'inbox',       // inbox | today | tomorrow | week | all | completed | list:<id> | calendar | kanban | pomodoro | habits | stats
  currentListId: 'inbox',
  searchReturnView: 'inbox',
  selectedTaskId: null,
  detailOpen: false,
  sidebarOpen: true,

  // Data (cached in memory)
  tasks: [],
  lists: [],
  folders: [],
  tags: [],
  habits: [],

  // UI state
  searchQuery: '',
  searchOpen: false,
  searchFilter: 'all',        // all | pending | completed
  sortBy: 'sortOrder',        // sortOrder | dueDate | priority | title | createdAt
  sortDir: 'asc',
  filterTags: [],
  filterPriority: null,

  // Calendar
  calendarDate: new Date(),
  calendarMode: 'month',      // month | week
  calendarListFilter: 'all',  // 'all' | 'inbox' | list id
  calendarTagFilter: '',      // '' = all tags, or a tagId

  // All view
  allListFilter: 'all',        // 'all' | 'inbox' | list id

  // Kanban
  kanbanListFilter: 'all',     // 'all' | 'inbox' | list id

  // Eisenhower
  eisenhowerListFilter: 'all', // 'all' | 'inbox' | list id

  // Pomodoro
  pomodoroState: 'idle',      // idle | running | paused
  pomodoroType: 'work',       // work | shortBreak | longBreak
  pomodoroTimeLeft: 25 * 60,
  pomodoroSession: 0,
  pomodoroTaskId: null,
  pomodoroCommand: null,      // null | 'skip' | 'reset' — used by floating window to trigger actions

  // Floating windows
  floatingTask: false,
  floatingPomodoro: false,
  floatingTaskOpacity: 1.0,
  floatingPomodoroOpacity: 1.0,

  // Modals
  modalOpen: null,             // null | 'addList' | 'addFolder' | 'addTask' | 'addHabit' | 'editList' | 'confirm' | 'addTag'
  modalData: null,

  // Editing
  editingListId: null,
  editingFolderId: null,
};

const listeners = {};

function subscribe(key, callback) {
  if (!listeners[key]) listeners[key] = [];
  listeners[key].push(callback);
  return () => {
    listeners[key] = listeners[key].filter(cb => cb !== callback);
  };
}

function subscribeMultiple(keys, callback) {
  const unsubs = keys.map(key => subscribe(key, callback));
  return () => unsubs.forEach(u => u());
}

function emit(key) {
  if (listeners[key]) {
    listeners[key].forEach(cb => cb(state[key], state));
  }
  // Also emit a wildcard for global listeners
  if (listeners['*']) {
    listeners['*'].forEach(cb => cb(key, state[key], state));
  }
}

function setState(updates) {
  const changedKeys = [];
  for (const [key, value] of Object.entries(updates)) {
    if (state[key] !== value) {
      state[key] = value;
      changedKeys.push(key);
    }
  }
  changedKeys.forEach(key => emit(key));
}

function getState(key) {
  return key ? state[key] : { ...state };
}

export { state, subscribe, subscribeMultiple, emit, setState, getState };
