# Arquivos Desnecessários - TaskFlow

**Data:** 13 de março de 2026

Esta documentação lista todos os arquivos que podem ser deletados com segurança para limpar a pasta do projeto.

---

## 📁 Arquivos SEGUROS para Deletar

### Categoria 1: Documentação Desatualizada

Estes arquivos foram substituídos pela documentação compilada em `CLAUDE.md`:

```
❌ TUTORIAL.md
   └─ Substituído por: CLAUDE.md (seções "Como Funciona" + FAQ)
   └─ Razão: Conteúdo desatualizado e genérico

❌ tarefas_pendentes.md
   └─ Substituído por: CLAUDE.md (seção "Funcionalidades Pendentes")
   └─ Razão: Conteúdo foi migrado para CLAUDE.md
```

### Categoria 2: Transcrições de Vídeo

Estes arquivos são tutoriais do TickTick em formato de transcrição, não são necessários:

```
❌ TICKTICK： O guia completo para MAXIMIZAR a sua produtividade! [uqEk7aYotO0].pt.vtt
   └─ Razão: Transcrição de vídeo externo, não parte do projeto
   └─ Tipo: Arquivo .vtt (subtitle format)
   └─ Tamanho: ~30-50 KB

❌ Tutorial do TickTick [xthyg_gQNQU].pt.vtt
   └─ Razão: Transcrição de vídeo externo, não parte do projeto
   └─ Tipo: Arquivo .vtt (subtitle format)
   └─ Tamanho: ~20-30 KB
```

### Categoria 3: Arquivos Temporários & Scripts Auxiliares

Estes foram usados apenas uma vez para gerar transcrições e não são mais necessários:

```
❌ transcripts.txt
   └─ Razão: Arquivo de saída dos scripts de transcrição
   └─ Conteúdo: Texto crudo de transcrições
   └─ Tamanho: ~50-100 KB

❌ clean_transcripts.txt
   └─ Razão: Log de limpeza de transcrições (arquivo intermediário)
   └─ Conteúdo: Anotações do processo
   └─ Tamanho: ~5 KB

❌ get_transcripts.js
   └─ Razão: Script para baixar transcrições do YouTube (one-time use)
   └─ Função: Não mais usado
   └─ Tamanho: ~2 KB

❌ get_transcripts.py
   └─ Razão: Versão Python do script de transcrições (one-time use)
   └─ Função: Não mais usado
   └─ Tamanho: ~2 KB

❌ clean_vtt.js
   └─ Razão: Script para limpar arquivos .vtt (one-time use)
   └─ Função: Não mais usado
   └─ Tamanho: ~1 KB

❌ yt-dlp.exe
   └─ Razão: Binário externo para download de vídeos (one-time use)
   └─ Função: Não mais usado
   └─ Tamanho: ~10-15 MB (!!! Maior arquivo desnecessário !!!)
```

### Categoria 4: Arquivos de Análise/Research

```
❌ Analise_TaskFlow.docx
   └─ Razão: Documento Word de análise (provavelmente desatualizado)
   └─ Conteúdo: Provavelmente análise funcional
   └─ Tamanho: ~50-100 KB
   └─ Nota: Se contém informações importantes, migrar para CLAUDE.md antes de deletar
```

### Categoria 5: Arquivos Temporários de Desenvolvimento

```
❌ _temp.js
   └─ Razão: Arquivo temporário criado durante debugging
   └─ Conteúdo: Desconhecido (provavelmente código teste)
   └─ Tamanho: ~5-10 KB
   └─ Gerado por: build.js ou manual testing

❌ js/components/taskDetail.js.tmp.5.1773185906782
❌ js/components/taskDetail.js.tmp.5.1773185918189
❌ js/components/taskDetail.js.tmp.5.1773185931364
❌ js/components/taskDetail.js.tmp.5.1773185952434
   └─ Razão: Backup automático criado durante edições
   └─ Conteúdo: Versões antigas de taskDetail.js
   └─ Tamanho: ~5-10 KB cada
   └─ Gerado por: Editor de texto
```

