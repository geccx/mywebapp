// index.js (final)
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

// Detect production (Railway sets RAILWAY_ENVIRONMENT)
const isProduction = !!process.env.RAILWAY_ENVIRONMENT;
console.log("Environment:", isProduction ? "Production (Railway)" : "Local");

// CORS - allow all origins for now; tighten if needed
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Ensure uploads folder exists
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
  console.log("Created uploads folder");
}
app.use("/uploads", express.static(UPLOAD_DIR));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Helper: send JSON error for unexpected exceptions
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (!res.headersSent) res.status(500).json({ message: "Server error" });
});

// ---------- AUTH ROUTES ----------

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });

    const [exists] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) return res.status(400).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashed]);

    return res.json({ message: "Registered" });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "All fields required" });

    const [rows] = await db.query("SELECT id, password FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ message: "Invalid credentials" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------- PROFILE ----------

// Get my profile
app.get("/api/me", auth, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, name, email, profile_image, created_at FROM users WHERE id = ?", [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("GET /me ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update profile (optional profile image)
app.put("/api/me", auth, upload.single("profile"), async (req, res) => {
  try {
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
      updates.push("profile_image = ?"); params.push("/uploads/" + req.file.filename);
    }

    if (!updates.length) return res.status(400).json({ message: "No fields to update" });

    params.push(req.user.id);
    await db.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
    return res.json({ message: "Profile updated" });
  } catch (err) {
    console.error("PUT /me ERROR:", err);
    if (err?.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Email already in use" });
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------- ITEMS (CRUD) ----------

// Create item
app.post("/api/items", auth, upload.single("image"), async (req, res) => {
  try {
    const name = req.body.name || "";
    const image = req.file ? "/uploads/" + req.file.filename : null;
    await db.query("INSERT INTO items (name, image) VALUES (?, ?)", [name, image]);
    return res.json({ message: "Created" });
  } catch (err) {
    console.error("POST /items ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Read items
app.get("/api/items", auth, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM items ORDER BY id DESC");
    return res.json(rows);
  } catch (err) {
    console.error("GET /items ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update item
app.put("/api/items/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const id = req.params.id;
    if (req.file) {
      const image = "/uploads/" + req.file.filename;
      await db.query("UPDATE items SET name = ?, image = ? WHERE id = ?", [req.body.name, image, id]);
    } else {
      await db.query("UPDATE items SET name = ? WHERE id = ?", [req.body.name, id]);
    }
    return res.json({ message: "Updated" });
  } catch (err) {
    console.error("PUT /items/:id ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete item
app.delete("/api/items/:id", auth, async (req, res) => {
  try {
    await db.query("DELETE FROM items WHERE id = ?", [req.params.id]);
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /items/:id ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

// Fallthrough for unknown API routes: return JSON (helps frontend avoid HTML responses)
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
