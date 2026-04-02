import mongoose from "mongoose";
import Faculty from "../models/Faculty.js";
import Subject from "../models/Subject.js";
import Feedback from "../models/Feedback.js";
import Notification from "../models/Notification.js";

function evaluateQuality(passPercentage, avgRating) {
  if (avgRating === null || avgRating === undefined) {
    return "Pending Evaluation";
  }
  return passPercentage >= 75 && avgRating >= 4 ? "Good" : "Need Improvement";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function upsertSubject(name, facultyId) {
  const normalized = String(name).trim();
  const subject = await Subject.findOneAndUpdate(
    { name: normalized },
    { name: normalized, facultyId },
    { upsert: true, new: true }
  );
  return subject;
}

async function clearSubjectIfOwned(subjectId, facultyId) {
  if (!subjectId) return;
  await Subject.updateOne(
    { _id: subjectId, facultyId },
    { $set: { facultyId: null } }
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

  try {
    const subjectDoc = await upsertSubject(subject, null);

    const doc = await Faculty.create({
      userId: ownerId,
      name,
      department,
      subject: String(subject).trim(),
      semester: String(semester).trim(),
      academic_year: String(academic_year).trim(),
      subjectId: subjectDoc._id,
      pass_percentage: passValue,
      quality_status
    });

    await Subject.updateOne({ _id: subjectDoc._id }, { $set: { facultyId: doc._id } });

    return res.status(201).json(doc.toJSON());
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

  try {
    const query = { _id: id };
    if (req.user.role === "Faculty") {
      if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
        return res.status(400).json({ message: "Invalid user session. Please login again." });
      }
      query.userId = req.user.id;
    }

    const existing = await Faculty.findOne(query);
    if (!existing) {
      return res.status(404).json({ message: "Faculty record not found." });
    }

    const subjectDoc = await upsertSubject(subject, null);

    const doc = await Faculty.findOneAndUpdate(
      query,
      {
        name,
        department,
        subject: String(subject).trim(),
        semester: String(semester).trim(),
        academic_year: String(academic_year).trim(),
        subjectId: subjectDoc._id,
        pass_percentage: passValue,
        quality_status
      },
      { new: true }
    );

    if (existing.subjectId?.toString() !== subjectDoc._id.toString()) {
      await clearSubjectIfOwned(existing.subjectId, existing._id);
    }
    await Subject.updateOne({ _id: subjectDoc._id }, { $set: { facultyId: doc._id } });

    const stats = await Feedback.aggregate([
      { $match: { facultyId: new mongoose.Types.ObjectId(doc._id) } },
      { $group: { _id: "$facultyId", avg_rating: { $avg: "$rating" } } }
    ]);
    const avgRating = stats[0]?.avg_rating ?? null;
    const updatedQuality = evaluateQuality(passValue, avgRating);
    if (updatedQuality !== doc.quality_status) {
      await Faculty.updateOne(
        { _id: doc._id },
        { $set: { quality_status: updatedQuality } }
      );
      if (updatedQuality === "Need Improvement") {
        await Notification.create({
          message: `${doc.name} performance needs improvement`
        });
      }
      doc.quality_status = updatedQuality;
    }

    return res.json(doc.toJSON());
  } catch (err) {
    return res.status(500).json({ message: "Failed to update faculty data.", error: err.message });
  }
}

export async function listFaculty(req, res) {
  try {
    const filter = req.user.role === "Faculty"
      ? { userId: new mongoose.Types.ObjectId(req.user.id) }
      : {};
    if (req.user.role === "Faculty" && !mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ message: "Invalid user session. Please login again." });
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
      filter.department = new RegExp(`^${escapeRegex(department)}$`, "i");
    }

    if (semester && semester.toLowerCase() !== "all") {
      filter.semester = new RegExp(`^${escapeRegex(semester)}$`, "i");
    }

    if (academicYear && academicYear.toLowerCase() !== "all") {
      filter.academic_year = new RegExp(`^${escapeRegex(academicYear)}$`, "i");
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: regex }, { department: regex }, { subject: regex }];
    }

    const basePipeline = [
      { $match: filter },
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
      }
    ];

    if (shouldPaginate && req.user.role === "Admin") {
      const pageNumber = Math.max(1, page);
      const pageSize = Math.max(1, Math.min(50, limit));
      const skip = (pageNumber - 1) * pageSize;

      const results = await Faculty.aggregate([
        ...basePipeline,
        {
          $facet: {
            data: [
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: pageSize },
              {
                $addFields: {
                  id: { $toString: "$_id" },
                  user_id: {
                    $cond: [{ $ifNull: ["$userId", false] }, { $toString: "$userId" }, null]
                  },
                  subject_id: {
                    $cond: [{ $ifNull: ["$subjectId", false] }, { $toString: "$subjectId" }, null]
                  }
                }
              },
              {
                $project: {
                  _id: 0,
                  __v: 0,
                  feedbacks: 0,
                  userId: 0,
                  subjectId: 0
                }
              }
            ],
            totalCount: [{ $count: "count" }]
          }
        }
      ]);

      const payload = results[0] || { data: [], totalCount: [] };
      const totalCount = payload.totalCount[0]?.count || 0;
      const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

      return res.json({
        data: payload.data,
        page: pageNumber,
        totalPages,
        totalCount
      });
    }

    const docs = await Faculty.aggregate([
      ...basePipeline,
      {
        $addFields: {
          id: { $toString: "$_id" },
          user_id: {
            $cond: [{ $ifNull: ["$userId", false] }, { $toString: "$userId" }, null]
          },
          subject_id: {
            $cond: [{ $ifNull: ["$subjectId", false] }, { $toString: "$subjectId" }, null]
          }
        }
      },
      {
        $project: {
          _id: 0,
          __v: 0,
          feedbacks: 0,
          userId: 0,
          subjectId: 0
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    return res.json(docs);
  } catch (err) {
    console.error("Faculty list error:", err);
    return res.status(500).json({ message: "Failed to fetch faculty data.", error: err.message });
  }
}

export async function getFacultyHistory(req, res) {
  const { id } = req.params || {};
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid faculty id." });
  }

  try {
    const baseDoc = await Faculty.findById(id);
    if (!baseDoc) {
      return res.status(404).json({ message: "Faculty record not found." });
    }

    const semester =
      typeof req.query.semester === "string" ? req.query.semester.trim() : "";
    const academicYear =
      typeof req.query.academic_year === "string" ? req.query.academic_year.trim() : "";

    const filter = {
      name: baseDoc.name,
      department: baseDoc.department
    };

    if (semester && semester.toLowerCase() !== "all") {
      filter.semester = new RegExp(`^${escapeRegex(semester)}$`, "i");
    }

    if (academicYear && academicYear.toLowerCase() !== "all") {
      filter.academic_year = new RegExp(`^${escapeRegex(academicYear)}$`, "i");
    }

    const rows = await Faculty.aggregate([
      { $match: filter },
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
              { $eq: ["$avg_rating", null] },
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
          _id: 0,
          id: { $toString: "$_id" },
          name: 1,
          department: 1,
          subject: 1,
          semester: 1,
          academic_year: 1,
          pass_percentage: 1,
          avg_rating: 1,
          quality_status: 1
        }
      },
      { $sort: { academic_year: -1, semester: -1, createdAt: -1 } }
    ]);

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch faculty history.", error: err.message });
  }
}