### Categoria 6: Arquivo HTML Antigo

```
❌ index.html
   └─ Razão: Template antigo (foi substituído por novo build process)
   └─ Nota: Pode ser mantido como "molde" se o build.js usá-lo, verificar antes de deletar
   └─ Status: VERIFICAR - Veja abaixo
```

---

## ⚠️ Arquivos a VERIFICAR Antes de Deletar

### `index.html`
- **Status**: Arquivo template usado pelo `build.js`
- **Verificação**:
  ```bash
  grep -n "index.html" build.js
  ```
  Se `build.js` lê este arquivo, NÃO DELETE.

### `.claude/settings.local.json`
- **Status**: Configurações locais do Claude Code
- **Recomendação**: Manter (não interfere, pequeno tamanho)

---

## 🧹 Limpeza Recomendada

### Opção 1: Agressiva (Remove tudo desnecessário)
```bash
rm -f TUTORIAL.md tarefas_pendentes.md
rm -f "TICKTICK： O guia completo para MAXIMIZAR a sua produtividade! [uqEk7aYotO0].pt.vtt"
rm -f "Tutorial do TickTick [xthyg_gQNQU].pt.vtt"
rm -f transcripts.txt clean_transcripts.txt
rm -f get_transcripts.js get_transcripts.py clean_vtt.js
rm -f yt-dlp.exe
rm -f Analise_TaskFlow.docx
rm -f _temp.js
rm -f js/components/taskDetail.js.tmp.*
```

**Resultado**: ~15 MB de espaço liberado (principalmente yt-dlp.exe)

### Opção 2: Conservadora (Remove apenas obvious)
```bash
rm -f _temp.js
rm -f js/components/taskDetail.js.tmp.*
rm -f yt-dlp.exe
```

**Resultado**: ~10 MB liberado, mantém docs antigas como referência

---

## ✅ Arquivos ESSENCIAIS (NÃO DELETE)

```
✅ CLAUDE.md                ← Nova documentação compilada (MANTENHA)
✅ TaskFlow.html            ← App compilada (ESSENCIAL)
✅ build.js                 ← Build script (ESSENCIAL)
✅ js/                      ← Código-fonte (ESSENCIAL)
✅ css/                     ← Estilos (ESSENCIAL)
✅ package.json             ← Dependencies (ESSENCIAL)
✅ .claude/                 ← Config local (MANTER)
✅ node_modules/            ← Dependencies instaladas (MANTER)
```

---

## 📊 Análise de Espaço

### Antes da Limpeza
- yt-dlp.exe: ~10-15 MB
- Transcrições (.vtt): ~50 KB
- Scripts auxiares: ~5 KB
- Documentação duplicada: ~30 KB
- Arquivos temp: ~40 KB
- **Total desnecessário: ~10.5-15.5 MB**

### Depois da Limpeza (Opção 1)
- Pasta reduzida de ~15-20 MB apenas para resíduos
- Documentação consolidada em CLAUDE.md (~30 KB)

---

## 📝 Checklist de Limpeza

- [ ] Ler CLAUDE.md e conferir que toda informação importante está lá
- [ ] Verificar `build.js` se usa `index.html` (se sim, manter)
- [ ] Conferir `Analise_TaskFlow.docx` se tem conteúdo importante não capturado em CLAUDE.md
- [ ] Deletar yt-dlp.exe (maior arquivo, 100% seguro deletar)
- [ ] Deletar arquivos .vtt (transcrições de vídeo, 100% seguro)
- [ ] Deletar scripts de transcrição (get_transcripts.*, clean_vtt.js, 100% seguro)
- [ ] Deletar documentação antiga (TUTORIAL.md, tarefas_pendentes.md, 100% seguro — conteúdo migrado)
- [ ] Deletar _temp.js e .tmp files (100% seguro)
- [ ] Rodar `git status` se usando git (verificar untracked files)
- [ ] Testar TaskFlow.html ainda funciona normalmente

---

**Recomendação Final**: Executar limpeza agressiva (Opção 1) — não há perda de informação, tudo está em CLAUDE.md.
