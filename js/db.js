// ============================================
// IndexedDB Database Layer
// ============================================

const DB_NAME = 'ticktick_clone';
const DB_VERSION = 1;

const STORES = {
  tasks: { keyPath: 'id', indexes: ['listId', 'dueDate', 'isCompleted', 'priority', 'createdAt'] },
  lists: { keyPath: 'id', indexes: ['folderId', 'sortOrder'] },
  folders: { keyPath: 'id', indexes: ['sortOrder'] },
  tags: { keyPath: 'id', indexes: ['name'] },
  habits: { keyPath: 'id', indexes: ['sortOrder'] },
  habitLogs: { keyPath: 'id', indexes: ['habitId', 'date'] },
  pomodoroSessions: { keyPath: 'id', indexes: ['taskId', 'date'] },
  settings: { keyPath: 'key' }
};

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      for (const [storeName, config] of Object.entries(STORES)) {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: config.keyPath });
          if (config.indexes) {
            config.indexes.forEach(idx => {
              store.createIndex(idx, idx, { unique: false });
            });
          }
        }
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

function getStore(storeName, mode = 'readonly') {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback with better entropy
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// ── CRUD Operations ──

async function dbAdd(storeName, data) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    if (!data.id) data.id = generateId();
    data.createdAt = data.createdAt || new Date().toISOString();
    data.updatedAt = new Date().toISOString();
    const request = store.add(data);
    request.onsuccess = () => resolve(data);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function dbGet(storeName, id) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function dbGetAll(storeName) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function dbUpdate(storeName, data) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    data.updatedAt = new Date().toISOString();
    const request = store.put(data);
    request.onsuccess = () => resolve(data);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function dbDelete(storeName, id) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve(id);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function dbGetByIndex(storeName, indexName, value) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function dbClear(storeName) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

async function dbCount(storeName) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// ── Settings helpers ──

async function getSetting(key, defaultValue = null) {
  const result = await dbGet('settings', key);
  return result ? result.value : defaultValue;
}

async function setSetting(key, value) {
  return dbUpdate('settings', { key, value });
}

// ── Seed default data ──

async function seedDefaults() {
  const lists = await dbGetAll('lists');
  if (lists.length === 0) {
    await dbAdd('lists', {
      id: 'inbox',
      name: 'Caixa de Entrada',
      color: '#4772fa',
      emoji: '📥',
      folderId: null,
      sortOrder: 0,
      isDefault: true,
      kanbanColumns: [
        { id: 'todo', title: 'A Fazer', color: '#6b7280', order: 0 },
        { id: 'doing', title: 'Em Progresso', color: '#4772fa', order: 1 },
        { id: 'done', title: 'Concluído', color: '#52c41a', order: 2 }
      ]
    });
  } else {
    // Migration: add kanbanColumns to existing lists that don't have it
    let changed = false;
    for (const list of lists) {
      if (!list.kanbanColumns) {
        list.kanbanColumns = [
          { id: 'todo', title: 'A Fazer', color: '#6b7280', order: 0 },
          { id: 'doing', title: 'Em Progresso', color: '#4772fa', order: 1 },
          { id: 'done', title: 'Concluído', color: '#52c41a', order: 2 }
        ];
        await dbUpdate('lists', list);
        changed = true;
      }
    }
  }

  const theme = await getSetting('theme');
  if (!theme) {
    await setSetting('theme', 'light');
  }

  const pomodoroSettings = await getSetting('pomodoro');
  if (!pomodoroSettings) {
    await setSetting('pomodoro', {
      workDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      sessionsBeforeLongBreak: 4
    });
  }
}

async function exportData() {
  const data = {};
  for (const storeName of Object.keys(STORES)) {
    data[storeName] = await dbGetAll(storeName);
  }
  return JSON.stringify(data);
}

// ── Import validation & sanitization ──

function sanitizeStr(val) {
  if (typeof val !== 'string') return '';
  return val.replace(/[<>"'&]/g, ch => ({ '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;', '&':'&amp;' }[ch] || ch));
}

function isValidColor(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c); }
function isValidDate(d) { return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d); }

function validateTask(item) {
  return {
    id: typeof item.id === 'string' ? item.id : generateId(),
    title: sanitizeStr(item.title || 'Sem título'),
    description: typeof item.description === 'string' ? item.description : '',
    listId: typeof item.listId === 'string' ? item.listId : 'inbox',
    priority: [0,1,2,3].includes(item.priority) ? item.priority : 0,
    dueDate: isValidDate(item.dueDate) ? item.dueDate : null,
    startTime: typeof item.startTime === 'string' ? item.startTime : null,
    duration: typeof item.duration === 'number' ? item.duration : null,
    tags: Array.isArray(item.tags) ? item.tags.filter(t => typeof t === 'string') : [],
    subtasks: Array.isArray(item.subtasks) ? item.subtasks.map(s => ({
      title: sanitizeStr(typeof s.title === 'string' ? s.title : ''),
      completed: !!s.completed
    })) : [],
    isCompleted: !!item.isCompleted,
    isCanceled: !!item.isCanceled,
    completedAt: typeof item.completedAt === 'string' ? item.completedAt : null,
    isRecurring: !!item.isRecurring,
    recurRule: typeof item.recurRule === 'string' ? item.recurRule : null,
    recurType: typeof item.recurType === 'string' ? item.recurType : null,
    recurDaysAfter: typeof item.recurDaysAfter === 'number' ? item.recurDaysAfter : null,
    kanbanStatus: typeof item.kanbanStatus === 'string' ? item.kanbanStatus : null,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
  };
}

function validateList(item) {
  return {
    id: typeof item.id === 'string' ? item.id : generateId(),
    name: sanitizeStr(item.name || 'Lista'),
    color: isValidColor(item.color) ? item.color : '#4772fa',
    emoji: typeof item.emoji === 'string' ? item.emoji.slice(0, 4) : '',
    folderId: typeof item.folderId === 'string' ? item.folderId : null,
    type: ['tasks','notes'].includes(item.type) ? item.type : 'tasks',
    kanbanColumns: Array.isArray(item.kanbanColumns) ? item.kanbanColumns.map(c => ({
      id: typeof c.id === 'string' ? c.id : generateId(),
      title: sanitizeStr(c.title || 'Coluna'),
      color: isValidColor(c.color) ? c.color : '#6b7280',
      order: typeof c.order === 'number' ? c.order : 0,
    })) : null,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
    isDefault: !!item.isDefault,
  };
}

function validateTag(item) {
  return {
    id: typeof item.id === 'string' ? item.id : generateId(),
    name: sanitizeStr(item.name || 'Tag'),
    color: isValidColor(item.color) ? item.color : '#4772fa',
  };
}

function validateFolder(item) {
  return {
    id: typeof item.id === 'string' ? item.id : generateId(),
    name: sanitizeStr(item.name || 'Pasta'),
    isExpanded: item.isExpanded !== false,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
  };
}

function validateHabit(item) {
  return {
    id: typeof item.id === 'string' ? item.id : generateId(),
    name: sanitizeStr(item.name || 'Hábito'),
    icon: typeof item.icon === 'string' ? item.icon.slice(0, 4) : '💪',
    color: isValidColor(item.color) ? item.color : '#52c41a',
    frequency: ['daily','weekly','custom'].includes(item.frequency) ? item.frequency : 'daily',
    frequencyDays: Array.isArray(item.frequencyDays) ? item.frequencyDays.filter(d => typeof d === 'number' && d >= 0 && d <= 6) : [],
    notificationTime: typeof item.notificationTime === 'string' ? item.notificationTime : null,
    showInCalendar: item.showInCalendar !== false,
    goalCount: typeof item.goalCount === 'number' && item.goalCount >= 1 ? item.goalCount : 1,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
  };
}

const IMPORT_VALIDATORS = {
  tasks: validateTask,
  lists: validateList,
  tags: validateTag,
  folders: validateFolder,
  habits: validateHabit,
};

const MAX_RECORDS_PER_STORE = 50000;

async function importData(jsonData) {
  try {
    const data = JSON.parse(jsonData);

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new Error('JSON root must be an object');
    }

    for (const storeName of Object.keys(STORES)) {
      if (data[storeName]) {
        if (!Array.isArray(data[storeName])) {
          throw new Error(`Store "${storeName}" must be an array`);
        }
        if (data[storeName].length > MAX_RECORDS_PER_STORE) {
          throw new Error(`Store "${storeName}" exceeds ${MAX_RECORDS_PER_STORE} records`);
        }

        const validator = IMPORT_VALIDATORS[storeName];
        const validated = validator
          ? data[storeName].map(item => validator(item))
          : data[storeName].map(item => {
              // For stores without a specific validator, only keep primitive values
              const safe = {};
              for (const [k, v] of Object.entries(item)) {
                if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
                safe[k] = v;
              }
              return safe;
            });

        await dbClear(storeName);
        for (const item of validated) {
          await dbAdd(storeName, item);
        }
      }
    }
    return true;
  } catch (e) {
    console.error("Import failed:", e);
    return false;
  }
}

export {
  openDB, generateId,
  dbAdd, dbGet, dbGetAll, dbUpdate, dbDelete, dbGetByIndex, dbClear, dbCount,
  getSetting, setSetting, seedDefaults, exportData, importData
};
