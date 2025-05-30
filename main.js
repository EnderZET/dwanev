import "dotenv/config"; 
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { pool as con, poolSkor as con2 } from "./src/database.js"; // Ensure the correct extension (.js)
import csurf from "csurf";
import { Octokit } from "@octokit/rest";
import cron from "node-cron";
import routes from './routes/routes.js';
import axios from "axios";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

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


async function updateFileContent(path, data, message) {
  try {
    // Get the current content to fetch the SHA
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: path,
    });

    const sha = fileData.sha; // Get the file's SHA

    // Create or update the file with the new content
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: path,
      message: message,
      content: Buffer.from(JSON.stringify(data, null, 4)).toString("base64"), // Convert JSON to base64
      sha: sha, // Include the SHA for the file being updated
    });

    // console.log(`File ${path} berhasil dibuat atau diperbarui:`, response.data);
    console.log(`File ${path} berhasil dibuat atau diperbarui`);

  } catch (error) {
    console.error(`Error saat mengupdate file ${path}:`, error);
  }
}

// Fungsi Sinkronisasi dan Upload
async function syncProcess() {
  const data = await fetchData();
  if (!data) {
    console.log("Gagal menjalankan backup!");
    return;
  }
  const currentDate = new Date();

  const formattedDate = [
    String(currentDate.getDate()).padStart(2, '0'),
    String(currentDate.getMonth() + 1).padStart(2, '0'),
    currentDate.getFullYear()
  ].join('/') + ' ' + [
    String(currentDate.getHours()).padStart(2, '0'),
    String(currentDate.getMinutes()).padStart(2, '0'),
    String(currentDate.getSeconds()).padStart(2, '0')
  ].join(':');
  
  
  await updateFileContent("backups/laporan.json", data.laporanTable, `Add laporan backup ${formattedDate}`);
  await updateFileContent("backups/controldata.json", data.controlData, `Add control backup ${formattedDate}`);
  await updateFileContent("backups/skor.json", data.skorDb, `Add skor backup ${formattedDate}`);
}

// Penjadwalan dengan node-cron untuk menjalankan setiap 10 jam
cron.schedule("* */24 * * *", () => {
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



app.use(async (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.session = req.session;
  res.locals.message = req.session.message;
  await axios.get(`https://api.github.com/gists/${process.env.GIST_ID}`, {headers: {'Authorization': `token ${process.env.GITHUB_TOKEN}`}})
    .then(async response => {
      const gist = response.data;
      const fileContent = gist.files[process.env.GIST_FN].content
  
      const penalties = JSON.parse(fileContent);
      res.locals.penalties = penalties;
      res.locals.p2 = fileContent;

    });
  delete req.session.message;
  next();
});

app.use(express.static("./public"));
// Template Engine
app.set("view engine", "ejs");

// Main Route
app.use(routes);

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
