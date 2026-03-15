# PLANO DE IMPLEMENTAÇÃO — Session 4 (v2 — atualizado)
**Data:** 15 de março de 2026
**Decisões de design incorporadas do usuário**

---

## 📋 RESUMO EXECUTIVO

| # | Item | Tipo | Prioridade | Estimativa |
|---|------|------|-----------|------------|
| BUG-01 | Pomodoro — task linking perdido | Bug Crítico | 🔴 | 1-2h |
| BUG-02 | Pomodoro — scroll corta página | Bug Médio | 🟠 | 30min |
| BUG-03 | Campo de busca desajustado | Bug Médio | 🟠 | 30min |
| BUG-04 | Kanban — bloqueia add/edit colunas em "Todas" | Bug Médio | 🟠 | 2-3h |
| BUG-05 | Kanban — colunas incompatíveis sem destaque | Bug Médio | 🟠 | 1-2h |
| FEAT-01 | Descrição: expansível + remover preview/edit | Feature | 🟡 | 1h |
| FEAT-02 | Janela flutuante draggable + transparência | Feature | 🟡 | 5-6h |
| FEAT-03 | Busca global potente | Feature | 🟡 | 3-4h |
| FEAT-04 | Lista "TUDO" — filtro por lista | Feature | 🟡 | 1h |
| FEAT-05 | Export com checksum de integridade | Feature (se viável) | 🟢 | 2h |
| **Total** | | | | **17-21h** |

---

## 🔴 BUG-01: Pomodoro — Task Linking perdido

**Causa provável:** O pomodoro.js tem o task selector (`pom-task-search`), mas o `pomodoroTaskId` pode não estar sendo preservado no state ao mudar de view.

**Investigar:** Se `state.pomodoroTaskId` é resetado em algum lugar.

**Solução confirmada:**
- Verificar se `initPomodoro()` subscreve corretamente às mudanças de state
- Garantir que o selector renderiza quando `focusedTask === null`
- Testar: selecionar tarefa → mudar de view → voltar → tarefa deve estar vinculada

---

## 🟠 BUG-02: Pomodoro — Scroll corta página

**Causa:** `.pomodoro-view` provavelmente tem `height: 100%` ou `overflow: hidden` hard-coded no CSS.

**Solução:**
- `css/pomodoro.css`: adicionar `overflow-y: auto` no `.pomodoro-view`
- Garantir que o container pai (`#task-list-content`) também passa o scroll para dentro

---

## 🟠 BUG-03: Campo de busca desajustado

**Investigar:** `sidebar.js` — onde o input de busca é renderizado e seu container.

**Solução:**
- Verificar se o `<input>` tem `width: 100%` e box-sizing correto
- Verificar se o container flex não está empurrando o elemento para fora

---

## 🟠 BUG-04 + BUG-05: Kanban — Colunas Incompatíveis

### Decisão do usuário: Listas independentes, mostrar incompatibilidade visualmente

**Lógica completa:**

**Cenário A — Visualizando "Todas as Listas" no Kanban:**
- Mostrar todas as colunas que existem em QUALQUER lista
- Coluna que NÃO existe em todas as listas aparece com `opacity: 0.5 + borda tracejada + tooltip "Esta coluna não existe em todas as listas"`
- Tarefas nessas colunas "fantasmas" aparecem normalmente (não bloquear)
- Permitir criar e editar colunas "globais" que serão adicionadas a TODAS as listas

**Cenário B — Visualizando uma lista específica:**
- Mostrar as colunas daquela lista
- Se uma tarefa foi movida para uma coluna que existe em "Todas" mas NÃO nessa lista → mostrar a coluna "fantasma" com destaque
- Tarefas nessa coluna fantasma continuam visíveis
- Usuário pode "adotar" a coluna fantasma (botão para adicionar à lista)

**Implementação em `kanban.js`:**
1. Criar `getGlobalColumns()` — union de todas as colunas de todas as listas
2. Criar `getIncompatibleColumns(listId)` — colunas em global que não estão na lista
3. Renderizar colunas incompatíveis com classe `kanban-col--ghost`
4. CSS: `.kanban-col--ghost { opacity: 0.5; border: 2px dashed var(--border-color); }`
5. Botão "✚ Adicionar esta coluna à lista" em colunas fantasmas
6. Desbloquear edição de colunas em "Todas as Listas" (remover guard que bloqueia)

**❓ Perguntas restantes para BUG-04/05:**
1. Ao criar uma coluna em "Todas as Listas", ela deve ser adicionada a **todas** as listas existentes automaticamente? Ou apenas às listas para as quais você vincular manualmente?
2. Ao criar uma coluna em "Todas as Listas" **depois** de criar uma lista nova, a nova lista herda essa coluna? (Onboarding de novas listas)

---

## 🟡 FEAT-01: Descrição Expansível

**O que muda:**
- Remover botões Preview/Edit (linhas 86-87 em `taskDetail.js`)
- Textarea com `resize: vertical`, `min-height: 80px`, `max-height: none` (sem limite superior)
- Auto-grow via JS ao digitar
- Salva on blur (já implementado)

**Markdown:** Já existe `renderMarkdown()`, mas sem os botões de toggle a renderização ficará no modo texto puro dentro da textarea. Isso é mais simples e funcional.

---

## 🟡 FEAT-02: Janela Flutuante Draggable + Transparência

