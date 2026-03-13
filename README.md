# TaskFlow — Gerenciador de Tarefas

Uma aplicação web completa e offline-first para gerenciamento de tarefas, inspirada no TickTick. Desenvolvida com vanilla JavaScript + IndexedDB, sem dependências externas.

## ✨ Funcionalidades

- ✅ **Gerenciamento de Tarefas** — Criar, editar, deletar tarefas com prioridades
- 📅 **Calendário** — Visualizar tarefas por data
- 🎯 **Matriz de Eisenhower** — Priorizar tarefas por urgência/importância
- 📊 **Kanban** — Organizar tarefas em colunas customizáveis
- 🍅 **Pomodoro** — Técnica de trabalho com timer integrado
- 📈 **Hábitos** — Rastrear hábitos diários com estatísticas
- 🏷️ **Tags** — Categorizar tarefas por tags
- 📁 **Pastas** — Organizar listas em pastas
- 💾 **Backup Local** — Exportar/importar dados em JSON
- 🌙 **Tema Claro/Escuro** — Alternar entre temas
- 📱 **Responsivo** — Funciona em desktop, tablet e mobile
- 🔒 **Offline-First** — Todos os dados salvos localmente no navegador (IndexedDB)

## 🚀 Como Usar

### Desenvolvimento

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/taskflow.git
cd taskflow
```

2. Abra `index.html` em um navegador (requer suporte a ES6 modules)
   - Recomendado: Live Server extension (VS Code) ou qualquer servidor HTTP local
   - Não funciona com `file://` protocolo (CORS restrictions)

### Produção

Use o arquivo `TaskFlow.html` — é uma versão auto-contida de 251KB com:
- Todos os CSS consolidados
- Todos os JS consolidados em IIFE
- Sem dependências externas
- Seguro para HTML offline

**Como usar:**
1. Baixe `TaskFlow.html`
2. Abra em qualquer navegador moderno
3. Nenhuma instalação necessária

## 🏗️ Arquitetura

```
taskflow/
├── index.html              # HTML com módulos ES6
├── TaskFlow.html           # Versão auto-contida (produção)
├── build.js                # Script que gera TaskFlow.html
├── package.json            # Dependências (apenas dev)
├── CLAUDE.md               # Documentação técnica completa
│
├── js/                     # JavaScript modular (ES6)
│   ├── app.js              # Inicialização do app
│   ├── store.js            # Pub/Sub state management
│   ├── db.js               # IndexedDB wrapper
│   ├── utils/
│   │   ├── date.js
│   │   ├── icons.js
│   │   ├── theme.js
│   │   └── shortcuts.js
│   └── components/
│       ├── taskList.js
│       ├── taskDetail.js
│       ├── calendar.js
│       ├── kanban.js
│       ├── pomodoro.js
│       ├── habits.js
│       ├── sidebar.js
│       ├── header.js
│       ├── modal.js
│       ├── stats.js
│       └── eisenhower.js
│
├── css/                    # Estilos (CSS puro, sem preprocessadores)
│   ├── variables.css       # Temas e cores
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── task.css
│   ├── calendar.css
│   ├── kanban.css
│   ├── pomodoro.css
│   ├── habits.css
│   ├── stats.css
│   └── eisenhower.css
│
└── CLAUDE.md               # Documentação (70+ features, schema, bugs, history)
```

## 🔐 Segurança

- **XSS Prevention** — HTML escaping em todos os pontos de inserção
- **CSP (Content Security Policy)** — Bloqueia execução de scripts externos
- **Input Validation** — Validação de tipo + regex em imports
- **No Network** — `connect-src 'none'` — dados nunca saem do navegador
- **Prototype Pollution Protection** — Validadores bloqueiam `__proto__`

[Ver VAT_REPORT.md para análise completa de segurança]

## 📦 Banco de Dados (IndexedDB)

Schema com 8 object stores:

```javascript
{
  tasks: { keyPath: 'id', indexes: ['listId', 'dueDate', 'isCompleted', 'priority'] },
  lists: { keyPath: 'id', indexes: ['folderId'] },
  folders: { keyPath: 'id', indexes: ['sortOrder'] },
  tags: { keyPath: 'id', indexes: ['name'] },
  habits: { keyPath: 'id', indexes: ['sortOrder'] },
  habitLogs: { keyPath: 'id', indexes: ['habitId', 'date'] },
  pomodoroSessions: { keyPath: 'id', indexes: ['taskId', 'date'] },
  settings: { keyPath: 'key' }
}
```

## 🔨 Build & Deploy

### Regenerar TaskFlow.html após mudanças

```bash
npm install  # Apenas para Node.js (build.js é standalone)
node build.js
```

Gera `TaskFlow.html` (251KB) com todos os CSS e JS consolidados.

### Deploy no GitHub Pages

1. Abra as configurações do repositório no GitHub
2. Vá para **Settings → Pages**
3. **Source** → Selecione `main` branch
4. **Folder** → Selecione `/ (root)`
5. Clique **Save**

Seu site estará disponível em: `https://seu-usuario.github.io/taskflow/`

**Adicionar TaskFlow.html ao Pages:**
- Renomeie para `index.html` (opcional, para acesso via raiz)
- Ou mantenha como `TaskFlow.html` e acesse via `https://seu-usuario.github.io/taskflow/TaskFlow.html`

Mais info: https://docs.github.com/en/pages/getting-started-with-github-pages

## 🧪 Testes de Compatibilidade

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ IE 11 — Não suportado (sem Promise/async-await/IndexedDB)

## 📝 Licença

MIT License — Use livremente em projetos pessoais ou comerciais

## 🤝 Contribuições

Encontrou um bug? Abra uma issue no GitHub!

---

**Desenvolvido com ❤️ usando vanilla JavaScript**
