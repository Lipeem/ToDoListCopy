// ============================================
// Date Utilities
// ============================================

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTHS_SHORT_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const DAYS_PT = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
];

const DAYS_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_MINI_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function parseLocal(d) {
  if (!d) return null;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(d + 'T12:00:00'); // noon local time - safe bet to avoid timezone shifts
  }
  return new Date(d);
}

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function tomorrow() {
  const d = today();
  d.setDate(d.getDate() + 1);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = parseLocal(a);
  const db = parseLocal(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

function isToday(date) {
  return isSameDay(date, new Date());
}

function isTomorrow(date) {
  return isSameDay(date, tomorrow());
}

function isPast(date) {
  if (!date) return false;
  const d = parseLocal(date);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
}

function isWithinDays(date, days) {
  if (!date) return false;
  const d = parseLocal(date);
  const limit = addDays(today(), days);
  limit.setHours(23, 59, 59, 999);
  return d >= today() && d <= limit;
}

function formatDate(date, format = 'short') {
  if (!date) return '';
  const d = parseLocal(date);

  if (isToday(d)) return 'Hoje';
  if (isTomorrow(d)) return 'Amanhã';

  const yesterday = addDays(today(), -1);
  if (isSameDay(d, yesterday)) return 'Ontem';

  switch (format) {
    case 'short':
      return `${d.getDate()} ${MONTHS_SHORT_PT[d.getMonth()]}`;
    case 'medium':
      return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`;
    case 'long':
      return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
    case 'weekday':
      return `${DAYS_SHORT_PT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT_PT[d.getMonth()]}`;
    case 'iso':
      return d.toISOString().split('T')[0];
    default:
      return `${d.getDate()} ${MONTHS_SHORT_PT[d.getMonth()]}`;
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function getCalendarDays(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = month === 0 ? getDaysInMonth(year - 1, 11) : getDaysInMonth(year, month - 1);

  const days = [];

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    });
  }

  // Next month days to fill 6 rows
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false
    });
  }

  return days;
}

function extractNaturalDate(text) {
  let date = null;
  let cleanText = text;
  const lower = text.toLowerCase().trim();

  const patterns = [
    { regex: /\bhoje\b/i, handler: () => today() },
    { regex: /\bamanh[aã]\b/i, handler: () => tomorrow() },
    { regex: /\bdepois de amanh[aã]\b/i, handler: () => addDays(today(), 2) },
    { regex: /\b(?:próxim[ao]|proxim[ao])?\s*(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)\b/i, handler: (m) => {
        const dayNames = ['domingo', 'segunda', 'terca', 'terça', 'quarta', 'quinta', 'sexta', 'sabado', 'sábado'];
        const dayIndexes = [0, 1, 2, 2, 3, 4, 5, 6, 6];
        const idx = dayNames.indexOf(m[1].toLowerCase());
        if (idx >= 0) {
          const targetDay = dayIndexes[idx];
          const d = today();
          let diff = targetDay - d.getDay();
          if (diff <= 0) diff += 7;
          return addDays(d, diff);
        }
        return null;
    }},
    { regex: /\bem\s+(\d+)\s+dias?\b/i, handler: (m) => addDays(today(), parseInt(m[1])) },
    { regex: /\b(?:próxima|proxima)\s+semana\b/i, handler: () => addDays(startOfWeek(today()), 8) },
    { regex: /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/, handler: (m) => {
        const day = parseInt(m[1]);
        const month = parseInt(m[2]) - 1;
        const year = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3])) : new Date().getFullYear();
        return new Date(year, month, day);
    }}
  ];

  for (const p of patterns) {
    const match = text.match(p.regex);
    if (match) {
      const d = p.handler(match);
      if (d) {
        date = d;
        // remove the matched date phrase from the string and any double spaces left behind
        cleanText = text.replace(match[0], '').replace(/\s{2,}/g, ' ').trim();
        break; // Stop at first valid match
      }
    }
  }

  return { cleanText, date };
}

function getDateClass(date) {
  if (!date) return '';
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  if (isPast(date)) return 'overdue';
  return '';
}

export {
  parseLocal,
  MONTHS_PT, MONTHS_SHORT_PT, DAYS_PT, DAYS_SHORT_PT, DAYS_MINI_PT,
  today, tomorrow, startOfWeek, endOfWeek, addDays,
  isSameDay, isToday, isTomorrow, isPast, isWithinDays,
  formatDate, formatTime, getDaysInMonth, getFirstDayOfMonth, getCalendarDays,
  extractNaturalDate, getDateClass
};
