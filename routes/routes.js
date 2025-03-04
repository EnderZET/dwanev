const express = require("express");
const router = express.Router();
const connection = require("../src/database");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const request = require("sync-request");
const SECRET_KEY = process.env.SECRET_KEY || "RED_AGATE_IS_RED"; // Harus disimpan di ENV
const COOKIE_NAME = "red_agate";

const monthMap = {
  0: "Januari",
  1: "Februari",
  2: "Maret",
  3: "April",
  4: "Mei",
  5: "Juni",
  6: "Juli",
  7: "Agustus",
  8: "September",
  9: "Oktober",
  10: "November",
  11: "Desember",
};

function generateAuthToken() {
  const timestamp = Date.now(); // Timestamp untuk mencegah replay attack
  const data = `red_agate_is_good.${timestamp}`; // Format token
  const hmac = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("hex"); // Buat signature HMAC
  return `${data}.${hmac}`; // Gabungkan data + signature
}
function verifyAuthToken(token) {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [prefix, timestamp, receivedHmac] = parts;
  const data = `${prefix}.${timestamp}`;

  // Cek apakah token sudah kedaluwarsa
  const tokenTime = parseInt(timestamp, 10);
  if (isNaN(tokenTime) || Date.now() - tokenTime > 24 * 60 * 60 * 1000) {
    return false;
  }

  // Validasi HMAC
  const expectedHmac = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("hex");
  return expectedHmac === receivedHmac;
}

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];

  // Jika tidak ada token, redirect ke login
  if (!token || !verifyAuthToken(token)) {
    res.clearCookie(COOKIE_NAME); // Hapus cookie jika tidak valid
    req.session.alertMessage = {
      type: "error",
      message: "Sesi Anda telah kadaluarsa, silakan login kembali!",
    };
    return res.redirect("/login");
  }

  next();
}

function generateRandomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function getMySQLDateTime(timeZone = "Asia/Jakarta") {
  const options = {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const formattedDate = new Date()
    .toLocaleString("en-GB", options) // Use en-GB for correct DD/MM/YYYY order
    .replace(",", ""); // Remove any unexpected comma

  // Rearrange the format to YYYY-MM-DD HH:MM:SS
  return formattedDate.replace(
    /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/,
    "$3-$2-$1 $4:$5:$6"
  );
}

const getWBSCounter = (date) => {
  let d = new Date(date);
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  let firstDay = new Date(year, month - 1, 1);
  let counter = 0;

  for (
    let day = firstDay;
    day.getMonth() + 1 === month;
    day.setDate(day.getDate() + 1)
  ) {
    if (day.getDay() === 5) {
      // Jumat (day index 6)
      counter++;
      if (day.getDate() > d.getDate()) break;
    }
  }

  return counter;
};

// Main Router
router.get("/export", requireAuth, async (req, res) => {
  connection.query(
    `
    SELECT udt, udtmonth, udtyear, situation, reporttitle, reportagent, 
           reportguilties, reporttypesandcauses, knowntimehappened, uploadtime, 
           isonpramday, isedited, edittime
    FROM laporantable
    ORDER BY udtyear DESC, udtmonth DESC, udt DESC
    `,
    (err, results) => {
      if (err) {
        req.session.alertMessage = { type: "error", message: "Gagal mengambil data! Errorcode: "+err.message}
        res.redirect('/dashboard');
      }

      let ringkasan = {};
      results.rows.forEach((row) => {
        let key = `${row.udt}-${row.udtmonth}-${row.udtyear}`;
        if (!ringkasan[key]) {
          ringkasan[key] = {
            udt: row.udt,
            udtMonth: row.udtmonth,
            udtYear: row.udtyear,
            laporan: [],
          };
        }
        ringkasan[key].laporan.push(row);
      });

      res.render("export", {
        ringkasan: Object.values(ringkasan),
        title: "Export | DEWANEV",
      });
    }
  );
});


router.get("/about", requireAuth, async (req, res) => {
  res.render("about", { title: "About | DEWANEV" });
});

router.get("/", requireAuth, async (req, res) => {
  const alertMessage = req.session.alertMessage;
  delete req.session.alertMessage;

  res.render("index", { alertMessage, title: "Home | DEWANEV" });
});

router.get("/login", (req, res) => {
  const token = req.cookies[COOKIE_NAME];

  // Jika tidak ada token, redirect ke login
  if (!token || !verifyAuthToken(token)) {
    let a = 1;
  } else {
    return res.redirect("/dashboard");
  }
  const alertMessage = req.session.alertMessage;
  delete req.session.alertMessage;
  res.render("login", {
    alertMessage,
    csrfToken: res.locals.csrfToken,
    title: "Login | DEWANEV",
  });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('hello');

  try {
      // Fetch the first user from controlData
      const result = await connection.query('SELECT * FROM controlData ORDER BY id LIMIT 1;');
      console.log(result.rows);
      if (result.rows.length === 0) {
          req.session.alertMessage = {
              type: "error",
              message: "Terjadi Error! Data tidak ditemukan.",
          };
          return res.render('login', { alertMessage: req.session.alertMessage, title: "Login | DEWANEV" });
      }

      const user = result.rows[0];
      console.log(user);

      if (user.username === username && bcrypt.compareSync(password, user.pwd)) {
          req.session.user = { username }; // Simpan di session

          const saltRounds = 10;
          bcrypt.genSalt(saltRounds, function (err, salt) {
              bcrypt.hash("accessGranted", salt, function (err, hash) {
                  if (err) {
                      req.session.alertMessage = {
                          type: "error",
                          message: "Terjadi kesalahan saat hashing.",
                      };
                      return res.render('login', { alertMessage: req.session.alertMessage, title: "Login | DEWANEV" });
                  }
                  const token = generateAuthToken(); // Buat token autentikasi
                  res.cookie(COOKIE_NAME, token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }); // Simpan cookie
                  return res.redirect('/dashboard');
              });
          });
          return;
      }

      req.session.alertMessage = {
          type: "error",
          message: "Username / Kata Sandi Salah!",
      };
      res.render('login', { alertMessage: req.session.alertMessage, title: "Login | DEWANEV" });

  } catch (err) {
      req.session.alertMessage = {
          type: "error",
          message: "Terjadi Error! CodeError: " + err.message,
      };
      res.render('login', { alertMessage: req.session.alertMessage, title: "Login | DEWANEV" });
  }
});


// Logout: Hapus session dan cookie
router.get("/logout", (req, res) => {
  res.clearCookie("user");
  req.session.destroy(() => {
    res.redirect("/login", { title: "Login | DEWANEV" });
  });
});

// Lapor routers
router.get("/lapor", requireAuth, (req, res) => {
  res.render("lapor", {
    title: "Lapor | DEWANEV",
    csrfToken: res.locals.csrfToken,
  });
});

