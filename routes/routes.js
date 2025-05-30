import express from "express";
import {
  pool as connection,
  poolSkor as connectionSkor,
} from "../src/database.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import he from "he";
dotenv.config();
const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;
const COOKIE_NAME = process.env.COOKIE_NAME;

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

function formatScore(score) {
  console.log(score)
  const result = Math.round(score * 100) / 100;
  return Number.isInteger(result) ? result : result;
}

function generateAuthToken(perm = "score_viewer") {
  const timestamp = Date.now(); // Timestamp untuk mencegah replay attack
  const data = `${perm}.${timestamp}`; // Format token
  const hmac = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("hex"); // Buat signature HMAC
  return `${data}.${hmac}`; // Gabungkan data + signature
}
function verifyAuthToken(req, token) {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [perm, timestamp, receivedHmac] = parts;
  const data = `${perm}.${timestamp}`;
  req.session.RedAgateIsBeautiful = perm;

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
  if (!token || !verifyAuthToken(req, token)) {
    res.clearCookie(COOKIE_NAME); // Hapus cookie jika tidak valid
    req.session.alertMessage = {
      type: "error",
      message:
        "Sesi Anda telah kadaluarsa/Anda tidak memiliki akses, silakan login kembali!",
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
  if (req.session.RedAgateIsBeautiful == "score_viewer") {
    req.session.alertMessage = {
      type: "error",
      message: "Anda tidak memiliki akses ke halaman ini!",
    };
    return res.redirect("/");
  }
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
        req.session.alertMessage = {
          type: "error",
          message: "Gagal mengambil data! Errorcode: " + err.message,
        };
        res.redirect("/dashboard");
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
        perm: req.session.RedAgateIsBeautiful,
      });
    }
  );
});

router.get("/about", requireAuth, async (req, res) => {
  res.render("about", {
    title: "About | DEWANEV",
    perm: req.session.RedAgateIsBeautiful,
  });
});

router.get("/", requireAuth, async (req, res) => {
  const alertMessage = req.session.alertMessage;
  delete req.session.alertMessage;

  res.render("index", {
    alertMessage,
    title: "Home | DEWANEV",
    perm: req.session.RedAgateIsBeautiful,
  });
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

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Fetch the first user from controlData
    const result = await connection.query(
      "SELECT * FROM controldata WHERE username = $1",
      [username]
    );
    if (result.rows.length === 0) {
      let alertMessage = {
        type: "error",
        message: "Tidak ada User: " + username,
      };
      return res.render("login", { alertMessage, title: "Login | DEWANEV" });
    }

    const user = result.rows[0];

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
            let alertMessage = req.session.alertMessage;
            delete req.session.alertMessage;
            return res.render("login", {
              alertMessage,
              title: "Login | DEWANEV",
            });
          }
          const token = generateAuthToken(user.perm); // Buat token autentikasi
          res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24,
          }); // Simpan cookie
          delete req.session.alertMessage;
          return res.redirect("/");
        });
      });
      return;
    }

    let alertMessage = {
      type: "error",
      message: "Username / Kata Sandi Salah!",
    };
    res.render("login", { alertMessage, title: "Login | DEWANEV" });
  } catch (err) {
    let alertMessage = {
      type: "error",
      message: "Terjadi Error! CodeError: " + err.message,
    };
    res.render("login", { alertMessage, title: "Login | DEWANEV" });
  }
});

// Logout: Hapus session dan cookie
router.get("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  req.session.destroy((err) => {
    if (err) {
      req.session.alertMessage({
        type: "error",
        message: "Tidak bisa log-out: " + err.message,
      });
      return res.redirect("/");
    }
    res.redirect("/login");
  });
});

// Lapor routers
router.get("/lapor", requireAuth, (req, res) => {
  if (req.session.RedAgateIsBeautiful == "score_viewer") {
    req.session.alertMessage = {
      type: "error",
      message: "Anda tidak memiliki akses ke halaman ini!",
    };
    return res.redirect("/");
  }
  res.render("lapor", {
    title: "Lapor | DEWANEV",
    csrfToken: res.locals.csrfToken,
    perm: req.session.RedAgateIsBeautiful,
    penalties: he.decode(res.locals.p2),
  });
});

