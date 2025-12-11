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
app.use(cors());
app.use(express.json());

// ensure uploads folder exists
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use("/uploads", express.static(UPLOAD_DIR));

/* -------------------------
   Multer storage
------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
  }
});
const upload = multer({ storage });

/* =========================
   AUTH: register & login
   ========================= */
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Missing fields" });

    const [exists] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) return res.status(400).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashed]);
    res.json({ message: "Registered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Missing fields" });

    const [rows] = await db.query("SELECT id, password FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ message: "Invalid credentials" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   PROFILE: View & Update
   ========================= */

// Get current user profile
app.get("/api/me", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query("SELECT id, name, email, profile_image, created_at FROM users WHERE id = ?", [userId]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update profile (name, email, password optional) and optional profile image
app.put("/api/me", auth, upload.single("profile"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, password } = req.body;
    const updates = [];
    const params = [];

    if (name) { updates.push("name = ?"); params.push(name); }
    if (email) { updates.push("email = ?"); params.push(email); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updates.push("password = ?"); params.push(hashed);
    }
    if (req.file) {
      const imagePath = "/uploads/" + req.file.filename;
      updates.push("profile_image = ?"); params.push(imagePath);
    }

    if (updates.length === 0) return res.status(400).json({ message: "No fields to update" });

    params.push(userId);
    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
    await db.query(sql, params);
    res.json({ message: "Profile updated" });
  } catch (err) {
    console.error(err);
    // handle duplicate email gracefully
    if (err && err.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Email already in use" });
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   ITEMS: CRUD + View image
   ========================= */

// Create item (with optional image)
app.post("/api/items", auth, upload.single("image"), async (req, res) => {
  try {
    const { name } = req.body;
    const imagePath = req.file ? "/uploads/" + req.file.filename : null;
    await db.query("INSERT INTO items (name, image) VALUES (?, ?)", [name, imagePath]);
    res.json({ message: "Created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Read items
app.get("/api/items", auth, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM items ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update item (optionally replace image)
app.put("/api/items/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;
    if (req.file) {
      const imagePath = "/uploads/" + req.file.filename;
      await db.query("UPDATE items SET name = ?, image = ? WHERE id = ?", [name, imagePath, id]);
    } else {
      await db.query("UPDATE items SET name = ? WHERE id = ?", [name, id]);
    }
    res.json({ message: "Updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete item
app.delete("/api/items/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM items WHERE id = ?", [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------
   Health
---------------------- */
app.get("/health", (req, res) => res.json({ ok: true }));

/* ----------------------
   Start server
---------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});
