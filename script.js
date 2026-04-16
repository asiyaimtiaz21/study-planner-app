// ----- Data Structure -----
//
// All app data lives under one localStorage key.
// Shape:
// {
//   subjects: [
//     { id, name, color, createdAt }
//   ],
//   assignments: [
//     { id, title, subjectId, dueDate, priority, status, notes, createdAt }
//     // priority: "low" | "medium" | "high"
//     // status:   "pending" | "completed"
//   ],
//   sessions: [
//     { id, subjectId, duration, date, createdAt }
//     // duration: seconds (number)
//     // date:     "YYYY-MM-DD"
//   ]
// }

const STORAGE_KEY = 'studyPlannerData';

const DEFAULT_DATA = {
  subjects:    [],
  assignments: [],
  sessions:    [],
};

// Returns the full data object from localStorage.
// Safely falls back to DEFAULT_DATA if empty or corrupted.
function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    // Ensure all expected keys exist in case of partial data
    return {
      subjects:    Array.isArray(parsed.subjects)    ? parsed.subjects    : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      sessions:    Array.isArray(parsed.sessions)    ? parsed.sessions    : [],
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

// Persists the full data object to localStorage.
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Returns a human-readable duration string from seconds.
// e.g. 90 → "1h 30m", 45*60 → "45m", 30 → "30s"
function formatDuration(seconds) {
  if (seconds <= 0)  return '0m';   // stat cards show minutes, not "0s"
  if (seconds < 60)  return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Generates a simple unique id.
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Adds an item to a collection ("subjects" | "assignments" | "sessions").
// Auto-injects id and createdAt. Returns the saved item.
function addItem(collection, item) {
  const data = getData();
  const newItem = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...item,
  };
  data[collection].push(newItem);
  saveData(data);
  return newItem;
}

// Updates fields on an item by id within a collection.
// Only supplied fields are changed; rest are preserved.
// Returns the updated item, or null if not found.
function updateItem(collection, id, changes) {
  const data = getData();
  const index = data[collection].findIndex(item => item.id === id);
  if (index === -1) return null;
  data[collection][index] = { ...data[collection][index], ...changes };
  saveData(data);
  return data[collection][index];
}

// Removes an item by id from a collection.
// Returns true if removed, false if not found.
function deleteItem(collection, id) {
  const data = getData();
  const before = data[collection].length;
  data[collection] = data[collection].filter(item => item.id !== id);
  if (data[collection].length === before) return false;
  saveData(data);
  return true;
}

// ----- Navigation -----

function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  // Deactivate all nav links
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  // Show the target section
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');

  // Activate the matching nav link
  const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
  if (activeLink) activeLink.classList.add('active');
}

// Wire up nav links
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    showSection(link.dataset.section);
  });
});

// ----- Subjects -----

