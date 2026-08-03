// Master Timetable Generator
// Data store
const store = {
  teachers: [],
  subjects: [],
  classes: [],
  rooms: [],
  settings: {
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    periodsPerDay: 8,
    periodDuration: 45,
    startTime: '08:00',
    useRooms: true
  },
  timetable: null,
  editId: null,
  editType: null
};

// Helpers
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => el.classList.remove('show'), 2800);
}

function save() {
  localStorage.setItem('mt_data', JSON.stringify({
    teachers: store.teachers,
    subjects: store.subjects,
    classes: store.classes,
    rooms: store.rooms,
    settings: store.settings
  }));
}

function load() {
  try {
    const raw = localStorage.getItem('mt_data');
    if (raw) {
      const data = JSON.parse(raw);
      store.teachers = data.teachers || [];
      store.subjects = data.subjects || [];
      store.classes = data.classes || [];
      store.rooms = data.rooms || [];
      store.settings = { ...store.settings, ...(data.settings || {}) };
    }
  } catch (e) {}
}

// Navigation
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    const titles = {
      dashboard: ['Dashboard', 'Overview of your schedule data'],
      teachers: ['Teachers', 'Manage teaching staff and availability'],
      subjects: ['Subjects', 'Define courses and assign teachers'],
      classes: ['Classes', 'Set up batches and subject requirements'],
      rooms: ['Rooms', 'Manage classrooms and labs'],
      settings: ['Settings', 'Configure working days and periods'],
      timetable: ['Master Timetable', 'Your generated schedule']
    };
    document.getElementById('pageTitle').textContent = titles[view][0];
    document.getElementById('pageSubtitle').textContent = titles[view][1];
  });
});

// Modal
const overlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalTitle = document.getElementById('modalTitle');

function openModal(title, html) {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  overlay.classList.add('open');
}

function closeModal() {
  overlay.classList.remove('open');
  store.editId = null;
  store.editType = null;
}

document.getElementById('modalClose').onclick = closeModal;
document.getElementById('modalCancel').onclick = closeModal;
overlay.addEventListener('click', e => {
  if (e.target === overlay) closeModal();
});

// Stats
function updateStats() {
  document.getElementById('statTeachers').textContent = store.teachers.length;
  document.getElementById('statSubjects').textContent = store.subjects.length;
  document.getElementById('statClasses').textContent = store.classes.length;
  document.getElementById('statRooms').textContent = store.rooms.length;
}

