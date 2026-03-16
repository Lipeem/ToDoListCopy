// ============================================
// Rich Text Editor Helpers
// ============================================

import { escapeHtml, icon } from './icons.js';

const LIST_STYLE_ATTR = 'data-list-style';
const CHECKLIST_VALUE = 'check';
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function hasHtmlMarkup(value) {
  return typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value);
}

function cleanPlainText(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textToRichTextHtml(text) {
  const normalized = cleanPlainText(text);
  if (!normalized) return '';

  return normalized
    .split(/\n{2,}/)
    .map(block => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function sanitizeLinkHref(rawHref) {
  let href = String(rawHref || '').trim();
  if (!href) return '';

  if (!/^[a-z][a-z0-9+.-]*:/i.test(href) && /^[^\s/]+\.[^\s]+/.test(href)) {
    href = `https://${href}`;
  }

  try {
    const url = new URL(href, 'https://taskflow.local');
    if (!ALLOWED_PROTOCOLS.has(url.protocol.toLowerCase())) {
      return '';
    }
    return url.protocol === 'mailto:' || url.protocol === 'tel:' ? href : url.href;
  } catch {
    return '';
  }
}

function appendSanitizedChildren(source, target, context = {}) {
  Array.from(source.childNodes).forEach(child => {
    const cleanNode = sanitizeNode(child, target.ownerDocument, context);
    if (cleanNode) {
      target.appendChild(cleanNode);
    }
  });
}

function sanitizeList(source, tagName, doc) {
  const list = doc.createElement(tagName);
  if (tagName === 'ul' && source.getAttribute(LIST_STYLE_ATTR) === CHECKLIST_VALUE) {
    list.setAttribute(LIST_STYLE_ATTR, CHECKLIST_VALUE);
  }

  Array.from(source.childNodes).forEach(child => {
    const cleanNode = sanitizeNode(child, doc, { parentTag: 'li' });
    if (!cleanNode) return;

    const nodes = cleanNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE
      ? Array.from(cleanNode.childNodes)
      : [cleanNode];

    nodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'li') {
        list.appendChild(node);
        return;
      }

      if (!cleanPlainText(node.textContent || '') && node.nodeName !== 'BR') {
        return;
      }

      const li = doc.createElement('li');
      li.appendChild(node);
      list.appendChild(li);
    });
  });

  return list;
}

function sanitizeNode(node, doc, context = {}) {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const tag = node.tagName.toLowerCase();

  switch (tag) {
    case 'br':
      return doc.createElement('br');
    case 'p':
    case 'div': {
      if (context.parentTag === 'li') {
        const fragment = doc.createDocumentFragment();
        appendSanitizedChildren(node, fragment, { parentTag: 'li' });
        return fragment;
      }
      const p = doc.createElement('p');
      appendSanitizedChildren(node, p, { parentTag: 'p' });
      return p;
    }
    case 'b':
    case 'strong': {
      const strong = doc.createElement('strong');
      appendSanitizedChildren(node, strong, { parentTag: 'strong' });
      return strong;
    }
    case 'i':
    case 'em': {
      const em = doc.createElement('em');
      appendSanitizedChildren(node, em, { parentTag: 'em' });
      return em;
    }
    case 'u': {
      const u = doc.createElement('u');
      appendSanitizedChildren(node, u, { parentTag: 'u' });
      return u;
    }
    case 'strike':
    case 's': {
      const s = doc.createElement('s');
      appendSanitizedChildren(node, s, { parentTag: 's' });
      return s;
    }
    case 'mark': {
      const mark = doc.createElement('mark');
      appendSanitizedChildren(node, mark, { parentTag: 'mark' });
      return mark;
    }
    case 'code': {
      const code = doc.createElement('code');
      code.textContent = node.textContent || '';
      return code;
    }
    case 'pre': {
      const pre = doc.createElement('pre');
      pre.textContent = node.textContent || '';
      return pre;
    }
    case 'ul':
      return sanitizeList(node, 'ul', doc);
    case 'ol':
      return sanitizeList(node, 'ol', doc);
    case 'li': {
      const li = doc.createElement('li');
      if (node.getAttribute('data-checked') === 'true') {
        li.setAttribute('data-checked', 'true');
      }
      appendSanitizedChildren(node, li, { parentTag: 'li' });
      return li;
    }
    case 'a': {
      const href = sanitizeLinkHref(node.getAttribute('href'));
      if (!href) {
        const fragment = doc.createDocumentFragment();
        appendSanitizedChildren(node, fragment, { parentTag: 'a' });
        return fragment;
      }
      const a = doc.createElement('a');
      appendSanitizedChildren(node, a, { parentTag: 'a' });
      a.setAttribute('href', href);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer nofollow');
      return a;
    }
    case 'h1':
    case 'h2':
    case 'h3': {
      const h2 = doc.createElement('h2');
      appendSanitizedChildren(node, h2, { parentTag: 'h2' });
      return h2;
    }
    case 'blockquote': {
      const quote = doc.createElement('blockquote');
      appendSanitizedChildren(node, quote, { parentTag: 'blockquote' });
      return quote;
    }
    default: {
      const fragment = doc.createDocumentFragment();
      appendSanitizedChildren(node, fragment, context);
      return fragment;
    }
  }
}

