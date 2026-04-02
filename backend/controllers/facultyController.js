import { query } from "../db.js";

function evaluateQuality(passPercentage, avgRating) {
  if (avgRating === null || avgRating === undefined) {
    return "Pending Evaluation";
  }
  return passPercentage >= 75 && avgRating >= 4 ? "Good" : "Need Improvement";
}

function toIntId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function mapFacultyRow(row) {
  return {
    id: String(row.id),
    user_id: row.user_id ? String(row.user_id) : null,
    subject_id: row.subject_id ? String(row.subject_id) : null,
    name: row.name,
    department: row.department,
    subject: row.subject,
    semester: row.semester,
    academic_year: row.academic_year,
    pass_percentage: row.pass_percentage === null ? null : Number(row.pass_percentage),
    avg_rating: row.avg_rating === null || row.avg_rating === undefined ? null : Number(row.avg_rating),
    quality_status: row.quality_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function upsertSubject(name) {
  const normalized = String(name).trim();
  const existing = await query("SELECT id FROM subjects WHERE name = ? LIMIT 1", [
    normalized
  ]);
  if (existing.length) return existing[0];

  const result = await query("INSERT INTO subjects (name, faculty_id) VALUES (?, NULL)", [
    normalized
  ]);
  return { id: result.insertId };
}

async function clearSubjectIfOwned(subjectId, facultyId) {
  if (!subjectId) return;
  await query(
    "UPDATE subjects SET faculty_id = NULL WHERE id = ? AND faculty_id = ?",
    [subjectId, facultyId]
  );
}

export async function addFaculty(req, res) {
  const { name, department, subject, semester, academic_year, pass_percentage, user_id } =
    req.body || {};

  const missing = [];
  if (!name || !String(name).trim()) missing.push("Faculty Name");
  if (!department || !String(department).trim()) missing.push("Department");
  if (!subject || !String(subject).trim()) missing.push("Subject");
  if (!semester || !String(semester).trim()) missing.push("Semester");
  if (!academic_year || !String(academic_year).trim()) missing.push("Academic Year");
  if (pass_percentage === undefined || pass_percentage === null || pass_percentage === "") {
    missing.push("Pass Percentage");
  }
  if (missing.length) {
    return res.status(400).json({
      message: `Missing fields: ${missing.join(", ")}.`
    });
  }

  const passValue = Number(pass_percentage);
  if (Number.isNaN(passValue) || passValue < 0 || passValue > 100) {
    return res.status(400).json({ message: "Pass percentage must be a number between 0 and 100." });
  }

  const quality_status = evaluateQuality(passValue, null);
  const ownerId = req.user.role === "Admin" && user_id ? user_id : req.user.id;
  const ownerInt = toIntId(ownerId);
  if (!ownerInt) {
    return res.status(400).json({ message: "Invalid user session. Please login again." });
  }

  try {
    const subjectDoc = await upsertSubject(subject);

    const result = await query(
      `
        INSERT INTO faculty
          (user_id, name, department, subject, semester, academic_year, subject_id, pass_percentage, quality_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        ownerInt,
        name,
        department,
        String(subject).trim(),
        String(semester).trim(),
        String(academic_year).trim(),
        subjectDoc.id,
        passValue,
        quality_status
      ]
    );

    const facultyId = result.insertId;
    await query("UPDATE subjects SET faculty_id = ? WHERE id = ?", [
      facultyId,
      subjectDoc.id
    ]);

    const rows = await query(
      `
        SELECT f.*, NULL AS avg_rating, f.quality_status AS quality_status
        FROM faculty f
        WHERE f.id = ?
      `,
      [facultyId]
    );

    return res.status(201).json(mapFacultyRow(rows[0]));
  } catch (err) {
    return res.status(500).json({ message: "Failed to add faculty data.", error: err.message });
  }
}

export async function updateFaculty(req, res) {
  const { id, name, department, subject, semester, academic_year, pass_percentage } =
    req.body || {};

  if (!id || !name || !department || !subject || !semester || !academic_year || pass_percentage === undefined) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const passValue = Number(pass_percentage);
  if (Number.isNaN(passValue) || passValue < 0 || passValue > 100) {
    return res.status(400).json({ message: "Pass percentage must be a number between 0 and 100." });
  }

  const quality_status = evaluateQuality(passValue, null);

  const facultyId = toIntId(id);
  if (!facultyId) {
    return res.status(400).json({ message: "Invalid faculty id." });
  }

  try {
    const filters = ["id = ?"];
    const params = [facultyId];

    if (req.user.role === "Faculty") {
      const userId = toIntId(req.user.id);
      if (!userId) {
        return res.status(400).json({ message: "Invalid user session. Please login again." });
      }
      filters.push("user_id = ?");
      params.push(userId);
    }

    const existingRows = await query(
      `SELECT * FROM faculty WHERE ${filters.join(" AND ")} LIMIT 1`,
      params
    );
    const existing = existingRows[0];
    if (!existing) {
      return res.status(404).json({ message: "Faculty record not found." });
    }

    const subjectDoc = await upsertSubject(subject);

    await query(
      `
        UPDATE faculty
        SET name = ?, department = ?, subject = ?, semester = ?, academic_year = ?,
            subject_id = ?, pass_percentage = ?, quality_status = ?
        WHERE ${filters.join(" AND ")}
      `,
      [
        name,
        department,
        String(subject).trim(),
        String(semester).trim(),
        String(academic_year).trim(),
        subjectDoc.id,
        passValue,
        quality_status,
        ...params
      ]
    );

    if (existing.subject_id !== subjectDoc.id) {
      await clearSubjectIfOwned(existing.subject_id, existing.id);
    }
    await query("UPDATE subjects SET faculty_id = ? WHERE id = ?", [
      existing.id,
      subjectDoc.id
    ]);

    const avgRows = await query(
      "SELECT AVG(rating) AS avg_rating FROM feedbacks WHERE faculty_id = ?",
      [existing.id]
    );
    const avgRating = avgRows[0]?.avg_rating ?? null;
    const updatedQuality = evaluateQuality(passValue, avgRating);
    if (updatedQuality !== existing.quality_status) {
      await query("UPDATE faculty SET quality_status = ? WHERE id = ?", [
        updatedQuality,
        existing.id
      ]);
      if (updatedQuality === "Need Improvement") {
        await query("INSERT INTO notifications (message) VALUES (?)", [
          `${existing.name} performance needs improvement`
        ]);
      }
    }

    const rows = await query(
      `
        SELECT f.*, ? AS avg_rating, ? AS quality_status
        FROM faculty f
        WHERE f.id = ?
      `,
      [avgRating, updatedQuality, existing.id]
    );

    return res.json(mapFacultyRow(rows[0]));
  } catch (err) {
    return res.status(500).json({ message: "Failed to update faculty data.", error: err.message });
  }
}

export async function listFaculty(req, res) {
  try {
    const filters = [];
    const params = [];

    if (req.user.role === "Faculty") {
      const userId = toIntId(req.user.id);
      if (!userId) {
        return res.status(400).json({ message: "Invalid user session. Please login again." });
      }
      filters.push("f.user_id = ?");
      params.push(userId);
    }

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const department =
      typeof req.query.department === "string" ? req.query.department.trim() : "";
    const semester =
      typeof req.query.semester === "string" ? req.query.semester.trim() : "";
    const academicYear =
      typeof req.query.academic_year === "string" ? req.query.academic_year.trim() : "";
    const page = Number(req.query.page || 0);
    const limit = Number(req.query.limit || 0);
    const shouldPaginate = page > 0 && limit > 0;

    if (department && department.toLowerCase() !== "all") {
      filters.push("LOWER(f.department) = LOWER(?)");
      params.push(department);
    }

    if (semester && semester.toLowerCase() !== "all") {
      filters.push("LOWER(f.semester) = LOWER(?)");
      params.push(semester);
    }

    if (academicYear && academicYear.toLowerCase() !== "all") {
      filters.push("LOWER(f.academic_year) = LOWER(?)");
      params.push(academicYear);
    }

    if (search) {
      const like = `%${search.toLowerCase()}%`;
      filters.push(
        "(LOWER(f.name) LIKE ? OR LOWER(f.department) LIKE ? OR LOWER(f.subject) LIKE ?)"
      );
      params.push(like, like, like);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    if (shouldPaginate && req.user.role === "Admin") {
      const pageNumber = Math.max(1, page);
      const pageSize = Math.max(1, Math.min(50, limit));
      const offset = (pageNumber - 1) * pageSize;

      const countRows = await query(
        `SELECT COUNT(*) AS count FROM faculty f ${whereClause}`,
        params
      );
      const totalCount = countRows[0]?.count || 0;
      const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

      const rows = await query(
        `
          SELECT
            f.*,
            ROUND(AVG(fb.rating), 2) AS avg_rating,
            CASE
              WHEN AVG(fb.rating) IS NULL THEN 'Pending Evaluation'
              WHEN f.pass_percentage >= 75 AND AVG(fb.rating) >= 4 THEN 'Good'
              ELSE 'Need Improvement'
            END AS quality_status
          FROM faculty f
          LEFT JOIN feedbacks fb ON fb.faculty_id = f.id
          ${whereClause}
          GROUP BY f.id
          ORDER BY f.created_at DESC
          LIMIT ? OFFSET ?
        `,
        [...params, pageSize, offset]
      );

      return res.json({
        data: rows.map(mapFacultyRow),
        page: pageNumber,
        totalPages,
        totalCount
      });
    }

    const rows = await query(
      `
        SELECT
          f.*,
          ROUND(AVG(fb.rating), 2) AS avg_rating,
          CASE
            WHEN AVG(fb.rating) IS NULL THEN 'Pending Evaluation'
            WHEN f.pass_percentage >= 75 AND AVG(fb.rating) >= 4 THEN 'Good'
            ELSE 'Need Improvement'
          END AS quality_status
        FROM faculty f
        LEFT JOIN feedbacks fb ON fb.faculty_id = f.id
        ${whereClause}
        GROUP BY f.id
        ORDER BY f.created_at DESC
      `,
      params
    );

    return res.json(rows.map(mapFacultyRow));
  } catch (err) {
    console.error("Faculty list error:", err);
    return res.status(500).json({ message: "Failed to fetch faculty data.", error: err.message });
  }
}

export async function getFacultyHistory(req, res) {
  const { id } = req.params || {};
  const facultyId = toIntId(id);
  if (!facultyId) {
    return res.status(400).json({ message: "Invalid faculty id." });
  }

  try {
    const baseRows = await query("SELECT * FROM faculty WHERE id = ? LIMIT 1", [
      facultyId
    ]);
    const baseDoc = baseRows[0];
    if (!baseDoc) {
      return res.status(404).json({ message: "Faculty record not found." });
    }

    const semester =
      typeof req.query.semester === "string" ? req.query.semester.trim() : "";
    const academicYear =
      typeof req.query.academic_year === "string" ? req.query.academic_year.trim() : "";

    const filters = ["f.name = ?", "f.department = ?"];
    const params = [baseDoc.name, baseDoc.department];

    if (semester && semester.toLowerCase() !== "all") {
      filters.push("LOWER(f.semester) = LOWER(?)");
      params.push(semester);
    }

    if (academicYear && academicYear.toLowerCase() !== "all") {
      filters.push("LOWER(f.academic_year) = LOWER(?)");
      params.push(academicYear);
    }

    const rows = await query(
      `
        SELECT
          f.id,
          f.name,
          f.department,
          f.subject,
          f.semester,
          f.academic_year,
          f.pass_percentage,
          ROUND(AVG(fb.rating), 2) AS avg_rating,
          CASE
            WHEN AVG(fb.rating) IS NULL THEN 'Pending Evaluation'
            WHEN f.pass_percentage >= 75 AND AVG(fb.rating) >= 4 THEN 'Good'
            ELSE 'Need Improvement'
          END AS quality_status
        FROM faculty f
        LEFT JOIN feedbacks fb ON fb.faculty_id = f.id
        WHERE ${filters.join(" AND ")}
        GROUP BY f.id
        ORDER BY f.academic_year DESC, f.semester DESC, f.created_at DESC
      `,
      params
    );

    return res.json(
      rows.map((row) => ({
        id: String(row.id),
        name: row.name,
        department: row.department,
        subject: row.subject,
        semester: row.semester,
        academic_year: row.academic_year,
        pass_percentage: row.pass_percentage === null ? null : Number(row.pass_percentage),
        avg_rating: row.avg_rating === null ? null : Number(row.avg_rating),
        quality_status: row.quality_status
      }))
    );
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch faculty history.", error: err.message });
  }
}

export async function deleteFaculty(req, res) {
  const { id } = req.params || {};
  const facultyId = toIntId(id);
  if (!facultyId) {
    return res.status(400).json({ message: "Invalid faculty id." });
  }

  try {
    const rows = await query("SELECT id FROM faculty WHERE id = ? LIMIT 1", [
      facultyId
    ]);
    if (!rows.length) {
      return res.status(404).json({ message: "Faculty record not found." });
    }

    await query("DELETE FROM faculty WHERE id = ?", [facultyId]);
    await query("UPDATE subjects SET faculty_id = NULL WHERE faculty_id = ?", [facultyId]);
    await query("DELETE FROM feedbacks WHERE faculty_id = ?", [facultyId]);

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete faculty data.", error: err.message });
  }
}

export async function getFacultyStats(req, res) {
  try {
    const statsRows = await query(
      `
        SELECT
          COUNT(*) AS total_faculty,
          AVG(pass_percentage) AS avg_pass_percentage,
          AVG(avg_rating) AS avg_rating
        FROM (
          SELECT f.id, f.pass_percentage, AVG(fb.rating) AS avg_rating
          FROM faculty f
          LEFT JOIN feedbacks fb ON fb.faculty_id = f.id
          GROUP BY f.id
        ) summary
      `
    );

    const stats = statsRows[0] || {
      total_faculty: 0,
      avg_pass_percentage: null,
      avg_rating: null
    };

    const departmentSummary = await query(
      `
        SELECT department, AVG(pass_percentage) AS avg_pass_percentage, COUNT(*) AS total_records
        FROM faculty
        GROUP BY department
        ORDER BY department
      `
    );

    const topFacultyRows = await query(
      `
        SELECT t.id, t.name, t.department, t.subject, ROUND(t.avg_rating, 2) AS avg_rating
        FROM (
          SELECT f.id, f.name, f.department, f.subject, AVG(fb.rating) AS avg_rating
          FROM faculty f
          LEFT JOIN feedbacks fb ON fb.faculty_id = f.id
          GROUP BY f.id
        ) t
        WHERE t.avg_rating IS NOT NULL
        ORDER BY t.avg_rating DESC
        LIMIT 1
      `
    );

    const topFaculty = topFacultyRows[0]
      ? {
          id: String(topFacultyRows[0].id),
          name: topFacultyRows[0].name,
          department: topFacultyRows[0].department,
          subject: topFacultyRows[0].subject,
          avg_rating: Number(topFacultyRows[0].avg_rating)
        }
      : null;

    return res.json({
      total_faculty: stats.total_faculty ?? 0,
      average_pass_percentage:
        stats.avg_pass_percentage === null ? null : Number(Number(stats.avg_pass_percentage).toFixed(2)),
      average_rating: stats.avg_rating === null ? null : Number(Number(stats.avg_rating).toFixed(2)),
      department_summary: departmentSummary.map((row) => ({
        department: row.department,
        average_pass_percentage:
          row.avg_pass_percentage === null ? null : Number(Number(row.avg_pass_percentage).toFixed(2)),
        total_records: row.total_records
      })),
      top_faculty: topFaculty
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch faculty stats.", error: err.message });
  }
}