// Prevent XSS when injecting user input into innerHTML
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSubjects() {
  const list = document.getElementById('subjects-list');
  const { subjects } = getData();

  if (subjects.length === 0) {
    list.innerHTML = `
      <div class="placeholder-box">
        <i class="fa-solid fa-folder-open"></i>
        <p>No subjects yet. Add one above to get started!</p>
      </div>`;
    updateDashboardStats();
    return;
  }

  list.innerHTML = `
    <div class="subjects-grid">
      ${subjects.map(s => `
        <div class="subject-card">
          <span class="subject-dot" style="background:${s.color}"></span>
          <span class="subject-name">${escapeHtml(s.name)}</span>
          <button class="btn-delete" data-id="${s.id}" title="Delete subject" aria-label="Delete ${escapeHtml(s.name)}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>`).join('')}
    </div>`;

  // Wire delete buttons after rendering
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteItem('subjects', btn.dataset.id);
      renderSubjects();
      populateSubjectDropdown();
    });
  });

  updateDashboardStats();
}

document.getElementById('add-subject-btn').addEventListener('click', () => {
  const input = document.getElementById('subject-input');
  const colorPicker = document.getElementById('subject-color');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  addItem('subjects', { name, color: colorPicker.value });
  input.value = '';
  renderSubjects();
  populateSubjectDropdown();
});

// Allow submitting with Enter key
document.getElementById('subject-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('add-subject-btn').click();
});

// ----- Assignments -----

let assignmentFilter = 'all';

// Sync the subject <select> with current subjects in storage
function populateSubjectDropdown() {
  const select = document.getElementById('assignment-subject');
  const { subjects } = getData();
  select.innerHTML =
    '<option value="">No subject</option>' +
    subjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
}

function renderAssignments() {
  const list = document.getElementById('assignments-list');
  const { assignments, subjects } = getData();

  const filtered = assignments.filter(a => {
    if (assignmentFilter === 'pending')   return a.status === 'pending';
    if (assignmentFilter === 'completed') return a.status === 'completed';
    return true;
  });

  if (filtered.length === 0) {
    const msg =
      assignmentFilter === 'completed' ? 'No completed assignments yet.' :
      assignmentFilter === 'pending'   ? 'No pending assignments. All done!' :
                                         'No assignments yet. Add one above to get started!';
    list.innerHTML = `
      <div class="placeholder-box">
        <i class="fa-solid fa-list-check"></i>
        <p>${msg}</p>
      </div>`;
    updateDashboardStats();
    return;
  }

  // Sort: pending first, then by due date ascending; no due date goes last
  const sorted = [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  list.innerHTML = `
    <div class="assignment-list">
      ${sorted.map(a => {
        const subject     = subjects.find(s => s.id === a.subjectId) || null;
        const isCompleted = a.status === 'completed';
        const dueDateStr  = a.dueDate
          ? new Date(a.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '';
        const subjectHtml = subject
          ? `<span style="display:inline-flex;align-items:center;gap:0.3rem">
               <span style="width:8px;height:8px;border-radius:50%;background:${subject.color};display:inline-block"></span>
               ${escapeHtml(subject.name)}
             </span>`
          : '';
        const dateHtml = dueDateStr
          ? `<span><i class="fa-regular fa-calendar" style="margin-right:0.2rem"></i>${dueDateStr}</span>`
          : '';
        return `
          <div class="assignment-card ${isCompleted ? 'completed' : ''}" data-priority="${a.priority}" data-id="${a.id}">
            <button class="btn-complete" data-id="${a.id}" title="${isCompleted ? 'Mark pending' : 'Mark complete'}" aria-label="Toggle completion">
              ${isCompleted ? '<i class="fa-solid fa-check" style="font-size:0.65rem"></i>' : ''}
            </button>
            <div class="assignment-body">
              <div class="assignment-title">${escapeHtml(a.title)}</div>
              <div class="assignment-meta">
                ${subjectHtml}
                ${dateHtml}
                <span class="priority-badge priority-badge--${a.priority}">${a.priority}</span>
              </div>
            </div>
            <button class="btn-delete" data-id="${a.id}" title="Delete assignment" aria-label="Delete ${escapeHtml(a.title)}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>`;
      }).join('')}
    </div>`;

  // Wire complete toggles
  list.querySelectorAll('.btn-complete').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = getData().assignments.find(x => x.id === btn.dataset.id);
      if (!current) return;
      updateItem('assignments', btn.dataset.id, {
        status: current.status === 'completed' ? 'pending' : 'completed',
      });
      renderAssignments();
    });
  });

  // Wire delete buttons
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteItem('assignments', btn.dataset.id);
      renderAssignments();
    });
  });

  updateDashboardStats();
}

document.getElementById('add-assignment-btn').addEventListener('click', () => {
  const titleInput = document.getElementById('assignment-title');
  const title      = titleInput.value.trim();
  if (!title) { titleInput.focus(); return; }

  addItem('assignments', {
    title,
    subjectId: document.getElementById('assignment-subject').value || null,
    dueDate:   document.getElementById('assignment-due').value    || null,
    priority:  document.getElementById('assignment-priority').value,
    status:    'pending',
    notes:     '',
  });

  titleInput.value = '';
  document.getElementById('assignment-due').value = '';
  renderAssignments();
});

document.getElementById('assignment-title').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('add-assignment-btn').click();
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    assignmentFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAssignments();
  });
});

// ----- Timer -----

// State
let timerDuration  = 25 * 60; // seconds — matches the default "25 min" preset
let timerRemaining = timerDuration;
let timerInterval  = null;
let timerRunning   = false;

// Returns "mm:ss" string from a seconds value
function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// Syncs the countdown text and colour class with current state
function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  display.textContent = formatTime(timerRemaining);
  display.classList.toggle('running',  timerRunning && timerRemaining > 0);
  display.classList.toggle('finished', timerRemaining === 0);
}

// Sets a new duration; only allowed while the timer is stopped
function setTimerDuration(seconds) {
  if (timerRunning) return;
  timerDuration  = seconds;
  timerRemaining = seconds;
  clearStatusMessage();
  updateTimerDisplay();
}

function clearStatusMessage() {
  const s = document.getElementById('timer-status');
  s.textContent = '';
  s.className   = 'timer-status';
}

function startTimer() {
  if (timerRunning || timerRemaining === 0) return;

  timerRunning = true;
  document.getElementById('timer-start').disabled = true;
  document.getElementById('timer-pause').disabled = false;
  clearStatusMessage();
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();

    if (timerRemaining === 0) {
      // Timer finished — clean up and log the session
      clearInterval(timerInterval);
      timerInterval = null;
      timerRunning  = false;
      document.getElementById('timer-start').disabled = false;
      document.getElementById('timer-pause').disabled = true;
      onTimerFinish();
    }
  }, 1000);
}

function pauseTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning  = false;
  document.getElementById('timer-start').disabled = false;
  document.getElementById('timer-pause').disabled = true;
  updateTimerDisplay();
  document.getElementById('timer-status').textContent = 'Paused — press Start to resume.';
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval  = null;
  timerRunning   = false;
  timerRemaining = timerDuration;
  document.getElementById('timer-start').disabled = false;
  document.getElementById('timer-pause').disabled = true;
  clearStatusMessage();
  updateTimerDisplay();
}

// Called when the countdown hits 0 — logs session and notifies the user
function onTimerFinish() {
  addItem('sessions', {
    subjectId: null,
    duration:  timerDuration,
    date:      new Date().toISOString().slice(0, 10),
  });
  updateDashboardStats();

  const statusEl = document.getElementById('timer-status');
  statusEl.textContent = `Session complete! ${formatTime(timerDuration)} logged to your dashboard.`;
  statusEl.className   = 'timer-status success';
}

// Button listeners
document.getElementById('timer-start').addEventListener('click', startTimer);
document.getElementById('timer-pause').addEventListener('click', pauseTimer);
document.getElementById('timer-reset').addEventListener('click', resetTimer);

// Preset buttons — set duration and mark active
document.querySelectorAll('.timer-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    if (timerRunning) return; // ignore clicks while running
    document.querySelectorAll('.timer-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('timer-custom').value = '';
    setTimerDuration(Number(btn.dataset.minutes) * 60);
  });
});

// Custom duration — read on Enter or blur; clamp to 1–180 min
document.getElementById('timer-custom').addEventListener('change', () => {
  const raw     = parseInt(document.getElementById('timer-custom').value, 10);
  if (!raw || raw < 1) return;
  const minutes = Math.min(raw, 180);
  document.querySelectorAll('.timer-preset').forEach(b => b.classList.remove('active'));
  setTimerDuration(minutes * 60);
});

// ----- Dashboard Stats -----

function updateDashboardStats() {
  const { subjects, assignments, sessions } = getData();
  const today = new Date().toISOString().slice(0, 10);

  // ── Stat cards ──────────────────────────────────────────────
  document.getElementById('stat-subjects').textContent  = subjects.length;
  document.getElementById('stat-pending').textContent   = assignments.filter(a => a.status === 'pending').length;
  document.getElementById('stat-completed').textContent = assignments.filter(a => a.status === 'completed').length;

  // Study Time Today — sum of duration for sessions logged today
  const todaySessions  = sessions.filter(s => s.date === today);
  const todaySeconds   = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  document.getElementById('stat-sessions').textContent  = formatDuration(todaySeconds);

  // Total Time Studied — all-time sum across every session
  const totalSeconds   = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  document.getElementById('stat-total-time').textContent = formatDuration(totalSeconds);

  // ── Upcoming assignments — next 3 pending with a due date ───
  const upcomingEl = document.getElementById('upcoming-list');
  const pending = assignments
    .filter(a => a.status === 'pending' && a.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  if (pending.length === 0) {
    upcomingEl.innerHTML = `
      <div class="placeholder-box">
        <i class="fa-solid fa-inbox"></i>
        <p>No upcoming assignments. Add one to get started!</p>
      </div>`;
  } else {
    upcomingEl.innerHTML = `
      <div class="upcoming-list-inner">
        ${pending.map(a => {
          const subject    = subjects.find(s => s.id === a.subjectId) || null;
          const dueDateStr = new Date(a.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const dotHtml    = subject
            ? `<span style="width:8px;height:8px;border-radius:50%;background:${subject.color};display:inline-block;flex-shrink:0"></span>`
            : '';
          return `
            <div class="upcoming-item" data-priority="${a.priority}">
              ${dotHtml}
              <span class="upcoming-item-title">${escapeHtml(a.title)}</span>
              <span class="upcoming-item-due"><i class="fa-regular fa-calendar" style="margin-right:0.2rem"></i>${dueDateStr}</span>
            </div>`;
        }).join('')}
      </div>`;
  }

  // ── Recent sessions — last 5, newest first ──────────────────
  const recentEl = document.getElementById('recent-sessions-list');
  const recent   = [...sessions]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5);

  if (recent.length === 0) {
    recentEl.innerHTML = `
      <div class="placeholder-box">
        <i class="fa-solid fa-stopwatch"></i>
        <p>No sessions logged yet. Start the timer to begin!</p>
      </div>`;
    return;
  }

  recentEl.innerHTML = `
    <div class="session-list">
      ${recent.map(s => {
        const subject    = subjects.find(sub => sub.id === s.subjectId) || null;
        const dateStr    = new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const dotHtml    = subject
          ? `<span style="width:8px;height:8px;border-radius:50%;background:${subject.color};display:inline-block"></span>`
          : '<i class="fa-solid fa-clock" style="font-size:0.75rem"></i>';
        const subjectLabel = subject ? escapeHtml(subject.name) : 'General';
        return `
          <div class="session-item">
            <span class="session-item-duration">${formatDuration(s.duration)}</span>
            <span class="session-item-subject">${dotHtml} ${subjectLabel}</span>
            <span class="session-item-date">${dateStr}</span>
          </div>`;
      }).join('')}
    </div>`;
}

// ----- AI Study Advice -----

document.getElementById('generate-advice-btn').addEventListener('click', generateStudyAdvice);

async function generateStudyAdvice() {
  const btn = document.getElementById('generate-advice-btn');
  const output = document.getElementById('ai-advice-output');

  // Read assignments from localStorage
  const { assignments } = getData();
  const pending = assignments.filter(a => a.status === 'pending');

  if (pending.length === 0) {
    output.style.display = 'block';
    output.textContent = 'No pending assignments found. Add some assignments first!';
    return;
  }

  // Build a short summary of pending assignments for the prompt
  const list = pending.map(a => {
    const due = a.dueDate ? ` (due ${a.dueDate})` : '';
    const priority = a.priority ? ` [${a.priority} priority]` : '';
    return `- ${a.title}${due}${priority}`;
  }).join('\n');

  const prompt =
  `You are a study coach. Based on these assignments:\n${list}\n\n` +
  `Give ONLY 2-4 sentences of study advice. Be specific, prioritize what to do first, and keep it short.`;

  // Show loading state
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thinking...';
  output.style.display = 'block';
  output.textContent = 'Generating advice...';

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemma3:1b',
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with status ${response.status}`);
    }

    const data = await response.json();
    output.textContent = data.response.trim();
  } catch (err) {
    output.textContent = 'Could not connect to Ollama. Make sure it is running on http://localhost:11434.';
    console.error('Ollama error:', err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-robot"></i> Generate Study Advice';
  }
}

// ----- Init -----
populateSubjectDropdown();
renderSubjects();
renderAssignments();
updateDashboardStats();
