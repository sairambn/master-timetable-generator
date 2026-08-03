const store = {
  teachers: [],
  subjects: [],
  classes: [],
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  periods: 8,
  timetable: null,
  editType: null,
  editId: null
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type === 'err' ? ' err' : type === 'ok' ? ' ok' : '');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function save() {
  localStorage.setItem('mt_simple', JSON.stringify({
    teachers: store.teachers,
    subjects: store.subjects,
    classes: store.classes,
    days: store.days,
    periods: store.periods
  }));
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem('mt_simple') || '{}');
    store.teachers = d.teachers || [];
    store.subjects = d.subjects || [];
    store.classes = d.classes || [];
    store.days = d.days || store.days;
    store.periods = d.periods || 8;
  } catch (e) {}
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  };
});

const overlay = document.getElementById('overlay');
function openModal(title, html) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  overlay.classList.add('open');
}
function closeModal() {
  overlay.classList.remove('open');
  store.editType = null;
  store.editId = null;
}
document.getElementById('modalClose').onclick = closeModal;
document.getElementById('modalCancel').onclick = closeModal;
overlay.onclick = e => { if (e.target === overlay) closeModal(); };

function render() {
  const tList = document.getElementById('teachersList');
  tList.innerHTML = store.teachers.length
    ? store.teachers.map(t => `
      <div class="item">
        <div><strong>${esc(t.name)}</strong> <span>${esc(t.code)} · max ${t.max}/day</span></div>
        <div class="item-actions">
          <button onclick="editItem('teacher','${t.id}')">Edit</button>
          <button onclick="delItem('teacher','${t.id}')">Delete</button>
        </div>
      </div>`).join('')
    : '<div class="item"><span>No teachers yet</span></div>';

  const sList = document.getElementById('subjectsList');
  sList.innerHTML = store.subjects.length
    ? store.subjects.map(s => {
        const names = s.teacherIds.map(id => {
          const t = store.teachers.find(x => x.id === id);
          return t ? t.code : '?';
        }).join(', ') || 'No teacher';
        return `
        <div class="item">
          <div><strong>${esc(s.name)}</strong> <span>${esc(s.code)} · ${esc(names)}</span></div>
          <div class="item-actions">
            <button onclick="editItem('subject','${s.id}')">Edit</button>
            <button onclick="delItem('subject','${s.id}')">Delete</button>
          </div>
        </div>`;
      }).join('')
    : '<div class="item"><span>No subjects yet</span></div>';

  const cList = document.getElementById('classesList');
  cList.innerHTML = store.classes.length
    ? store.classes.map(c => {
        const parts = c.reqs.map(r => {
          const s = store.subjects.find(x => x.id === r.sid);
          return s ? `${s.code}×${r.n}` : '?';
        }).join(', ') || 'No subjects';
        return `
        <div class="item">
          <div><strong>${esc(c.name)}</strong> <span>${esc(c.code)} · ${esc(parts)}</span></div>
          <div class="item-actions">
            <button onclick="editItem('class','${c.id}')">Edit</button>
            <button onclick="delItem('class','${c.id}')">Delete</button>
          </div>
        </div>`;
      }).join('')
    : '<div class="item"><span>No classes yet</span></div>';

  document.querySelectorAll('#daysBox input').forEach(cb => {
    cb.checked = store.days.includes(cb.value);
  });
  document.getElementById('periods').value = store.periods;
  save();
}

document.getElementById('addTeacher').onclick = () => {
  store.editType = 'teacher';
  store.editId = null;
  openModal('Add Teacher', `
    <label>Name</label>
    <input type="text" id="fName" placeholder="Dr. Anita Sharma">
    <label>Code</label>
    <input type="text" id="fCode" placeholder="AS">
    <label>Max periods per day</label>
    <input type="number" id="fMax" value="5" min="1" max="10">
  `);
};

