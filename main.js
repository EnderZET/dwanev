require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const connection = require("./src/database");
const csurf = require("csurf");
const app = express();
const port = process.env.PORT || 3000;

// Connect to MySQL

// Use Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  session({
    secret: "DPPEVALINSTANCE",
    saveUninitialized: true,
    resave: false,
  })
);

app.use(cookieParser());

const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

app.use(
  session({
    secret: process.env.SESSION_SECRET, // Gunakan secret dari .env
    resave: false,
    saveUninitialized: false, // Hanya simpan session jika ada perubahan
    cookie: {
      httpOnly: true, // Mencegah akses cookie dari JavaScript (meningkatkan keamanan)
      secure: false, // Set ke true jika menggunakan HTTPS
      maxAge: 1000 * 60 * 60 * 24, // Cookie berlaku selama 1 hari
    },
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
  res.render("error", { error: 404, message: "Halaman tidak ditemukan!", title: "404 | DEWANEV", easter_egg: false });
});



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.render("error", { error: 500, message: "Server Internal mengalami Error!", title: "500 | DEWANEV", easter_egg: false });

});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
