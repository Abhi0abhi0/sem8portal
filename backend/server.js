require('dotenv').config();
const express    = require('express');
const { Pool }   = require('pg');
const session    = require('express-session');
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const path       = require('path');
const fs         = require('fs');
const cors       = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Cloudinary Config ─────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'sem8secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// ── DB Pool (Neon PostgreSQL) ─────────────────────────────
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper: MySQL style query wrapper for PostgreSQL
// Converts ? placeholders to $1, $2... for PostgreSQL
async function query(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  const result = await db.query(pgSql, params);
  return [result.rows];
}

// ── Multer (temp storage) ─────────────────────────────────
const upload = multer({
  dest: '/tmp/uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('PDF only'), false);
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ── Guards ────────────────────────────────────────────────
const requireUser  = (req, res, next) => req.session.userId  ? next() : res.status(401).json({ error: 'Login required' });
const requireAdmin = (req, res, next) => req.session.isAdmin ? next() : res.status(403).json({ error: 'Admin only' });

// ════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════

app.post('/api/auth/login', async (req, res) => {
  const { name, college } = req.body;
  if (!name?.trim() || !college?.trim()) return res.status(400).json({ error: 'Name and college required' });
  try {
    const [rows] = await query('SELECT * FROM users WHERE name=$1 AND college=$2', [name.trim(), college.trim()]);
    let user = rows[0];
    if (!user) {
      const result = await db.query('INSERT INTO users (name,college) VALUES ($1,$2) RETURNING *', [name.trim(), college.trim()]);
      user = result.rows[0];
    }
    req.session.userId      = user.id;
    req.session.userName    = user.name;
    req.session.userCollege = user.college;
    res.json({ success: true, user: { id: user.id, name: user.name, college: user.college } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/auth/me', (req, res) => {
  if (req.session.isAdmin)  return res.json({ loggedIn: true, isAdmin: true });
  if (req.session.userId)   return res.json({ loggedIn: true, user: { id: req.session.userId, name: req.session.userName, college: req.session.userCollege }});
  res.json({ loggedIn: false });
});

app.post('/api/auth/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

// ════════════════════════════════════════════════════════
// SUBJECTS
// ════════════════════════════════════════════════════════

app.get('/api/subjects', requireUser, async (req, res) => {
  const [rows] = await query('SELECT * FROM subjects ORDER BY sort_order, subject_code');
  res.json(rows);
});

app.get('/api/subjects/:id', requireUser, async (req, res) => {
  const [rows] = await query('SELECT * FROM subjects WHERE id=?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// ════════════════════════════════════════════════════════
// PDFs
// ════════════════════════════════════════════════════════

app.get('/api/subjects/:id/pdfs', requireUser, async (req, res) => {
  const [rows] = await query(
    'SELECT id,title,description,category,original_name,file_size,uploaded_at,cloudinary_url FROM pdfs WHERE subject_id=? ORDER BY category,uploaded_at DESC',
    [req.params.id]
  );
  res.json(rows);
});

app.get('/api/pdfs/:id/download', requireUser, async (req, res) => {
  const [rows] = await query('SELECT * FROM pdfs WHERE id=?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.redirect(rows[0].cloudinary_url);
});

app.get('/api/pdfs/:id/dl', requireUser, async (req, res) => {
  const [rows] = await query('SELECT * FROM pdfs WHERE id=?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.redirect(rows[0].cloudinary_url);
});

// ════════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════════

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === (process.env.ADMIN_PASSWORD || 'admin123')) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

app.get('/api/admin/subjects', requireAdmin, async (req, res) => {
  const [rows] = await query('SELECT * FROM subjects ORDER BY sort_order');
  res.json(rows);
});

app.post('/api/admin/subjects', requireAdmin, async (req, res) => {
  const { subject_code, subject_name, subject_type, credits, description } = req.body;
  if (!subject_code || !subject_name) return res.status(400).json({ error: 'Code and name required' });
  const result = await db.query(
    'INSERT INTO subjects (subject_code,subject_name,subject_type,credits,description) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [subject_code, subject_name, subject_type||'core', credits||3, description||'']
  );
  res.json({ success: true, id: result.rows[0].id });
});

app.delete('/api/admin/subjects/:id', requireAdmin, async (req, res) => {
  const [pdfs] = await query('SELECT cloudinary_id FROM pdfs WHERE subject_id=?', [req.params.id]);
  for (const p of pdfs) {
    if (p.cloudinary_id) await cloudinary.uploader.destroy(p.cloudinary_id, { resource_type: 'raw' }).catch(() => {});
  }
  await query('DELETE FROM subjects WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

app.post('/api/admin/pdfs/upload', requireAdmin, upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
  const { subject_id, title, description, category } = req.body;
  if (!subject_id || !title) return res.status(400).json({ error: 'Subject and title required' });

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'raw',
      folder: 'sem8portal',
      public_id: `${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`,
    });
    fs.unlinkSync(req.file.path);
    const r = await db.query(
      'INSERT INTO pdfs (subject_id,title,description,category,filename,original_name,file_size,cloudinary_url,cloudinary_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [subject_id, title, description||'', category||'imp', result.public_id, req.file.originalname, req.file.size, result.secure_url, result.public_id]
    );
    res.json({ success: true, id: r.rows[0].id });
  } catch (e) {
    console.error('Upload error:', e.message);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Upload failed: ' + e.message });
  }
});

app.delete('/api/admin/pdfs/:id', requireAdmin, async (req, res) => {
  const [rows] = await query('SELECT * FROM pdfs WHERE id=?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  if (rows[0].cloudinary_id) {
    await cloudinary.uploader.destroy(rows[0].cloudinary_id, { resource_type: 'raw' }).catch(() => {});
  }
  await query('DELETE FROM pdfs WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/admin/pdfs', requireAdmin, async (req, res) => {
  const [rows] = await query(
    `SELECT p.*,s.subject_code,s.subject_name FROM pdfs p
     JOIN subjects s ON p.subject_id=s.id ORDER BY p.uploaded_at DESC`
  );
  res.json(rows);
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const [rows] = await query('SELECT * FROM users ORDER BY created_at DESC');
  res.json(rows);
});

// ── Serve frontend ─────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/index.html')));

app.listen(PORT, () => {
  console.log(`\n🎓 RGPV 8th Sem Portal → http://localhost:${PORT}`);
  console.log(`🔐 Admin Panel        → http://localhost:${PORT}/admin\n`);
});   