export async function deleteFaculty(req, res) {
  const { id } = req.params || {};
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid faculty id." });
  }

  try {
    const doc = await Faculty.findByIdAndDelete(id);
    if (!doc) {
      return res.status(404).json({ message: "Faculty record not found." });
    }

    await Subject.updateMany({ facultyId: doc._id }, { $set: { facultyId: null } });
    await Feedback.deleteMany({ facultyId: doc._id });

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete faculty data.", error: err.message });
  }
}

export async function getFacultyStats(req, res) {
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
          _id: null,
          total_faculty: { $sum: 1 },
          avg_pass_percentage: { $avg: "$pass_percentage" },
          avg_rating: { $avg: "$avg_rating" }
        }
      }
    ]);

    const stats = rows[0] || {
      total_faculty: 0,
      avg_pass_percentage: null,
      avg_rating: null
    };

    const departmentSummary = await Faculty.aggregate([
      {
        $group: {
          _id: "$department",
          avg_pass_percentage: { $avg: "$pass_percentage" },
          total_records: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const topFacultyRows = await Faculty.aggregate([
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
      { $match: { avg_rating: { $ne: null } } },
      { $sort: { avg_rating: -1 } },
      { $limit: 1 },
      {
        $project: {
          _id: 1,
          name: 1,
          department: 1,
          subject: 1,
          avg_rating: { $round: ["$avg_rating", 2] }
        }
      }
    ]);

    const topFaculty = topFacultyRows[0]
      ? {
          id: topFacultyRows[0]._id.toString(),
          name: topFacultyRows[0].name,
          department: topFacultyRows[0].department,
          subject: topFacultyRows[0].subject,
          avg_rating: topFacultyRows[0].avg_rating
        }
      : null;

    return res.json({
      total_faculty: stats.total_faculty ?? 0,
      average_pass_percentage:
        stats.avg_pass_percentage === null ? null : Number(stats.avg_pass_percentage.toFixed(2)),
      average_rating: stats.avg_rating === null ? null : Number(stats.avg_rating.toFixed(2)),
      department_summary: departmentSummary.map((row) => ({
        department: row._id,
        average_pass_percentage:
          row.avg_pass_percentage === null ? null : Number(row.avg_pass_percentage.toFixed(2)),
        total_records: row.total_records
      })),
      top_faculty: topFaculty
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch faculty stats.", error: err.message });
  }
}
