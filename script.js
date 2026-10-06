// --- Element refs ------------------------------------------------------

const sceneMolaDrop = document.getElementById('scene-mola-drop');
const sceneMolaImg = document.getElementById('scene-mola-img');

const dtWeekday = document.getElementById('dt-weekday');
const dtDaymonth = document.getElementById('dt-daymonth');
const dtDigits = document.querySelectorAll('#dt-count .dt-digit');

const speechBubbleText = document.getElementById('speech-bubble-text');

const toolSeaweed = document.getElementById('tool-seaweed');
const toolJellyfish = document.getElementById('tool-jellyfish');
const toolHistory = document.getElementById('tool-history');

const helpBtn = document.getElementById('help-btn');
const helpDialog = document.getElementById('help-dialog');
const helpClose = document.getElementById('help-close');

const historyDialog = document.getElementById('history-dialog');
const historyClose = document.getElementById('history-close');
const historyStats = document.getElementById('history-stats');
const historyList = document.getElementById('history-list');

const startCalDialog = document.getElementById('start-cal-dialog');
const startCalClose = document.getElementById('start-cal-close');
const startCalPrev = document.getElementById('start-cal-prev');
const startCalNext = document.getElementById('start-cal-next');
const startCalLabel = document.getElementById('start-cal-label');
const startCalGrid = document.getElementById('start-cal-grid');

const endCalDialog = document.getElementById('end-cal-dialog');
const endCalTitle = document.getElementById('end-cal-title');
const endCalClose = document.getElementById('end-cal-close');
const endCalPrev = document.getElementById('end-cal-prev');
const endCalNext = document.getElementById('end-cal-next');
const endCalLabel = document.getElementById('end-cal-label');
const endCalGrid = document.getElementById('end-cal-grid');
const savePeriodBtn = document.getElementById('save-period-btn');
const periodOngoingBtn = document.getElementById('period-ongoing-btn');

let pendingStart = null;
let pendingEnd = null;
let editingKey = null;
let isHistoryEdit = false;
let returnToHistory = false;
let speechMode = 'day'; // 'day' | 'prediction'
let startCalView = null;
let endCalView = null;

let cycles = [];

function parseDate(str) {
  return new Date(str + 'T00:00:00');
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function fmtLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return fmtLocal(new Date());
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

// --- Calendar date pickers -------------------------------------------------
//
// Standard month view (Monday first): the 1st of the month sits in the first
// row, under its weekday, with blank cells before it. A view is the Date of
// the first day of the month being shown.

function monthStartOf(dateStr) {
  const d = parseDate(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function shiftMonth(monthStart, delta) {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + delta, 1);
}

// Builds the weekday header, leading blanks, and one cell per day of the
// month; dayRenderer(btn, dateStr, col, date) decides each cell's classes,
// disabled state, and click handler.
function renderCalendarGrid(gridEl, labelEl, monthStart, dayRenderer) {
  labelEl.textContent = monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  gridEl.innerHTML = '';
  ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].forEach((wd) => {
    const el = document.createElement('div');
    el.className = 'cal-weekday';
    el.textContent = wd;
    gridEl.appendChild(el);
  });
  const blanks = (monthStart.getDay() + 6) % 7;
  for (let i = 0; i < blanks; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-blank';
    gridEl.appendChild(blank);
  }
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    const dateStr = fmtLocal(date);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day';
    const bubble = document.createElement('span');
    bubble.className = 'cal-day-bubble';
    bubble.textContent = String(day);
    btn.appendChild(bubble);
    dayRenderer(btn, dateStr, (blanks + day - 1) % 7, date);
    gridEl.appendChild(btn);
  }
}

function updateCalNavButtons(nextBtn, monthStart, maxDateStr) {
  nextBtn.disabled = shiftMonth(monthStart, 1) > parseDate(maxDateStr);
}

function startDayRenderer(btn, dateStr) {
  const max = todayStr();
  if (dateStr === todayStr()) btn.classList.add('cal-day-today');
  if (dateStr > max) {
    btn.disabled = true;
    btn.classList.add('cal-day-disabled');
  } else {
    btn.addEventListener('click', () => {
      pendingStart = dateStr;
      pendingEnd = null;
      startCalDialog.close();
      openEndCalendar();
    });
  }
}

