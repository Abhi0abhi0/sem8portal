# 🎓 SemVault — RGPV 8th Semester CS Study Portal

Full-stack web app for RGPV CS 8th Semester students.
**Stack:** Node.js · Express · MySQL · Vanilla HTML/CSS/JS

---

## 📁 Project Structure

```
sem8portal/
├── database.sql              ← Run this FIRST in MySQL
├── backend/
│   ├── server.js             ← Express server (all API routes)
│   ├── package.json
│   ├── .env.example          ← Copy to .env and configure
│   └── uploads/              ← PDFs stored here (auto-created)
└── frontend/
    └── public/
        ├── index.html        ← Student portal
        ├── admin.html        ← Admin panel
        ├── css/
        │   ├── main.css
        │   └── admin.css
        └── js/
            ├── main.js
            └── admin.js
```

---

## 🚀 Setup (5 Steps)

### Step 1 — Requirements
- **Node.js** v18+  →  https://nodejs.org
- **MySQL** 8+      →  https://mysql.com (or XAMPP/WAMP)

### Step 2 — Database
Open MySQL Workbench / phpMyAdmin / terminal and run:
```sql
source /full/path/to/sem8portal/database.sql
```
Or paste the contents of `database.sql` directly.

### Step 3 — Configure
```bash
cd backend
cp .env.example .env
```
Edit `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sem8portal
PORT=3000
SESSION_SECRET=any_random_string_here
ADMIN_PASSWORD=admin123
```
> ⚠️ Change `ADMIN_PASSWORD` to something secure!

### Step 4 — Install & Run
```bash
cd backend
npm install
npm start
```

For development (auto-restart on changes):
```bash
npm run dev
```

### Step 5 — Open Browser
| Page | URL |
|------|-----|
| Student Portal | http://localhost:3000 |
| Admin Panel | http://localhost:3000/admin |

---

## 👤 Student Flow
1. Go to `http://localhost:3000`
2. Enter **Name** + **College** (no password)
3. Browse all 9 subjects of 8th Semester
4. Filter by: All / Core / Dept. Elective / Open Elective
5. Click a subject → view PDFs by category (IMP, Notes, Syllabus, etc.)
6. **View** PDFs inline or **Download** them

---

## 🔐 Admin Flow
1. Go to `http://localhost:3000/admin`
2. Enter admin password (set in `.env`)
3. Tabs:
   - **Upload PDF** — Select subject, category, title → upload file
   - **All PDFs** — View / delete uploaded files (filter by subject)
   - **Subjects** — Add or delete subjects
   - **Users** — See registered students

---

## 📚 Pre-loaded 8th Sem Subjects (RGPV CS)

| Code | Subject | Type |
|------|---------|------|
| CS801 | Internet of Things | Core |
| CS802-A | Block Chain Technologies | Dept. Elective |
| CS802-B | Cloud Computing | Dept. Elective |
| CS802-C | High Performance Computing | Dept. Elective |
| CS802-D | Object Oriented Software Engineering | Dept. Elective |
| CS803-A | Image Processing and Computer Vision | Open Elective |
| CS803-B | Game Theory with Engineering Applications | Open Elective |
| CS803-C | Internet of Things (Open) | Open Elective |
| CS803-D | Managing Innovation and Entrepreneurship | Open Elective |

---

## 🌐 Deploy Live (Free Options)

### Option A — Railway (Easiest)
1. Push to GitHub
2. New project at https://railway.app → Deploy from GitHub
3. Add MySQL plugin
4. Set env vars in Railway dashboard → Deploy

### Option B — Render + PlanetScale
1. Free MySQL at https://planetscale.com
2. Free web service at https://render.com
3. Set env vars → Deploy

### Option C — Local network (share with classmates)
```bash
# Find your local IP
ipconfig   # Windows
ifconfig   # Mac/Linux

# Start server — classmates on same WiFi can access:
# http://YOUR_IP:3000
npm start
```

---

## ✨ Features
- 🌙 Dark / ☀️ Light mode toggle (saved in localStorage)
- Animated particle background on landing
- Filter subjects by type (Core / Dept. / Open Elective)
- PDF viewer inline + download
- Filter PDFs by category (IMP / Syllabus / Notes / Previous Year)
- Admin panel with drag & drop upload + progress bar
- No password for students — just name + college
- Session lasts 7 days
