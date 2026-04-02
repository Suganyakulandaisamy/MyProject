import { query } from "../db.js";

function toIntId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function listSubjects(req, res) {
  try {
    const rows = await query(
      `
        SELECT
          s.id,
          s.name,
          s.created_at,
          s.updated_at,
          f.id AS faculty_id,
          f.name AS faculty_name,
          f.department AS faculty_department
        FROM subjects s
        LEFT JOIN faculty f ON f.id = s.faculty_id
        ORDER BY s.name
      `
    );
    return res.json(
      rows.map((row) => ({
        id: String(row.id),
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        faculty: row.faculty_id
          ? {
              id: String(row.faculty_id),
              name: row.faculty_name,
              department: row.faculty_department
            }
          : null
      }))
    );
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch subjects.", error: err.message });
  }
}

export async function addSubject(req, res) {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Subject name is required." });
  }

  const normalized = String(name).trim();

  try {
    const exists = await query("SELECT id FROM subjects WHERE name = ? LIMIT 1", [
      normalized
    ]);
    if (exists.length) {
      return res.status(409).json({ message: "Subject already exists." });
    }

    const result = await query(
      "INSERT INTO subjects (name, faculty_id) VALUES (?, NULL)",
      [normalized]
    );
    const subjectRows = await query(
      "SELECT id, name, faculty_id, created_at, updated_at FROM subjects WHERE id = ? LIMIT 1",
      [result.insertId]
    );
    const subject = subjectRows[0];
    return res.status(201).json({
      id: String(subject.id),
      name: subject.name,
      faculty_id: subject.faculty_id ? String(subject.faculty_id) : null,
      createdAt: subject.created_at,
      updatedAt: subject.updated_at
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to add subject.", error: err.message });
  }
}

export async function updateSubject(req, res) {
  const { id } = req.params || {};
  const { name } = req.body || {};
  const subjectId = toIntId(id);
  if (!subjectId) {
    return res.status(400).json({ message: "Invalid subject id." });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Subject name is required." });
  }

  const normalized = String(name).trim();

  try {
    const conflict = await query(
      "SELECT id FROM subjects WHERE name = ? AND id <> ? LIMIT 1",
      [normalized, subjectId]
    );
    if (conflict.length) {
      return res.status(409).json({ message: "Subject already exists." });
    }

    const result = await query("UPDATE subjects SET name = ? WHERE id = ?", [
      normalized,
      subjectId
    ]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: "Subject not found." });
    }

    await query("UPDATE faculty SET subject = ? WHERE subject_id = ?", [
      normalized,
      subjectId
    ]);

    const subjectRows = await query(
      "SELECT id, name, faculty_id, created_at, updated_at FROM subjects WHERE id = ? LIMIT 1",
      [subjectId]
    );
    const subject = subjectRows[0];

    return res.json({
      id: String(subject.id),
      name: subject.name,
      faculty_id: subject.faculty_id ? String(subject.faculty_id) : null,
      createdAt: subject.created_at,
      updatedAt: subject.updated_at
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update subject.", error: err.message });
  }
}

export async function deleteSubject(req, res) {
  const { id } = req.params || {};
  const subjectId = toIntId(id);
  if (!subjectId) {
    return res.status(400).json({ message: "Invalid subject id." });
  }

  try {
    const rows = await query("SELECT id FROM subjects WHERE id = ? LIMIT 1", [
      subjectId
    ]);
    if (!rows.length) {
      return res.status(404).json({ message: "Subject not found." });
    }

    await query("DELETE FROM subjects WHERE id = ?", [subjectId]);
    await query("UPDATE faculty SET subject_id = NULL WHERE subject_id = ?", [
      subjectId
    ]);

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete subject.", error: err.message });
  }
}