function renderStartCalendar() {
  renderCalendarGrid(startCalGrid, startCalLabel, startCalView, startDayRenderer);
  updateCalNavButtons(startCalNext, startCalView, todayStr());
}

function openStartCalendar() {
  startCalView = monthStartOf(todayStr());
  renderStartCalendar();
  startCalDialog.showModal();
}

function endDayRenderer(btn, dateStr, col, date) {
  const max = todayStr();
  if (dateStr === todayStr()) btn.classList.add('cal-day-today');
  if (dateStr === pendingStart) btn.classList.add('cal-day-anchor');

  const outOfRange = dateStr < pendingStart || dateStr > max;
  if (outOfRange) {
    btn.disabled = true;
    btn.classList.add('cal-day-disabled');
    return;
  }

  if (pendingEnd && dateStr >= pendingStart && dateStr <= pendingEnd) {
    btn.classList.add('cal-day-in-range');
    const isFirstOfMonth = date.getDate() === 1;
    const isLastOfMonth = addDays(date, 1).getMonth() !== date.getMonth();
    if (dateStr === pendingStart || col === 0 || isFirstOfMonth) btn.classList.add('cal-range-cap-left');
    if (dateStr === pendingEnd || col === 6 || isLastOfMonth) btn.classList.add('cal-range-cap-right');
  }

  btn.addEventListener('click', () => {
    // Clicking the (circled) start date again un-selects it so a new start
    // date can be chosen. If an end date has been picked, the first click
    // collapses the range to a single day instead, and the next click
    // removes the start.
    if (dateStr === pendingStart) {
      if (!pendingEnd || pendingEnd === pendingStart) {
        removeStartDate();
        return;
      }
    }
    pendingEnd = dateStr;
    renderEndCalendar();
  });
}

// Drops the chosen start date and goes back to the start-date calendar.
function removeStartDate() {
  const removed = pendingStart;
  pendingStart = null;
  pendingEnd = null;
  endCalDialog.close();
  startCalView = monthStartOf(removed);
  renderStartCalendar();
  startCalDialog.showModal();
}

function renderEndCalendar() {
  renderCalendarGrid(endCalGrid, endCalLabel, endCalView, endDayRenderer);
  updateCalNavButtons(endCalNext, endCalView, todayStr());
  savePeriodBtn.disabled = !pendingEnd;
}

function openEndCalendar() {
  pendingEnd = null;
  endCalTitle.textContent = isHistoryEdit ? 'Edit period' : 'End date';
  endCalView = monthStartOf(pendingStart);
  renderEndCalendar();
  endCalDialog.showModal();
}

function finishCalendarFlow() {
  pendingStart = null;
  pendingEnd = null;
  editingKey = null;
  isHistoryEdit = false;
  endCalDialog.close();
  if (returnToHistory) {
    returnToHistory = false;
    historyDialog.showModal();
  }
}

function cancelCalendarFlow(dialogEl) {
  pendingStart = null;
  pendingEnd = null;
  editingKey = null;
  isHistoryEdit = false;
  dialogEl.close();
  if (returnToHistory) {
    returnToHistory = false;
    historyDialog.showModal();
  }
}

// Opens the edit flow for an existing cycle, starting at the start-date step.
function startEditCycle(key) {
  const cycle = cycles.find((c) => c.key === key);
  if (!cycle) return;
  editingKey = key;
  isHistoryEdit = true;
  pendingStart = cycle.start;
  returnToHistory = true;
  historyDialog.close();
  startCalView = monthStartOf(cycle.start);
  renderStartCalendar();
  startCalDialog.showModal();
}

// --- Local data layer ------------------------------------------------------
//
// Everything is stored on this device only (localStorage). There is no
// account, server, or sync.

const STORAGE_KEY = 'molaMolaTracker.cycles.v1';

const dataErrorBanner = document.getElementById('data-error-banner');
const dataErrorText = document.getElementById('data-error-text');
const dataErrorDismiss = document.getElementById('data-error-dismiss');

dataErrorDismiss.addEventListener('click', () => dataErrorBanner.classList.add('hidden'));

function showDataError(context, err) {
  console.error(context, err);
  dataErrorText.textContent = `${context}. ${err && err.message ? err.message : ''}`.trim();
  dataErrorBanner.classList.remove('hidden');
}

function newCycleKey() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortCycles(list) {
  return list.sort((a, b) => a.start.localeCompare(b.start));
}

