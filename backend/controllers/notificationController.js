import Notification from "../models/Notification.js";

export async function listNotifications(req, res) {
  try {
    const limit = Number(req.query.limit || 10);
    const size = Number.isNaN(limit) ? 10 : Math.min(Math.max(limit, 1), 50);
    const rows = await Notification.find({}).sort({ createdAt: -1 }).limit(size);
    const total = await Notification.countDocuments();
    return res.json({
      items: rows.map((row) => row.toJSON()),
      unread_count: total
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch notifications.", error: err.message });
  }
}

export async function clearNotifications(req, res) {
  try {
    await Notification.deleteMany({});
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: "Failed to clear notifications.", error: err.message });
  }
}