function stripRichTextFromHtml(html) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.innerText || temp.textContent || '';
  return cleanPlainText(text);
}

function sanitizeRichText(html) {
  if (!html) return '';

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const output = document.createElement('div');
  appendSanitizedChildren(parsed.body, output, { parentTag: 'body' });

  const safeHtml = output.innerHTML.trim();
  return cleanPlainText(stripRichTextFromHtml(safeHtml)) ? safeHtml : '';
}

function normalizeRichTextHtml(value) {
  if (!value) return '';
  const raw = String(value);
  return sanitizeRichText(hasHtmlMarkup(raw) ? raw : textToRichTextHtml(raw));
}

function stripRichText(value) {
  if (!value) return '';
  const raw = String(value);
  return hasHtmlMarkup(raw) ? stripRichTextFromHtml(sanitizeRichText(raw)) : cleanPlainText(raw);
}

function truncateRichText(value, maxLength = 120) {
  const text = stripRichText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function isRichTextEmpty(value) {
  return !stripRichText(value);
}

function findClosestElement(node, selector, editor) {
  if (!node) return null;
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (!element) return null;
  const closest = element.closest(selector);
  return closest && editor.contains(closest) ? closest : null;
}

function getSelectionRange(editor) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return editor.contains(range.commonAncestorContainer) ? range : null;
}

function cloneSelectionRange(editor) {
  const range = getSelectionRange(editor);
  return range ? range.cloneRange() : null;
}

function restoreSelection(range) {
  if (!range) return false;
  const selection = window.getSelection();
  if (!selection) return false;
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function focusEditor(editor, range) {
  editor.focus();
  if (!getSelectionRange(editor) && range) {
    restoreSelection(range);
  }
}

function insertHtmlAtSelection(editor, html, fallbackRange) {
  const selection = window.getSelection();
  if (!selection) return false;

  focusEditor(editor, fallbackRange);
  const range = getSelectionRange(editor) || fallbackRange;
  if (!range) return false;

  range.deleteContents();
  const fragment = range.createContextualFragment(html);
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  if (lastNode) {
    const caret = document.createRange();
    caret.setStartAfter(lastNode);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
  }

  return true;
}

function insertPlainText(editor, text, fallbackRange) {
  focusEditor(editor, fallbackRange);
  if (!document.execCommand('insertText', false, text)) {
    insertHtmlAtSelection(editor, escapeHtml(text).replace(/\n/g, '<br>'), fallbackRange);
  }
}

function wrapRangeWithElement(editor, tagName, fallbackText, attributes = {}, fallbackRange) {
  focusEditor(editor, fallbackRange);
  const range = getSelectionRange(editor) || fallbackRange;
  if (!range) return;

  const wrapper = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    wrapper.setAttribute(key, value);
  });

  if (range.collapsed) {
    wrapper.textContent = fallbackText;
    range.insertNode(wrapper);
    const selection = window.getSelection();
    const innerRange = document.createRange();
    innerRange.selectNodeContents(wrapper);
    selection.removeAllRanges();
    selection.addRange(innerRange);
    return;
  }

  const content = range.extractContents();
  wrapper.appendChild(content);
  range.insertNode(wrapper);
  const selection = window.getSelection();
  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