// Render tables
function renderTeachers() {
  const tbody = document.querySelector('#teachersTable tbody');
  const empty = document.getElementById('teachersEmpty');
  if (!store.teachers.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = store.teachers.map(t => `
    <tr>
      <td><strong>${escapeHtml(t.name)}</strong></td>
      <td>${escapeHtml(t.code)}</td>
      <td>${t.maxPerDay}</td>
      <td>${t.days.map(d => `<span class="tag">${d}</span>`).join('')}</td>
      <td>
        <button class="btn-danger" onclick="editTeacher('${t.id}')">Edit</button>
        <button class="btn-danger" onclick="deleteTeacher('${t.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderSubjects() {
  const tbody = document.querySelector('#subjectsTable tbody');
  const empty = document.getElementById('subjectsEmpty');
  if (!store.subjects.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = store.subjects.map(s => {
    const teacherNames = s.teacherIds.map(id => {
      const t = store.teachers.find(x => x.id === id);
      return t ? t.name : '?';
    });
    return `
      <tr>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${escapeHtml(s.code)}</td>
        <td>${teacherNames.map(n => `<span class="tag">${escapeHtml(n)}</span>`).join('') || '<span class="tag-muted">None</span>'}</td>
        <td>
          <button class="btn-danger" onclick="editSubject('${s.id}')">Edit</button>
          <button class="btn-danger" onclick="deleteSubject('${s.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderClasses() {
  const tbody = document.querySelector('#classesTable tbody');
  const empty = document.getElementById('classesEmpty');
  if (!store.classes.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = store.classes.map(c => {
    const subs = c.requirements.map(r => {
      const s = store.subjects.find(x => x.id === r.subjectId);
      return s ? `${s.code} (${r.periods}/wk)` : '?';
    });
    return `
      <tr>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>${escapeHtml(c.code)}</td>
        <td>${subs.map(s => `<span class="tag">${escapeHtml(s)}</span>`).join('') || '<span class="tag-muted">None</span>'}</td>
        <td>
          <button class="btn-danger" onclick="editClass('${c.id}')">Edit</button>
          <button class="btn-danger" onclick="deleteClass('${c.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderRooms() {
  const tbody = document.querySelector('#roomsTable tbody');
  const empty = document.getElementById('roomsEmpty');
  if (!store.rooms.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = store.rooms.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td>${escapeHtml(r.code)}</td>
      <td>${r.capacity}</td>
      <td>${escapeHtml(r.type)}</td>
      <td>
        <button class="btn-danger" onclick="editRoom('${r.id}')">Edit</button>
        <button class="btn-danger" onclick="deleteRoom('${r.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

function refreshAll() {
  updateStats();
  renderTeachers();
  renderSubjects();
  renderClasses();
  renderRooms();
  save();
}

// Teacher modal
document.getElementById('addTeacherBtn').onclick = () => {
  store.editType = 'teacher';
  store.editId = null;
  openModal('Add Teacher', `
    <div class="form-group">
      <label>Full Name</label>
      <input type="text" id="tName" placeholder="e.g. Dr. Anita Sharma">
    </div>
    <div class="form-group">
      <label>Short Code</label>
      <input type="text" id="tCode" placeholder="e.g. AS">
    </div>
    <div class="form-group">
      <label>Max Periods per Day</label>
      <input type="number" id="tMax" value="5" min="1" max="10">
    </div>
    <div class="form-group">
      <label>Available Days</label>
      <div class="days-selector" id="tDays">
        ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `
          <label class="day-chip"><input type="checkbox" value="${d}" ${['Mon','Tue','Wed','Thu','Fri'].includes(d) ? 'checked' : ''}> ${d}</label>
        `).join('')}
      </div>
    </div>
  `);
};

window.editTeacher = function(id) {
  const t = store.teachers.find(x => x.id === id);
  if (!t) return;
  store.editType = 'teacher';
  store.editId = id;
  openModal('Edit Teacher', `
    <div class="form-group">
      <label>Full Name</label>
      <input type="text" id="tName" value="${escapeHtml(t.name)}">
    </div>
    <div class="form-group">
      <label>Short Code</label>
      <input type="text" id="tCode" value="${escapeHtml(t.code)}">
    </div>
    <div class="form-group">
      <label>Max Periods per Day</label>
      <input type="number" id="tMax" value="${t.maxPerDay}" min="1" max="10">
    </div>
    <div class="form-group">
      <label>Available Days</label>
      <div class="days-selector" id="tDays">
        ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `
          <label class="day-chip"><input type="checkbox" value="${d}" ${t.days.includes(d) ? 'checked' : ''}> ${d}</label>
        `).join('')}
      </div>
    </div>
  `);
};

window.deleteTeacher = function(id) {
  if (!confirm('Delete this teacher? Subjects linked to them will lose the assignment.')) return;
  store.teachers = store.teachers.filter(t => t.id !== id);
  store.subjects.forEach(s => {
    s.teacherIds = s.teacherIds.filter(tid => tid !== id);
  });
  refreshAll();
  toast('Teacher removed');
};

// Subject modal
document.getElementById('addSubjectBtn').onclick = () => {
  store.editType = 'subject';
  store.editId = null;
  openModal('Add Subject', subjectFormHtml());
};

window.editSubject = function(id) {
  const s = store.subjects.find(x => x.id === id);
  if (!s) return;
  store.editType = 'subject';
  store.editId = id;
  openModal('Edit Subject', subjectFormHtml(s));
};

function subjectFormHtml(s = null) {
  return `
    <div class="form-group">
      <label>Subject Name</label>
      <input type="text" id="sName" value="${s ? escapeHtml(s.name) : ''}" placeholder="e.g. Mathematics">
    </div>
    <div class="form-group">
      <label>Code</label>
      <input type="text" id="sCode" value="${s ? escapeHtml(s.code) : ''}" placeholder="e.g. MATH">
    </div>
    <div class="form-group">
      <label>Assign Teachers</label>
      <select id="sTeachers" multiple style="height:100px">
        ${store.teachers.map(t => `
          <option value="${t.id}" ${s && s.teacherIds.includes(t.id) ? 'selected' : ''}>${escapeHtml(t.name)} (${escapeHtml(t.code)})</option>
        `).join('')}
      </select>
      <small style="color:var(--text-muted);font-size:12px;margin-top:4px;display:block">Hold Ctrl/Cmd to select multiple</small>
    </div>
  `;
}

window.deleteSubject = function(id) {
  if (!confirm('Delete this subject? It will be removed from all classes.')) return;
  store.subjects = store.subjects.filter(s => s.id !== id);
  store.classes.forEach(c => {
    c.requirements = c.requirements.filter(r => r.subjectId !== id);
  });
  refreshAll();
  toast('Subject removed');
};

// Class modal
document.getElementById('addClassBtn').onclick = () => {
  store.editType = 'class';
  store.editId = null;
  openModal('Add Class', classFormHtml());
};

window.editClass = function(id) {
  const c = store.classes.find(x => x.id === id);
  if (!c) return;
  store.editType = 'class';
  store.editId = id;
  openModal('Edit Class', classFormHtml(c));
};

function classFormHtml(c = null) {
  const reqs = c ? c.requirements : [{ subjectId: '', periods: 4 }];
  return `
    <div class="form-group">
      <label>Class Name</label>
      <input type="text" id="cName" value="${c ? escapeHtml(c.name) : ''}" placeholder="e.g. Grade 10 A">
    </div>
    <div class="form-group">
      <label>Code</label>
      <input type="text" id="cCode" value="${c ? escapeHtml(c.code) : ''}" placeholder="e.g. 10A">
    </div>
    <div class="form-group">
      <label>Subjects & Weekly Periods</label>
      <div id="reqList">
        ${reqs.map((r, i) => `
          <div class="subject-period-row" data-idx="${i}">
            <select class="req-subject">
              <option value="">Select subject</option>
              ${store.subjects.map(s => `
                <option value="${s.id}" ${r.subjectId === s.id ? 'selected' : ''}>${escapeHtml(s.name)} (${escapeHtml(s.code)})</option>
              `).join('')}
            </select>
            <input type="number" class="req-periods" value="${r.periods}" min="1" max="20" placeholder="Periods">
            <button type="button" class="btn-danger" onclick="this.parentElement.remove()">×</button>
          </div>
        `).join('')}
      </div>
      <button type="button" class="btn-sm" style="margin-top:8px" onclick="addReqRow()">+ Add Subject</button>
    </div>
  `;
}

window.addReqRow = function() {
  const list = document.getElementById('reqList');
  const div = document.createElement('div');
  div.className = 'subject-period-row';
  div.innerHTML = `
    <select class="req-subject">
      <option value="">Select subject</option>
      ${store.subjects.map(s => `
        <option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.code)})</option>
      `).join('')}
    </select>
    <input type="number" class="req-periods" value="4" min="1" max="20">
    <button type="button" class="btn-danger" onclick="this.parentElement.remove()">×</button>
  `;
  list.appendChild(div);
};

window.deleteClass = function(id) {
  if (!confirm('Delete this class?')) return;
  store.classes = store.classes.filter(c => c.id !== id);
  refreshAll();
  toast('Class removed');
};

// Room modal
document.getElementById('addRoomBtn').onclick = () => {
  store.editType = 'room';
  store.editId = null;
  openModal('Add Room', `
    <div class="form-group">
      <label>Room Name</label>
      <input type="text" id="rName" placeholder="e.g. Room 101">
    </div>
    <div class="form-group">
      <label>Code</label>
      <input type="text" id="rCode" placeholder="e.g. R101">
    </div>
    <div class="form-group">
      <label>Capacity</label>
      <input type="number" id="rCap" value="40" min="1">
    </div>
    <div class="form-group">
      <label>Type</label>
      <select id="rType">
        <option value="Classroom">Classroom</option>
        <option value="Lab">Lab</option>
        <option value="Lecture Hall">Lecture Hall</option>
        <option value="Seminar">Seminar</option>
      </select>
    </div>
  `);
};

window.editRoom = function(id) {
  const r = store.rooms.find(x => x.id === id);
  if (!r) return;
  store.editType = 'room';
  store.editId = id;
  openModal('Edit Room', `
    <div class="form-group">
      <label>Room Name</label>
      <input type="text" id="rName" value="${escapeHtml(r.name)}">
    </div>
    <div class="form-group">
      <label>Code</label>
      <input type="text" id="rCode" value="${escapeHtml(r.code)}">
    </div>
    <div class="form-group">
      <label>Capacity</label>
      <input type="number" id="rCap" value="${r.capacity}" min="1">
    </div>
    <div class="form-group">
      <label>Type</label>
      <select id="rType">
        <option value="Classroom" ${r.type === 'Classroom' ? 'selected' : ''}>Classroom</option>
        <option value="Lab" ${r.type === 'Lab' ? 'selected' : ''}>Lab</option>
        <option value="Lecture Hall" ${r.type === 'Lecture Hall' ? 'selected' : ''}>Lecture Hall</option>
        <option value="Seminar" ${r.type === 'Seminar' ? 'selected' : ''}>Seminar</option>
      </select>
    </div>
  `);
};

window.deleteRoom = function(id) {
  if (!confirm('Delete this room?')) return;
  store.rooms = store.rooms.filter(r => r.id !== id);
  refreshAll();
  toast('Room removed');
};

// Save modal
document.getElementById('modalSave').onclick = () => {
  const type = store.editType;
  if (type === 'teacher') {
    const name = document.getElementById('tName').value.trim();
    const code = document.getElementById('tCode').value.trim();
    const maxPerDay = parseInt(document.getElementById('tMax').value) || 5;
    const days = [...document.querySelectorAll('#tDays input:checked')].map(i => i.value);
    if (!name || !code) { toast('Name and code required', 'error'); return; }
    if (!days.length) { toast('Select at least one day', 'error'); return; }
    if (store.editId) {
      const t = store.teachers.find(x => x.id === store.editId);
      Object.assign(t, { name, code, maxPerDay, days });
    } else {
      store.teachers.push({ id: uid(), name, code, maxPerDay, days });
    }
    toast('Teacher saved', 'success');
  } else if (type === 'subject') {
    const name = document.getElementById('sName').value.trim();
    const code = document.getElementById('sCode').value.trim();
    const teacherIds = [...document.getElementById('sTeachers').selectedOptions].map(o => o.value);
    if (!name || !code) { toast('Name and code required', 'error'); return; }
    if (store.editId) {
      const s = store.subjects.find(x => x.id === store.editId);
      Object.assign(s, { name, code, teacherIds });
    } else {
      store.subjects.push({ id: uid(), name, code, teacherIds });
    }
    toast('Subject saved', 'success');
  } else if (type === 'class') {
    const name = document.getElementById('cName').value.trim();
    const code = document.getElementById('cCode').value.trim();
    const rows = document.querySelectorAll('#reqList .subject-period-row');
    const requirements = [];
    rows.forEach(row => {
      const sid = row.querySelector('.req-subject').value;
      const periods = parseInt(row.querySelector('.req-periods').value) || 0;
      if (sid && periods > 0) requirements.push({ subjectId: sid, periods });
    });
    if (!name || !code) { toast('Name and code required', 'error'); return; }
    if (!requirements.length) { toast('Add at least one subject', 'error'); return; }
    if (store.editId) {
      const c = store.classes.find(x => x.id === store.editId);
      Object.assign(c, { name, code, requirements });
    } else {
      store.classes.push({ id: uid(), name, code, requirements });
    }
    toast('Class saved', 'success');
  } else if (type === 'room') {
    const name = document.getElementById('rName').value.trim();
    const code = document.getElementById('rCode').value.trim();
    const capacity = parseInt(document.getElementById('rCap').value) || 40;
    const typeVal = document.getElementById('rType').value;
    if (!name || !code) { toast('Name and code required', 'error'); return; }
    if (store.editId) {
      const r = store.rooms.find(x => x.id === store.editId);
      Object.assign(r, { name, code, capacity, type: typeVal });
    } else {
      store.rooms.push({ id: uid(), name, code, capacity, type: typeVal });
    }
    toast('Room saved', 'success');
  }
  closeModal();
  refreshAll();
};

// Settings
document.getElementById('saveSettings').onclick = () => {
  const days = [...document.querySelectorAll('#daysSelector input:checked')].map(i => i.value);
  if (!days.length) { toast('Select at least one working day', 'error'); return; }
  store.settings.days = days;
  store.settings.periodsPerDay = parseInt(document.getElementById('periodsPerDay').value) || 8;
  store.settings.periodDuration = parseInt(document.getElementById('periodDuration').value) || 45;
  store.settings.startTime = document.getElementById('startTime').value || '08:00';
  store.settings.useRooms = document.getElementById('useRooms').checked;
  save();
  toast('Settings saved', 'success');
};

function loadSettingsUI() {
  document.querySelectorAll('#daysSelector input').forEach(cb => {
    cb.checked = store.settings.days.includes(cb.value);
  });
  document.getElementById('periodsPerDay').value = store.settings.periodsPerDay;
  document.getElementById('periodDuration').value = store.settings.periodDuration;
  document.getElementById('startTime').value = store.settings.startTime;
  document.getElementById('useRooms').checked = store.settings.useRooms;
}

// Generator
document.getElementById('generateBtn').onclick = () => {
  if (!store.teachers.length) { toast('Add at least one teacher', 'error'); return; }
  if (!store.subjects.length) { toast('Add at least one subject', 'error'); return; }
  if (!store.classes.length) { toast('Add at least one class', 'error'); return; }

  const btn = document.getElementById('generateBtn');
  btn.classList.add('generating');
  btn.innerHTML = '<span>Generating...</span>';

  setTimeout(() => {
    try {
      const result = generateTimetable();
      store.timetable = result;
      renderTimetable(result);
      document.getElementById('viewTimetableBtn').style.display = 'inline-block';
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-timetable').classList.add('active');
      document.getElementById('pageTitle').textContent = 'Master Timetable';
      document.getElementById('pageSubtitle').textContent = 'Your generated schedule';
      if (result.unplaced === 0) {
        toast('Timetable generated. All periods placed.', 'success');
      }
    } catch (err) {
      console.error(err);
      toast(err.message || 'Generation failed', 'error');
    }
    btn.classList.remove('generating');
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate Timetable`;
  }, 80);
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tryOneSchedule(lessons, days, periodsPerDay, useRooms) {
  const slots = [];
  days.forEach(day => {
    for (let p = 1; p <= periodsPerDay; p++) {
      slots.push({ day, period: p });
    }
  });

  const teacherBusy = {};
  const classBusy = {};
  const roomBusy = {};
  const teacherDayCount = {};
  const teacherTotal = {};

  store.teachers.forEach(t => {
    teacherBusy[t.id] = new Set();
    teacherTotal[t.id] = 0;
    days.forEach(d => { teacherDayCount[`${t.id}-${d}`] = 0; });
  });
  store.classes.forEach(c => { classBusy[c.id] = new Set(); });
  store.rooms.forEach(r => { roomBusy[r.id] = new Set(); });

  const schedule = [];
  let placed = 0;
  let unplaced = 0;

  const ordered = [...lessons].sort((a, b) => a.possibleTeachers.length - b.possibleTeachers.length);

  for (const lesson of ordered) {
    let best = null;
    let bestScore = -Infinity;

    const slotOrder = shuffle(slots);

    for (const slot of slotOrder) {
      const key = `${slot.day}-${slot.period}`;
      if (classBusy[lesson.classId].has(key)) continue;

      const candidates = lesson.possibleTeachers.filter(tid => {
        const t = store.teachers.find(x => x.id === tid);
        if (!t || !t.days.includes(slot.day)) return false;
        if (teacherBusy[tid].has(key)) return false;
        if (teacherDayCount[`${tid}-${slot.day}`] >= t.maxPerDay) return false;
        return true;
      });

      if (!candidates.length) continue;

      candidates.sort((a, b) => {
        const dayDiff = teacherDayCount[`${a}-${slot.day}`] - teacherDayCount[`${b}-${slot.day}`];
        if (dayDiff !== 0) return dayDiff;
        return teacherTotal[a] - teacherTotal[b];
      });

      const teacherId = candidates[0];

      let score = 100;
      score -= teacherDayCount[`${teacherId}-${slot.day}`] * 8;
      score -= teacherTotal[teacherId] * 2;
      if (slot.period >= 2 && slot.period <= periodsPerDay - 1) score += 3;

      const prev = schedule.find(s => s.classId === lesson.classId && s.day === slot.day && s.period === slot.period - 1);
      if (prev && prev.subjectId === lesson.subjectId) score -= 15;

      if (score > bestScore) {
        bestScore = score;
        let roomId = null;
        if (useRooms && store.rooms.length) {
          const free = store.rooms.filter(r => !roomBusy[r.id].has(key));
          if (free.length) roomId = free[Math.floor(Math.random() * free.length)].id;
        }
        best = { slot, teacherId, roomId, key };
      }
    }

    if (best) {
      teacherBusy[best.teacherId].add(best.key);
      classBusy[lesson.classId].add(best.key);
      teacherDayCount[`${best.teacherId}-${best.slot.day}`]++;
      teacherTotal[best.teacherId]++;
      if (best.roomId) roomBusy[best.roomId].add(best.key);

      schedule.push({
        day: best.slot.day,
        period: best.slot.period,
        classId: lesson.classId,
        subjectId: lesson.subjectId,
        teacherId: best.teacherId,
        roomId: best.roomId
      });
      placed++;
    } else {
      unplaced++;
    }
  }

  return { schedule, placed, unplaced, total: lessons.length };
}

