import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../db.js";

function normalizeRole(role) {
  if (!role) return null;
  const trimmed = String(role).trim();
  const lower = trimmed.toLowerCase();
  if (lower === "admin") return "Admin";
  if (lower === "faculty") return "Faculty";
  if (lower === "student") return "Student";
  return null;
}

export async function register(req, res) {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ message: "Username, password, and role are required." });
  }

  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return res.status(400).json({ message: "Role must be Admin, Faculty, or Student." });
  }

  try {
    const existingRows = await query("SELECT id FROM users WHERE username = ? LIMIT 1", [
      username
    ]);
    if (existingRows.length) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, hash, normalizedRole]
    );
    const userId = result.insertId;

    return res.status(201).json({
      id: String(userId),
      username,
      role: normalizedRole
    });
  } catch (err) {
    return res.status(500).json({ message: "Registration failed.", error: err.message });
  }
}

export async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const rows = await query("SELECT id, username, password, role FROM users WHERE username = ? LIMIT 1", [
      username
    ]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: String(user.id), username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      id: String(user.id),
      username: user.username,
      role: user.role,
      token
    });
  } catch (err) {
    return res.status(500).json({ message: "Login failed.", error: err.message });
  }
}
