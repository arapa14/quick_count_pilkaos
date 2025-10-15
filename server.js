import express from "express";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const app = express();
const db = new sqlite3.Database("./db.sqlite");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Buat tabel jika belum ada
db.run(`CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  partner TEXT,
  photo TEXT,
  votes INTEGER DEFAULT 0
)`);

// Setup folder penyimpanan foto
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Route untuk tambah kandidat dengan foto
app.post("/add-candidate", upload.single("photo"), (req, res) => {
  const { name, partner } = req.body;
  const photo = req.file ? "/uploads/" + req.file.filename : null;

  db.run(
    "INSERT INTO candidates (name, partner, photo) VALUES (?, ?, ?)",
    [name, partner, photo],
    (err) => {
      if (err) throw err;
      res.redirect("/admin");
    }
  );
});

// Halaman publik (untuk OBS)
app.get("/", (req, res) => {
  db.all("SELECT * FROM candidates", (err, rows) => {
    if (err) throw err;
    const totalVotes = rows.reduce((a, b) => a + b.votes, 0);
    res.render("index", { candidates: rows, totalVotes });
  });
});

// Halaman admin
app.get("/admin", (req, res) => {
  db.all("SELECT * FROM candidates", (err, rows) => {
    if (err) throw err;
    res.render("admin", { candidates: rows });
  });
});

// Proses update suara
app.post("/update", (req, res) => {
  const { id, votes } = req.body;
  db.run("UPDATE candidates SET votes = ? WHERE id = ?", [votes, id], (err) => {
    if (err) throw err;
    res.redirect("/admin");
  });
});

// Jalankan server
app.listen(3000, () => console.log("✅ Quick Count running at http://localhost:3000"));