document.getElementById('addSubject').onclick = () => {
  store.editType = 'subject';
  store.editId = null;
  openModal('Add Subject', `
    <label>Name</label>
    <input type="text" id="fName" placeholder="Mathematics">
    <label>Code</label>
    <input type="text" id="fCode" placeholder="MATH">
    <label>Teachers (hold Ctrl to multi select)</label>
    <select id="fTeachers" multiple>
      ${store.teachers.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
    </select>
  `);
};

document.getElementById('addClass').onclick = () => {
  store.editType = 'class';
  store.editId = null;
  openModal('Add Class', classForm());
};

function classForm(c) {
  const reqs = c ? c.reqs : [{ sid: '', n: 4 }];
  return `
    <label>Name</label>
    <input type="text" id="fName" value="${c ? esc(c.name) : ''}" placeholder="Grade 10 A">
    <label>Code</label>
    <input type="text" id="fCode" value="${c ? esc(c.code) : ''}" placeholder="10A">
    <label>Subjects and weekly periods</label>
    <div id="reqBox">
      ${reqs.map(r => `
        <div class="req-row">
          <select class="req-sid">
            <option value="">Subject</option>
            ${store.subjects.map(s => `<option value="${s.id}" ${r.sid === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
          </select>
          <input type="number" class="req-n" value="${r.n}" min="1" max="15">
          <button type="button" class="btn" onclick="this.parentElement.remove()">×</button>
        </div>
      `).join('')}
    </div>
    <button type="button" class="btn" style="margin-top:8px" onclick="addReq()">+ Subject</button>
  `;
}

window.addReq = function() {
  const box = document.getElementById('reqBox');
  const div = document.createElement('div');
  div.className = 'req-row';
  div.innerHTML = `
    <select class="req-sid">
      <option value="">Subject</option>
      ${store.subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}
    </select>
    <input type="number" class="req-n" value="4" min="1" max="15">
    <button type="button" class="btn" onclick="this.parentElement.remove()">×</button>
  `;
  box.appendChild(div);
};

window.editItem = function(type, id) {
  store.editType = type;
  store.editId = id;
  if (type === 'teacher') {
    const t = store.teachers.find(x => x.id === id);
    openModal('Edit Teacher', `
      <label>Name</label>
      <input type="text" id="fName" value="${esc(t.name)}">
      <label>Code</label>
      <input type="text" id="fCode" value="${esc(t.code)}">
      <label>Max periods per day</label>
      <input type="number" id="fMax" value="${t.max}" min="1" max="10">
    `);
  } else if (type === 'subject') {
    const s = store.subjects.find(x => x.id === id);
    openModal('Edit Subject', `
      <label>Name</label>
      <input type="text" id="fName" value="${esc(s.name)}">
      <label>Code</label>
      <input type="text" id="fCode" value="${esc(s.code)}">
      <label>Teachers</label>
      <select id="fTeachers" multiple>
        ${store.teachers.map(t => `<option value="${t.id}" ${s.teacherIds.includes(t.id) ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
      </select>
    `);
  } else if (type === 'class') {
    const c = store.classes.find(x => x.id === id);
    openModal('Edit Class', classForm(c));
  }
};

window.delItem = function(type, id) {
  if (!confirm('Delete this item?')) return;
  if (type === 'teacher') {
    store.teachers = store.teachers.filter(t => t.id !== id);
    store.subjects.forEach(s => { s.teacherIds = s.teacherIds.filter(x => x !== id); });
  } else if (type === 'subject') {
    store.subjects = store.subjects.filter(s => s.id !== id);
    store.classes.forEach(c => { c.reqs = c.reqs.filter(r => r.sid !== id); });
  } else if (type === 'class') {
    store.classes = store.classes.filter(c => c.id !== id);
  }
  render();
  toast('Deleted');
};

