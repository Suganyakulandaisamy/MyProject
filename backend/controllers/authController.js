import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

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
    const exists = await User.findOne({ username }).lean();
    if (exists) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash, role: normalizedRole });

    return res.status(201).json({
      id: user._id.toString(),
      username: user.username,
      role: user.role
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
    const user = await User.findOne({ username }).lean();
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      token
    });
  } catch (err) {
    return res.status(500).json({ message: "Login failed.", error: err.message });
  }
}