function generateTimetable() {
  const { days, periodsPerDay, useRooms } = store.settings;

  const lessons = [];
  store.classes.forEach(cls => {
    cls.requirements.forEach(req => {
      const subject = store.subjects.find(s => s.id === req.subjectId);
      if (!subject || !subject.teacherIds.length) {
        throw new Error(`Subject "${subject ? subject.name : 'unknown'}" has no teachers assigned. Assign teachers first.`);
      }
      for (let i = 0; i < req.periods; i++) {
        lessons.push({
          classId: cls.id,
          subjectId: subject.id,
          possibleTeachers: [...subject.teacherIds]
        });
      }
    });
  });

  if (!lessons.length) throw new Error('No periods to schedule. Add subjects to classes.');

  let bestResult = null;
  const attempts = 12;

  for (let i = 0; i < attempts; i++) {
    const result = tryOneSchedule(lessons, days, periodsPerDay, useRooms);
    if (!bestResult || result.placed > bestResult.placed ||
        (result.placed === bestResult.placed && result.unplaced < bestResult.unplaced)) {
      bestResult = result;
    }
    if (result.unplaced === 0) break;
  }

  if (bestResult.unplaced > 0) {
    const ratio = Math.round((bestResult.placed / bestResult.total) * 100);
    toast(`Placed ${bestResult.placed} of ${bestResult.total} periods (${ratio}%). Tighten constraints or add teachers if needed.`, 'error');
  }

  return {
    schedule: bestResult.schedule,
    days,
    periodsPerDay,
    unplaced: bestResult.unplaced,
    total: bestResult.total,
    placed: bestResult.placed
  };
}