router.post("/lapor", requireAuth, (req, res) => {
  let {
    reportTitle,
    knownTimeHappened,
    reportGuilties,
    reportAgent,
    reportTypesAndCauses,
    isPramuka,
    situation,
    isVerified,
  } = req.body;
  
  isVerified = isVerified === "on";
  let udt = getWBSCounter(knownTimeHappened);
  let isOnPramDay = isPramuka === "on";
  let udtMonth = new Date(knownTimeHappened).getMonth();
  let udtYear = new Date(knownTimeHappened).getFullYear();
  let uploadTime = getMySQLDateTime(); // Ensure this function returns a valid timestamp format for PostgreSQL

  connection.query(
    `INSERT INTO laporantable 
    (uid, udt, udtmonth, udtyear, situation, uploadtime, knowntimehappened, 
    reporttitle, reportguilties, reportagent, isverified, isonpramday, 
    reporttypesandcauses, isedited) 
    VALUES 
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      generateRandomString(16),
      udt,
      monthMap[udtMonth],
      udtYear,
      situation,
      uploadTime,
      knownTimeHappened,
      reportTitle,
      reportGuilties,
      reportAgent,
      isVerified,
      isOnPramDay,
      reportTypesAndCauses,
      false,
    ],
    (err, results) => {
      if (err) {
        console.log(err);
        req.session.alertMessage = {
          type: "error",
          message: "Gagal mengirim laporan! CodeError: " + err.message,
        };
        return res.redirect("/dashboard");
      }
      if (results.rowCount > 0) {
        req.session.alertMessage = {
          type: "success",
          message: "Laporan berhasil dikirim!",
        };
      } else {
        req.session.alertMessage = {
          type: "error",
          message: "Laporan gagal dikirim, tidak ada perubahan data!",
        };
      }
      res.redirect("/dashboard");
    }
  );
});

// Edit routers
router.get("/edit/:uid", requireAuth, (req, res) => {
  const uid = req.params.uid;
  connection.query(
    "SELECT * FROM LaporanTable WHERE uid = $1",
    [uid],
    (err, results) => {
      if (err) throw err;
      res.render("edit", {
        title: "Edit Report | DEWANEV",
        data: results.rows[0],
        csrfToken: res.locals.csrfToken,
      });
    }
  );
});

router.post("/edit/:uid", requireAuth, (req, res) => {
  const uid = req.params.uid;
  const {
    reportTitle,
    knownTimeHappened,
    reportGuilties,
    reportAgent,
    reportTypesAndCauses,
    isScoutEvent,
    situation,
  } = req.body;

  // Konversi knownTimeHappened ke WBS format
  let date = new Date(knownTimeHappened);
  let udt = getWBSCounter(knownTimeHappened);
  let udtMonth = monthMap[date.getMonth()];
  let udtYear = date.getFullYear();
  let isOnPramDay = isScoutEvent === "on";

  // Lanjutkan dengan update database...
  // console.log("Data yang dikirim:", req.body);
  console.log(getMySQLDateTime());
  connection.query(
    `UPDATE laporantable 
    SET udt = $1, udtmonth = $2, udtyear = $3, situation = $4, 
        knowntimehappened = $5, reporttitle = $6, reportguilties = $7, 
        reportagent = $8, isonpramday = $9, reporttypesandcauses = $10, 
        isedited = $11, edittime = $12 
    WHERE uid = $13`,
    [
      udt,
      udtMonth,
      udtYear,
      situation,
      knownTimeHappened,
      reportTitle,
      reportGuilties,
      reportAgent,
      isOnPramDay,
      reportTypesAndCauses,
      true,
      getMySQLDateTime(),
      uid,
    ],
    (err, results) => {
      if (err) {
        console.log(err);
        req.session.alertMessage = {
          type: "error",
          message: "Gagal mengedit laporan! CodeError: " + err.message,
        };
        res.redirect("/dashboard");
      }
      if (results.rowCount > 0) {
        req.session.alertMessage = {
          type: "success",
          message: "Laporan berhasil diedit!",
        };
        res.redirect("/dashboard");
      }
    }
  );
});
router.post("/verify", requireAuth, (req, res) => {
  const uid = req.body.uid;

  // Proses verifikasi di database...
  connection.query(
    "UPDATE laporantable SET isverified = TRUE WHERE uid = $1",
    [uid],
    (err, results) => {
      if (err) {
        req.session.alertMessage = {
          type: "error",
          message: "Gagal memverifikasi laporan! CodeError: " + err.message,
        };
        return res.redirect("/dashboard");
      }
      if (results.rowCount > 0) {
        req.session.alertMessage = {
          type: "success",
          message: "Laporan berhasil diverifikasi!",
        };
      } else {
        req.session.alertMessage = {
          type: "error",
          message: "Laporan tidak ditemukan atau sudah diverifikasi!",
        };
      }
      res.redirect("/dashboard");
    }
  );
});

// Verifikasi routers
router.post("/unverify", requireAuth, (req, res) => {
  const uid = req.body.uid;

  // Proses verifikasi di database...
  connection.query(
    'UPDATE LaporanTable SET "isverified" = false WHERE "uid" = $1',
    [uid],
    (err, results) => {
      if (err) {
        req.session.alertMessage = {
          type: "error",
          message:
            "Gagal membatalkan verifikasi laporan! CodeError: " + err.message,
        };
        return res.redirect("/dashboard");
      }
      if (results.rowCount > 0) {
        req.session.alertMessage = {
          type: "success",
          message: "Laporan berhasil dibatalkan verifikasi-Nya!",
        };
      } else {
        req.session.alertMessage = {
          type: "error",
          message: "Laporan tidak ditemukan atau sudah tidak terverifikasi.",
        };
      }
      res.redirect("/dashboard");
    }
  );
});


// Delete routers
router.post("/delete", requireAuth, (req, res) => {
  const { uid } = req.body;
  connection.query(
    "DELETE FROM LaporanTable WHERE uid = $1",
    [uid],
    (err, results) => {
      if (err) {
        req.session.alertMessage = {
          type: "error",
          message: "Gagal menghapus laporan! CodeError: " + err.message,
        };
        return res.redirect("/dashboard");
      }
      if (results.rowCount > 0) {
        req.session.alertMessage = {
          type: "success",
          message: "Laporan berhasil dihapus!",
        };
      } else {
        req.session.alertMessage = {
          type: "error",
          message: "Laporan tidak ditemukan atau sudah dihapus.",
        };
      }
      res.redirect("/dashboard");
    }
  );
});


// Dashboard routers
router.get("/dashboard", requireAuth, async (req, res) => {
  const sortOption = req.query.sort || "latest"; // Default: terbaru
  let orderByClause = "ORDER BY uploadtime DESC"; // Default: terbaru
  
  switch (sortOption) {
    case "oldest":
      orderByClause = "ORDER BY uploadtime ASC";
      break;
    case "mostGuilties":
      orderByClause =
        "ORDER BY LENGTH(reportguilties) - LENGTH(REPLACE(reportguilties, ',', '')) DESC";
      break;
    case "mostAgents":
      orderByClause =
        "ORDER BY LENGTH(reportagent) - LENGTH(REPLACE(reportagent, ',', '')) DESC";
      break;
    case "nearestTime":
      orderByClause =
        "ORDER BY ABS(EXTRACT(EPOCH FROM knowntimehappened::timestamp - NOW())) ASC";
      break;
    case "verified":
      orderByClause = "ORDER BY isverified DESC";
      break;
  }
  
  const alertMessage = req.session.alertMessage;
  delete req.session.alertMessage;
  let page = parseInt(req.query.page) || 1;
  let limit = 8;
  let offset = (page - 1) * limit;
  let search = req.query.search || ""; // Ambil nilai pencarian
  
  let countQuery =
    `SELECT COUNT(*) AS total FROM laporantable WHERE reporttitle ILIKE $1`;
  let dataQuery = `SELECT * FROM laporantable WHERE reporttitle ILIKE $1 ${orderByClause} LIMIT $2 OFFSET $3`;
  
  try {
    const countResult = await connection.query(countQuery, [`%${search}%`]);
    let totalRecords = countResult.rows[0].total;
    let totalPages = Math.ceil(totalRecords / limit);
  
    const results = await connection.query(dataQuery, [`%${search}%`, limit, offset]);
  
    res.render("dashboard", {
      data: results.rows,
      totalPages,
      currentPage: page,
      searchQuery: search, // Kirimkan searchQuery agar bisa dipakai di frontend
      title: "Dashboard | DEWANEV",
      csrfToken: res.locals.csrfToken,
      alertMessage,
    });
  } catch (err) {
    req.session.alertMessage = {
      type: "error",
      message: "Gagal Menampilkan Data! CodeError: " + err.message,
    };
    res.redirect("/");
  }
});  

router.use("/ada_sesuatu_yang_aneh", (req, res) => {
  res.render("error", { error: 500, title: "??? | DEWANEV", easter_egg: true });
});

module.exports = router;