### Escopo confirmado pelo usuário:
- ✅ Draggable (arrastar pela janela)
- ✅ Controle de transparência (slider)
- ✅ Para: Task Detail + Pomodoro

### Arquitetura proposta:

**Componente reutilizável `FloatingWindow`:**
```javascript
// Estado em `state`:
// floatingWindows: {
//   taskDetail: { open: false, x: 100, y: 100, opacity: 1.0 },
//   pomodoro:   { open: false, x: 200, y: 100, opacity: 1.0 }
// }
```

**UI:**
- Botão "⊡" no header do detail-panel para ativar modo flutuante
- Botão "⊡" no header do pomodoro para ativar modo flutuante
- Janela: `position: fixed`, `z-index: 1000`, `border-radius`, sombra
- Handle de drag: barra de título no topo da janela
- Slider de opacity: `<input type="range" min="20" max="100">` no canto da janela
- Botão X para fechar / botão ⊡ para voltar ao modo normal (dock)

**Drag implementation:**
```javascript
// Vanilla JS: mousedown + mousemove + mouseup
// Salva posição em state (não em DB — reseta ao recarregar)
// Ou salva em settings se quiser persistir posição
```

**❓ Perguntas sobre FEAT-02:**
1. Quando a janela flutuante está aberta, o painel lateral de detalhe da tarefa deve **fechar** (um só lugar) ou **permanecer aberto** (dois ao mesmo tempo)?
2. Ao recarregar a página, quer que a janela flutuante **lembre a posição** (salvar em settings) ou sempre **inicie no centro da tela**?
3. Quando o Pomodoro está em janela flutuante e você navega para outra view, o timer deve **continuar aparecendo** em tela (objetivo principal do float) ou é só para mudar o visual?

---

## 🟡 FEAT-03: Busca Global Potente

### Confirmado: busca conforme digita

**Funcionalidades:**
- Modal overlay (Ctrl+F ou ícone 🔍 no header)
- Busca simultânea em: título, descrição, tags, nome da lista
- Highlighting do termo no resultado
- Filtro rápido: Pendentes / Concluídas / Todas
- Ao clicar no resultado: abre task detail

**Score de relevância:**
- Match no título = peso 3
- Match na descrição = peso 1
- Match em tag = peso 2
- Ordenar por score decrescente

**Implementação:**
- Novo arquivo: `js/components/search.js`
- Novo arquivo: `css/search.css`
- Registrar em `build.js`
- Atalho `Ctrl+F` em `shortcuts.js`

---

## 🟡 FEAT-04: Lista "TUDO" — Filtro por Lista

**Simples** — reaproveitar `renderListFilterSelect()` já existente em `calendar.js`.

**Implementação em `taskList.js`:**
- Quando `view === 'all'`: renderizar o dropdown de filtro no header da lista
- Filtrar `state.tasks` pelo `listFilter` selecionado

---

## 🟢 FEAT-05: Export com Checksum de Integridade

### Decisão do usuário: Implementar apenas se for simples e não causar bugs

**Análise de viabilidade:** ✅ VIÁVEL e simples

**Como funciona:**
1. Ao **exportar**: gera hash SHA-256 do JSON usando `crypto.subtle.digest()`
2. Inclui `"_integrity": "sha256-<hash>"` no arquivo exportado
3. Ao **importar**: recalcula hash do JSON (sem o campo `_integrity`)
4. Se hashes divergem: alerta "⚠️ Este arquivo foi modificado desde a exportação. Deseja importar assim mesmo?"
5. Usuário pode cancelar ou continuar mesmo assim

**Não bloqueia** — apenas avisa. Não causa risco de perda de dados.

**Estimativa:** 1.5h (em `db.js` — `exportData()` e `importData()`)

---

## 🎯 PRIORIZAÇÃO DE EXECUÇÃO

### Fase 1 — Bugs (4-5h) 🔴🟠
| # | Tarefa |
|---|--------|
| 1 | BUG-02: Pomodoro scroll (30min) |
| 2 | BUG-03: Busca sidebar (30min) |
| 3 | BUG-01: Pomodoro task linking (2h) |
| 4 | BUG-04 + BUG-05: Kanban colunas (3h) |

### Fase 2 — Core Features (6-7h) 🟡
| # | Tarefa |
|---|--------|
| 5 | FEAT-01: Descrição expansível (1h) |
| 6 | FEAT-04: Filtro "TUDO" (1h) |
| 7 | FEAT-03: Busca global (4h) |

### Fase 3 — Advanced (7-8h)
| # | Tarefa |
|---|--------|
| 8 | FEAT-02: Janela flutuante (6h) |
| 9 | FEAT-05: Export checksum (1.5h) |

---

## ❓ PERGUNTAS ABERTAS (aguardando resposta antes de implementar)

### Kanban (BUG-04/05):
1. Ao criar coluna em "Todas as Listas", adicionar **automaticamente** a todas as listas existentes?
2. Novas listas criadas depois herdam as colunas globais?

### Janela Flutuante (FEAT-02):
3. Quando flutuante está aberta, o painel lateral **fecha** ou **fica aberto também**?
4. Ao recarregar, posição da janela: **lembrar** (persistir) ou **resetar ao centro**?
5. Pomodoro flutuante: objetivo é **continuar visível ao navegar** entre views?

### Busca (FEAT-03):
6. Ao clicar em resultado de busca, a busca **fecha** e abre o detalhe? Ou fica aberta ao lado?

---

**Status:** ⏳ Aguardando respostas das perguntas abertas para iniciar implementação

