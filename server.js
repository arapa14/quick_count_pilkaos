import express from "express";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const app = express();
const db = new sqlite3.Database("./db.sqlite", (err) => {
  if (err) console.error("❌ Database connection failed:", err.message);
  else console.log("✅ Connected to SQLite database.");
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Middleware error handler
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Tabel kandidat (tanpa pasangan)
db.run(`
  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    photo TEXT,
    votes INTEGER DEFAULT 0
  )
`);

// Multer setup
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, "public/uploads"),
  filename: (_, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ➕ Tambah calon
app.post("/add-candidate", upload.single("photo"), asyncHandler(async (req, res) => {
  const { name } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(
    "INSERT INTO candidates (name, photo) VALUES (?, ?)",
    [name, photo],
    (err) => {
      if (err) {
        console.error("Error inserting candidate:", err);
        return res.status(500).send("Gagal menambah calon.");
      }
      res.redirect("/admin");
    }
  );
}));

// Halaman publik (untuk OBS)
// app.js (potongan)
app.get("/", (req, res) => {
  db.all("SELECT * FROM candidates", (err, rows) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).send("Terjadi kesalahan database");
    }

    // Hitung total suara sekarang
    const totalVotes = rows.reduce((sum, r) => sum + (Number(r.votes) || 0), 0);

    // Konfigurasi total maksimal suara
    const totalMax = 1539;

    // Hitung persentase data masuk, clamp antara 0 - 100, dan konversi jadi Number
    let percentData = totalMax > 0 ? (totalVotes / totalMax) * 100 : 0;
    if (!isFinite(percentData) || Number.isNaN(percentData)) percentData = 0;
    percentData = Math.max(0, Math.min(100, percentData));
    // Bulatkan 1 desimal
    percentData = Math.round(percentData * 10) / 10;

    // Kirim semua ke view
    res.render("index", {
      candidates: rows,
      totalVotes,
      totalMax,
      percentData, // pastikan tersedia dan bertipe Number
    });
  });
});


app.get("/break", (req, res) => {
  db.all("SELECT * FROM candidates", (err, rows) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).send("Terjadi kesalahan database");
    }

    // Hitung total suara sekarang
    const totalVotes = rows.reduce((sum, r) => sum + (Number(r.votes) || 0), 0);

    // Konfigurasi total maksimal suara
    const totalMax = 1539;

    // Hitung persentase data masuk, clamp antara 0 - 100, dan konversi jadi Number
    let percentData = totalMax > 0 ? (totalVotes / totalMax) * 100 : 0;
    if (!isFinite(percentData) || Number.isNaN(percentData)) percentData = 0;
    percentData = Math.max(0, Math.min(100, percentData));
    // Bulatkan 1 desimal
    percentData = Math.round(percentData * 10) / 10;

    // Kirim semua ke view
    res.render("break", {
      candidates: rows,
      totalVotes,
      totalMax,
      percentData, // pastikan tersedia dan bertipe Number
    });
  });
});



// 🧩 Halaman admin
app.get("/admin", asyncHandler(async (req, res) => {
  db.all("SELECT * FROM candidates", (err, rows) => {
    if (err) {
      console.error("Error loading admin data:", err);
      return res.status(500).send("Gagal memuat halaman admin.");
    }
    res.render("admin", { candidates: rows });
  });
}));

// 🔄 Update suara
app.post("/update", asyncHandler(async (req, res) => {
  const { id, votes } = req.body;
  db.run("UPDATE candidates SET votes = ? WHERE id = ?", [votes, id], (err) => {
    if (err) {
      console.error("Error updating votes:", err);
      return res.status(500).send("Gagal memperbarui suara.");
    }
    res.redirect("/admin");
  });
}));

// Middleware global error handler
app.use((err, req, res, next) => {
  console.error("⚠️ Uncaught error:", err);
  res.status(500).send("Terjadi kesalahan pada server.");
});

// Jalankan server
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🚀 Quick Count running at http://localhost:${PORT}`)
);