document.getElementById('modalSave').onclick = () => {
  const type = store.editType;
  if (type === 'teacher') {
    const name = document.getElementById('fName').value.trim();
    const code = document.getElementById('fCode').value.trim();
    const max = parseInt(document.getElementById('fMax').value) || 5;
    if (!name || !code) { toast('Name and code needed', 'err'); return; }
    if (store.editId) {
      Object.assign(store.teachers.find(t => t.id === store.editId), { name, code, max });
    } else {
      store.teachers.push({ id: uid(), name, code, max });
    }
  } else if (type === 'subject') {
    const name = document.getElementById('fName').value.trim();
    const code = document.getElementById('fCode').value.trim();
    const teacherIds = [...document.getElementById('fTeachers').selectedOptions].map(o => o.value);
    if (!name || !code) { toast('Name and code needed', 'err'); return; }
    if (store.editId) {
      Object.assign(store.subjects.find(s => s.id === store.editId), { name, code, teacherIds });
    } else {
      store.subjects.push({ id: uid(), name, code, teacherIds });
    }
  } else if (type === 'class') {
    const name = document.getElementById('fName').value.trim();
    const code = document.getElementById('fCode').value.trim();
    const reqs = [];
    document.querySelectorAll('#reqBox .req-row').forEach(row => {
      const sid = row.querySelector('.req-sid').value;
      const n = parseInt(row.querySelector('.req-n').value) || 0;
      if (sid && n > 0) reqs.push({ sid, n });
    });
    if (!name || !code) { toast('Name and code needed', 'err'); return; }
    if (!reqs.length) { toast('Add at least one subject', 'err'); return; }
    if (store.editId) {
      Object.assign(store.classes.find(c => c.id === store.editId), { name, code, reqs });
    } else {
      store.classes.push({ id: uid(), name, code, reqs });
    }
  }
  closeModal();
  render();
  toast('Saved', 'ok');
};

document.getElementById('daysBox').onchange = () => {
  store.days = [...document.querySelectorAll('#daysBox input:checked')].map(i => i.value);
  save();
};
document.getElementById('periods').onchange = () => {
  store.periods = parseInt(document.getElementById('periods').value) || 8;
  save();
};

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generate() {
  const days = store.days;
  const periods = store.periods;
  if (!days.length) throw new Error('Select at least one working day');
  if (!store.teachers.length) throw new Error('Add at least one teacher');
  if (!store.subjects.length) throw new Error('Add at least one subject');
  if (!store.classes.length) throw new Error('Add at least one class');

  const lessons = [];
  store.classes.forEach(c => {
    c.reqs.forEach(r => {
      const sub = store.subjects.find(s => s.id === r.sid);
      if (!sub || !sub.teacherIds.length) {
        throw new Error(`"${sub ? sub.name : 'Subject'}" has no teacher assigned`);
      }
      for (let i = 0; i < r.n; i++) {
        lessons.push({ classId: c.id, subjectId: sub.id, teachers: [...sub.teacherIds] });
      }
    });
  });

  const slots = [];
  days.forEach(d => { for (let p = 1; p <= periods; p++) slots.push({ day: d, period: p }); });

  function tryOnce() {
    const tBusy = {}, cBusy = {}, tDay = {}, tTot = {};
    store.teachers.forEach(t => {
      tBusy[t.id] = new Set();
      tTot[t.id] = 0;
      days.forEach(d => { tDay[t.id + '-' + d] = 0; });
    });
    store.classes.forEach(c => { cBusy[c.id] = new Set(); });

    const schedule = [];
    let placed = 0;
    const ordered = [...lessons].sort((a, b) => a.teachers.length - b.teachers.length);

    for (const lesson of ordered) {
      let best = null, bestScore = -1e9;
      for (const slot of shuffle(slots)) {
        const key = slot.day + '-' + slot.period;
        if (cBusy[lesson.classId].has(key)) continue;
        const cands = lesson.teachers.filter(tid => {
          const t = store.teachers.find(x => x.id === tid);
          if (!t) return false;
          if (tBusy[tid].has(key)) return false;
          if (tDay[tid + '-' + slot.day] >= t.max) return false;
          return true;
        });
        if (!cands.length) continue;
        cands.sort((a, b) => (tDay[a + '-' + slot.day] - tDay[b + '-' + slot.day]) || (tTot[a] - tTot[b]));
        const tid = cands[0];
        let score = 100 - tDay[tid + '-' + slot.day] * 8 - tTot[tid] * 2;
        if (slot.period > 1 && slot.period < periods) score += 2;
        if (score > bestScore) {
          bestScore = score;
          best = { slot, tid, key };
        }
      }
      if (best) {
        tBusy[best.tid].add(best.key);
        cBusy[lesson.classId].add(best.key);
        tDay[best.tid + '-' + best.slot.day]++;
        tTot[best.tid]++;
        schedule.push({
          day: best.slot.day,
          period: best.slot.period,
          classId: lesson.classId,
          subjectId: lesson.subjectId,
          teacherId: best.tid
        });
        placed++;
      }
    }
    return { schedule, placed, total: lessons.length };
  }

  let best = null;
  for (let i = 0; i < 10; i++) {
    const r = tryOnce();
    if (!best || r.placed > best.placed) best = r;
    if (r.placed === r.total) break;
  }
  return best;
}