function getCurrentList(editor) {
  const range = getSelectionRange(editor);
  if (!range) return null;
  return findClosestElement(range.startContainer, 'ul, ol', editor);
}

function toggleChecklist(editor, fallbackRange) {
  focusEditor(editor, fallbackRange);
  let list = getCurrentList(editor);

  if (!list) {
    document.execCommand('insertUnorderedList');
    list = getCurrentList(editor);
  } else if (list.tagName.toLowerCase() === 'ol') {
    document.execCommand('insertOrderedList');
    document.execCommand('insertUnorderedList');
    list = getCurrentList(editor);
  }

  if (list && list.tagName.toLowerCase() === 'ul') {
    if (list.getAttribute(LIST_STYLE_ATTR) === CHECKLIST_VALUE) {
      list.removeAttribute(LIST_STYLE_ATTR);
    } else {
      list.setAttribute(LIST_STYLE_ATTR, CHECKLIST_VALUE);
    }
  }
}

function toggleList(editor, ordered, fallbackRange) {
  focusEditor(editor, fallbackRange);
  const currentList = getCurrentList(editor);
  if (currentList && currentList.tagName.toLowerCase() === 'ul') {
    currentList.removeAttribute(LIST_STYLE_ATTR);
  }
  document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
  const updatedList = getCurrentList(editor);
  if (updatedList && updatedList.tagName.toLowerCase() === 'ul') {
    updatedList.removeAttribute(LIST_STYLE_ATTR);
  }
}

function toggleHeading(editor, fallbackRange) {
  focusEditor(editor, fallbackRange);
  const range = getSelectionRange(editor) || fallbackRange;
  const currentHeading = range ? findClosestElement(range.startContainer, 'h2', editor) : null;
  document.execCommand('formatBlock', false, currentHeading ? 'p' : 'h2');
}

function toggleQuote(editor, fallbackRange) {
  focusEditor(editor, fallbackRange);
  const range = getSelectionRange(editor) || fallbackRange;
  const currentQuote = range ? findClosestElement(range.startContainer, 'blockquote', editor) : null;
  document.execCommand('formatBlock', false, currentQuote ? 'p' : 'blockquote');
}

function insertTimestamp(editor, fallbackRange) {
  const stamp = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date());
  insertPlainText(editor, stamp, fallbackRange);
}

function insertCodeBlock(editor, fallbackRange) {
  focusEditor(editor, fallbackRange);
  const range = getSelectionRange(editor) || fallbackRange;
  const selectedText = range ? range.toString() : '';
  insertHtmlAtSelection(
    editor,
    `<pre>${escapeHtml(selectedText || 'bloco de código')}</pre><p><br></p>`,
    fallbackRange
  );
}

function insertLink(editor, fallbackRange) {
  const preservedRange = fallbackRange || cloneSelectionRange(editor);
  const input = window.prompt('Informe o link (http, https, mailto ou tel):', 'https://');
  if (input === null) return;

  const href = sanitizeLinkHref(input);
  if (!href) {
    window.alert('O link informado não é permitido.');
    return;
  }

  focusEditor(editor, preservedRange);
  const range = getSelectionRange(editor) || preservedRange;
  const text = range && range.toString().trim() ? range.toString().trim() : href;
  wrapRangeWithElement(
    editor,
    'a',
    text,
    {
      href,
      target: '_blank',
      rel: 'noopener noreferrer nofollow'
    },
    preservedRange
  );
}

