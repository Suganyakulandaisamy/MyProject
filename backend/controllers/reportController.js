import Faculty from "../models/Faculty.js";

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
    const rows = await Faculty.aggregate([
      {
        $lookup: {
          from: "feedbacks",
          localField: "_id",
          foreignField: "facultyId",
          as: "feedbacks"
        }
      },
      {
        $addFields: {
          avg_rating: {
            $cond: [
              { $gt: [{ $size: "$feedbacks" }, 0] },
              { $round: [{ $avg: "$feedbacks.rating" }, 2] },
              null
            ]
          }
        }
      },
      {
        $addFields: {
          quality_status: {
            $cond: [
              {
                $eq: ["$avg_rating", null]
              },
              "Pending Evaluation",
              {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$pass_percentage", 75] },
                      { $gte: ["$avg_rating", 4] }
                    ]
                  },
                  "Good",
                  "Need Improvement"
                ]
              }
            ]
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          department: 1,
          subject: 1,
          semester: 1,
          academic_year: 1,
          pass_percentage: 1,
          quality_status: 1,
          avg_rating: 1
        }
      },
      { $sort: { name: 1 } }
    ]);

    const result = rows.map((row) => ({
      id: row._id.toString(),
      name: row.name,
      department: row.department,
      subject: row.subject,
      semester: row.semester ?? null,
      academic_year: row.academic_year ?? null,
      pass_percentage: row.pass_percentage ?? null,
      quality_status: row.quality_status ?? null,
      avg_rating: row.avg_rating ?? null
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
    const rows = await Faculty.aggregate([
      {
        $lookup: {
          from: "feedbacks",
          localField: "_id",
          foreignField: "facultyId",
          as: "feedbacks"
        }
      },
      {
        $addFields: {
          avg_rating: {
            $cond: [
              { $gt: [{ $size: "$feedbacks" }, 0] },
              { $avg: "$feedbacks.rating" },
              null
            ]
          }
        }
      },
      {
        $group: {
          _id: "$department",
          avg_pass_percentage: { $avg: "$pass_percentage" },
          avg_rating: { $avg: "$avg_rating" },
          total_faculty: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const result = rows.map((row) => ({
      department: row._id,
      average_pass_percentage:
        row.avg_pass_percentage === null ? null : Number(row.avg_pass_percentage.toFixed(2)),
      average_feedback_rating:
        row.avg_rating === null ? null : Number(row.avg_rating.toFixed(2)),
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
