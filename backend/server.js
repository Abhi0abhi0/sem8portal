require('dotenv').config();
const express    = require('express');
const mysql      = require('mysql2/promise');
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

// ── DB Pool ───────────────────────────────────────────────
const db = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || '',
  database:         process.env.DB_NAME     || 'sem8portal',
  port:             process.env.DB_PORT     || 3306,
  waitForConnections: true,
  connectionLimit:  10,
  ssl: process.env.DB_HOST?.includes('aivencloud') ? { rejectUnauthorized: false } : false,
});

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
    const [rows] = await db.query('SELECT * FROM users WHERE name=? AND college=?', [name.trim(), college.trim()]);
    let user = rows[0];
    if (!user) {
      const [r] = await db.query('INSERT INTO users (name,college) VALUES (?,?)', [name.trim(), college.trim()]);
      user = { id: r.insertId, name: name.trim(), college: college.trim() };
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
  const [rows] = await db.query('SELECT * FROM subjects ORDER BY sort_order, subject_code');
  res.json(rows);
});

app.get('/api/subjects/:id', requireUser, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM subjects WHERE id=?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// ════════════════════════════════════════════════════════
// PDFs
// ════════════════════════════════════════════════════════

app.get('/api/subjects/:id/pdfs', requireUser, async (req, res) => {
  const [rows] = await db.query(
    'SELECT id,title,description,category,original_name,file_size,uploaded_at,cloudinary_url FROM pdfs WHERE subject_id=? ORDER BY category,uploaded_at DESC',
    [req.params.id]
  );
  res.json(rows);
});

// View PDF (redirect to Cloudinary URL)
app.get('/api/pdfs/:id/download', requireUser, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM pdfs WHERE id=?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.redirect(rows[0].cloudinary_url);
});

// Download PDF
app.get('/api/pdfs/:id/dl', requireUser, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM pdfs WHERE id=?', [req.params.id]);
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
  const [rows] = await db.query('SELECT * FROM subjects ORDER BY sort_order');
  res.json(rows);
});

app.post('/api/admin/subjects', requireAdmin, async (req, res) => {
  const { subject_code, subject_name, subject_type, credits, description } = req.body;
  if (!subject_code || !subject_name) return res.status(400).json({ error: 'Code and name required' });
  const [r] = await db.query(
    'INSERT INTO subjects (subject_code,subject_name,subject_type,credits,description) VALUES (?,?,?,?,?)',
    [subject_code, subject_name, subject_type||'core', credits||3, description||'']
  );
  res.json({ success: true, id: r.insertId });
});

app.delete('/api/admin/subjects/:id', requireAdmin, async (req, res) => {
  // Delete from cloudinary too
  const [pdfs] = await db.query('SELECT cloudinary_id FROM pdfs WHERE subject_id=?', [req.params.id]);
  for (const p of pdfs) {
    if (p.cloudinary_id) await cloudinary.uploader.destroy(p.cloudinary_id, { resource_type: 'raw' }).catch(() => {});
  }
  await db.query('DELETE FROM subjects WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Upload PDF to Cloudinary
app.post('/api/admin/pdfs/upload', requireAdmin, upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
  const { subject_id, title, description, category } = req.body;
  if (!subject_id || !title) return res.status(400).json({ error: 'Subject and title required' });

  try {
    console.log('=== CLOUDINARY UPLOAD START ===');
    console.log('File path:', req.file.path);
    console.log('Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'raw',
      folder: 'sem8portal',
      public_id: `${Date.now()}_${req.file.originalname.replace(/\s/g, '_')}`,
    });

    // Delete temp file
    fs.unlinkSync(req.file.path);

    // Save to DB
    const [r] = await db.query(
      'INSERT INTO pdfs (subject_id,title,description,category,filename,original_name,file_size,cloudinary_url,cloudinary_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [subject_id, title, description||'', category||'imp', result.public_id, req.file.originalname, req.file.size, result.secure_url, result.public_id]
    );
    res.json({ success: true, id: r.insertId });
  } catch (e) {
    console.error(e);
    console.error('=== CLOUDINARY ERROR ===', e.message);
    console.error('Full error:', JSON.stringify(e));
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Upload failed: ' + e.message });
  }
});

// Delete PDF
app.delete('/api/admin/pdfs/:id', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM pdfs WHERE id=?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  // Delete from Cloudinary
  if (rows[0].cloudinary_id) {
    await cloudinary.uploader.destroy(rows[0].cloudinary_id, { resource_type: 'raw' }).catch(() => {});
  }
  await db.query('DELETE FROM pdfs WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/admin/pdfs', requireAdmin, async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.*,s.subject_code,s.subject_name FROM pdfs p
     JOIN subjects s ON p.subject_id=s.id ORDER BY p.uploaded_at DESC`
  );
  res.json(rows);
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM users ORDER BY created_at DESC');
  res.json(rows);
});

// ── Serve frontend ─────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/index.html')));

app.listen(PORT, () => {
  console.log(`\n🎓 RGPV 8th Sem Portal → http://localhost:${PORT}`);
  console.log(`🔐 Admin Panel        → http://localhost:${PORT}/admin\n`);
});