import { query } from "../db.js";

export async function listNotifications(req, res) {
  try {
    const limit = Number(req.query.limit || 10);
    const size = Number.isNaN(limit) ? 10 : Math.min(Math.max(limit, 1), 50);
    const rows = await query(
      "SELECT id, message, created_at, updated_at FROM notifications ORDER BY created_at DESC LIMIT ?",
      [size]
    );
    const totalRows = await query("SELECT COUNT(*) AS count FROM notifications");
    const total = totalRows[0]?.count || 0;
    return res.json({
      items: rows.map((row) => ({
        id: String(row.id),
        message: row.message,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      unread_count: total
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch notifications.", error: err.message });
  }
}

export async function clearNotifications(req, res) {
  try {
    await query("DELETE FROM notifications");
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: "Failed to clear notifications.", error: err.message });
  }
}
