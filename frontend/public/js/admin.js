// ── Theme ─────────────────────────────────────────────────────────
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcons(savedTheme);

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcons(next);
}
function updateThemeIcons(theme) {
  document.querySelectorAll('.theme-icon').forEach(el => el.textContent = theme === 'dark' ? '☀' : '☾');
}

// ── Toast ─────────────────────────────────────────────────────────
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3200);
}

// ── Utils ─────────────────────────────────────────────────────────
function fmtSize(b) {
  if (!b) return '-';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const catLabel = { syllabus: 'Syllabus', imp: 'IMP', notes: 'Notes', previous_year: 'Prev Year', other: 'Other' };
const catBadge = { syllabus: 'abadge-syl', imp: 'abadge-imp', notes: 'abadge-note', previous_year: 'abadge-prev', other: 'abadge-oth' };
const typeBadge = { core: 'abadge-core', dept_elective: 'abadge-dept', open_elective: 'abadge-open' };
const typeLabel = { core: 'Core', dept_elective: 'Dept. Elective', open_elective: 'Open Elective' };

let allSubjects = [];

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  const res = await fetch('/api/auth/me');
  const data = await res.json();
  if (data.isAdmin) showDash();
}

// ── Auth ──────────────────────────────────────────────────────────
async function adminLogin() {
  const pass = document.getElementById('admin-pass').value;
  const errEl = document.getElementById('admin-err');
  errEl.textContent = '';
  if (!pass) { errEl.textContent = 'Enter password.'; return; }

  const res = await fetch('/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pass })
  });
  const data = await res.json();
  if (data.success) showDash();
  else errEl.textContent = data.error || 'Wrong password.';
}

async function adminLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  document.getElementById('page-admin-dash').classList.remove('active');
  document.getElementById('page-admin-login').classList.add('active');
  document.getElementById('admin-pass').value = '';
}

function showDash() {
  document.getElementById('page-admin-login').classList.remove('active');
  document.getElementById('page-admin-login').style.display = 'none';
  document.getElementById('page-admin-dash').classList.add('active');
  loadSubjectsForDropdowns();
  loadSubjectsTable();
}

// ── Tabs ──────────────────────────────────────────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.atab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebtn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'pdfs')     loadAllPdfs();
  if (name === 'users')    loadUsers();
  if (name === 'subjects') loadSubjectsTable();
}

// ── Load subjects into dropdowns ──────────────────────────────────
async function loadSubjectsForDropdowns() {
  const res = await fetch('/api/admin/subjects');
  allSubjects = await res.json();

  const options = allSubjects.map(s => `<option value="${s.id}">${s.subject_code} – ${s.subject_name}</option>`).join('');
  const upSel = document.getElementById('up-subject');
  if (upSel) upSel.innerHTML = `<option value="">Select Subject</option>` + options;

  const filterSel = document.getElementById('filter-subj');
  if (filterSel) filterSel.innerHTML = `<option value="">All Subjects</option>` + options;
}

// ── Upload PDF ────────────────────────────────────────────────────
function fileChosen(input) {
  const f = input.files[0];
  if (f) {
    document.getElementById('dz-filename').textContent = `✅  ${f.name}  (${fmtSize(f.size)})`;
    document.getElementById('drop-zone').style.borderColor = 'var(--green)';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('drop-zone');
  if (dz) {
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('over');
      const f = e.dataTransfer.files[0];
      if (f && f.type === 'application/pdf') {
        const input = document.getElementById('pdf-file');
        const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files;
        fileChosen(input);
      } else toast('Only PDF files allowed', 'error');
    });
  }
  init();
});