let currentViewMode = 'class';

function renderTimetable(result) {
  const container = document.getElementById('timetableContainer');
  const filter = document.getElementById('timetableFilter');
  const toggle = document.getElementById('viewToggle');

  function updateFilterOptions() {
    if (currentViewMode === 'class') {
      filter.innerHTML = '<option value="all">All Classes</option>' +
        store.classes.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    } else {
      filter.innerHTML = '<option value="all">All Teachers</option>' +
        store.teachers.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    }
  }

  function buildClassView(filterId) {
    let html = '';
    const list = filterId === 'all' ? store.classes : store.classes.filter(c => c.id === filterId);
    list.forEach(cls => {
      html += `<div class="tt-class-block">
        <div class="tt-class-title">${escapeHtml(cls.name)} (${escapeHtml(cls.code)})</div>
        <table class="tt-table">
          <thead><tr><th>Period</th>${result.days.map(d => `<th>${d}</th>`).join('')}</tr></thead>
          <tbody>`;
      for (let p = 1; p <= result.periodsPerDay; p++) {
        html += `<tr><td>P${p}</td>`;
        result.days.forEach(day => {
          const cell = result.schedule.find(s => s.classId === cls.id && s.day === day && s.period === p);
          if (cell) {
            const sub = store.subjects.find(s => s.id === cell.subjectId);
            const teacher = store.teachers.find(t => t.id === cell.teacherId);
            const room = cell.roomId ? store.rooms.find(r => r.id === cell.roomId) : null;
            html += `<td><div class="tt-cell">
              <span class="tt-subject">${sub ? escapeHtml(sub.code) : '?'}</span>
              <span class="tt-teacher">${teacher ? escapeHtml(teacher.code) : ''}</span>
              ${room ? `<span class="tt-room">${escapeHtml(room.code)}</span>` : ''}
            </div></td>`;
          } else {
            html += `<td><span class="tt-empty">—</span></td>`;
          }
        });
        html += `</tr>`;
      }
      html += `</tbody></table></div>`;
    });
    return html || '<div class="empty-state"><p>No data</p></div>';
  }

  function buildTeacherView(filterId) {
    let html = '';
    const list = filterId === 'all' ? store.teachers : store.teachers.filter(t => t.id === filterId);
    list.forEach(teacher => {
      html += `<div class="tt-class-block">
        <div class="tt-class-title">${escapeHtml(teacher.name)} (${escapeHtml(teacher.code)})</div>
        <table class="tt-table">
          <thead><tr><th>Period</th>${result.days.map(d => `<th>${d}</th>`).join('')}</tr></thead>
          <tbody>`;
      for (let p = 1; p <= result.periodsPerDay; p++) {
        html += `<tr><td>P${p}</td>`;
        result.days.forEach(day => {
          const cell = result.schedule.find(s => s.teacherId === teacher.id && s.day === day && s.period === p);
          if (cell) {
            const sub = store.subjects.find(s => s.id === cell.subjectId);
            const cls = store.classes.find(c => c.id === cell.classId);
            const room = cell.roomId ? store.rooms.find(r => r.id === cell.roomId) : null;
            html += `<td><div class="tt-cell">
              <span class="tt-subject">${sub ? escapeHtml(sub.code) : '?'}</span>
              <span class="tt-teacher">${cls ? escapeHtml(cls.code) : ''}</span>
              ${room ? `<span class="tt-room">${escapeHtml(room.code)}</span>` : ''}
            </div></td>`;
          } else {
            html += `<td><span class="tt-empty">—</span></td>`;
          }
        });
        html += `</tr>`;
      }
      html += `</tbody></table></div>`;
    });
    return html || '<div class="empty-state"><p>No data</p></div>';
  }

  function redraw() {
    updateFilterOptions();
    const val = filter.value || 'all';
    container.innerHTML = currentViewMode === 'class' ? buildClassView(val) : buildTeacherView(val);
  }

  if (toggle) {
    toggle.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.onclick = () => {
        toggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentViewMode = btn.dataset.mode;
        filter.value = 'all';
        redraw();
      };
    });
  }

  filter.onchange = redraw;
  currentViewMode = 'class';
  if (toggle) {
    toggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    const classBtn = toggle.querySelector('[data-mode="class"]');
    if (classBtn) classBtn.classList.add('active');
  }
  redraw();

  const preview = document.getElementById('latestPreview');
  if (result.schedule.length) {
    const pct = Math.round((result.placed / result.total) * 100);
    preview.innerHTML = `
      <p style="font-size:14px;color:var(--text-muted);line-height:1.5">
        Placed <strong>${result.placed}</strong> of <strong>${result.total}</strong> periods (${pct}%) across ${store.classes.length} classes.
        ${result.unplaced ? `<br><span style="color:var(--danger)">${result.unplaced} periods could not fit under current constraints.</span>` : '<br><span style="color:var(--success)">All periods placed successfully.</span>'}
      </p>
      <button class="btn-sm" style="margin-top:12px" id="goToTimetable">Open Full Timetable</button>`;
    document.getElementById('goToTimetable').onclick = () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById('view-timetable').classList.add('active');
      document.getElementById('pageTitle').textContent = 'Master Timetable';
      document.getElementById('pageSubtitle').textContent = 'Your generated schedule';
    };
  }
}

