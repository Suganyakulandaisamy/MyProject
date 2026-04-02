import { query } from "../db.js";

function toIntId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function mapFeedbackRow(row) {
  return {
    id: String(row.id),
    student_id: String(row.student_id),
    faculty_id: String(row.faculty_id),
    subject_id: String(row.subject_id),
    rating: row.rating,
    comment: row.comment ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function submitFeedback(req, res) {
  const { faculty_id, rating, comment } = req.body || {};
  const student_id = req.user?.id;

  if (!student_id) {
    return res.status(401).json({ message: "Invalid session. Please login again." });
  }

  if (!faculty_id || rating === undefined) {
    return res.status(400).json({ message: "Faculty and rating are required." });
  }

  const facultyId = toIntId(faculty_id);
  if (!facultyId) {
    return res.status(400).json({ message: "Invalid faculty id." });
  }

  const ratingValue = Number(rating);
  if (Number.isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5." });
  }

  try {
    const facultyRows = await query("SELECT * FROM faculty WHERE id = ? LIMIT 1", [
      facultyId
    ]);
    const faculty = facultyRows[0];
    if (!faculty) {
      return res.status(404).json({ message: "Faculty record not found." });
    }

    let subjectId = faculty.subject_id;
    if (!subjectId) {
      const normalized = String(faculty.subject || "").trim();
      if (normalized) {
        const existingSubject = await query(
          "SELECT id FROM subjects WHERE name = ? LIMIT 1",
          [normalized]
        );
        if (existingSubject.length) {
          subjectId = existingSubject[0].id;
        } else {
          const created = await query(
            "INSERT INTO subjects (name, faculty_id) VALUES (?, ?)",
            [normalized, faculty.id]
          );
          subjectId = created.insertId;
        }
        await query("UPDATE faculty SET subject_id = ? WHERE id = ?", [
          subjectId,
          faculty.id
        ]);
      }
    }

    if (!subjectId) {
      return res.status(400).json({ message: "Faculty subject not configured yet." });
    }

    const studentId = toIntId(student_id);
    if (!studentId) {
      return res.status(401).json({ message: "Invalid session. Please login again." });
    }

    const result = await query(
      `
        INSERT INTO feedbacks (student_id, faculty_id, subject_id, rating, comment)
        VALUES (?, ?, ?, ?, ?)
      `,
      [studentId, facultyId, subjectId, ratingValue, comment || ""]
    );

    const avgRows = await query(
      "SELECT AVG(rating) AS avg_rating FROM feedbacks WHERE faculty_id = ?",
      [facultyId]
    );
    const avgRating = avgRows[0]?.avg_rating ?? null;
    if (avgRating !== null) {
      const previousStatus = faculty.quality_status;
      const quality_status =
        avgRating === null
          ? "Pending Evaluation"
          : Number(faculty.pass_percentage) >= 75 && avgRating >= 4
            ? "Good"
            : "Need Improvement";
      await query("UPDATE faculty SET quality_status = ? WHERE id = ?", [
        quality_status,
        facultyId
      ]);

      if (previousStatus !== "Need Improvement" && quality_status === "Need Improvement") {
        await query("INSERT INTO notifications (message) VALUES (?)", [
          `${faculty.name} performance needs improvement`
        ]);
      }

      await query("INSERT INTO notifications (message) VALUES (?)", [
        `Feedback submitted for ${faculty.name}`
      ]);
    }

    const feedbackRows = await query("SELECT * FROM feedbacks WHERE id = ? LIMIT 1", [
      result.insertId
    ]);
    return res.status(201).json(mapFeedbackRow(feedbackRows[0]));
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Feedback already submitted for this subject." });
    }
    return res.status(500).json({ message: "Failed to submit feedback.", error: err.message });
  }
}
