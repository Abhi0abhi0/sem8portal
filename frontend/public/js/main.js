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
  document.querySelectorAll('.theme-icon').forEach(el => {
    el.textContent = theme === 'dark' ? '☀' : '☾';
  });
}

// ── Toast ────────────────────────────────────────────────────────
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Utils ─────────────────────────────────────────────────────────
function fmtSize(b) {
  if (!b) return '';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const catIcon  = { syllabus: '📋', imp: '⭐', notes: '📝', previous_year: '📅', other: '📄' };
const catLabel = { syllabus: 'Syllabus', imp: 'IMP', notes: 'Notes', previous_year: 'Prev Year', other: 'Other' };
const catColor = { syllabus: '#3ecf8e', imp: '#f0a050', notes: '#5b6af5', previous_year: '#a855f7', other: '#9294a8' };

// ── State ─────────────────────────────────────────────────────────
let allSubjects = [];
let currentSubjectId = null;
let allPdfs = [];
let currentPdfCat = 'all';

// ── Particle Canvas (landing bg) ──────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function randomParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    };
  }

  for (let i = 0; i < 120; i++) particles.push(randomParticle());

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const theme = document.documentElement.getAttribute('data-theme');
    const color = theme === 'dark' ? '91,106,245' : '68,85,232';

    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${p.alpha})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${color},${0.07 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  const res  = await fetch('/api/auth/me');
  const data = await res.json();
  if (data.loggedIn && !data.isAdmin) {
    setUser(data.user);
    showApp();
  } else {
    showPage('page-landing');
  }

  // Browser back button support
  window.addEventListener('popstate', function(e) {
    if (e.state?.section === 'home') {
      currentSubjectId = null;
      loadSubjects();
    } else if (e.state?.section === 'subject') {
      openSubject(e.state.id);
    }
  });
}

function setUser(user) {
  document.getElementById('user-av').textContent        = user.name[0].toUpperCase();
  document.getElementById('user-name-nav').textContent  = user.name;
  document.getElementById('user-college-nav').textContent = user.college;
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showApp() {
  showPage('page-app');
  history.replaceState({ section: 'home' }, '', '/');
  loadSubjects();
}

// ── Auth ──────────────────────────────────────────────────────────
async function doLogin() {
  const name    = document.getElementById('inp-name').value.trim();
  const college = document.getElementById('inp-college').value.trim();
  const errEl   = document.getElementById('login-err');
  errEl.textContent = '';

  if (!name)    { errEl.textContent = 'Please enter your name.';    return; }
  if (!college) { errEl.textContent = 'Please enter your college.'; return; }

  const btn = document.querySelector('.cta-btn');
  btn.disabled = true; btn.textContent = 'Opening...';

  try {
    const res  = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, college })
    });
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
      showApp();
    } else {
      errEl.textContent = data.error || 'Something went wrong.';
    }
  } catch { errEl.textContent = 'Server error. Please try again.'; }
  finally  { btn.disabled = false; btn.innerHTML = 'Enter Portal <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'; }
}

async function doLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_college');
  history.replaceState(null, '', '/');
  showPage('page-landing');
  document.getElementById('inp-name').value = '';
  document.getElementById('inp-college').value = '';
  currentSubjectId = null; allSubjects = [];
}

// Enter key on inputs
document.addEventListener('DOMContentLoaded', () => {
  ['inp-name', 'inp-college'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });

  // Filter tabs
  document.getElementById('filter-tabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.ftab');
    if (!btn) return;
    document.querySelectorAll('.ftab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderSubjects(btn.dataset.filter);
  });

  // PDF category tabs
  document.getElementById('pdf-cat-tabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.pcat');
    if (!btn) return;
    document.querySelectorAll('.pcat').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPdfCat = btn.dataset.cat;
    renderPdfs();
  });

  init();
});

// ── Subjects ──────────────────────────────────────────────────────
async function loadSubjects() {
  showSection('sec-home');
  setBreadcrumb([{ label: 'Home', action: 'home' }]);

  const grid = document.getElementById('subjects-grid');
  grid.innerHTML = Array(6).fill(0).map(() =>
    `<div class="subj-card"><div class="skel" style="height:160px;border-radius:12px"></div></div>`
  ).join('');

  const res = await fetch('/api/subjects');
  allSubjects = await res.json();
  renderSubjects('all');
}