async function uploadPdf() {
  const subjectId = document.getElementById('up-subject').value;
  const title     = document.getElementById('up-title').value.trim();
  const desc      = document.getElementById('up-desc').value.trim();
  const category  = document.getElementById('up-category').value;
  const file      = document.getElementById('pdf-file').files[0];
  const msgEl     = document.getElementById('up-msg');
  msgEl.textContent = ''; msgEl.className = 'up-msg';

  if (!subjectId) { msgEl.textContent = 'Select a subject.';    msgEl.className = 'up-msg err'; return; }
  if (!title)     { msgEl.textContent = 'Enter a title.';       msgEl.className = 'up-msg err'; return; }
  if (!file)      { msgEl.textContent = 'Choose a PDF file.';   msgEl.className = 'up-msg err'; return; }

  const formData = new FormData();
  formData.append('subject_id', subjectId);
  formData.append('title',      title);
  formData.append('description', desc);
  formData.append('category',   category);
  formData.append('pdf',        file);

  const prog  = document.getElementById('upload-prog');
  const fill  = document.getElementById('prog-fill');
  const label = document.getElementById('prog-label');
  prog.classList.remove('hidden');

  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      const pct = Math.round(e.loaded / e.total * 100);
      fill.style.width = pct + '%';
      label.textContent = `Uploading… ${pct}%`;
    }
  };
  xhr.onload = () => {
    prog.classList.add('hidden'); fill.style.width = '0';
    if (xhr.status === 200) {
      msgEl.textContent = '✅ Uploaded successfully!'; msgEl.className = 'up-msg ok';
      document.getElementById('up-title').value = '';
      document.getElementById('up-desc').value  = '';
      document.getElementById('pdf-file').value = '';
      document.getElementById('dz-filename').textContent = 'PDF only · Max 50MB';
      document.getElementById('drop-zone').style.borderColor = '';
      toast('PDF uploaded!', 'success');
    } else {
      const err = JSON.parse(xhr.responseText);
      msgEl.textContent = '❌ ' + (err.error || 'Upload failed'); msgEl.className = 'up-msg err';
    }
  };
  xhr.onerror = () => { prog.classList.add('hidden'); msgEl.textContent = '❌ Network error'; msgEl.className = 'up-msg err'; };
  xhr.open('POST', '/api/admin/pdfs/upload');
  xhr.send(formData);
}

// ── All PDFs ──────────────────────────────────────────────────────
async function loadAllPdfs() {
  const wrap = document.getElementById('all-pdfs');
  wrap.innerHTML = '<p class="aempty">Loading…</p>';

  const filterVal = document.getElementById('filter-subj')?.value || '';
  let pdfs;

  if (filterVal) {
    const res = await fetch(`/api/subjects/${filterVal}/pdfs`);
    const raw = await res.json();
    const sub = allSubjects.find(s => s.id == filterVal);
    pdfs = raw.map(p => ({ ...p, subject_code: sub?.subject_code, subject_name: sub?.subject_name }));
  } else {
    const res = await fetch('/api/admin/pdfs');
    pdfs = await res.json();
  }

  if (!pdfs.length) { wrap.innerHTML = '<p class="aempty">No PDFs uploaded yet.</p>'; return; }

  wrap.innerHTML = `
    <table class="atable">
      <thead><tr><th>Title</th><th>Subject</th><th>Category</th><th>Size</th><th>Date</th><th></th></tr></thead>
      <tbody>
        ${pdfs.map(p => `
          <tr>
            <td style="font-weight:700;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.title}</td>
            <td style="color:var(--text-2);font-size:0.82rem">${p.subject_code || ''}</td>
            <td><span class="abadge ${catBadge[p.category] || 'abadge-oth'}">${catLabel[p.category] || p.category}</span></td>
            <td style="color:var(--text-3);font-size:0.8rem;font-family:'JetBrains Mono',monospace">${fmtSize(p.file_size)}</td>
            <td style="color:var(--text-3);font-size:0.8rem">${fmtDate(p.uploaded_at)}</td>
            <td><button class="del-btn" onclick="deletePdf(${p.id},'${esc(p.title)}')">Delete</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p style="color:var(--text-3);font-size:0.78rem;margin-top:10px">${pdfs.length} file${pdfs.length !== 1 ? 's' : ''} total</p>
  `;
}

async function deletePdf(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  const res = await fetch(`/api/admin/pdfs/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.success) { toast('PDF deleted'); loadAllPdfs(); }
  else toast(data.error || 'Failed', 'error');
}

