// ============================================
// Theme Manager
// ============================================

import { getSetting, setSetting } from '../db.js';
import { setState, getState } from '../store.js';

async function initTheme() {
  let theme = await getSetting('theme', 'light');

  // Check system preference if no saved preference
  if (!theme) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme(theme);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const savedTheme = getState('theme');
    if (!savedTheme || savedTheme === 'system') {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  setState({ theme });
}

async function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  await setSetting('theme', next);
}

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

export { initTheme, applyTheme, toggleTheme, getCurrentTheme };