function renderSubjects(filter) {
  const grid = document.getElementById('subjects-grid');
  const filtered = filter === 'all' ? allSubjects : allSubjects.filter(s => s.subject_type === filter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="ei">🔍</div><h3>No subjects found</h3></div>`;
    return;
  }

  const typeLabel = { core: 'Core', dept_elective: 'Dept. Elective', open_elective: 'Open Elective' };
  const typeCls   = { core: 'type-core', dept_elective: 'type-dept', open_elective: 'type-open' };

  grid.innerHTML = filtered.map((s, i) => `
    <div class="subj-card" onclick="openSubject(${s.id})" style="animation-delay:${i * 0.05}s">
      <div class="card-top">
        <span class="card-code">${s.subject_code}</span>
        <span class="card-type-badge ${typeCls[s.subject_type]}">${typeLabel[s.subject_type]}</span>
      </div>
      <div class="card-name">${s.subject_name}</div>
      <div class="card-desc">${s.description || ''}</div>
      <div class="card-footer">
        <span class="card-credits">${s.credits} Credits</span>
        <div class="card-arrow">→</div>
      </div>
    </div>
  `).join('');
}

// ── Subject Detail ────────────────────────────────────────────────
async function openSubject(id) {
  history.pushState({ section: 'subject', id }, '', `?subject=${id}`);
  currentSubjectId = id;
  currentPdfCat = 'all';
  document.querySelectorAll('.pcat').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));

  const subj = allSubjects.find(s => s.id === id);
  if (!subj) return;

  showSection('sec-subject');
  setBreadcrumb([
    { label: 'Home', action: 'home' },
    { label: subj.subject_code, action: null }
  ]);

  const typeLabel = { core: 'Core Subject', dept_elective: 'Dept. Elective', open_elective: 'Open Elective' };
  const typeCls   = { core: 'type-core', dept_elective: 'type-dept', open_elective: 'type-open' };

  document.getElementById('subj-code').textContent = subj.subject_code;
  document.getElementById('subj-name').textContent = subj.subject_name;
  document.getElementById('subj-desc').textContent = subj.description || '';
  document.getElementById('subj-credits').textContent = subj.credits + ' Credits';

  const badge = document.getElementById('subj-type-badge');
  badge.textContent = typeLabel[subj.subject_type];
  badge.className = `subj-badge card-type-badge ${typeCls[subj.subject_type]}`;

  const pdfGrid = document.getElementById('pdf-grid');
  pdfGrid.innerHTML = Array(3).fill(0).map(() =>
    `<div class="pdf-row"><div class="skel" style="height:70px;flex:1;border-radius:8px"></div></div>`
  ).join('');

  const res = await fetch(`/api/subjects/${id}/pdfs`);
  allPdfs = await res.json();
  renderPdfs();
}

function renderPdfs() {
  const grid = document.getElementById('pdf-grid');
  const list = currentPdfCat === 'all' ? allPdfs : allPdfs.filter(p => p.category === currentPdfCat);

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="ei">📭</div><h3>No files here yet</h3><p>Admin will upload materials soon.</p></div>`;
    return;
  }

  grid.innerHTML = list.map((p, i) => `
    <div class="pdf-row" style="animation-delay:${i * 0.04}s">
      <div class="pdf-row-icon cat-${p.category}">${catIcon[p.category] || '📄'}</div>
      <div class="pdf-row-info">
        <div class="pdf-row-title">${p.title}</div>
        ${p.description ? `<div class="pdf-row-desc">${p.description}</div>` : ''}
        <div class="pdf-row-meta">
          <span class="pdf-cat-tag" style="background:${catColor[p.category]}22;color:${catColor[p.category]}">${catLabel[p.category]}</span>
          ${p.original_name} ${p.file_size ? '· ' + fmtSize(p.file_size) : ''} · ${fmtDate(p.uploaded_at)}
        </div>
      </div>
      <div class="pdf-row-btns">
        <button class="pdf-btn pdf-btn-view" onclick="viewPdf(${p.id},'${esc(p.title)}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
          View
        </button>
        <a class="pdf-btn pdf-btn-dl" href="/api/pdfs/${p.id}/dl" download>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </a>
      </div>
    </div>
  `).join('');
}

function esc(str) { return (str || '').replace(/'/g, "\\'"); }

// ── PDF Viewer ────────────────────────────────────────────────────
function viewPdf(id, title) {
  window.open(`/api/pdfs/${id}/download`, '_blank');
}

function closePdf() {
  document.getElementById('pdf-overlay').classList.add('hidden');
  document.getElementById('pdf-frame').src = '';
  document.body.style.overflow = '';
}

document.getElementById('pdf-overlay')?.addEventListener('click', function(e) {
  if (e.target === this) closePdf();
});

// ── Navigation ────────────────────────────────────────────────────
function showSection(id) {
  ['sec-home', 'sec-subject'].forEach(s =>
    document.getElementById(s).classList.toggle('hidden', s !== id)
  );
}

function setBreadcrumb(items) {
  const bc = document.getElementById('breadcrumb');
  bc.innerHTML = items.map((item, i) => {
    const isLast = i === items.length - 1;
    return `
      ${i > 0 ? '<span class="bc-sep">›</span>' : ''}
      <span class="bc ${isLast ? 'active' : ''}" ${item.action ? `onclick="${item.action === 'home' ? 'goHome()' : ''}"` : ''}>${item.label}</span>
    `;
  }).join('');
}

function goHome() {
  history.pushState({ section: 'home' }, '', '/');
  currentSubjectId = null;
  loadSubjects();
}