// ── Subjects Table ────────────────────────────────────────────────
async function loadSubjectsTable() {
  const wrap = document.getElementById('subj-table');
  if (!wrap) return;
  wrap.innerHTML = '<p class="aempty">Loading…</p>';

  const res = await fetch('/api/admin/subjects');
  const subjects = await res.json();

  if (!subjects.length) { wrap.innerHTML = '<p class="aempty">No subjects yet.</p>'; return; }

  wrap.innerHTML = `
    <table class="atable">
      <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Credits</th><th></th></tr></thead>
      <tbody>
        ${subjects.map(s => `
          <tr>
            <td style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;color:var(--accent)">${s.subject_code}</td>
            <td style="font-weight:700">${s.subject_name}</td>
            <td><span class="abadge ${typeBadge[s.subject_type]}">${typeLabel[s.subject_type]}</span></td>
            <td style="color:var(--text-3);font-size:0.82rem">${s.credits}</td>
            <td><button class="del-btn" onclick="deleteSubject(${s.id},'${esc(s.subject_name)}')">Delete</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function addSubject() {
  const code    = document.getElementById('ns-code').value.trim();
  const name    = document.getElementById('ns-name').value.trim();
  const type    = document.getElementById('ns-type').value;
  const credits = document.getElementById('ns-credits').value;
  const desc    = document.getElementById('ns-desc').value.trim();
  const msgEl   = document.getElementById('ns-msg');
  msgEl.textContent = ''; msgEl.className = 'up-msg';

  if (!code || !name) { msgEl.textContent = 'Code and name are required.'; msgEl.className = 'up-msg err'; return; }

  const res = await fetch('/api/admin/subjects', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject_code: code, subject_name: name, subject_type: type, credits, description: desc })
  });
  const data = await res.json();
  if (data.success) {
    msgEl.textContent = '✅ Subject added!'; msgEl.className = 'up-msg ok';
    document.getElementById('ns-code').value = '';
    document.getElementById('ns-name').value = '';
    document.getElementById('ns-desc').value = '';
    toast('Subject added!');
    loadSubjectsTable();
    loadSubjectsForDropdowns();
  } else { msgEl.textContent = '❌ ' + (data.error || 'Failed'); msgEl.className = 'up-msg err'; }
}

async function deleteSubject(id, name) {
  if (!confirm(`Delete subject "${name}"?\nAll PDFs for this subject will also be deleted.`)) return;
  const res = await fetch(`/api/admin/subjects/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.success) { toast('Subject deleted'); loadSubjectsTable(); loadSubjectsForDropdowns(); }
  else toast(data.error || 'Failed', 'error');
}

// ── Users ─────────────────────────────────────────────────────────
async function loadUsers() {
  const wrap = document.getElementById('users-table');
  if (!wrap) return;
  wrap.innerHTML = '<p class="aempty">Loading…</p>';

  const res = await fetch('/api/admin/users');
  const users = await res.json();

  if (!users.length) { wrap.innerHTML = '<p class="aempty">No users registered yet.</p>'; return; }

  wrap.innerHTML = `
    <table class="atable">
      <thead><tr><th>#</th><th>Name</th><th>College</th><th>Joined</th></tr></thead>
      <tbody>
        ${users.map((u, i) => `
          <tr>
            <td style="color:var(--text-3);font-size:0.8rem">${i + 1}</td>
            <td style="font-weight:700">${u.name}</td>
            <td style="color:var(--text-2)">${u.college}</td>
            <td style="color:var(--text-3);font-size:0.8rem">${fmtDate(u.created_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p style="color:var(--text-3);font-size:0.78rem;margin-top:10px">${users.length} student${users.length !== 1 ? 's' : ''} registered</p>
  `;
}

function esc(str) { return (str || '').replace(/'/g, "\\'"); }