function loadCycles() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return sortCycles(
      raw
        .filter((c) => c && typeof c.start === 'string')
        .map((c) => ({ key: c.key ? String(c.key) : newCycleKey(), start: c.start, end: c.end || null }))
    );
  } catch (err) {
    showDataError('Could not read your saved data', err);
    return [];
  }
}

function saveCycles() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cycles));
  } catch (err) {
    showDataError('Could not save your data', err);
  }
}

function commitCycles() {
  sortCycles(cycles);
  saveCycles();
  render();
}

function addCycle(start, end) {
  cycles.push({ key: newCycleKey(), start, end: end || null });
  commitCycles();
}

function updateCycleDates(key, start, end) {
  const cycle = cycles.find((c) => c.key === key);
  if (!cycle) return;
  cycle.start = start;
  cycle.end = end || null;
  commitCycles();
}

function deleteCycle(key) {
  cycles = cycles.filter((c) => c.key !== key);
  commitCycles();
}

// Finds the cycle (open or closed) that a given date falls inside, if any.
function findActiveCycle(cycles, date) {
  for (const c of cycles) {
    const start = parseDate(c.start);
    if (c.end) {
      const end = parseDate(c.end);
      if (date >= start && date <= end) return c;
    } else if (date >= start) {
      return c;
    }
  }
  return null;
}

const DEFAULT_CYCLE_LENGTH = 28;

function computeStats(cycles) {
  const closed = cycles.filter(c => c.end);
  const periodLengths = closed.map(c => daysBetween(parseDate(c.start), parseDate(c.end)) + 1);
  const avgPeriodLength = periodLengths.length
    ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
    : null;

  const starts = cycles.map(c => c.start).sort();
  const cycleLengths = [];
  for (let i = 1; i < starts.length; i++) {
    cycleLengths.push(daysBetween(parseDate(starts[i - 1]), parseDate(starts[i])));
  }
  const recentCycleLengths = cycleLengths.slice(-6);
  const avgCycleLength = recentCycleLengths.length
    ? Math.round(recentCycleLengths.reduce((a, b) => a + b, 0) / recentCycleLengths.length)
    : null;

  const lastStart = starts.length ? parseDate(starts[starts.length - 1]) : null;

  const isEstimate = !avgCycleLength && !!lastStart;
  const effectiveCycleLength = avgCycleLength || (lastStart ? DEFAULT_CYCLE_LENGTH : null);

  const predictedNext = lastStart && effectiveCycleLength
    ? new Date(lastStart.getTime() + effectiveCycleLength * 86400000)
    : null;

  return { avgPeriodLength, avgCycleLength, effectiveCycleLength, isEstimate, lastStart, predictedNext };
}

function computeCountdown(cycles, stats, today) {
  const activeCycle = findActiveCycle(cycles, today);
  if (activeCycle) {
    return { onPeriod: true };
  }
  if (!stats.lastStart || !stats.effectiveCycleLength) {
    return { daysUntil: null };
  }
  const daysUntil = daysBetween(today, stats.predictedNext);
  return { daysUntil, estimated: stats.isEstimate };
}

// --- Date tracker (today's date + a 4-digit cycle-count odometer) ---------

function renderDateTracker() {
  const now = new Date();
  dtWeekday.textContent = now.toLocaleDateString(undefined, { weekday: 'long' });
  const month = now.toLocaleDateString(undefined, { month: 'short' });
  dtDaymonth.textContent = `${ordinal(now.getDate())} ${month}`;

  const countStr = String(Math.min(9999, cycles.length)).padStart(4, '0');
  dtDigits.forEach((el, i) => { el.textContent = countStr[i]; });
}

// --- Speech bubble ----------------------------------------------------

function renderSpeechBubble(stats, countdown, today) {
  if (speechMode === 'prediction') {
    if (countdown.onPeriod) {
      speechBubbleText.textContent = "You're in the flow state...";
    } else if (countdown.daysUntil === null) {
      speechBubbleText.textContent = 'Feed me a seaweed to start tracking...';
    } else if (countdown.daysUntil > 0) {
      const n = countdown.daysUntil;
      speechBubbleText.textContent = `In...${n} day${n === 1 ? '' : 's'}...`;
    } else if (countdown.daysUntil === 0) {
      speechBubbleText.textContent = "It's due...today...";
    } else {
      const n = Math.abs(countdown.daysUntil);
      speechBubbleText.textContent = `...${n} day${n === 1 ? '' : 's'} overdue...`;
    }
    return;
  }

  if (!stats.lastStart) {
    speechBubbleText.textContent = 'Feed me a seaweed to start tracking...';
    return;
  }
  const dayOfCycle = daysBetween(stats.lastStart, today) + 1;
  speechBubbleText.textContent = `It is...day ${dayOfCycle}...`;
}

