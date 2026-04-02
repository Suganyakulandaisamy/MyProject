import { query } from "../db.js";

function toCsv(rows) {
  const header = [
    "Faculty Name",
    "Department",
    "Subject",
    "Semester",
    "Academic Year",
    "Pass Percentage",
    "Average Feedback Rating",
    "Quality Status"
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    const values = [
      row.name,
      row.department,
      row.subject,
      row.semester ?? "",
      row.academic_year ?? "",
      row.pass_percentage ?? "",
      row.avg_rating ?? "Pending",
      row.quality_status ?? ""
    ].map((value) => {
      const safe = value === null || value === undefined ? "" : String(value);
      return `"${safe.replace(/"/g, '""')}"`;
    });
    lines.push(values.join(","));
  }

  return lines.join("\n");
}

export async function getReports(req, res) {
  try {
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
        GROUP BY f.id
        ORDER BY f.name
      `
    );

    const result = rows.map((row) => ({
      id: String(row.id),
      name: row.name,
      department: row.department,
      subject: row.subject,
      semester: row.semester ?? null,
      academic_year: row.academic_year ?? null,
      pass_percentage: row.pass_percentage === null ? null : Number(row.pass_percentage),
      quality_status: row.quality_status ?? null,
      avg_rating: row.avg_rating === null ? null : Number(row.avg_rating)
    }));

    if (req.query.format === "csv") {
      const csv = toCsv(result);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=aaqap-report.csv");
      return res.send(csv);
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch reports.", error: err.message });
  }
}

export async function getDepartmentSummary(req, res) {
  try {
    const rows = await query(
      `
        SELECT
          department,
          AVG(pass_percentage) AS avg_pass_percentage,
          AVG(avg_rating) AS avg_rating,
          COUNT(*) AS total_faculty
        FROM (
          SELECT f.id, f.department, f.pass_percentage, AVG(fb.rating) AS avg_rating
          FROM faculty f
          LEFT JOIN feedbacks fb ON fb.faculty_id = f.id
          GROUP BY f.id
        ) summary
        GROUP BY department
        ORDER BY department
      `
    );

    const result = rows.map((row) => ({
      department: row.department,
      average_pass_percentage:
        row.avg_pass_percentage === null ? null : Number(Number(row.avg_pass_percentage).toFixed(2)),
      average_feedback_rating:
        row.avg_rating === null ? null : Number(Number(row.avg_rating).toFixed(2)),
      total_faculty: row.total_faculty
    }));

    if (req.query.format === "csv") {
      const header = [
        "Department Name",
        "Average Pass Percentage",
        "Average Feedback Rating",
        "Number of Faculty"
      ];
      const lines = [header.join(",")];
      for (const row of result) {
        const values = [
          row.department ?? "",
          row.average_pass_percentage ?? "",
          row.average_feedback_rating ?? "",
          row.total_faculty ?? ""
        ].map((value) => {
          const safe = value === null || value === undefined ? "" : String(value);
          return `"${safe.replace(/"/g, '""')}"`;
        });
        lines.push(values.join(","));
      }
      const csv = lines.join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=aaqap-department-summary.csv");
      return res.send(csv);
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch department summary.", error: err.message });
  }
}
