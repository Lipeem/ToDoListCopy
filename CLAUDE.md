# TaskFlow — Documentação Compilada Completa

**Última atualização:** 13 de março de 2026
**Status:** Em desenvolvimento ativo — Versão 1.2 (Session 3)
**Autor:** Desenvolvedor principal + Claude AI

---

## 📋 Índice

1. [Visão Geral do Projeto](#visão-geral)
2. [Arquitetura Técnica](#arquitetura-técnica)
3. [Estrutura de Arquivos](#estrutura-de-arquivos)
4. [Como Funciona](#como-funciona)
5. [Funcionalidades Implementadas](#funcionalidades-implementadas)
6. [Funcionalidades Pendentes](#funcionalidades-pendentes)
7. [Guia de Desenvolvimento](#guia-de-desenvolvimento)
8. [Build & Deployment](#build--deployment)
9. [Histórico de Sessões](#histórico-de-sessões)
10. [Bugs Conhecidos & Correções](#bugs-conhecidos--correções)

---

## Visão Geral

### O que é TaskFlow?

**TaskFlow** é um gerenciador de tarefas portátil, offline-first e com zero dependências externas, inspirado no TickTick. É um **aplicativo web único em um arquivo HTML** que funciona completamente no navegador.

**Principais características:**
- ✅ **100% Portável**: Um único arquivo `.html` que funciona em qualquer navegador, em qualquer computador
- ✅ **Offline**: Dados armazenados localmente em IndexedDB (no seu computador, nunca na nuvem)
- ✅ **Zero Dependências**: Nenhuma dependência de biblioteca externa de UI/CSS (CSS puro, vanilla JS)
- ✅ **Rápido**: Renderização instantânea, sem servidor
- ✅ **Privado**: Nenhum dado sai do seu navegador

### Propósito

O objetivo original era criar uma alternativa ao TickTick que fosse:
1. Totalmente offline e portátil (funcionar em pen drive ou qualquer lugar)
2. Leve e rápido (sem frameworks pesados)
3. Funcional com todas as features do TickTick que o usuário precisa

---

## Arquitetura Técnica

### Padrão de Arquitetura

```
┌─────────────────────────────────────────┐
│       TaskFlow.html (Single File)       │  ← Saída final (244 KB)
│   (Consolidado via build.js)            │
└─────────────────────────────────────────┘
            ↑
            │ build.js consolida
            │ (wraps in IIFE)
            │
┌─────────────────────────────────────────┐
│  Fonte Modular (JS/CSS separados)       │
├─────────────────────────────────────────┤
│ js/                                     │
│  ├── app.js (entry point)               │
│  ├── store.js (Pub/Sub state mgmt)      │
│  ├── db.js (IndexedDB wrapper)          │
│  ├── components/                        │
│  │   ├── header.js                      │
│  │   ├── sidebar.js                     │
│  │   ├── taskList.js                    │
│  │   ├── taskDetail.js                  │
│  │   ├── modal.js                       │
│  │   ├── calendar.js                    │
│  │   ├── kanban.js                      │
│  │   ├── pomodoro.js                    │
│  │   ├── eisenhower.js                  │
│  │   ├── habits.js                      │
│  │   └── stats.js                       │
│  └── utils/                             │
│      ├── date.js (date utilities)       │
│      ├── icons.js (SVG icons)           │
│      ├── shortcuts.js (keyboard)        │
│      └── theme.js (dark mode)           │
│                                         │
│ css/                                    │
│  ├── variables.css (design tokens)      │
│  ├── base.css                           │
│  ├── layout.css                         │
│  ├── components.css                     │
│  ├── task.css                           │
│  ├── calendar.css                       │
│  ├── kanban.css                         │
│  ├── pomodoro.css                       │
│  ├── habits.css                         │
│  ├── stats.css                          │
│  ├── eisenhower.css                     │
│  └── ...                                │
└─────────────────────────────────────────┘
```

### Stack Técnico

| Componente | Tecnologia |
|-----------|-----------|
| **Database** | IndexedDB (browser native) |
| **State Management** | Pub/Sub (custom store.js) |
| **UI Rendering** | Vanilla JS (innerHTML) |
| **CSS** | Vanilla CSS (custom properties) |
| **Build** | Node.js script (build.js) |
| **Package Manager** | npm |

### Padrões Principais

#### 1. **Pub/Sub Reactive State** (`js/store.js`)
```javascript
// Initialize
const initialState = { tasks: [], lists: [], ... };

// Subscribe to changes
subscribe('tasks', (newTasks) => {
  renderTaskList(newTasks);
});

// Update state
setState({ tasks: updatedTasks });
```

#### 2. **IndexedDB Wrapper** (`js/db.js`)
```javascript
// 8 object stores
const stores = [
  'tasks', 'lists', 'folders', 'tags',
  'habits', 'habitLogs', 'pomodoroSessions', 'settings'
];

// CRUD operations
await dbAdd('tasks', taskObj);
await dbUpdate('tasks', taskObj);
await dbDelete('tasks', taskId);
const allTasks = await dbGetAll('tasks');
const task = await dbGet('tasks', taskId);
```

#### 3. **Component Architecture**
Cada componente segue este padrão:
```javascript
// 1. HTML template function
function renderComponentName() { return `<html>...`; }

// 2. Event binding function
function bindComponentNameEvents() { /* listeners */ }

// 3. Init/subscribe function
function initComponentName() {
  subscribe('stateKey', () => renderComponentName());
  bindComponentNameEvents();
}

// 4. Export
export { renderComponentName, initComponentName };
```

#### 4. **Build Process** (`build.js`)
- Lê arquivos CSS em ordem específica
- Lê arquivos JS em ordem específica
- Remove `import`/`export` statements
- Envolve tudo em um IIFE: `(function() { /* código */ })()`
- Injeta na tag `<script>` do `index.html`
- Sai `TaskFlow.html` (244 KB, totalmente self-contained)

---

## Estrutura de Arquivos

### Pasta Raiz
```
.
├── TaskFlow.html              ← APP COMPILADA (use isso)
├── build.js                   ← Build script
├── index.html                 ← Template HTML base
├── package.json               ← Dependencies (npm)
├── js/                        ← Código JS modular
├── css/                       ← Estilos CSS modular
├── .claude/                   ← Claude Code local settings
└── [DESNECESSÁRIOS - ver abaixo]
```

### IndexedDB Schema

**Object Stores (8 total):**

1. **tasks**
   ```javascript
   {
     id: 'task_xxx',
     title: string,
     description: string,
     listId: string,          // 'inbox' | list.id
     priority: 0-3,           // 0=none, 1=low, 2=medium, 3=high
     dueDate: 'YYYY-MM-DD',   // nullable
     startTime: 'HH:MM',      // nullable
     duration: number,        // minutes, nullable
     tags: [tagId, ...],
     subtasks: [{id, title, completed}, ...],
     isCompleted: boolean,
     completedAt: ISO8601,    // nullable
     isCanceled: boolean,
     isRecurring: boolean,
     recurRule: 'daily'|'weekly'|'monthly'|'yearly'|null,
     kanbanStatus: string,    // 'todo'|'doing'|'done' or custom column id
     sortOrder: number,
     createdAt: ISO8601
   }
   ```

2. **lists**
   ```javascript
   {
     id: string,
     name: string,
     color: '#hex',
     emoji: string,           // single emoji
     folderId: string|null,   // null = no folder
     type: 'tasks'|'notes',   // 'notes' hides checkboxes
     kanbanColumns: [{id, title, color, order}, ...],
     sortOrder: number,
     isDefault: boolean
   }
   ```

3. **folders**
   ```javascript
   {
     id: string,
     name: string,
     isExpanded: boolean,
     sortOrder: number
   }
   ```

4. **tags**
   ```javascript
   {
     id: string,
     name: string,
     color: '#hex'
   }
   ```

5. **habits**
   ```javascript
   {
     id: string,
     name: string,
     icon: string,            // emoji
     color: '#hex',
     frequency: 'daily'|'weekly'|'custom',
     frequencyDays: [0-6, ...],  // 0=Sunday, 6=Saturday
     notificationTime: 'HH:MM',
     showInCalendar: boolean,
     goalCount: number,       // >1 for "drink 3 glasses of water"
     sortOrder: number,
     createdAt: ISO8601
   }
   ```

6. **habitLogs**
   ```javascript
   {
     id: string,
     habitId: string,
     date: 'YYYY-MM-DD',
     completed: boolean,
     currentProgress: number  // for goalCount > 1
   }
   ```

7. **pomodoroSessions**
   ```javascript
   {
     id: string,
     taskId: string|null,
     startedAt: ISO8601,
     duration: number,        // seconds
     wasCompleted: boolean
   }
   ```

8. **settings**
   ```javascript
   {
     key: string,
     value: any
   }
   ```

---

## Como Funciona

### Fluxo de Dados

1. **Usuário interage** com UI (clica botão, digita, etc)
2. **Event listener** dispara (definido em `bind*Events()`)
3. **Async operation** (IndexedDB: `dbAdd`, `dbUpdate`, etc)
4. **State update** via `setState({ key: value })`
5. **Subscribers** são notificados (definidos em `init*()`)
6. **Re-render** do componente afetado (via `render*()`)
7. **DOM atualizado** (innerHTML)

**Exemplo: Criar uma tarefa**
```
User clicks "+" button
→ Opens addTask modal
→ User fills form & clicks save
→ bindModalEvents gets form values
→ dbAdd('tasks', newTask)
→ taskArray = dbGetAll('tasks')
→ setState({ tasks: taskArray })
→ taskList subscriber fires
→ renderTaskList() called
→ DOM updated
→ Modal closes
```

### Persistência de Dados

- **IndexedDB**: Todos os dados ficam no `localStorage` do navegador (no disco do seu PC)
- **Exportação**: Usuário pode baixar JSON via botão "Download JSON" (backup)
- **Importação**: Usuário pode carregar JSON anterior via botão "Upload JSON" (restore)
- **Sincronização**: NÃO existe sincronização entre múltiplos navegadores/PCs (by design - offline first)

### Portabilidade

```
TaskFlow.html em Pendrive A + Computador B
→ Abrir em Firefox
→ Dados salvos em: ~/.mozilla/firefox/[profile]/storage/default/file://...
→ Transportar TaskFlow.html para Pendrive B + Computador C
→ Abrir em Edge
→ Novos dados salvos em: %APPDATA%/Microsoft/Edge/User Data/Default/...
→ Tarefas do Computador B NÃO aparecem (isolamento por navegador + máquina)
```

---

## Funcionalidades Implementadas

### Core (Session 1-3)
- [x] **Caixa de Entrada & Listas** - CRUD de listas com cores, emojis, tipos (tarefas/notas)
- [x] **Pastas** - Agrupar listas em pastas expansíveis
- [x] **Tags** - Criar, atribuir e visualizar tarefas por tag (+ **Session 3**: editar/deletar tags)
- [x] **Tarefas** - Criar, editar, completar, cancelar, ordenar, subtarefas
- [x] **Prioridades** - Nenhuma, Baixa, Média, Alta
- [x] **Datas** - Due date, start time, duration; rollover automático de atrasadas
- [x] **NLP para Datas** - Extrai "amanhã", "segunda" do título
- [x] **Dark Mode** - Toggle via header

### Visualizações (Session 1-3)
- [x] **Lista de Tarefas** - Filtrável por (Inbox/Today/Tomorrow/Next 7 days)
- [x] **Calendário** - Visão mensal + semanal; filtro por lista (Session 3)
- [x] **Kanban** - Colunas customizáveis (to-do, doing, done); arrastar/soltar tasks
- [x] **Matriz de Eisenhower** - Grid 2x2 por prioridade; filtro por lista (Session 3)

### Produtividade (Session 1-3)
- [x] **Pomodoro Timer** - 25min foco, 5min pausa; sons; task linking; duração customizável (Session 2)
- [x] **Rastreador de Hábitos** - Diário/semanal; metas de contagem (ex: 3 copos d'água); calendário; stats
- [x] **Estatísticas** - Gráficos de conclusão, sessões de foco, tarefas por lista

### UX/Detalhes (Session 1-3)
- [x] **Detalhes da Tarefa** - Panel lateral; título, desc, subtarefas, tags, prioridade, datas
- [x] **Modal de Atalho Global** - `Ctrl+Shift+A` cria tarefa de qualquer lugar
- [x] **Atalhos de Teclado** - `N` (nova), `Ctrl+B` (toggle sidebar), `Esc` (fechar modal/detail)
- [x] **Export/Import JSON** - Backup e restore completo dos dados
- [x] **Responsivo** - Layout funciona em mobile (não totalmente otimizado, mas viável)
- [x] **Tema Claro/Escuro** - Toggle automático ou manual

### Session 3 Específico
- [x] **Bug fix: Infinite loading** - taskDetail.js estava truncado
- [x] **Bug fix: Task typing freeze** - Agora salva em `blur` não em debounce
- [x] **Bug fix: Tag edit/delete** - Context menu para editar/deletar tags
- [x] **Bug fix: List reorder** - Drag-and-drop para reordenar listas (mesma pasta)
- [x] **Eisenhower list filter** - Dropdown de filtro por lista
- [x] **Calendar list filter** - Dropdown de filtro por lista
- [x] **Pomodoro task selector** - Dropdown para escolher tarefa
- [x] **Pomodoro duration settings** - Modal customizável (work, short break, long break, sessions before long)

---

## Funcionalidades Pendentes

### Alto Prioridade

**1. Markdown na Descrição de Tarefas**
- Renderizar **bold**, *italic*, `code`, # headers, lists, line breaks
- Edit/Preview toggle buttons
- No `taskDetail.js`

**2. Duplicar Tarefa**
- Botão "⧉ Duplicar" em `taskDetail.js`
- Cria nova tarefa com valores copiados

**3. Kanban Melhorias**
- ✅ FEITO: Bug de tarefas desaparecendo após edição de coluna
- ✅ FEITO: Filtro por lista no header kanban
- ✅ FEITO: Destaque de lista no sidebar quando em kanban
- ✅ PENDENTE: Permitir reordenar DENTRO de coluna (drag between columns vs within column)

**4. Calendar Melhorias**
- ✅ FEITO: List filter dropdown
- ✅ PENDENTE: Tag filter dropdown
- ✅ PENDENTE: Chips com mais detalhes (tag dots + comment icon)
- ✅ PENDENTE: Inbox color = gray (não mais default color)

**5. Sidebar Melhorias**
- ✅ FEITO: Kanban como nav item global (como Calendar, Pomodoro)
- ✅ PENDENTE: Botão "Limpar Todas as Tarefas" com double-confirmation
- ✅ FEITO: Tag edit/delete via context menu
- ✅ FEITO: List drag-and-drop reorder

### Médio Prioridade

**1. Recorrência Baseada em Conclusão** (`recurType: 'after_completion'`)
- Quando marcar completa, próxima data = hoje + recurInterval
- Atualmente só suporta datas fixas

**2. Melhorias de Performance**
- Batch state updates (não re-renderizar a cada dbUpdate)
- Debounce render calls

**3. Melhorias de Estilo**
- Animações suaves entre visualizações
- Polish no responsivo mobile

### Baixo Prioridade

**1. Cloud Sync** (complexo, quebra filosofia offline)
- Integrar com Firebase ou similar?
- Sync entre navegadores/máquinas?
- Provavelmente NOT DO (perde o ponto de offline-first)

**2. Offline Notifications**
- Service Worker para background notifications
- Difícil sem servidor

---

## Guia de Desenvolvimento

### Setup Local

```bash
# 1. Clone ou tenha a pasta
cd "C:\Users\estra\Documents\Aplicativos Tarefas v.1.2"

# 2. Instale dependências (só nodejs, nenhuma lib)
npm install

# 3. Abra em navegador (desenvolvimento)
# Opção A: Abra index.html diretamente
# Opção B: Use live reload (ex: VSCode Live Server)
```

### Modificar Código Fonte

**NÃO edite TaskFlow.html diretamente!**
**Sempre edite os arquivos em `js/` e `css/`**, depois rode build.

```bash
# Edite arquivos em js/ e css/

# Depois gere TaskFlow.html
node build.js

# Teste em navegador
# (abra TaskFlow.html ou refreshe)
```

### Estrutura de um Novo Componente

1. Criar arquivo: `js/components/myComponent.js`
2. Seguir padrão (render → bind → init)
3. Adicionar CSS: `css/myComponent.css`
4. Registrar em `build.js` (arrays de jsFiles e cssFiles)
5. Importar e chamar `initMyComponent()` em `app.js`
6. Rodar `node build.js`

### Debug

```javascript
// No console do navegador (F12):

// Ver estado atual
state

// Ver todos os dados do IndexedDB
dbGetAll('tasks').then(console.log)

// Limpar dados (cuidado!)
dbClear('tasks')  // PRECISA estar exportado em db.js

// Simular estado (manual test)
setState({ currentView: 'list:inbox' })
```

### Boas Práticas

1. **Sempre use `setState()` para atualizar**, nunca mute `state` diretamente
2. **Sempre `await` operações de IndexedDB**, elas são assíncronas
3. **Unsubscribe não é necessário**, components são destruídos/criados via re-render
4. **Use template literals** para HTML, não concatenação
5. **Evite `document.querySelector` global**, use `overlay.querySelector` para escopo
6. **Cache referências DOM** se usar múltiplas vezes
7. **Nomeie funções bem**: `renderX()`, `bindXEvents()`, `initX()`

---

## Build & Deployment

### Como Funciona o Build

`build.js` faz:

1. Lê `index.html` (template base)
2. Concatena CSS em ordem: variables, base, layout, components, task, ...
3. Concatena JS em ordem: db, store, utils, components, app
4. Remove `import`/`export` statements (via regex)
5. Envolve em IIFE: `(function() { ... })()`
6. Injeta `<style>` com CSS e `<script>` com JS
7. Salva como `TaskFlow.html` (244 KB)

### Deploy

```bash
# 1. Desenvolva em js/ e css/

# 2. Teste localmente
node build.js
# Abra TaskFlow.html no navegador

# 3. Distribuir
# Copie APENAS TaskFlow.html para:
# - Pen drive
# - Email
# - Google Drive
# - GitHub Releases
# - Seu site
#
# Ninguém precisa de js/, css/, node_modules/

# 4. Usuário final
# Baixa TaskFlow.html
# Clica 2x ou abre com navegador
# Pronto!
```

---

## Histórico de Sessões

### Session 1 (Inicial)
- Análise completa do projeto desatualizado
- Eisenhower Matrix implementado
- Pomodoro task linking adicionado
- Build.js corrigido (faltavam eisenhower files)

### Session 2
- Pomodoro duration settings implementado
- Calendar list filter dropdown
- Eisenhower list filter dropdown
- Investigação de ERR_TOO_MANY_REDIRECTS (não era problema do app)

### Session 3 (Atual)
- **Critical**: Resolvido infinite loading (taskDetail.js truncado)
- **UX**: Description/title agora salvam em blur (não debounce)
- **Tags**: Editar e deletar via context menu
- **Lists**: Drag-and-drop para reordenar
- **Refactoring**: Consolidação de documentação

---

## Bugs Conhecidos & Correções

### ✅ CORRIGIDOS (Session 3)

| Bug | Causa | Solução |
|-----|-------|---------|
| Infinite loading screen | taskDetail.js truncado mid-função | Completou `handleRecurrence()` |
| Description desabilita após save | Debounce + setState trigger re-render | Mudou para save on `blur` |
| Tags sem editar/deletar | Modal não tinha `editTag` case | Adicionou context menu + modal |
| Lists não reordenáveis | Sem drag-and-drop | Implementou drag listeners |

### ⚠️ CONHECIDOS (A Verificar/Corrigir)

**De Bug Report (Explore Agent):**

1. **taskDetail.js - Subtask toggle sem null check** (Line 376)
   - Acessa `task.subtasks[idx]` sem validar
   - Risco: crash se subtasks = undefined
   - Fix: Add `if (task.subtasks && idx >= 0 && idx < task.subtasks.length)`

2. **modal.js - Destructure sem guard** (Line 680)
   - `const { listId, column } = state.modalData` sem checar existência
   - Fix: `if (!state.modalData) return;`

3. **taskDetail.js - Missing null check (Line 278)**
   - Canceled tasks marcadas com `completedAt` confunde UI
   - Fix: Use `canceledAt` field ou não set `completedAt`

4. **sidebar.js - Race condition in file import** (Line 270)
   - Múltiplos imports simultâneos podem corromper dados
   - Fix: Add `importInProgress` flag

5. **db.js - ID generation collision risk** (Line 55)
   - `generateId()` usa `Date.now().toString(36)`, pode colidir
   - Fix: Usar UUID ou aumentar entropia

6. **taskList.js - sortOrder não é único** (Line 281)
   - Usa `state.tasks.length` para novo sortOrder, ignora deletados
   - Fix: Usar `max(sortOrder) + 1`

### 🔧 TODO: Bugs a Investigar

- [ ] Certificar que `dbClear` está exportado em `db.js` (necessário para clear all tasks)
- [ ] Testar drag-and-drop de lista entre pastas (deve falhar com folderIdDrag check)
- [ ] Verificar se calendar tag filter estava pendente ou implementado
- [ ] Verificar inbox color em calendar

---

## Notas de Configuração

### Variáveis de Tema (`css/variables.css`)

```css
:root {
  --primary: #4772fa;           /* Cor primária (azul) */
  --bg-primary: #ffffff;        /* Fundo principal */
  --bg-secondary: #f5f5f5;      /* Fundo secundário */
  --text-primary: #333333;      /* Texto principal */
  --text-secondary: #666666;    /* Texto secundário */
  --text-tertiary: #999999;     /* Texto terciário */

  /* Prioridades */
  --priority-low: #52c41a;      /* Verde */
  --priority-medium: #faad14;   /* Laranja */
  --priority-high: #f5222d;     /* Vermelho */

  /* Outros */
  --border-color: #e0e0e0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --fs-sm: 12px;
  --fs-base: 14px;
  --fs-lg: 16px;
  --radius-md: 8px;
}
```

### Keyboard Shortcuts (`js/utils/shortcuts.js`)

- `N` — Nova tarefa
- `Ctrl+Shift+A` — Global quick add modal
- `Ctrl+B` — Toggle sidebar
- `Esc` — Fechar modal/detail panel
- (mais podem ser adicionados aqui)

---

## FAQ

**P: Por que usar IndexedDB e não localStorage?**
R: localStorage tem limite de ~5MB; IndexedDB suporta Gigabytes. Para app com muitas tarefas, IndexedDB é essencial.

**P: Posso sincronizar entre dois navegadores?**
R: Não (by design - offline first). Se quiser, você teria que:
1. Exportar JSON de um navegador
2. Importar JSON no outro
3. Resolver conflitos manualmente

**P: Quanto espaço ocupa no disco?**
R: Tarefas são texto, então ~100 bytes por tarefa em média. Mesmo 10.000 tarefas = ~1 MB.

**P: Funciona em mobile?**
R: Sim, mas layout não é otimizado. Design é desktop-first.

**P: Posso usar em produção?**
R: Sim! É estável, mas ainda está em desenvolvimento. Sempre faça backup (Download JSON).

---

## Contato & Suporte

- **Bugs**: Abra issue ou documente em `tarefas_pendentes.md`
- **Features**: Adicione à seção "Funcionalidades Pendentes"
- **Desenvolvimento**: Siga "Guia de Desenvolvimento" acima

---

**Status Final:** Pronto para desenvolvimento contínuo. Documentação compilada e atualizada. TaskFlow.html (244 KB) está sincronizado com código-fonte.