router.post("/lapor", requireAuth, (req, res) => {
  if (req.session.RedAgateIsBeautiful == "score_viewer") {
    req.session.alertMessage = {
      type: "error",
      message: "Anda tidak memiliki akses ke halaman ini!",
    };
    return res.redirect("/");
  }
  console.log(req.body);
  let {
    reportTitle,
    knownTimeHappened,
    reportGuilties,
    violations,
    reportAgent,
    reportTypesAndCauses,
    isPramuka,
    situation,
    isVerified,
  } = req.body;

  console.log(req.body);
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
    reporttypesandcauses, isedited, tipePelanggaran) 
    VALUES 
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
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
      violations ? violations.join(", ") : "", // Pastikan tipePelanggaran diisi jika ada
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
  if (req.session.RedAgateIsBeautiful == "score_viewer") {
    req.session.alertMessage = {
      type: "error",
      message: "Anda tidak memiliki akses ke halaman ini!",
    };
    return res.redirect("/");
  }
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
        perm: req.session.RedAgateIsBeautiful,
      });
    }
  );
});

router.post("/edit/:uid", requireAuth, (req, res) => {
  if (req.session.RedAgateIsBeautiful == "score_viewer") {
    req.session.alertMessage = {
      type: "error",
      message: "Anda tidak memiliki akses ke halaman ini!",
    };
    return res.redirect("/");
  }
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
  if (req.session.RedAgateIsBeautiful == "score_viewer") {
    req.session.alertMessage = {
      type: "error",
      message: "Anda tidak memiliki akses ke halaman ini!",
    };
    return res.redirect("/");
  }
  const uid = req.body.uid;

  // Kita perlu olah Guilties
  // - Awalnya kan: NAMA   KELAS   (STATUS)
  // - Contoh: Asomaso 7K (GDP)
  connection.query(
    "SELECT reportguilties, tipepelanggaran, isonpramday FROM laporantable WHERE uid = $1",
    [uid],
    async (err, results) => {
      if (err) {
        req.session.alertMessage = {
          type: "error",
          message: "Gagal mengambil data laporan! CodeError: " + err.message,
        };
        return res.redirect("/dashboard");
      }
      if (results.rowCount === 0) {
        req.session.alertMessage = {
          type: "error",
          message: "Laporan tidak ditemukan!",
        };
        return res.redirect("/dashboard");
      }

      const reportGuilties = results.rows[0].reportguilties;
      const tipePelanggaran = results.rows[0].tipepelanggaran;
      const apakahSaatPramuka = Boolean(results.rows[0].isonpramday);


      // Asumsi penalties sudah didecode di res.locals.p2
      const penalties = res.locals.penalties;

      // Pisah nama terdakwa (misal "1. Iqbal Ramdhan, 2. Yusuf Hasibuan")
      // dan hapus nomor depan "1.", "2." dll
      const guiltiesArray = reportGuilties
        .split(",")
        .map((g) => g.trim().replace(/^\d+\.\s*/, ""));

      try {
        let min;
        for (const input of guiltiesArray) {
          // Ambil status dari dalam ()
          const statusMatch = input.match(/\(([^)]+)\)$/);
          const status = statusMatch ? statusMatch[1] : "";

          // Hapus kelas + status (misal ' 7B (GDP)') dari input untuk dapat nama bersih
          const nama = input.replace(/\s*\d+[A-Z]?\s*\([^)]+\)$/, "").trim();
          // console.log(`<<<<<<<<<<<<<<<<<<<< Base input: ${input}`)
          // console.log(`>>>>>>>>>>>>>>>>>>>> Terdeteksi nama: ${nama} dengan status: ${status}`);


          // Ambil skor sekarang dari DB
          const skorResults = await new Promise((resolve, reject) => {
            connectionSkor.query(
              "SELECT skor FROM skor WHERE nama = $1",
              [nama],
              (err, skorResults) => {
                if (err) return reject(err);
                resolve(skorResults);
              }
            );
          });

          if (skorResults.rowCount === 0) {
            req.session.alertMessage = {
              type: "error",
              message: "Data skor tidak ditemukan untuk nama: " + nama,
            };
            return res.redirect("/dashboard");
          }

          let currentScore = skorResults.rows[0].skor;

          // Kurangi skor berdasarkan tipePelanggaran
          if (tipePelanggaran) {
            tipePelanggaran.split(",").forEach((pelanggaran) => {
              pelanggaran = pelanggaran.trim();
              console.log('==============================')
              if (penalties[pelanggaran]) {
                let pelg = parseInt(penalties[pelanggaran].poin);
                if (status === "GDP") {
                  console.log(`Name: ${nama} adalah GDP maka dikali 1.25 (${pelg} * 1.25 = ${pelg*1.25})`);
                  min = pelg * 1.25;
                }else if (status === "GD") {
                  min = pelg * 1.15;
                  console.log(`Name: ${nama} adalah GARUDA maka dikali 1.15 (${pelg} * 1.15 = ${pelg*1.15})`);

                }else{
                  min = pelg;
                }
                min = apakahSaatPramuka ? min*1.08 : min;
                // console.log(`Name: ${nama}, Pelanggaran: ${pelanggaran}, Poin Awal: ${currentScore}, Min: ${(apakahSaatPramuka) ? min*1.08 : min} Hasil: ${currentScore - ((apakahSaatPramuka) ? min*1.08 : min)}`);
                // console.log(`Pelanggaran: ${pelanggaran}, poin asli: ${pelg}`);

                currentScore -= min;
                min = undefined;
              }
            });
          }

          // Update skor di DB
          await new Promise((resolve, reject) => {
            connectionSkor.query(
              "UPDATE skor SET skor = $1 WHERE nama = $2",
              [formatScore(currentScore), nama],
              (err) => {
                if (err) return reject(err);
                resolve();
              }
            );
          });
        }

        // Setelah semua selesai, update status laporan verified
        connection.query(
          "UPDATE laporantable SET isverified = TRUE WHERE uid = $1",
          [uid],
          (err, results) => {
            if (err) {
              req.session.alertMessage = {
                type: "error",
                message:
                  "Gagal memverifikasi laporan! CodeError: " + err.message,
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
      } catch (error) {
        req.session.alertMessage = {
          type: "error",
          message: "Terjadi kesalahan proses: " + error.message,
        };
        return res.redirect("/dashboard");
      }
    }
  );


});

router.post("/unverify", requireAuth, (req, res) => {
  if (req.session.RedAgateIsBeautiful == "score_viewer") {
    req.session.alertMessage = {
      type: "error",
      message: "Anda tidak memiliki akses ke halaman ini!",
    };
    return res.redirect("/");
  }

  const uid = req.body.uid;

  connection.query(
    "SELECT reportguilties, tipepelanggaran, isonpramday FROM laporantable WHERE uid = $1",
    [uid],
    async (err, results) => {
      if (err) {
        req.session.alertMessage = {
          type: "error",
          message: "Gagal mengambil data laporan! CodeError: " + err.message,
        };
        return res.redirect("/dashboard");
      }

      if (results.rowCount === 0) {
        req.session.alertMessage = {
          type: "error",
          message: "Laporan tidak ditemukan!",
        };
        return res.redirect("/dashboard");
      }

      const reportGuilties = results.rows[0].reportguilties;
      const tipePelanggaran = results.rows[0].tipepelanggaran;
      const apakahSaatPramuka = Boolean(results.rows[0].isonpramday);

      const penalties = res.locals.penalties;

      const guiltiesArray = reportGuilties
        .split(",")
        .map((g) => g.trim().replace(/^\d+\.\s*/, ""));

      try {
        let min, bonus;
        [min, bonus] = [0, 0];
        for (const input of guiltiesArray) {
          const statusMatch = input.match(/\(([^)]+)\)$/);
          const status = statusMatch ? statusMatch[1] : "";

          const nama = input.replace(/\s*\d+[A-Z]?\s*\([^)]+\)$/, "").trim();

          const skorResults = await new Promise((resolve, reject) => {
            connectionSkor.query(
              "SELECT skor FROM skor WHERE nama = $1",
              [nama],
              (err, skorResults) => {
                if (err) return reject(err);
                resolve(skorResults);
              }
            );
          });

          if (skorResults.rowCount === 0) {
            req.session.alertMessage = {
              type: "error",
              message: "Data skor tidak ditemukan untuk nama: " + nama,
            };
            return res.redirect("/dashboard");
          }

          let currentScore = skorResults.rows[0].skor;

          if (tipePelanggaran) {
            tipePelanggaran.split(",").forEach((pelanggaran) => {
              pelanggaran = pelanggaran.trim();
              if (penalties[pelanggaran]) {
                let pelg = Number(parseInt(penalties[pelanggaran].poin));
                min = (status === "GDP") ? pelg * 1.25 :
                          (status === "GD") ? pelg * 1.15 : pelg;
                bonus = (apakahSaatPramuka) ? min * 1.08 : min;
                console.log(`Tipe bonus: ${typeof bonus} (tipe min: ${typeof min}).  BONUS: ${bonus}, MIN: ${min}`);
                console.log(`Name: ${nama}, Pelanggaran: ${pelanggaran}, Poin: ${currentScore}, Plus: ${(apakahSaatPramuka) ? min*1.08 : min} Hasil: ${currentScore + Number(bonus)}`);

                currentScore += Number(bonus); // Kembalikan skor!
                [min, bonus] = [0, 0];
              }
            });
          }

          await new Promise((resolve, reject) => {
            connectionSkor.query(
              "UPDATE skor SET skor = $1 WHERE nama = $2",
              [formatScore(currentScore), nama],
              (err) => {
                if (err) return reject(err);
                resolve();
              }
            );
          });
        }

        // Tandai laporan sebagai tidak terverifikasi
        connection.query(
          "UPDATE laporantable SET isverified = FALSE WHERE uid = $1",
          [uid],
          (err, results) => {
            if (err) {
              req.session.alertMessage = {
                type: "error",
                message: "Gagal membatalkan verifikasi! CodeError: " + err.message,
              };
              return res.redirect("/dashboard");
            }
            if (results.rowCount > 0) {
              req.session.alertMessage = {
                type: "success",
                message: "Verifikasi laporan berhasil dibatalkan!",
              };
            } else {
              req.session.alertMessage = {
                type: "error",
                message: "Laporan tidak ditemukan atau belum diverifikasi!",
              };
            }
            res.redirect("/dashboard");
          }
        );
      } catch (error) {
        req.session.alertMessage = {
          type: "error",
          message: "Terjadi kesalahan proses: " + error.message,
        };
        return res.redirect("/dashboard");
      }
    }
  );
});




