// ============================================
// Modal Component
// ============================================

import { state, setState, subscribe } from '../store.js';
import { dbAdd, dbUpdate, dbGetAll, dbDelete } from '../db.js';
import { icon, escapeHtml } from '../utils/icons.js';
import { extractNaturalDate } from '../utils/date.js';

const COLORS = [
  '#4772fa', '#ff4d4f', '#ff8c22', '#faad14', '#52c41a',
  '#13c2c2', '#1890ff', '#722ed1', '#eb2f96', '#f5222d',
  '#fa8c16', '#a0d911', '#36cfc9', '#597ef7', '#9254de',
  '#ff85c0', '#ffa940', '#bae637', '#5cdbd3', '#85a5ff',
  '#b37feb'
];

const EMOJIS = ['📋', '⭐', '🏠', '💼', '🎓', '💪', '🎨', '🎵', '📚', '🛒', '✈️', '🎯', '💡', '🔧', '❤️', '🌿', '🍕', '🎮', '📱', '🚀'];

function renderModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  if (!state.modalOpen) {
    overlay.classList.remove('active');
    return;
  }

  overlay.classList.add('active');
  let content = '';

  switch (state.modalOpen) {
    case 'addList':
    case 'editList':
      content = renderListModal();
      break;
    case 'addFolder':
      content = renderFolderModal();
      break;
    case 'addTask':
      content = renderTaskModal();
      break;
    case 'addTag':
    case 'editTag':
      content = renderTagModal();
      break;
    case 'addHabit':
    case 'editHabit':
      content = renderHabitModal();
      break;
    case 'addKanbanColumn':
    case 'editKanbanColumn':
      content = renderKanbanColumnModal();
      break;
    case 'globalQuickAdd':
      content = renderGlobalQuickAddModal();
      break;
    default:
      overlay.classList.remove('active');
      return;
  }

  overlay.innerHTML = state.modalOpen === 'globalQuickAdd' 
    ? `<div class="modal" style="padding: 0; overflow: hidden;">${content}</div>`
    : `<div class="modal">${content}</div>`;
  bindModalEvents();

  // Focus first input
  setTimeout(() => {
    const firstInput = overlay.querySelector('input[type="text"], input:not([type="hidden"])');
    if (firstInput) firstInput.focus();
  }, 100);
}

function renderGlobalQuickAddModal() {
  return `
    <div style="padding: 0; display: flex; flex-direction: column;">
      <input type="text" id="global-quick-add-input" class="input" placeholder="Adicionar tarefa... (ex: 'Ler amanhã')" style="font-size: 1.2rem; padding: 20px; border: none; border-radius: var(--radius-md); outline: none; box-shadow: none;" autocomplete="off" />
      <div style="font-size: 11px; color: var(--text-tertiary); padding: 4px 12px 12px; text-align: right; background: var(--bg-primary);">Pressione Enter para salvar ou Esc para cancelar</div>
    </div>
  `;
}

