// ============================================
// IndexedDB Database Layer
// ============================================

import { normalizeRichTextHtml } from './utils/richText.js';

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

async function dbBulkUpdate(storeName, items) {
  await openDB();

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const timestamp = new Date().toISOString();
    const preparedItems = items.map(item => ({
      ...item,
      createdAt: item.createdAt || timestamp,
      updatedAt: timestamp
    }));

    tx.oncomplete = () => resolve(preparedItems);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Bulk update aborted'));

    for (const item of preparedItems) {
      store.put(item);
    }
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
  const jsonPayload = JSON.stringify(data);
  // Generate SHA-256 checksum
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(jsonPayload));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // Return JSON with integrity field
  return JSON.stringify({ ...data, _integrity: 'sha256-' + hashHex });
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
    description: normalizeRichTextHtml(typeof item.description === 'string' ? item.description : ''),
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

function validateHabitLog(item) {
  return {
    id: typeof item.id === 'string' ? item.id : generateId(),
    habitId: typeof item.habitId === 'string' ? item.habitId : '',
    date: isValidDate(item.date) ? item.date : new Date().toISOString().split('T')[0],
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
  };
}

function validatePomodoroSession(item) {
  return {
    id: typeof item.id === 'string' ? item.id : generateId(),
    taskId: typeof item.taskId === 'string' ? item.taskId : null,
    date: isValidDate(item.date) ? item.date : new Date().toISOString().split('T')[0],
    duration: typeof item.duration === 'number' && item.duration > 0 && item.duration <= 480 ? item.duration : 25,
    completedAt: typeof item.completedAt === 'string' ? item.completedAt : new Date().toISOString(),
  };
}

function validateSetting(item) {
  return {
    key: typeof item.key === 'string' ? item.key : '',
    value: item.value !== undefined ? item.value : null,
  };
}

const IMPORT_VALIDATORS = {
  tasks: validateTask,
  lists: validateList,
  tags: validateTag,
  folders: validateFolder,
  habits: validateHabit,
  habitLogs: validateHabitLog,
  pomodoroSessions: validatePomodoroSession,
  settings: validateSetting,
};

const MAX_RECORDS_PER_STORE = 50000;

async function importData(jsonData) {
  try {
    const data = JSON.parse(jsonData);

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new Error('JSON root must be an object');
    }

    // Check integrity if present
    if (data._integrity) {
      const storedHash = data._integrity;
      const dataWithoutIntegrity = { ...data };
      delete dataWithoutIntegrity._integrity;
      const payload = JSON.stringify(dataWithoutIntegrity);
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const computedHash = 'sha256-' + hashHex;
      if (computedHash !== storedHash) {
        const proceed = confirm('⚠️ AVISO: Este arquivo foi modificado desde a exportação.\n\nO checksum de integridade não confere. O arquivo pode ter sido alterado manualmente.\n\nDeseja importar mesmo assim?');
        if (!proceed) return false;
      }
      delete data._integrity; // remove before processing
    }

    // Phase 1: Validate ALL stores in memory — no DB writes yet
    const validatedData = {};
    for (const storeName of Object.keys(STORES)) {
      if (!data[storeName]) continue;

      if (!Array.isArray(data[storeName])) {
        throw new Error(`Store "${storeName}" must be an array`);
      }
      if (data[storeName].length > MAX_RECORDS_PER_STORE) {
        throw new Error(`Store "${storeName}" exceeds ${MAX_RECORDS_PER_STORE} records`);
      }

      const validator = IMPORT_VALIDATORS[storeName];
      validatedData[storeName] = validator
        ? data[storeName].map(item => validator(item))
        : data[storeName].map(item => {
            const safe = {};
            for (const [k, v] of Object.entries(item)) {
              if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
              safe[k] = v;
            }
            return safe;
          });
    }

    // Phase 2: Commit atomically in a single transaction covering all affected stores
    await openDB();
    const storeNames = Object.keys(validatedData);
    if (storeNames.length === 0) return true;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Import transaction aborted'));
      tx.oncomplete = () => resolve(true);

      for (const storeName of storeNames) {
        const store = tx.objectStore(storeName);
        store.clear();
        for (const item of validatedData[storeName]) {
          // Ensure required fields are set without leaving the transaction
          if (!item.id && STORES[storeName].keyPath === 'id') item.id = generateId();
          if (!item.createdAt) item.createdAt = new Date().toISOString();
          item.updatedAt = new Date().toISOString();
          store.add(item);
        }
      }
    });
  } catch (e) {
    console.error("Import failed:", e);
    return false;
  }
}

export {
  openDB, generateId,
  dbAdd, dbGet, dbGetAll, dbUpdate, dbBulkUpdate, dbDelete, dbGetByIndex, dbClear, dbCount,
  getSetting, setSetting, seedDefaults, exportData, importData
};