// --- History dialog -----------------------------------------------------

function renderHistory() {
  const stats = computeStats(cycles);
  historyStats.innerHTML = '';
  const statDefs = [
    ['Cycles logged', String(cycles.length)],
    ['Avg. period length', stats.avgPeriodLength ? `${stats.avgPeriodLength} days` : '–'],
    ['Avg. cycle length', stats.avgCycleLength ? `${stats.avgCycleLength} days` : '–'],
  ];
  statDefs.forEach(([label, value]) => {
    const div = document.createElement('div');
    div.className = 'history-stat';
    const labelSpan = document.createElement('span');
    labelSpan.className = 'history-stat-label';
    labelSpan.textContent = label;
    const valueSpan = document.createElement('span');
    valueSpan.className = 'history-stat-value';
    valueSpan.textContent = value;
    div.appendChild(labelSpan);
    div.appendChild(valueSpan);
    historyStats.appendChild(div);
  });

  historyList.innerHTML = '';
  if (cycles.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.textContent = 'Feed the Mola Mola some seaweed to log your first period.';
    historyList.appendChild(li);
    return;
  }

  [...cycles].reverse().forEach((cycle) => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const datesSpan = document.createElement('span');
    datesSpan.className = 'dates';
    const startFmt = formatDate(parseDate(cycle.start));
    if (cycle.end) {
      const endFmt = formatDate(parseDate(cycle.end));
      const len = daysBetween(parseDate(cycle.start), parseDate(cycle.end)) + 1;
      datesSpan.innerHTML = `${startFmt} – ${endFmt} <span class="length-tag">(${len}d)</span>`;
    } else {
      datesSpan.innerHTML = `${startFmt} – ongoing`;
    }

    const actions = document.createElement('div');
    actions.className = 'history-item-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'icon-btn';
    editBtn.textContent = '✎';
    editBtn.title = 'Edit entry';
    editBtn.addEventListener('click', () => startEditCycle(cycle.key));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn delete-btn';
    delBtn.textContent = '✕';
    delBtn.title = 'Delete entry';
    delBtn.addEventListener('click', () => deleteCycle(cycle.key));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(datesSpan);
    li.appendChild(actions);
    historyList.appendChild(li);
  });
}

// --- Chewing animation + tool interactions -------------------------------

let isChewing = false;

// Resolves once the mola has finished chewing, so popups can wait for it.
function chewAnimation() {
  return new Promise((resolve) => {
    isChewing = true;
    sceneMolaDrop.classList.add('chewing');
    let toggles = 0;
    const maxToggles = 5;
    const interval = setInterval(() => {
      toggles++;
      sceneMolaImg.src = (toggles % 2 === 1) ? 'icons/mola-eating.png' : 'icons/mola-resting.png';
      if (toggles >= maxToggles) {
        clearInterval(interval);
        sceneMolaImg.src = 'icons/mola-resting.png';
        sceneMolaDrop.classList.remove('chewing');
        isChewing = false;
        resolve();
      }
    }, 160);
  });
}

async function handleSeaweedUsed() {
  if (isChewing) return;
  await chewAnimation();
  isHistoryEdit = false;
  const openCycle = cycles.find((c) => !c.end);
  if (openCycle) {
    editingKey = openCycle.key;
    pendingStart = openCycle.start;
    openEndCalendar();
  } else {
    editingKey = null;
    openStartCalendar();
  }
}

async function handleJellyfishUsed() {
  if (isChewing) return;
  await chewAnimation();
  speechMode = 'prediction';
  render();
}

async function handleHistoryUsed() {
  if (isChewing) return;
  await chewAnimation();
  renderHistory();
  historyDialog.showModal();
}