function clearFormatting(editor, fallbackRange) {
  focusEditor(editor, fallbackRange);
  document.execCommand('removeFormat');
  const range = getSelectionRange(editor) || fallbackRange;
  const currentHeading = range ? findClosestElement(range.startContainer, 'h2, blockquote', editor) : null;
  if (currentHeading) {
    document.execCommand('formatBlock', false, 'p');
  }
}

function updateEditorEmptyState(root, editor) {
  root.classList.toggle('is-empty', isRichTextEmpty(editor.innerHTML));
}

function updateToolbarState(root, editor) {
  const range = getSelectionRange(editor);
  const currentList = range ? findClosestElement(range.startContainer, 'ul, ol', editor) : null;
  const activeMap = {
    heading: !!(range && findClosestElement(range.startContainer, 'h2', editor)),
    highlight: !!(range && findClosestElement(range.startContainer, 'mark', editor)),
    checklist: !!(currentList && currentList.tagName.toLowerCase() === 'ul' && currentList.getAttribute(LIST_STYLE_ATTR) === CHECKLIST_VALUE),
    bulletList: !!(currentList && currentList.tagName.toLowerCase() === 'ul' && currentList.getAttribute(LIST_STYLE_ATTR) !== CHECKLIST_VALUE),
    orderedList: !!(currentList && currentList.tagName.toLowerCase() === 'ol'),
    quote: !!(range && findClosestElement(range.startContainer, 'blockquote', editor)),
    code: !!(range && findClosestElement(range.startContainer, 'code', editor)),
    toggleMore: root.querySelector('[data-rich-more]')?.classList.contains('open')
  };

  root.querySelectorAll('[data-rich-action]').forEach(button => {
    const action = button.dataset.richAction;
    let isActive = false;

    if (action === 'bold' || action === 'italic' || action === 'underline' || action === 'strikeThrough') {
      try {
        isActive = document.queryCommandState(action);
      } catch {
        isActive = false;
      }
    } else if (action === 'expand') {
      isActive = root.classList.contains('is-expanded');
    } else if (Object.prototype.hasOwnProperty.call(activeMap, action)) {
      isActive = activeMap[action];
    }

    button.classList.toggle('active', !!isActive);
  });
}

