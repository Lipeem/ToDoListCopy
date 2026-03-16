// ============================================
// Keyboard Shortcuts Manager
// ============================================

import { state, setState } from '../store.js';

function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Global shortcut: Ctrl+Shift+A — works even in inputs and modals
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      setState({ modalOpen: 'globalQuickAdd', modalData: null });
      return;
    }

    // Global search: Ctrl+F
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      setState({ searchOpen: true, searchQuery: '' });
      return;
    }

    // Close search with Escape
    if (e.key === 'Escape' && state.searchOpen) {
      e.preventDefault();
      setState({ searchOpen: false, searchQuery: '' });
      return;
    }

    // Ignore if typing in input/textarea
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable || e.target.closest?.('[data-rich-root]')) return;

    // Ignore if modal is open
    if (state.modalOpen) {
      if (e.key === 'Escape') {
        setState({ modalOpen: null, modalData: null });
      }
      return;
    }

    switch (e.key) {
      case 'n':
      case 'N':
        e.preventDefault();
        // Focus quick add or open modal
        const quickAdd = document.getElementById('quick-add-input');
        if (quickAdd) {
          quickAdd.focus();
        } else {
          setState({ modalOpen: 'addTask', modalData: null });
        }
        break;

      case '/':
        e.preventDefault();
        const searchInput = document.getElementById('sidebar-search');
        if (searchInput) searchInput.focus();
        break;

      case 'Escape':
        if (state.detailOpen) {
          setState({ detailOpen: false, selectedTaskId: null });
        } else if (state.searchQuery) {
          setState({
            searchQuery: '',
            currentView: state.currentView === 'search' ? (state.searchReturnView || 'inbox') : state.currentView
          });
        }
        break;

      case '1':
        if (e.altKey) { setState({ currentView: 'inbox', currentListId: 'inbox' }); e.preventDefault(); }
        break;
      case '2':
        if (e.altKey) { setState({ currentView: 'today', currentListId: 'today' }); e.preventDefault(); }
        break;
      case '3':
        if (e.altKey) { setState({ currentView: 'tomorrow', currentListId: 'tomorrow' }); e.preventDefault(); }
        break;
      case '4':
        if (e.altKey) { setState({ currentView: 'week', currentListId: 'week' }); e.preventDefault(); }
        break;

      case 'b':
      case 'B':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setState({ sidebarOpen: !state.sidebarOpen });
        }
        break;
    }
  });
}

export { initShortcuts };
