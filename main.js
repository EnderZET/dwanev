require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { pool: con, poolSkor: con2 } = require("./src/database");
const csurf = require("csurf");
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const cron = require("node-cron");

const app = express();
const port = process.env.PORT || 3000;

// Utilites

// Ambil Data dari PostgreSQL
async function fetchData() {
  try {
    const { rows: laporanTable } = await con.query(
      "SELECT * FROM laporantable"
    );
    const { rows: controlData } = await con.query("SELECT * FROM controldata");

    const { rows: skorDb } = await con2.query("SELECT * FROM skor");

    return { laporanTable, controlData, skorDb };
  } catch (err) {
    console.error("Error fetching data:", err);
    return null;
  }
}

function upData(data) {
  octokit.rest.repos.createOrUpdateFileContents({
    owner: process.env.GITHUB_REPO_OWNER,
    repo: process.env.GITHUB_REPO_NAME,
    path: "backups/laporan.json", // Nama file dan path dalam repositori
    message: "Add laporan backup",
    content: Buffer.from(JSON.stringify(data.laporanTable, null, 4)).toString("base64"), // Mengonversi JSON ke dalam format base64 untuk API
  }).then(response => {
    console.log('File laporan.json dibuat atau diperbarui:', response.data);
  })
  .catch(error => {
    console.error('Error (LAPORAN):', error);
  });
  octokit.rest.repos.createOrUpdateFileContents({
    owner: process.env.GITHUB_REPO_OWNER,
    repo: process.env.GITHUB_REPO_NAME,
    path: "backups/controldata.json", // Nama file dan path dalam repositori
    message: "Add control backup",
    content: Buffer.from(JSON.stringify(data.controlData, null, 4)).toString("base64"), // Mengonversi JSON ke dalam format base64 untuk API
  }).then(response => {
    console.log('File controldata.json dibuat atau diperbarui:', response.data);
  })
  .catch(error => {
    console.error('Error (CDATA):', error);
  });

  octokit.rest.repos.createOrUpdateFileContents({
    owner: process.env.GITHUB_REPO_OWNER,
    repo: process.env.GITHUB_REPO_NAME,
    path: "backups/skor.json", // Nama file dan path dalam repositori
    message: "Add skor backup",
    content: Buffer.from(JSON.stringify(data.skorDb, null, 4)).toString("base64"), // Mengonversi JSON ke dalam format base64 untuk API

  }).then(response => {
    console.log('File skor.json berhasil dibuat atau diperbarui:', response.data);
  })
  .catch(error => {
    console.error('Error (SKOR):', error);
  });
}

// Fungsi Sinkronisasi dan Upload
async function syncProcess() {
  const data = await fetchData();
  if (!data) {
    console.log("Gagal menjalankan backup!");
    return;
  }

  await upData(data);
}

// Penjadwalan dengan node-cron untuk menjalankan setiap 10 jam
cron.schedule("10 53 13 * * *", () => {
  console.log("📌 Menjalankan proses sinkronisasi...");
  syncProcess();
});

// Use Middleware
const sessionStore = new session.MemoryStore();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(cookieParser());

const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

app.use(
  session({
    name: process.env.SESSION_NAME,
    secret: process.env.SESSION_SECRET, // Gunakan secret dari .env
    resave: false,
    saveUninitialized: false, // Hanya simpan session jika ada perubahan
    cookie: {
      httpOnly: true, // Mencegah akses cookie dari JavaScript (meningkatkan keamanan)
      secure: false, // Set ke true jika menggunakan HTTPS
      maxAge: 1000 * 60 * 60 * 24, // Cookie berlaku selama 1 hari
    },
    store: sessionStore,
  })
);

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.session = req.session;
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

app.use(express.static("./public"));
// Template Engine
app.set("view engine", "ejs");

// Main Route
app.use(require("./routes/routes"));

app.use((req, res) => {
  res.render("error", {
    error: 404,
    message: "Halaman tidak ditemukan!",
    title: "404 | DEWANEV",
    easter_egg: false,
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.render("error", {
    error: 500,
    message: "Server Internal mengalami Error!",
    title: "500 | DEWANEV",
    easter_egg: false,
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