document.getElementById('viewTimetableBtn').onclick = () => {
  if (!store.timetable) return;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-timetable').classList.add('active');
  document.getElementById('pageTitle').textContent = 'Master Timetable';
  document.getElementById('pageSubtitle').textContent = 'Your generated schedule';
};

// Export CSV
document.getElementById('exportCsv').onclick = () => {
  if (!store.timetable) return;
  const rows = [['Class', 'Day', 'Period', 'Subject', 'Teacher', 'Room']];
  store.timetable.schedule.forEach(s => {
    const cls = store.classes.find(c => c.id === s.classId);
    const sub = store.subjects.find(x => x.id === s.subjectId);
    const teacher = store.teachers.find(t => t.id === s.teacherId);
    const room = s.roomId ? store.rooms.find(r => r.id === s.roomId) : null;
    rows.push([
      cls ? cls.name : '',
      s.day,
      s.period,
      sub ? sub.name : '',
      teacher ? teacher.name : '',
      room ? room.name : ''
    ]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'master-timetable.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV downloaded', 'success');
};

document.getElementById('printTimetable').onclick = () => window.print();

// Sample data
document.getElementById('loadSample').onclick = () => {
  if (store.teachers.length && !confirm('This will replace current data with sample data. Continue?')) return;

  store.teachers = [
    { id: 't1', name: 'Dr. Anita Sharma', code: 'AS', maxPerDay: 5, days: ['Mon','Tue','Wed','Thu','Fri'] },
    { id: 't2', name: 'Mr. Rajesh Kumar', code: 'RK', maxPerDay: 6, days: ['Mon','Tue','Wed','Thu','Fri'] },
    { id: 't3', name: 'Ms. Priya Patel', code: 'PP', maxPerDay: 5, days: ['Mon','Tue','Wed','Thu','Fri'] },
    { id: 't4', name: 'Mr. Suresh Nair', code: 'SN', maxPerDay: 4, days: ['Mon','Tue','Wed','Thu','Fri'] },
    { id: 't5', name: 'Mrs. Kavita Reddy', code: 'KR', maxPerDay: 5, days: ['Mon','Tue','Wed','Thu','Fri'] },
    { id: 't6', name: 'Mr. Vikram Singh', code: 'VS', maxPerDay: 5, days: ['Mon','Tue','Wed','Thu','Fri'] }
  ];

  store.subjects = [
    { id: 's1', name: 'Mathematics', code: 'MATH', teacherIds: ['t1', 't2'] },
    { id: 's2', name: 'Physics', code: 'PHY', teacherIds: ['t2', 't4'] },
    { id: 's3', name: 'Chemistry', code: 'CHEM', teacherIds: ['t3'] },
    { id: 's4', name: 'English', code: 'ENG', teacherIds: ['t5'] },
    { id: 's5', name: 'Biology', code: 'BIO', teacherIds: ['t3', 't6'] },
    { id: 's6', name: 'History', code: 'HIST', teacherIds: ['t5', 't6'] },
    { id: 's7', name: 'Computer Science', code: 'CS', teacherIds: ['t4'] }
  ];

  store.classes = [
    {
      id: 'c1', name: 'Grade 10 A', code: '10A',
      requirements: [
        { subjectId: 's1', periods: 6 },
        { subjectId: 's2', periods: 4 },
        { subjectId: 's3', periods: 4 },
        { subjectId: 's4', periods: 5 },
        { subjectId: 's5', periods: 3 },
        { subjectId: 's6', periods: 3 },
        { subjectId: 's7', periods: 3 }
      ]
    },
    {
      id: 'c2', name: 'Grade 10 B', code: '10B',
      requirements: [
        { subjectId: 's1', periods: 6 },
        { subjectId: 's2', periods: 4 },
        { subjectId: 's3', periods: 4 },
        { subjectId: 's4', periods: 5 },
        { subjectId: 's5', periods: 3 },
        { subjectId: 's6', periods: 3 },
        { subjectId: 's7', periods: 3 }
      ]
    },
    {
      id: 'c3', name: 'Grade 11 Science', code: '11S',
      requirements: [
        { subjectId: 's1', periods: 7 },
        { subjectId: 's2', periods: 5 },
        { subjectId: 's3', periods: 5 },
        { subjectId: 's4', periods: 4 },
        { subjectId: 's7', periods: 4 }
      ]
    }
  ];

  store.rooms = [
    { id: 'r1', name: 'Room 101', code: 'R101', capacity: 40, type: 'Classroom' },
    { id: 'r2', name: 'Room 102', code: 'R102', capacity: 40, type: 'Classroom' },
    { id: 'r3', name: 'Physics Lab', code: 'PHYLAB', capacity: 30, type: 'Lab' },
    { id: 'r4', name: 'Chemistry Lab', code: 'CHEMLAB', capacity: 30, type: 'Lab' },
    { id: 'r5', name: 'Computer Lab', code: 'CSLAB', capacity: 35, type: 'Lab' },
    { id: 'r6', name: 'Lecture Hall A', code: 'LHA', capacity: 80, type: 'Lecture Hall' }
  ];

  store.settings = {
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    periodsPerDay: 8,
    periodDuration: 45,
    startTime: '08:00',
    useRooms: true
  };

  loadSettingsUI();
  refreshAll();
  toast('Sample data loaded', 'success');
};

document.getElementById('clearAll').onclick = () => {
  if (!confirm('Clear all data? This cannot be undone.')) return;
  store.teachers = [];
  store.subjects = [];
  store.classes = [];
  store.rooms = [];
  store.timetable = null;
  localStorage.removeItem('mt_data');
  refreshAll();
  document.getElementById('latestPreview').innerHTML = `
    <div class="empty-state">
      <p>No timetable generated yet</p>
      <span>Add data and generate to see results here</span>
    </div>`;
  document.getElementById('viewTimetableBtn').style.display = 'none';
  toast('All data cleared');
};

// Init
load();
loadSettingsUI();
refreshAll();
