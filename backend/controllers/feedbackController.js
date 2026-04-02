import mongoose from "mongoose";
import Feedback from "../models/Feedback.js";
import Faculty from "../models/Faculty.js";
import Notification from "../models/Notification.js";
import Subject from "../models/Subject.js";

export async function submitFeedback(req, res) {
  const { faculty_id, rating, comment } = req.body || {};
  const student_id = req.user?.id;

  if (!student_id) {
    return res.status(401).json({ message: "Invalid session. Please login again." });
  }

  if (!faculty_id || rating === undefined) {
    return res.status(400).json({ message: "Faculty and rating are required." });
  }

  if (!mongoose.Types.ObjectId.isValid(faculty_id)) {
    return res.status(400).json({ message: "Invalid faculty id." });
  }

  const ratingValue = Number(rating);
  if (Number.isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5." });
  }

  try {
    const faculty = await Faculty.findById(faculty_id);
    if (!faculty) {
      return res.status(404).json({ message: "Faculty record not found." });
    }

    let subjectId = faculty.subjectId;
    if (!subjectId) {
      const normalized = String(faculty.subject || "").trim();
      if (normalized) {
        let subject = await Subject.findOne({ name: normalized });
        if (!subject) {
          subject = await Subject.create({ name: normalized, facultyId: faculty._id });
        }
        subjectId = subject._id;
        await Faculty.updateOne({ _id: faculty._id }, { $set: { subjectId } });
      }
    }

    if (!subjectId) {
      return res.status(400).json({ message: "Faculty subject not configured yet." });
    }

    const doc = await Feedback.create({
      studentId: student_id,
      facultyId: faculty_id,
      subjectId,
      rating: ratingValue,
      comment: comment || ""
    });

    const stats = await Feedback.aggregate([
      { $match: { facultyId: new mongoose.Types.ObjectId(faculty_id) } },
      { $group: { _id: "$facultyId", avg_rating: { $avg: "$rating" } } }
    ]);

    const avgRating = stats[0]?.avg_rating ?? null;
    if (avgRating !== null) {
      const previousStatus = faculty.quality_status;
      const quality_status =
        avgRating === null
          ? "Pending Evaluation"
          : faculty.pass_percentage >= 75 && avgRating >= 4
            ? "Good"
            : "Need Improvement";
      await Faculty.updateOne(
        { _id: faculty._id },
        { $set: { quality_status } }
      );

      if (previousStatus !== "Need Improvement" && quality_status === "Need Improvement") {
        await Notification.create({
          message: `${faculty.name} performance needs improvement`
        });
      }

      await Notification.create({
        message: `Feedback submitted for ${faculty.name}`
      });
    }

    return res.status(201).json(doc.toJSON());
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Feedback already submitted for this subject." });
    }
    return res.status(500).json({ message: "Failed to submit feedback.", error: err.message });
  }
}