document.getElementById('generate').onclick = () => {
  try {
    store.days = [...document.querySelectorAll('#daysBox input:checked')].map(i => i.value);
    store.periods = parseInt(document.getElementById('periods').value) || 8;
    const result = generate();
    store.timetable = result;
    showTimetable();
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-tab="timetable"]').classList.add('active');
    document.getElementById('tab-timetable').classList.add('active');
    if (result.placed === result.total) {
      toast('All ' + result.placed + ' periods placed', 'ok');
    } else {
      toast('Placed ' + result.placed + ' of ' + result.total + ' periods', 'err');
    }
  } catch (e) {
    toast(e.message || 'Failed', 'err');
  }
};

function showTimetable() {
  const result = store.timetable;
  const out = document.getElementById('timetableOut');
  const empty = document.getElementById('emptyTt');
  if (!result || !result.schedule.length) {
    out.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const mode = document.getElementById('viewSelect').value;
  const filter = document.getElementById('filterSelect');

  if (mode === 'class') {
    filter.innerHTML = '<option value="all">All classes</option>' +
      store.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  } else {
    filter.innerHTML = '<option value="all">All teachers</option>' +
      store.teachers.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  }

  function draw() {
    const fid = filter.value;
    let html = '';
    if (mode === 'class') {
      const list = fid === 'all' ? store.classes : store.classes.filter(c => c.id === fid);
      list.forEach(cls => {
        html += `<div class="tt-block"><div class="tt-title">${esc(cls.name)}</div>
          <table class="tt-table"><thead><tr><th>Period</th>${store.days.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>`;
        for (let p = 1; p <= store.periods; p++) {
          html += `<tr><td>P${p}</td>`;
          store.days.forEach(day => {
            const cell = result.schedule.find(s => s.classId === cls.id && s.day === day && s.period === p);
            if (cell) {
              const sub = store.subjects.find(s => s.id === cell.subjectId);
              const t = store.teachers.find(x => x.id === cell.teacherId);
              html += `<td><div class="cell-sub">${sub ? esc(sub.code) : '?'}</div><div class="cell-meta">${t ? esc(t.code) : ''}</div></td>`;
            } else {
              html += `<td><span class="cell-empty">—</span></td>`;
            }
          });
          html += `</tr>`;
        }
        html += `</tbody></table></div>`;
      });
    } else {
      const list = fid === 'all' ? store.teachers : store.teachers.filter(t => t.id === fid);
      list.forEach(teacher => {
        html += `<div class="tt-block"><div class="tt-title">${esc(teacher.name)}</div>
          <table class="tt-table"><thead><tr><th>Period</th>${store.days.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>`;
        for (let p = 1; p <= store.periods; p++) {
          html += `<tr><td>P${p}</td>`;
          store.days.forEach(day => {
            const cell = result.schedule.find(s => s.teacherId === teacher.id && s.day === day && s.period === p);
            if (cell) {
              const sub = store.subjects.find(s => s.id === cell.subjectId);
              const cls = store.classes.find(c => c.id === cell.classId);
              html += `<td><div class="cell-sub">${sub ? esc(sub.code) : '?'}</div><div class="cell-meta">${cls ? esc(cls.code) : ''}</div></td>`;
            } else {
              html += `<td><span class="cell-empty">—</span></td>`;
            }
          });
          html += `</tr>`;
        }
        html += `</tbody></table></div>`;
      });
    }
    out.innerHTML = html;
  }

  filter.onchange = draw;
  draw();
}

document.getElementById('viewSelect').onchange = () => {
  if (store.timetable) showTimetable();
};

document.getElementById('exportCsv').onclick = () => {
  if (!store.timetable) return;
  const rows = [['Class', 'Day', 'Period', 'Subject', 'Teacher']];
  store.timetable.schedule.forEach(s => {
    const c = store.classes.find(x => x.id === s.classId);
    const sub = store.subjects.find(x => x.id === s.subjectId);
    const t = store.teachers.find(x => x.id === s.teacherId);
    rows.push([c ? c.name : '', s.day, s.period, sub ? sub.name : '', t ? t.name : '']);
  });
  const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'timetable.csv';
  a.click();
  toast('CSV downloaded', 'ok');
};

document.getElementById('printBtn').onclick = () => window.print();

document.getElementById('loadSample').onclick = () => {
  if (store.teachers.length && !confirm('Replace current data with sample?')) return;
  store.teachers = [
    { id: 't1', name: 'Dr. Anita Sharma', code: 'AS', max: 5 },
    { id: 't2', name: 'Mr. Rajesh Kumar', code: 'RK', max: 6 },
    { id: 't3', name: 'Ms. Priya Patel', code: 'PP', max: 5 },
    { id: 't4', name: 'Mr. Suresh Nair', code: 'SN', max: 4 },
    { id: 't5', name: 'Mrs. Kavita Reddy', code: 'KR', max: 5 }
  ];
  store.subjects = [
    { id: 's1', name: 'Mathematics', code: 'MATH', teacherIds: ['t1', 't2'] },
    { id: 's2', name: 'Physics', code: 'PHY', teacherIds: ['t2', 't4'] },
    { id: 's3', name: 'Chemistry', code: 'CHEM', teacherIds: ['t3'] },
    { id: 's4', name: 'English', code: 'ENG', teacherIds: ['t5'] },
    { id: 's5', name: 'Biology', code: 'BIO', teacherIds: ['t3'] },
    { id: 's6', name: 'History', code: 'HIST', teacherIds: ['t5'] }
  ];
  store.classes = [
    {
      id: 'c1', name: 'Grade 10 A', code: '10A',
      reqs: [
        { sid: 's1', n: 6 }, { sid: 's2', n: 4 }, { sid: 's3', n: 4 },
        { sid: 's4', n: 5 }, { sid: 's5', n: 3 }, { sid: 's6', n: 3 }
      ]
    },
    {
      id: 'c2', name: 'Grade 10 B', code: '10B',
      reqs: [
        { sid: 's1', n: 6 }, { sid: 's2', n: 4 }, { sid: 's3', n: 4 },
        { sid: 's4', n: 5 }, { sid: 's5', n: 3 }, { sid: 's6', n: 3 }
      ]
    }
  ];
  store.days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  store.periods = 8;
  render();
  toast('Sample loaded', 'ok');
};

document.getElementById('clearAll').onclick = () => {
  if (!confirm('Clear everything?')) return;
  store.teachers = [];
  store.subjects = [];
  store.classes = [];
  store.timetable = null;
  localStorage.removeItem('mt_simple');
  render();
  document.getElementById('timetableOut').innerHTML = '';
  document.getElementById('emptyTt').style.display = 'block';
  toast('Cleared');
};

load();
render();