function renderListModal() {
  const isEdit = state.modalOpen === 'editList';
  const list = isEdit ? state.modalData : null;
  const selectedColor = list?.color || COLORS[0];
  const selectedEmoji = list?.emoji || '';

  return `
    <div class="modal-header">
      <span class="modal-title">${isEdit ? 'Editar Lista' : 'Nova Lista'}</span>
      <button class="btn-icon modal-close">${icon('x')}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input type="text" class="input" id="modal-list-name" value="${escapeHtml(list?.name || '')}" placeholder="Nome da lista" />
      </div>
      <div class="form-group">
        <label class="form-label">Emoji</label>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-1)">
          <div class="color-swatch ${!selectedEmoji ? 'selected' : ''}" data-emoji="" style="background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-tertiary)">✕</div>
          ${EMOJIS.map(e => `
            <div class="color-swatch ${selectedEmoji === e ? 'selected' : ''}" data-emoji="${e}" style="background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;font-size:16px">${e}</div>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Cor</label>
        <div class="color-picker" id="modal-color-picker">
          ${COLORS.map(c => `
            <div class="color-swatch ${selectedColor === c ? 'selected' : ''}" data-color="${c}" style="background: ${c}"></div>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Pasta (opcional)</label>
        <select class="select" id="modal-list-folder">
          <option value="">Nenhuma</option>
          ${state.folders.map(f => `
            <option value="${f.id}" ${list?.folderId === f.id ? 'selected' : ''}>${f.name}</option>
          `).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tipo de Lista</label>
        <select class="select" id="modal-list-type">
          <option value="tasks" ${list?.type === 'notes' ? '' : 'selected'}>Tarefas</option>
          <option value="notes" ${list?.type === 'notes' ? 'selected' : ''}>Notas</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      ${isEdit ? `<button class="btn btn-danger" id="modal-delete">Excluir</button>` : '<span></span>'}
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn-secondary modal-close">Cancelar</button>
        <button class="btn btn-primary" id="modal-save">Salvar</button>
      </div>
    </div>
  `;
}

function renderFolderModal() {
  return `
    <div class="modal-header">
      <span class="modal-title">Nova Pasta</span>
      <button class="btn-icon modal-close">${icon('x')}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input type="text" class="input" id="modal-folder-name" placeholder="Nome da pasta" />
      </div>
    </div>
    <div class="modal-footer">
      <span></span>
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn-secondary modal-close">Cancelar</button>
        <button class="btn btn-primary" id="modal-save">Salvar</button>
      </div>
    </div>
  `;
}

function renderTaskModal() {
  return `
    <div class="modal-header">
      <span class="modal-title">Nova Tarefa</span>
      <button class="btn-icon modal-close">${icon('x')}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Título</label>
        <input type="text" class="input" id="modal-task-title" placeholder="O que precisa ser feito?" />
      </div>
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <textarea class="textarea" id="modal-task-desc" placeholder="Adicionar detalhes..." rows="3"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="form-group">
          <label class="form-label">Lista</label>
          <select class="select" id="modal-task-list">
            ${state.lists.map(l => `
              <option value="${l.id}" ${l.id === state.currentListId ? 'selected' : ''}>${l.emoji || ''} ${l.name}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Data e Duração</label>
          <div style="display:flex;gap:4px">
            <input type="date" class="input" id="modal-task-date" value="${state.modalData?.dueDate || ''}" style="flex:2;padding:0 4px" />
            <input type="time" class="input" id="modal-task-start-time" title="Horário" style="flex:1;padding:0 4px" />
            <input type="number" class="input" id="modal-task-duration" placeholder="Min" title="Minutos" style="flex:1;padding:0 4px" min="5" step="5" />
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Prioridade</label>
        <div class="priority-selector" id="modal-task-priority">
          <div class="priority-option selected" data-priority="0" style="color:var(--text-tertiary)">${icon('flag')} Nenhuma</div>
          <div class="priority-option" data-priority="1" style="color:var(--priority-low)">${icon('flag')} Baixa</div>
          <div class="priority-option" data-priority="2" style="color:var(--priority-medium)">${icon('flag')} Média</div>
          <div class="priority-option" data-priority="3" style="color:var(--priority-high)">${icon('flag')} Alta</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Tags</label>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-1)">
          ${state.tags.map(t => `
            <span class="tag" data-modal-tag="${t.id}">
              <span class="tag-dot" style="background:${t.color}"></span>
              ${t.name}
            </span>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <span></span>
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn-secondary modal-close">Cancelar</button>
        <button class="btn btn-primary" id="modal-save">Criar Tarefa</button>
      </div>
    </div>
  `;
}

function renderTagModal() {
  const isEdit = state.modalOpen === 'editTag';
  const tag = isEdit ? state.modalData : null;
  const selectedColor = tag?.color || COLORS[0];

  return `
    <div class="modal-header">
      <span class="modal-title">${isEdit ? 'Editar Tag' : 'Nova Tag'}</span>
      <button class="btn-icon modal-close">${icon('x')}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input type="text" class="input" id="modal-tag-name" value="${escapeHtml(tag?.name || '')}" placeholder="Nome da tag" />
      </div>
      <div class="form-group">
        <label class="form-label">Cor</label>
        <div class="color-picker" id="modal-color-picker">
          ${COLORS.map(c => `
            <div class="color-swatch ${selectedColor === c ? 'selected' : ''}" data-color="${c}" style="background: ${c}"></div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="modal-footer">
      ${isEdit ? `<button class="btn btn-danger" id="modal-delete">Excluir</button>` : '<span></span>'}
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn-secondary modal-close">Cancelar</button>
        <button class="btn btn-primary" id="modal-save">Salvar</button>
      </div>
    </div>
  `;
}

function renderHabitModal() {
  const isEdit = state.modalOpen === 'editHabit';
  const habit = isEdit ? state.modalData : null;

  const HABIT_ICONS = ['💪', '🏃', '📖', '💧', '🧘', '🍎', '😴', '📝', '🎵', '🎨', '💊', '🧹', '🌅', '☕', '🚶'];

  return `
    <div class="modal-header">
      <span class="modal-title">${isEdit ? 'Editar Hábito' : 'Novo Hábito'}</span>
      <button class="btn-icon modal-close">${icon('x')}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input type="text" class="input" id="modal-habit-name" value="${escapeHtml(habit?.name || '')}" placeholder="Ex: Exercitar-se" />
      </div>
      <div class="form-group">
        <label class="form-label">Ícone</label>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-1)">
          ${HABIT_ICONS.map(e => `
            <div class="color-swatch ${(habit?.icon || '💪') === e ? 'selected' : ''}" data-emoji="${e}" style="background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;font-size:18px;width:36px;height:36px">${e}</div>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Frequência</label>
        <select class="select" id="modal-habit-frequency">
          <option value="daily" ${habit?.frequency === 'daily' ? 'selected' : ''}>Diário</option>
          <option value="weekly" ${habit?.frequency === 'weekly' ? 'selected' : ''}>Semanal</option>
          <option value="custom" ${habit?.frequency === 'custom' ? 'selected' : ''}>Dias específicos</option>
        </select>
        
        <div id="modal-habit-custom-days" style="display:${habit?.frequency === 'custom' ? 'flex' : 'none'}; gap:4px; margin-top:8px; flex-wrap:wrap;">
          ${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => {
            const isSelected = habit?.frequencyDays ? habit.frequencyDays.includes(idx) : false;
            return `
              <div class="habit-day-toggle ${isSelected ? 'selected' : ''}" data-day-index="${idx}" 
                   style="width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; 
                          cursor:pointer; font-size:12px; font-weight:var(--fw-medium);
                          background:${isSelected ? 'var(--primary)' : 'var(--bg-tertiary)'}; 
                          color:${isSelected ? 'white' : 'var(--text-secondary)'};">
                ${day}
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:var(--space-2)">
        <div class="form-group">
          <label class="form-label">Notificação (Horário)</label>
          <input type="time" class="input" id="modal-habit-time" value="${habit?.notificationTime || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Meta diária</label>
          <input type="number" class="input" id="modal-habit-goal-count" value="${habit?.goalCount || 1}" min="1" />
        </div>
      </div>
      <div class="form-group" style="display:flex; flex-direction:column; justify-content:center;">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:var(--fs-sm)">
          <input type="checkbox" id="modal-habit-calendar" ${habit?.showInCalendar !== false ? 'checked' : ''} />
          Mostrar no Calendário
        </label>
      </div>
      <div class="form-group">
        <label class="form-label">Cor</label>
        <div class="color-picker" id="modal-color-picker">
          ${COLORS.slice(0, 14).map(c => `
            <div class="color-swatch ${(habit?.color || COLORS[4]) === c ? 'selected' : ''}" data-color="${c}" style="background: ${c}"></div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="modal-footer">
      ${isEdit ? `<button class="btn btn-danger" id="modal-delete">Excluir</button>` : '<span></span>'}
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn-secondary modal-close">Cancelar</button>
        <button class="btn btn-primary" id="modal-save">Salvar</button>
      </div>
    </div>
  `;
}

function renderKanbanColumnModal() {
  const isEdit = state.modalOpen === 'editKanbanColumn';
  const column = isEdit ? state.modalData.column : null;
  const selectedColor = column?.color || COLORS[0];

  return `
    <div class="modal-header">
      <span class="modal-title">${isEdit ? 'Editar Coluna' : 'Nova Coluna Kanban'}</span>
      <button class="btn-icon modal-close">${icon('x')}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nome da Coluna</label>
        <input type="text" class="input" id="modal-kanban-col-name" value="${escapeHtml(column?.title || '')}" placeholder="Ex: Em revisão" />
      </div>
      <div class="form-group">
        <label class="form-label">Cor</label>
        <div class="color-picker" id="modal-color-picker">
          ${COLORS.map(c => `
            <div class="color-swatch ${selectedColor === c ? 'selected' : ''}" data-color="${c}" style="background: ${c}"></div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="modal-footer">
      ${isEdit ? `<button class="btn btn-danger" id="modal-delete">Excluir</button>` : '<span></span>'}
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn-secondary modal-close">Cancelar</button>
        <button class="btn btn-primary" id="modal-save">Salvar</button>
      </div>
    </div>
  `;
}

function bindModalEvents() {
  const overlay = document.getElementById('modal-overlay');
  let selectedColor = COLORS[0];
  let selectedEmoji = '';
  let selectedTags = [];
  let selectedPriority = 0;
  let selectedHabitDays = [];

  // Pre-fill selections from existing data
  if (state.modalOpen === 'editList' && state.modalData) {
    selectedColor = state.modalData.color || COLORS[0];
    selectedEmoji = state.modalData.emoji || '';
  }
  if (state.modalOpen === 'editHabit' && state.modalData) {
    selectedColor = state.modalData.color || COLORS[4];
    selectedEmoji = state.modalData.icon || '💪';
    selectedHabitDays = state.modalData.frequencyDays || [];
  }
  if (state.modalOpen === 'editKanbanColumn' && state.modalData && state.modalData.column) {
    selectedColor = state.modalData.column.color || COLORS[0];
  }
  if (state.modalOpen === 'editTag' && state.modalData) {
    selectedColor = state.modalData.color || COLORS[0];
  }

  // Close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  overlay.querySelectorAll('.modal-close').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  // Color picker
  overlay.querySelectorAll('[data-color]').forEach(el => {
    el.addEventListener('click', () => {
      overlay.querySelectorAll('[data-color]').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');
      selectedColor = el.dataset.color;
    });
  });

  // Emoji picker
  overlay.querySelectorAll('[data-emoji]').forEach(el => {
    el.addEventListener('click', () => {
      overlay.querySelectorAll('[data-emoji]').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');
      selectedEmoji = el.dataset.emoji;
    });
  });

  // Habit frequency custom days
  const freqSelect = document.getElementById('modal-habit-frequency');
  const customDaysContainer = document.getElementById('modal-habit-custom-days');
  if (freqSelect && customDaysContainer) {
    freqSelect.addEventListener('change', (e) => {
      customDaysContainer.style.display = e.target.value === 'custom' ? 'flex' : 'none';
    });
  }

  overlay.querySelectorAll('.habit-day-toggle').forEach(el => {
    el.addEventListener('click', () => {
      const dayIdx = parseInt(el.dataset.dayIndex);
      const idx = selectedHabitDays.indexOf(dayIdx);
      if (idx >= 0) {
        selectedHabitDays.splice(idx, 1);
        el.classList.remove('selected');
        el.style.background = 'var(--bg-tertiary)';
        el.style.color = 'var(--text-secondary)';
      } else {
        selectedHabitDays.push(dayIdx);
        el.classList.add('selected');
        el.style.background = 'var(--primary)';
        el.style.color = 'white';
      }
    });
  });

  // Global Quick Add event
  const globalInput = document.getElementById('global-quick-add-input');
  if (globalInput) {
    globalInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && globalInput.value.trim()) {
        const rawTitle = globalInput.value.trim();
        const extracted = extractNaturalDate(rawTitle);
        const title = extracted.cleanText || rawTitle;

        let dueDate = null;
        if (extracted.date) {
          dueDate = extracted.date.toISOString().split('T')[0];
        }

        const newTask = {
          title,
          description: '',
          listId: 'inbox',
          priority: 0,
          dueDate,
          tags: [],
          subtasks: [],
          isCompleted: false,
          completedAt: null,
          isRecurring: false,
          recurRule: null,
          sortOrder: state.tasks.length
        };

        await dbAdd('tasks', newTask);
        const updatedTasks = await dbGetAll('tasks');
        setState({ tasks: updatedTasks, modalOpen: null, modalData: null });
      }
    });
  }

  // Tag toggle in task modal
  overlay.querySelectorAll('[data-modal-tag]').forEach(el => {
    el.addEventListener('click', () => {
      const tagId = el.dataset.modalTag;
      const idx = selectedTags.indexOf(tagId);
      if (idx >= 0) {
        selectedTags.splice(idx, 1);
        el.classList.remove('selected');
        const tag = state.tags.find(t => t.id === tagId);
        el.style.background = '';
        el.style.color = '';
        el.style.border = '';
      } else {
        selectedTags.push(tagId);
        el.classList.add('selected');
        const tag = state.tags.find(t => t.id === tagId);
        if (tag) {
          el.style.background = `${tag.color}22`;
          el.style.color = tag.color;
          el.style.border = `1px solid ${tag.color}44`;
        }
      }
    });
  });

  // Priority toggle in task modal
  overlay.querySelectorAll('#modal-task-priority [data-priority]').forEach(el => {
    el.addEventListener('click', () => {
      overlay.querySelectorAll('#modal-task-priority [data-priority]').forEach(p => p.classList.remove('selected'));
      el.classList.add('selected');
      selectedPriority = parseInt(el.dataset.priority);
    });
  });

  // Delete
  document.getElementById('modal-delete')?.addEventListener('click', async () => {
    if (state.modalOpen === 'editList' && state.modalData) {
      const tasks = state.tasks.filter(t => t.listId === state.modalData.id);
      for (const task of tasks) {
        task.listId = 'inbox';
        await dbUpdate('tasks', task);
      }
      await dbDelete('lists', state.modalData.id);
      setState({
        lists: await dbGetAll('lists'),
        tasks: await dbGetAll('tasks'),
        currentView: 'inbox',
        currentListId: 'inbox'
      });
    } else if (state.modalOpen === 'editHabit' && state.modalData) {
      await dbDelete('habits', state.modalData.id);
      setState({ habits: await dbGetAll('habits') });
    } else if (state.modalOpen === 'editTag' && state.modalData) {
      const tagId = state.modalData.id;
      // Remove tag from all tasks that reference it
      const tasksWithTag = state.tasks.filter(t => (t.tags || []).includes(tagId));
      for (const task of tasksWithTag) {
        task.tags = task.tags.filter(id => id !== tagId);
        await dbUpdate('tasks', task);
      }
      await dbDelete('tags', tagId);
      setState({
        tags: await dbGetAll('tags'),
        tasks: await dbGetAll('tasks'),
        ...(state.currentView === 'tag:' + tagId ? { currentView: 'inbox', currentListId: 'inbox' } : {})
      });
    } else if (state.modalOpen === 'editKanbanColumn' && state.modalData) {
      const { listId, column } = state.modalData;
      if (listId === 'all') {
        // Delete from all lists
        for (const list of state.lists) {
          if (list.kanbanColumns) {
            list.kanbanColumns = list.kanbanColumns.filter(c => c.id !== column.id);
            await dbUpdate('lists', list);
          }
        }
        // Move affected tasks to 'todo'
        const affectedTasks = state.tasks.filter(t => t.kanbanStatus === column.id);
        for (const task of affectedTasks) {
          task.kanbanStatus = 'todo';
          await dbUpdate('tasks', task);
        }
        setState({ lists: await dbGetAll('lists'), tasks: await dbGetAll('tasks') });
      } else {
        const list = state.lists.find(l => l.id === listId);
        if (list && list.kanbanColumns) {
          list.kanbanColumns = list.kanbanColumns.filter(c => c.id !== column.id);

          // Move tasks to default 'todo' column if their column is deleted
          const tasks = state.tasks.filter(t => t.listId === listId && t.kanbanStatus === column.id);
          for (const task of tasks) {
            task.kanbanStatus = 'todo';
            await dbUpdate('tasks', task);
          }

          await dbUpdate('lists', list);
          setState({ lists: await dbGetAll('lists'), tasks: await dbGetAll('tasks') });
        }
      }
    }
    closeModal();
  });

  // Save
  document.getElementById('modal-save')?.addEventListener('click', async () => {
    switch (state.modalOpen) {
      case 'addList':
      case 'editList': {
        const name = document.getElementById('modal-list-name')?.value.trim();
        if (!name) return;
        const folderId = document.getElementById('modal-list-folder')?.value || null;
        const type = document.getElementById('modal-list-type')?.value || 'tasks';

        if (state.modalOpen === 'editList' && state.modalData) {
          state.modalData.name = name;
          state.modalData.color = selectedColor;
          state.modalData.emoji = selectedEmoji;
          state.modalData.folderId = folderId;
          state.modalData.type = type;
          await dbUpdate('lists', state.modalData);
        } else {
          // Inherit global columns: columns that appear in ALL existing user lists
          let inheritedColumns = null;
          const userLists = state.lists.filter(l => !l.isDefault);
          if (userLists.length > 0) {
            // Find columns present in ALL user lists
            const firstListCols = (userLists[0].kanbanColumns || []).map(c => c.id);
            const globalCols = firstListCols.filter(colId =>
              userLists.every(l => (l.kanbanColumns || []).some(c => c.id === colId))
            );
            if (globalCols.length > 0) {
              // Build column objects from first list
              inheritedColumns = (userLists[0].kanbanColumns || [])
                .filter(c => globalCols.includes(c.id))
                .map(c => ({ ...c }));
            }
          }
          if (!inheritedColumns) {
            inheritedColumns = [
              { id: 'todo', title: 'A Fazer', color: '#6b7280', order: 0 },
              { id: 'doing', title: 'Em Progresso', color: '#4772fa', order: 1 },
              { id: 'done', title: 'Concluído', color: '#52c41a', order: 2 }
            ];
          }
          await dbAdd('lists', {
            name,
            color: selectedColor,
            emoji: selectedEmoji,
            folderId,
            type,
            kanbanColumns: inheritedColumns,
            sortOrder: state.lists.length,
            isDefault: false
          });
        }
        setState({ lists: await dbGetAll('lists') });
        break;
      }

      case 'addFolder': {
        const name = document.getElementById('modal-folder-name')?.value.trim();
        if (!name) return;
        await dbAdd('folders', {
          name,
          isExpanded: true,
          sortOrder: state.folders.length
        });
        setState({ folders: await dbGetAll('folders') });
        break;
      }

      case 'addTask': {
        const title = document.getElementById('modal-task-title')?.value.trim();
        if (!title) return;
        const desc = document.getElementById('modal-task-desc')?.value.trim() || '';
        const listId = document.getElementById('modal-task-list')?.value || 'inbox';
        const dueDate = document.getElementById('modal-task-date')?.value || null;
        const startTime = document.getElementById('modal-task-start-time')?.value || null;
        const durationValue = document.getElementById('modal-task-duration')?.value;
        const duration = durationValue ? parseInt(durationValue) : null;

        await dbAdd('tasks', {
          title,
          description: desc,
          listId,
          priority: selectedPriority,
          dueDate,
          startTime,
          duration,
          tags: selectedTags,
          subtasks: [],
          isCompleted: false,
          completedAt: null,
          isRecurring: false,
          recurRule: null,
          sortOrder: state.tasks.length
        });
        setState({ tasks: await dbGetAll('tasks') });
        break;
      }

      case 'addTag': {
        const name = document.getElementById('modal-tag-name')?.value.trim();
        if (!name) return;
        await dbAdd('tags', { name, color: selectedColor });
        setState({ tags: await dbGetAll('tags') });
        break;
      }

      case 'editTag': {
        const name = document.getElementById('modal-tag-name')?.value.trim();
        if (!name || !state.modalData) return;
        state.modalData.name = name;
        state.modalData.color = selectedColor;
        await dbUpdate('tags', state.modalData);
        setState({ tags: await dbGetAll('tags') });
        break;
      }

      case 'addHabit':
      case 'editHabit': {
        const name = document.getElementById('modal-habit-name')?.value.trim();
        if (!name) return;
        const frequency = document.getElementById('modal-habit-frequency')?.value || 'daily';
        const notificationTime = document.getElementById('modal-habit-time')?.value || null;
        const showInCalendar = document.getElementById('modal-habit-calendar')?.checked ?? true;
        const goalCount = parseInt(document.getElementById('modal-habit-goal-count')?.value || 1) || 1;

        if (state.modalOpen === 'editHabit' && state.modalData) {
          state.modalData.name = name;
          state.modalData.icon = selectedEmoji || '💪';
          state.modalData.color = selectedColor;
          state.modalData.frequency = frequency;
          state.modalData.frequencyDays = selectedHabitDays;
          state.modalData.notificationTime = notificationTime;
          state.modalData.showInCalendar = showInCalendar;
          state.modalData.goalCount = goalCount;
          await dbUpdate('habits', state.modalData);
        } else {
          await dbAdd('habits', {
            name,
            icon: selectedEmoji || '💪',
            color: selectedColor,
            frequency,
            frequencyDays: selectedHabitDays,
            notificationTime,
            showInCalendar,
            goalCount,
            sortOrder: state.habits.length
          });
        }
        setState({ habits: await dbGetAll('habits') });
        break;
      }

      case 'addKanbanColumn':
      case 'editKanbanColumn': {
        const title = document.getElementById('modal-kanban-col-name')?.value.trim();
        if (!title) return;
        if (!state.modalData) return;
        const { listId, column } = state.modalData;

        if (listId === 'all') {
          // Global operation: add/edit column across ALL lists
          const newId = state.modalOpen === 'addKanbanColumn'
            ? title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now()
            : column.id;

          for (const list of state.lists) {
            if (!list.kanbanColumns) {
              list.kanbanColumns = [
                { id: 'todo', title: 'A Fazer', color: '#6b7280', order: 0 },
                { id: 'doing', title: 'Em Progresso', color: '#4772fa', order: 1 },
                { id: 'done', title: 'Concluído', color: '#52c41a', order: 2 }
              ];
            }
            if (state.modalOpen === 'editKanbanColumn') {
              const colIndex = list.kanbanColumns.findIndex(c => c.id === newId);
              if (colIndex >= 0) {
                list.kanbanColumns[colIndex].title = title;
                list.kanbanColumns[colIndex].color = selectedColor;
              }
            } else {
              // Add new column if not already present
              if (!list.kanbanColumns.find(c => c.id === newId)) {
                list.kanbanColumns.push({
                  id: newId,
                  title,
                  color: selectedColor,
                  order: list.kanbanColumns.length
                });
              }
            }
            await dbUpdate('lists', list);
          }
        } else {
          const list = state.lists.find(l => l.id === listId);
          if (list) {
            if (!list.kanbanColumns) {
              list.kanbanColumns = [];
            }
            if (state.modalOpen === 'editKanbanColumn') {
              const colIndex = list.kanbanColumns.findIndex(c => c.id === column.id);
              if (colIndex >= 0) {
                list.kanbanColumns[colIndex].title = title;
                list.kanbanColumns[colIndex].color = selectedColor;
              }
            } else {
              const newId = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now();
              list.kanbanColumns.push({
                id: newId,
                title,
                color: selectedColor,
                order: list.kanbanColumns.length
              });
            }
            await dbUpdate('lists', list);
          }
        }
        setState({ lists: await dbGetAll('lists') });
        break;
      }
    }

    closeModal();
  });

  // Enter key to submit
  overlay.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('modal-save')?.click();
      }
    });
  });
}

function closeModal() {
  setState({ modalOpen: null, modalData: null });
}

function initModal() {
  subscribe('modalOpen', () => {
    renderModal();
  });
}

export { renderModal, initModal, closeModal };