function renderRichTextEditor({
  value = '',
  placeholder = 'Adicionar descrição...',
  compact = false,
  allowExpand = true
} = {}) {
  const initialValue = normalizeRichTextHtml(value);

  return `
    <div class="rich-text-field ${compact ? 'rich-text-field--compact' : ''} ${isRichTextEmpty(initialValue) ? 'is-empty' : ''}" data-rich-root>
      <div class="rich-text-toolbar" data-rich-toolbar>
        ${allowExpand ? `<button type="button" class="rich-text-btn rich-text-btn--icon" data-rich-action="expand" title="Expandir editor">${icon('expand')}</button>` : ''}
        ${allowExpand ? '<span class="rich-text-separator" aria-hidden="true"></span>' : ''}
        <button type="button" class="rich-text-btn rich-text-btn--text" data-rich-action="heading" title="Título">H</button>
        <button type="button" class="rich-text-btn rich-text-btn--text" data-rich-action="bold" title="Negrito">B</button>
        <button type="button" class="rich-text-btn rich-text-btn--text rich-text-btn--highlight" data-rich-action="highlight" title="Destaque">A</button>
        <span class="rich-text-separator" aria-hidden="true"></span>
        <button type="button" class="rich-text-btn rich-text-btn--icon" data-rich-action="checklist" title="Checklist">${icon('checklist')}</button>
        <button type="button" class="rich-text-btn rich-text-btn--icon" data-rich-action="bulletList" title="Lista com marcadores">${icon('bulletList')}</button>
        <button type="button" class="rich-text-btn rich-text-btn--icon" data-rich-action="orderedList" title="Lista numerada">${icon('orderedList')}</button>
        <span class="rich-text-separator" aria-hidden="true"></span>
        <button type="button" class="rich-text-btn rich-text-btn--text rich-text-btn--italic" data-rich-action="italic" title="Itálico">I</button>
        <button type="button" class="rich-text-btn rich-text-btn--text rich-text-btn--underline" data-rich-action="underline" title="Sublinhado">U</button>
        <button type="button" class="rich-text-btn rich-text-btn--text rich-text-btn--strike" data-rich-action="strikeThrough" title="Tachado">S</button>
        <span class="rich-text-separator" aria-hidden="true"></span>
        <button type="button" class="rich-text-btn rich-text-btn--icon" data-rich-action="quote" title="Citação">${icon('quote')}</button>
        <button type="button" class="rich-text-btn rich-text-btn--icon" data-rich-action="timestamp" title="Inserir data e hora">${icon('today')}</button>
        <span class="rich-text-separator" aria-hidden="true"></span>
        <button type="button" class="rich-text-btn rich-text-btn--icon" data-rich-action="link" title="Inserir link">${icon('link')}</button>
        <button type="button" class="rich-text-btn rich-text-btn--icon" data-rich-action="code" title="Código inline">${icon('code')}</button>
        <div class="rich-text-more" data-rich-more>
          <button type="button" class="rich-text-btn rich-text-btn--icon" data-rich-action="toggleMore" title="Mais opções">${icon('moreH')}</button>
          <div class="rich-text-more-menu" data-rich-more-menu>
            <button type="button" class="rich-text-more-item" data-rich-action="paragraph">Parágrafo</button>
            <button type="button" class="rich-text-more-item" data-rich-action="codeBlock">Bloco de código</button>
            <button type="button" class="rich-text-more-item" data-rich-action="timestamp">Inserir data e hora</button>
            <button type="button" class="rich-text-more-item" data-rich-action="clear">Limpar formatação</button>
          </div>
        </div>
      </div>
      <div class="rich-text-surface">
        <div
          class="rich-text-editor rich-text-content ${compact ? 'rich-text-editor--compact' : ''}"
          contenteditable="true"
          spellcheck="true"
          data-rich-editor
          data-placeholder="${escapeHtml(placeholder)}"
        >${initialValue}</div>
      </div>
    </div>
  `;
}