function isOverDropZone(x, y) {
  const rect = sceneMolaDrop.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

// Tools only activate by being fed to the mola: dragging a tool's icon onto
// the drop zone (the pointer path below), or — since there's no drag
// equivalent for keyboard users — pressing Enter/Space on the tool button,
// detected via MouseEvent.detail === 0 on the synthetic click that browsers
// fire for keyboard activation (a real pointer tap has detail >= 1 and is
// otherwise ignored here, since a plain tap shouldn't feed the mola).
function setupDraggableTool(slotEl, onActivate) {
  const DRAG_THRESHOLD = 10;

  slotEl.addEventListener('click', (e) => {
    if (e.detail === 0) onActivate();
  });

  slotEl.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let ghost = null;

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        dragging = true;
        slotEl.classList.add('dragging');
        const source = slotEl.querySelector('img, svg');
        ghost = source.cloneNode(true);
        ghost.setAttribute('class', 'drag-ghost');
        document.body.appendChild(ghost);
      }
      if (dragging && ghost) {
        ghost.style.left = `${ev.clientX}px`;
        ghost.style.top = `${ev.clientY}px`;
        sceneMolaDrop.classList.toggle('drop-hover', isOverDropZone(ev.clientX, ev.clientY));
      }
    }

    function onUp(ev) {
      document.removeEventListener('pointermove', onMove);
      slotEl.classList.remove('dragging');
      sceneMolaDrop.classList.remove('drop-hover');
      if (dragging) {
        const dropped = isOverDropZone(ev.clientX, ev.clientY);
        if (ghost) ghost.remove();
        if (dropped) onActivate();
      }
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp, { once: true });
  });
}

// --- Main render ----------------------------------------------------------

function render() {
  const stats = computeStats(cycles);
  const today = parseDate(todayStr());
  const countdown = computeCountdown(cycles, stats, today);

  renderDateTracker();
  renderSpeechBubble(stats, countdown, today);
  renderHistory();
}

setupDraggableTool(toolSeaweed, handleSeaweedUsed);
setupDraggableTool(toolJellyfish, handleJellyfishUsed);
setupDraggableTool(toolHistory, handleHistoryUsed);

helpBtn.addEventListener('click', () => helpDialog.showModal());
helpClose.addEventListener('click', () => helpDialog.close());
helpDialog.addEventListener('click', (e) => {
  if (e.target === helpDialog) helpDialog.close();
});

historyClose.addEventListener('click', () => historyDialog.close());
historyDialog.addEventListener('click', (e) => {
  if (e.target === historyDialog) historyDialog.close();
});

startCalClose.addEventListener('click', () => cancelCalendarFlow(startCalDialog));
startCalDialog.addEventListener('click', (e) => {
  if (e.target === startCalDialog) cancelCalendarFlow(startCalDialog);
});
startCalPrev.addEventListener('click', () => {
  startCalView = shiftMonth(startCalView, -1);
  renderStartCalendar();
});
startCalNext.addEventListener('click', () => {
  startCalView = shiftMonth(startCalView, 1);
  renderStartCalendar();
});

endCalClose.addEventListener('click', () => cancelCalendarFlow(endCalDialog));
endCalDialog.addEventListener('click', (e) => {
  if (e.target === endCalDialog) cancelCalendarFlow(endCalDialog);
});
endCalPrev.addEventListener('click', () => {
  endCalView = shiftMonth(endCalView, -1);
  renderEndCalendar();
});
endCalNext.addEventListener('click', () => {
  endCalView = shiftMonth(endCalView, 1);
  renderEndCalendar();
});
savePeriodBtn.addEventListener('click', () => {
  if (!pendingEnd) return;
  if (editingKey) {
    updateCycleDates(editingKey, pendingStart, pendingEnd);
  } else {
    addCycle(pendingStart, pendingEnd);
  }
  speechMode = 'day';
  finishCalendarFlow();
});
periodOngoingBtn.addEventListener('click', () => {
  if (editingKey) {
    updateCycleDates(editingKey, pendingStart, null);
  } else {
    addCycle(pendingStart, null);
  }
  speechMode = 'day';
  finishCalendarFlow();
});

cycles = loadCycles();
render();

// Ask the browser not to evict this data when storage gets tight.
if (navigator.storage && typeof navigator.storage.persist === 'function') {
  navigator.storage.persist().catch(() => {});
}

// --- Service worker (offline support + fresh updates) ---------------------

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // When a newer service worker takes over a page that was already being
  // served by an older one, reload once so the latest app code shows up.
  const hadController = !!navigator.serviceWorker.controller;
  let reloadedForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloadedForUpdate) return;
    reloadedForUpdate = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
