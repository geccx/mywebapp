// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("./db");
const auth = require("./auth");

const app = express();

// ------------------------------
// ENVIRONMENT CHECK
// ------------------------------
const isProduction = process.env.RAILWAY_ENVIRONMENT !== undefined;
console.log("🚀 Environment:", isProduction ? "Production (Railway)" : "Local Development");

// ------------------------------
// CORS SETTINGS
// ------------------------------
// Accept all origins in dev, restrict on production
app.use(
  cors({
    origin: isProduction ? "*" : "*",
    credentials: true,
  })
);

app.use(express.json());

// ------------------------------
// ENSURE UPLOADS FOLDER EXISTS
// ------------------------------
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
  console.log("📁 Created uploads folder");
}

// Serve uploads
app.use("/uploads", express.static(UPLOAD_DIR));

// ------------------------------
// MULTER STORAGE CONFIG
// ------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// ------------------------------
// USER AUTH ROUTES
// ------------------------------

// REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length)
      return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed]
    );

    res.json({ message: "Registration successful" });
  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      "SELECT id, password FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0)
      return res.status(400).json({ message: "Invalid credentials" });

    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ------------------------------
// PROFILE ROUTES
// ------------------------------

// GET PROFILE
app.get("/api/me", auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, profile_image, created_at FROM users WHERE id = ?",
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ PROFILE FETCH ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// UPDATE PROFILE
app.put("/api/me", auth, upload.single("profile"), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const updates = [];
    const params = [];

    if (name) { updates.push("name = ?"); params.push(name); }
    if (email) { updates.push("email = ?"); params.push(email); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updates.push("password = ?");
      params.push(hashed);
    }

    if (req.file) {
      const imgPath = "/uploads/" + req.file.filename;
      updates.push("profile_image = ?");
      params.push(imgPath);
    }

    if (updates.length === 0)
      return res.status(400).json({ message: "No fields to update" });

    params.push(req.user.id);

    await db.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
    res.json({ message: "Profile updated" });
  } catch (err) {
    console.error("❌ PROFILE UPDATE ERROR:", err);

    if (err?.code === "ER_DUP_ENTRY")
      return res.status(400).json({ message: "Email already used" });

    res.status(500).json({ message: "Server Error" });
  }
});

// ------------------------------
// ITEM CRUD ROUTES
// ------------------------------

// CREATE ITEM
app.post("/api/items", auth, upload.single("image"), async (req, res) => {
  try {
    const image = req.file ? "/uploads/" + req.file.filename : null;

    await db.query(
      "INSERT INTO items (name, image) VALUES (?, ?)",
      [req.body.name, image]
    );

    res.json({ message: "Item created" });
  } catch (err) {
    console.error("❌ CREATE ITEM ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// READ ITEMS
app.get("/api/items", auth, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM items ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ READ ITEMS ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// UPDATE ITEM
app.put("/api/items/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.file) {
      const imgPath = "/uploads/" + req.file.filename;
      await db.query(
        "UPDATE items SET name = ?, image = ? WHERE id = ?",
        [req.body.name, imgPath, id]
      );
    } else {
      await db.query(
        "UPDATE items SET name = ? WHERE id = ?",
        [req.body.name, id]
      );
    }

    res.json({ message: "Item updated" });
  } catch (err) {
    console.error("❌ UPDATE ITEM ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// DELETE ITEM
app.delete("/api/items/:id", auth, async (req, res) => {
  try {
    await db.query("DELETE FROM items WHERE id = ?", [req.params.id]);
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("❌ DELETE ITEM ERROR:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ------------------------------
// HEALTH CHECK ROUTE
// ------------------------------
app.get("/health", (req, res) => res.json({ ok: true }));

// ------------------------------
// START SERVER
// ------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Backend running on port ${PORT}`)
);