// Delete routers
router.post("/delete", requireAuth, (req, res) => {
  if (req.session.RedAgateIsBeautiful == "score_viewer") {
    req.session.alertMessage = {
      type: "error",
      message: "Anda tidak memiliki akses ke halaman ini!",
    };
    return res.redirect("/");
  }
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
  if (req.session.RedAgateIsBeautiful == "score_viewer") {
    req.session.alertMessage = {
      type: "error",
      message: "Anda tidak memiliki akses ke halaman ini!",
    };
    return res.redirect("/");
  }
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

  let countQuery = `SELECT COUNT(*) AS total FROM laporantable WHERE reporttitle ILIKE $1`;
  let dataQuery = `SELECT * FROM laporantable WHERE reporttitle ILIKE $1 ${orderByClause} LIMIT $2 OFFSET $3`;

  try {
    const countResult = await connection.query(countQuery, [`%${search}%`]);
    let totalRecords = countResult.rows[0].total;
    let totalPages = Math.ceil(totalRecords / limit);

    const results = await connection.query(dataQuery, [
      `%${search}%`,
      limit,
      offset,
    ]);

    res.render("dashboard", {
      perm: req.session.RedAgateIsBeautiful,
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

// Skor Web

// Route untuk menampilkan halaman skor
router.get("/skor", requireAuth, async (req, res) => {
  const { sortBy } = req.query; // Mendapatkan parameter query dari dropdown

  let orderClause = "ORDER BY nama"; // Default sorting (alfabet)
  if (sortBy === "score_asc") {
    orderClause = "ORDER BY skor ASC"; // Skor terendah
  } else if (sortBy === "score_desc") {
    orderClause = "ORDER BY skor DESC"; // Skor tertinggi
  } else if (sortBy === "name_desc") {
    orderClause = "ORDER BY nama DESC"; // Alfabet terbalik
  }

  try {
    // Ambil data siswa berdasarkan status
    const gdResult = await connectionSkor.query(
      `SELECT * FROM skor WHERE status = $1 ${orderClause}`,
      ["GD"]
    );
    const gdpResult = await connectionSkor.query(
      `SELECT * FROM skor WHERE status = $1 ${orderClause}`,
      ["GDP"]
    );
    const dppResult = await connectionSkor.query(
      `SELECT * FROM skor WHERE status = $1 ${orderClause}`,
      ["DPP"]
    );

    // Pisahkan data berdasarkan status
    const gdStudents = gdResult.rows;
    const gdpStudents = gdpResult.rows;
    const dppStudents = dppResult.rows;

    // Render halaman skor dengan data siswa
    res.render("skor", {
      csrfToken: res.locals.csrfToken,
      gdStudents,
      gdpStudents,
      dppStudents,
      sortBy,
      title: "Skor | DEWANEV",
      perm: req.session.RedAgateIsBeautiful,
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).send("Error fetching data");
  }
});

router.post("/update-score-add/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { dropdown2: dropdown } = req.body;

  const result = await connectionSkor.query(
    "SELECT * FROM skor WHERE uid = $1",
    [id]
  );
  const student = result.rows[0];
  try {
    if (student && res.locals.penalties[dropdown]) {
      let cskor = student.skor;
      // Perbarui skor sesuai aksi

      // Update skor di database
      await connectionSkor.query("UPDATE skor SET skor = $1 WHERE uid = $2", [
        cskor + parseInt(res.locals.penalties[dropdown]),
        id,
      ]);
    }

    // Kembali ke halaman skor dengan data yang diperbarui
    res.redirect("/profile/" + id);
  } catch (err) {
    console.error("Error updating score:", err);
    res.status(500).send("Error updating score");
  }
});

function getScoreColor(score) {
  if (score >= 25) return "text-emerald-600"; // Hijau (30-25)
  if (score >= 20) return "text-lime-600"; // Hijau muda (20-24)
  if (score >= 15) return "text-yellow-600"; // Kuning (15-19)
  if (score >= 10) return "text-orange-600"; // Oranye (10-14)
  if (score >= 5) return "text-red-600"; // Oranye kemerahan (5-9)
  return "text-red-600"; // Merah (0-4)
}

router.get("/profile/:id", requireAuth, (req, res) => {
  connectionSkor.query(
    "SELECT * FROM skor WHERE uid = $1",
    [req.params.id],
    (err, resultsSkor) => {
      connection.query(
        "SELECT * FROM laporantable WHERE reportguilties ILIKE $1",
        [`%${resultsSkor.rows[0].nama}%`],
        (err, results) => {
          res.render("profile", {
            title: "Profile | DEWANEV",
            student: resultsSkor.rows[0],
            panduan: he.decode(res.locals.p2),
            getScoreColor,
            perm: req.session.RedAgateIsBeautiful,
            trackrecords: results.rows,
            csrfToken: res.locals.csrfToken,
          });
          if (err) {
            req.session.alertMessage = {
              type: "error",
              message: "Gagal mengambil data! CodeError: " + err.message,
            };
            return res.redirect("/skor");
          }
        }
      );
      if (err) {
        req.session.alertMessage = {
          type: "error",
          message: "Gagal mengambil data! CodeError: " + err.message,
        };
        return res.redirect("/skor");
      }
    }
  );
});

// Route untuk memperbarui skor
router.post("/update-score-sub/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { dropdown } = req.body;
  const result = await connectionSkor.query(
    "SELECT * FROM skor WHERE uid = $1",
    [id]
  );
  const student = result.rows[0];

  if (student && res.locals.penalties[dropdown]) {
    let cskor = student.skor;
    // Perbarui skor sesuai aksi

    // Update skor di database
    await connectionSkor.query("UPDATE skor SET skor = $1 WHERE uid = $2", [
      cskor - res.locals.penalties[dropdown],
      id,
    ]);
  }

  // Kembali ke halaman skor dengan data yang diperbarui
  res.redirect("/profile/" + id);
});

router.use("/ada_sesuatu_yang_aneh", (req, res) => {
  res.render("error", { error: 500, title: "??? | DEWANEV", easter_egg: true });
});

export default router;