function bindRichTextEditor(root, {
  initialValue = '',
  onChange = null,
  onSave = null
} = {}) {
  const host = typeof root === 'string' ? document.querySelector(root) : root;
  if (!host) return null;

  const scope = host.matches?.('[data-rich-root]') ? host : (host.querySelector('[data-rich-root]') || host);
  const editor = scope.querySelector('[data-rich-editor]');
  const moreWrap = scope.querySelector('[data-rich-more]');
  if (!editor) return null;

  let lastSelection = null;
  editor.innerHTML = normalizeRichTextHtml(initialValue);

  const syncValue = () => {
    const safeValue = normalizeRichTextHtml(editor.innerHTML);
    scope.dataset.richValue = safeValue;
    updateEditorEmptyState(scope, editor);
    updateToolbarState(scope, editor);
    if (onChange) {
      onChange(safeValue, stripRichText(safeValue));
    }
    return safeValue;
  };

  const saveValue = async () => {
    const safeValue = syncValue();
    if (onSave) {
      await onSave(safeValue, stripRichText(safeValue));
    }
    return safeValue;
  };

  const closeMoreMenu = () => {
    if (moreWrap) {
      moreWrap.classList.remove('open');
    }
    updateToolbarState(scope, editor);
  };

  const handleAction = async (action) => {
    if (!action) return;

    if (action === 'toggleMore') {
      if (moreWrap) {
        moreWrap.classList.toggle('open');
        updateToolbarState(scope, editor);
      }
      return;
    }

    closeMoreMenu();

    switch (action) {
      case 'expand':
        scope.classList.toggle('is-expanded');
        break;
      case 'heading':
        toggleHeading(editor, lastSelection);
        break;
      case 'bold':
      case 'italic':
      case 'underline':
      case 'strikeThrough':
        focusEditor(editor, lastSelection);
        document.execCommand(action);
        break;
      case 'highlight':
        wrapRangeWithElement(editor, 'mark', 'texto destacado', {}, lastSelection);
        break;
      case 'checklist':
        toggleChecklist(editor, lastSelection);
        break;
      case 'bulletList':
        toggleList(editor, false, lastSelection);
        break;
      case 'orderedList':
        toggleList(editor, true, lastSelection);
        break;
      case 'quote':
        toggleQuote(editor, lastSelection);
        break;
      case 'timestamp':
        insertTimestamp(editor, lastSelection);
        break;
      case 'link':
        insertLink(editor, lastSelection);
        break;
      case 'code':
        wrapRangeWithElement(editor, 'code', 'codigo', {}, lastSelection);
        break;
      case 'paragraph':
        focusEditor(editor, lastSelection);
        document.execCommand('formatBlock', false, 'p');
        break;
      case 'codeBlock':
        insertCodeBlock(editor, lastSelection);
        break;
      case 'clear':
        clearFormatting(editor, lastSelection);
        break;
      default:
        break;
    }

    lastSelection = cloneSelectionRange(editor);
    syncValue();
  };

  scope.querySelectorAll('[data-rich-action]').forEach(button => {
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    button.addEventListener('click', async () => {
      await handleAction(button.dataset.richAction);
    });
  });

  editor.addEventListener('input', () => {
    lastSelection = cloneSelectionRange(editor);
    syncValue();
  });

  editor.addEventListener('focus', () => {
    lastSelection = cloneSelectionRange(editor);
    updateToolbarState(scope, editor);
  });

  editor.addEventListener('keyup', () => {
    lastSelection = cloneSelectionRange(editor);
    updateToolbarState(scope, editor);
  });

  editor.addEventListener('mouseup', () => {
    lastSelection = cloneSelectionRange(editor);
    updateToolbarState(scope, editor);
  });

  editor.addEventListener('click', (e) => {
    const listItem = e.target.closest('li');
    const checklist = listItem?.parentElement;
    if (!listItem || !checklist || checklist.getAttribute(LIST_STYLE_ATTR) !== CHECKLIST_VALUE) {
      return;
    }

    const rect = listItem.getBoundingClientRect();
    if (e.clientX - rect.left > 26) {
      return;
    }

    e.preventDefault();
    listItem.setAttribute(
      'data-checked',
      listItem.getAttribute('data-checked') === 'true' ? 'false' : 'true'
    );
    lastSelection = cloneSelectionRange(editor);
    syncValue();
  });

  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') || '';
    insertPlainText(editor, text, lastSelection);
    lastSelection = cloneSelectionRange(editor);
    syncValue();
  });

  scope.addEventListener('focusout', async (e) => {
    if (!scope.contains(e.relatedTarget)) {
      closeMoreMenu();
      await saveValue();
    }
  });

  syncValue();

  return {
    root: scope,
    editor,
    focus() {
      focusEditor(editor, lastSelection);
    },
    getValue() {
      return normalizeRichTextHtml(editor.innerHTML);
    },
    async save() {
      return saveValue();
    },
    setValue(value) {
      editor.innerHTML = normalizeRichTextHtml(value);
      syncValue();
    }
  };
}

export {
  bindRichTextEditor,
  isRichTextEmpty,
  normalizeRichTextHtml,
  renderRichTextEditor,
  sanitizeRichText,
  stripRichText,
  truncateRichText
};
